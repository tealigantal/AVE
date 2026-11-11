from __future__ import annotations

import json
from pathlib import Path
import re
import threading
import time
from copy import deepcopy
from dataclasses import replace
from fractions import Fraction

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, sha256_file
from ..adapters.ffmpeg import CommandCancelled, run_ffmpeg
from ..adapters.animated_image import prepare_video
from ..adapters.still_image import animation_facts
from ..render.graph_compiler import compile_render_graph
from ..render.execution_plan import validate_execution_request
from ..render.bounded_linear import render_bounded_linear


WORKER_VERSION = "ave-worker-host-r18"
AAC_TRUE_PEAK_HEADROOM_DB = 2.5


def _render_source_kind(graph: dict) -> str:
    kinds = {node.get("parameters", {}).get("source_kind") for node in graph.get("nodes", []) if node.get("kind") == "source"}
    if not kinds or not kinds.issubset({"original", "proxy"}):
        raise ValueError("RENDER_SOURCE_KIND_INVALID")
    return next(iter(kinds)) if len(kinds) == 1 else "mixed"


def _loudnorm_measure(path: Path, settings: dict, context: HandlerContext, stderr_line, on_exit, on_tick) -> dict[str, float]:
    target = float(settings["target_lufs"])
    peak = float(settings["true_peak_db"])
    result = run_ffmpeg(
        ["-v", "info", "-i", str(path), "-af", f"loudnorm=I={target}:TP={peak}:LRA=11:print_format=json", "-f", "null", "-"],
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
        stderr_line=stderr_line,
        on_exit=on_exit,
        on_tick=on_tick,
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


def _normalize_audio(source: Path, destination: Path, target: str, settings: dict, measured: dict[str, float], context: HandlerContext, stderr_line, on_exit, on_tick) -> None:
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
        stderr_line=stderr_line,
        on_exit=on_exit,
        on_tick=on_tick,
    )


