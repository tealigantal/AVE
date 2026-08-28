from __future__ import annotations

import json
from pathlib import Path
import re

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, sha256_file
from ..adapters.ffmpeg import run_ffmpeg
from ..render.graph_compiler import compile_render_graph
from ..render.execution_plan import validate_execution_request


WORKER_VERSION = "ave-worker-host-r14"
AAC_TRUE_PEAK_HEADROOM_DB = 2.5


def _loudnorm_measure(path: Path, settings: dict, context: HandlerContext) -> dict[str, float]:
    target = float(settings["target_lufs"])
    peak = float(settings["true_peak_db"])
    result = run_ffmpeg(
        ["-v", "info", "-i", str(path), "-af", f"loudnorm=I={target}:TP={peak}:LRA=11:print_format=json", "-f", "null", "-"],
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
    )
    blocks = re.findall(r"\{\s*\"input_i\".*?\}", result.stderr, flags=re.DOTALL)
    if not blocks:
        raise ValueError("LOUDNESS_MEASUREMENT_MISSING")
    raw = json.loads(blocks[-1])
    return {
        "integrated_lufs": float(raw["input_i"]),
        "true_peak_db": float(raw["input_tp"]),
        "lra": float(raw["input_lra"]),
        "threshold": float(raw["input_thresh"]),
        "offset": float(raw["target_offset"]),
    }


def _normalize_audio(source: Path, destination: Path, target: str, settings: dict, measured: dict[str, float], context: HandlerContext) -> None:
    # AAC can overshoot the pre-encode true peak by several tenths of a dB.
    # Keep codec headroom internally while final QC still enforces the user's
    # declared ceiling against the encoded file.
    encode_peak = float(settings["true_peak_db"]) - AAC_TRUE_PEAK_HEADROOM_DB
    base = f"loudnorm=I={float(settings['target_lufs'])}:TP={encode_peak}:LRA=11"
    if target == "master":
        base += (
            f":measured_I={measured['integrated_lufs']}:measured_LRA={measured['lra']}"
            f":measured_TP={measured['true_peak_db']}:measured_thresh={measured['threshold']}"
            f":offset={measured['offset']}:linear=true"
        )
    run_ffmpeg(
        ["-y", "-i", str(source), "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy", "-af", base, "-c:a", "aac", "-ar", "48000", "-movflags", "+faststart", str(destination)],
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
    )


def handle(payload: dict, context: HandlerContext) -> dict:
    graph = payload.get("graph")
    if not isinstance(graph, dict):
        raise ValueError("GRAPH_REQUIRED: render.timeline.v1 requires graph")
    execution_plan = validate_execution_request(payload)
    worker_version = WORKER_VERSION
    target = graph.get("target")
    compiled = compile_render_graph(graph)
    target_dir = output_directory(payload.get("output_dir"))
    temporary = context.workspace / f"{target or 'render'}.mp4"
    args = [
        "-y",
        *compiled["inputs"],
        "-filter_complex",
        compiled["filter_complex"],
        "-map",
        f"[{compiled['video_label']}]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
    ]
    if compiled.get("expected_frame_count") is not None:
        args.extend(["-fps_mode", "passthrough"])
        profile_value = graph.get("profile")
        profile: dict = profile_value if isinstance(profile_value, dict) else {}
        if float(profile.get("fps", 30)) > 60:
            args.extend(["-preset", "faster"])
    if compiled["audio_label"]:
        args.extend(["-map", f"[{compiled['audio_label']}]", "-c:a", "aac", "-ar", "48000"])
    else:
        args.append("-an")
    args.extend(["-movflags", "+faststart", str(temporary)])
    ffmpeg_result = run_ffmpeg(
        args,
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
    )
    normalization: dict[str, object] | None = None
    collected_source = temporary
    audio_master = compiled.get("audio_master")
    if audio_master:
        if not audio_master.get("enabled"):
            normalization = {"status": "disabled"}
        elif not compiled["audio_label"]:
            normalization = {"status": "no_audio"}
        else:
            input_measurement = _loudnorm_measure(temporary, audio_master, context)
            normalized = context.workspace / f"{target or 'render'}-normalized.mp4"
            _normalize_audio(temporary, normalized, str(target), audio_master, input_measurement, context)
            output_measurement = _loudnorm_measure(normalized, audio_master, context)
            target_lufs = float(audio_master["target_lufs"])
            true_peak_db = float(audio_master["true_peak_db"])
            tolerance_lufs = float(audio_master["tolerance_lufs"])
            normalization = {
                "status": "normalized",
                "input_integrated_lufs": input_measurement["integrated_lufs"],
                "input_true_peak_db": input_measurement["true_peak_db"],
                "output_integrated_lufs": output_measurement["integrated_lufs"],
                "output_true_peak_db": output_measurement["true_peak_db"],
                "target_lufs": target_lufs,
                "true_peak_ceiling_db": true_peak_db,
                "tolerance_lufs": tolerance_lufs,
                "within_tolerance": abs(output_measurement["integrated_lufs"] - target_lufs) <= tolerance_lufs and output_measurement["true_peak_db"] <= true_peak_db + 0.1,
            }
            collected_source = normalized
    version_result = run_ffmpeg(
        ["-version"],
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
    )
    output_path = collect_output(
        collected_source,
        target_dir
        / f"{execution_plan['plan_id']}-{target}-{execution_plan['cache_key'][:16]}.mp4",
    )
    output_hash = sha256_file(Path(output_path))
    context.progress(1.0)
    ffmpeg_version = (
        (version_result.stdout or version_result.stderr).splitlines()[0]
        if (version_result.stdout or version_result.stderr).splitlines()
        else "ffmpeg"
    )
    return {
        "outputs": [
            {
                "kind": "render",
                "path": output_path,
                "hash": output_hash,
                "source_kind": "original" if target == "master" else "proxy",
                "target": target,
                "execution_plan_id": execution_plan["plan_id"],
                "semantic_graph_hash": execution_plan["semantic_graph_hash"],
                "cache_key": execution_plan["cache_key"],
            }
        ],
        "metrics": {
            "worker_version": worker_version,
            "source_order": compiled["source_order"],
            "filter_complex": compiled["filter_complex"],
            "ffmpeg_version": ffmpeg_version,
            "ffmpeg_returncode": ffmpeg_result.returncode,
            "execution_plan_id": execution_plan["plan_id"],
            "semantic_graph_hash": execution_plan["semantic_graph_hash"],
            "cache_key": execution_plan["cache_key"],
            "output_hash": output_hash,
            "audio_normalization": normalization,
            "ducking_status": compiled.get("ducking_status"),
        },
    }