def handle(payload: dict, context: HandlerContext) -> dict:
    graph = payload.get("graph")
    if not isinstance(graph, dict):
        raise ValueError("GRAPH_REQUIRED: render.timeline.v1 requires graph")
    execution_plan = validate_execution_request(payload)
    source_kind = _render_source_kind(graph)
    worker_version = WORKER_VERSION
    target = graph.get("target")
    expected_frames = None
    last_percent = -1
    last_frame: int | None = None
    diagnostic_started = time.monotonic()
    diagnostic_last_sent = 0.0
    diagnostic_lines: list[str] = []
    diagnostic_lock = threading.Lock()
    diagnostic_operation = "video_encode"
    def diagnostic(state: str = "running", exit_code: int | None = None, force: bool = False) -> None:
        nonlocal diagnostic_last_sent
        if target not in ("preview", "master"):
            return
        now = time.monotonic()
        with diagnostic_lock:
            if not force and now - diagnostic_last_sent < 5:
                return
            diagnostic_last_sent = now
            context.diagnostic({"stage": target, "operation": diagnostic_operation, "state": state, "frame": last_frame, "elapsed_ms": max(0, int((now - diagnostic_started) * 1000)), "exit_code": exit_code, "stderr_tail": "\n".join(diagnostic_lines)[-2048:]})
    def start_operation(operation: str) -> None:
        nonlocal diagnostic_operation, last_frame
        with diagnostic_lock:
            diagnostic_operation = operation
            last_frame = None
            diagnostic_lines.clear()
        diagnostic(force=True)
    def report_stderr(line: str) -> None:
        # Keep actionable encoder messages but never persist arbitrary media
        # metadata, file names, URLs, quoted values or control sequences.
        if not re.search(r"error|failed|invalid|unsupported|cannot|unable|no such|not found|out of memory|permission denied|no space left on device|unknown encoder", line, flags=re.I):
            return
        safe = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", line)
        safe = re.sub(r"https?://\S+|(?:[A-Za-z]:[\\/]|/)[^\s\]\[,:;]+", "<path>", safe)
        safe = re.sub(r"'[^']*'|\"[^\"]*\"", "<redacted>", safe)
        safe = re.sub(r"\S+\.(?:mp4|mov|mkv|wav|mp3|png|jpe?g|webp|ass|srt)(?:\?\S*)?", "<file>", safe, flags=re.I)
        safe = re.sub(r"(?i)(?:token|key|password|secret|authorization)\s*[:=]\s*\S+", "<redacted>", safe)
        with diagnostic_lock:
            diagnostic_lines.append(safe[:512])
            del diagnostic_lines[:-8]
        diagnostic()
    def report_frame(line: str) -> None:
        nonlocal last_percent, last_frame
        if not isinstance(expected_frames, int) or expected_frames <= 0 or not line.startswith("frame="):
            return
        raw = line.partition("=")[2].strip()
        if not raw.isdecimal():
            return
        last_frame = int(raw)
        # Encoding is only one part of the job: audio normalization and output
        # publication may follow, so reserve 100% for the completed job.
        percent = min(99, int(raw) * 100 // expected_frames)
        if percent > last_percent:
            last_percent = percent
            context.progress(percent / 100)
        diagnostic()
    policy_mode = execution_plan["execution_policy"]["mode"]
    if policy_mode == "bounded-linear-v1":
        start_operation("video_encode")
        temporary_bounded = context.workspace / "bounded-final.mp4"
        try:
            segment_result = render_bounded_linear(payload, replace(context, progress=lambda value: context.progress(min(0.99, value))), temporary_bounded)
            start_operation("output_collect")
            version_result = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=16384)
            version = (version_result.stdout or version_result.stderr).splitlines()[0]
            output_path = collect_output(temporary_bounded, output_directory(payload.get("output_dir")) / f"{execution_plan['plan_id']}-{target}-{execution_plan['cache_key'][:16]}.mp4")
            output_hash = sha256_file(Path(output_path))
            diagnostic("succeeded", force=True)
            context.progress(1.0)
            return {
                "outputs": [{"kind": "render", "path": output_path, "hash": output_hash, "source_kind": source_kind, "target": target, "execution_plan_id": execution_plan["plan_id"], "semantic_graph_hash": execution_plan["semantic_graph_hash"], "cache_key": execution_plan["cache_key"]}],
                "metrics": {"worker_version": worker_version, "source_order": segment_result["source_order"], "ffmpeg_version": version, "ffmpeg_returncode": 0, "execution_plan_id": execution_plan["plan_id"], "semantic_graph_hash": execution_plan["semantic_graph_hash"], "cache_key": execution_plan["cache_key"], "output_hash": output_hash, "audio_normalization": None, "ducking_status": "disabled", "execution_strategy": "bounded-linear-v1"},
            }
        except BaseException as error:
            diagnostic("cancelled" if isinstance(error, CommandCancelled) else "failed", force=True)
            raise
    start_operation("source_prepare")
    render_graph = deepcopy(graph)
    for index, node in enumerate(render_graph.get("nodes", [])):
        if node.get("kind") != "source":
            continue
        parameters = node.get("parameters", {})
        source_ref = parameters.get("source_ref")
        if not isinstance(source_ref, str) or parameters.get("clip_kind") in {"image", "graphic"}:
            continue
        source = Path(source_ref)
        if animation_facts(source) is None:
            continue
        derived = context.workspace / f"animated-source-{index:04d}.mkv"
        prepare_video(source, derived, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stderr_line=report_stderr, on_exit=lambda state, code: diagnostic(state, code, force=True), on_tick=diagnostic)
        parameters["source_ref"] = str(derived)
        source_start = int(str(parameters.get("source_start_pts", "0n")).removesuffix("n"))
        source_end = int(str(parameters.get("source_end_pts", "0n")).removesuffix("n"))
        source_timescale = int(str(parameters.get("source_timescale", "1000n")).removesuffix("n"))
        timeline_duration = parameters.get("timeline_duration")
        timeline_timescale = parameters.get("timeline_timescale")
        if timeline_duration is not None and timeline_timescale is not None:
            timeline_ticks = Fraction(int(str(timeline_duration).removesuffix("n")) * source_timescale, int(str(timeline_timescale).removesuffix("n")))
            if timeline_ticks.denominator != 1:
                raise ValueError("MEDIA_ANIMATION_TIMELINE_DURATION_UNREPRESENTABLE")
            if timeline_ticks.numerator > source_end - source_start:
                source_end = source_start + timeline_ticks.numerator
                parameters["source_end_pts"] = f"{source_end}n"
                parameters["animated_loop"] = True
    start_operation("graph_compile")
    compiled = compile_render_graph(render_graph)
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
    expected_frames = compiled.get("expected_frame_count")
    start_operation("video_encode")
    args.extend(["-progress", "pipe:1", "-nostats", "-movflags", "+faststart", str(temporary)])
    ffmpeg_result = run_ffmpeg(
        args,
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
        stdout_line=report_frame,
        stderr_line=report_stderr,
        on_exit=lambda state, code: diagnostic(state, code, force=True),
        on_tick=diagnostic,
        # Progress and diagnostic callbacks consume every line. The encoder's
        # return value only needs a bounded error tail, unlike QC/loudnorm.
        capture_limit=65536,
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
            start_operation("audio_measure")
            input_measurement = _loudnorm_measure(temporary, audio_master, context, report_stderr, lambda state, code: diagnostic(state, code, force=True), diagnostic)
            normalized = context.workspace / f"{target or 'render'}-normalized.mp4"
            start_operation("audio_normalize")
            _normalize_audio(temporary, normalized, str(target), audio_master, input_measurement, context, report_stderr, lambda state, code: diagnostic(state, code, force=True), diagnostic)
            start_operation("audio_verify")
            output_measurement = _loudnorm_measure(normalized, audio_master, context, report_stderr, lambda state, code: diagnostic(state, code, force=True), diagnostic)
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
    start_operation("output_collect")
    version_result = run_ffmpeg(
        ["-version"],
        timeout_seconds=context.timeout_seconds,
        cancelled=context.cancelled.is_set,
        stderr_line=report_stderr,
        on_tick=diagnostic,
    )
    output_path = collect_output(
        collected_source,
        target_dir
        / f"{execution_plan['plan_id']}-{target}-{execution_plan['cache_key'][:16]}.mp4",
    )
    output_hash = sha256_file(Path(output_path))
    diagnostic("succeeded", force=True)
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
                "source_kind": source_kind,
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
