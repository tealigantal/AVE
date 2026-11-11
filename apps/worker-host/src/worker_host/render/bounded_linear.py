"""Experimental bounded renderer for strictly linear, frame-aligned graphs.

The Host admits only its verified linear subset and retains the ordinary
target-specific plan, source authority and QC publication boundaries.
"""
from __future__ import annotations

from builtins import BaseExceptionGroup
from copy import deepcopy
from dataclasses import replace
from fractions import Fraction
from pathlib import Path
import json
import os
import shutil
import stat
import tempfile

from ..adapters.ffmpeg import CommandCancelled, run_ffmpeg, run_ffprobe
from ..handlers.context import HandlerContext
from .execution_plan import validate_execution_request
from .graph_compiler import compile_render_graph, integer


# Chunk after the original clip's complete filter graph, on its global output
# frame grid.  This bounds each lossless intermediate without redefining the
# source trim, frame-rate conversion, or resampling origin at chunk edges.
MAX_SEGMENT_FRAMES = 300


def _linear_segments(sources: list[dict]):
    if type(MAX_SEGMENT_FRAMES) is not int or MAX_SEGMENT_FRAMES <= 0:
        raise ValueError("BOUNDED_LINEAR_SEGMENT_SIZE_INVALID")
    for source in sources:
        total = integer(source["parameters"]["timeline_duration"])
        for offset in range(0, total, MAX_SEGMENT_FRAMES):
            yield source, offset, min(MAX_SEGMENT_FRAMES, total - offset)


def _single_thread_inputs(inputs: list[str]) -> list[str]:
    result: list[str] = []
    for value in inputs:
        if value == "-i":
            result.extend(["-threads", "1"])
        result.append(value)
    return result


def _linear_audio_filter(compiled: dict, samples: int) -> str:
    """Select the compiler's single-clip audio graph without a video sink.

    The bounded strategy admits exactly one embedded audio source and no
    audio effects other than gain.  Refuse an unfamiliar compiler graph
    instead of trying to reconstruct or silently omit its audio semantics.
    """
    label = compiled.get("audio_label")
    if not isinstance(label, str) or not label:
        raise ValueError("BOUNDED_LINEAR_AUDIO_MISSING")
    parts = compiled["filter_complex"].split(";")
    source = [part for part in parts if part.startswith("[0:a]") and part.endswith("[a0]")]
    placed = [part for part in parts if part.startswith("[a0]") and part.endswith(f"[{label}]")]
    if len(source) != 1 or len(placed) != 1:
        raise ValueError("BOUNDED_LINEAR_AUDIO_GRAPH_UNSUPPORTED")
    return ";".join([source[0], placed[0], f"[{label}]atrim=end_sample={samples}[linear-audio]"])


def _count_video_frames(path: Path, context: HandlerContext, progress) -> int:
    last_frame = 0
    def receive(line: str) -> None:
        nonlocal last_frame
        if line.startswith("frame=") and line[6:].strip().isdigit():
            frame = int(line[6:].strip())
            if frame > last_frame:
                last_frame = frame
                progress(frame)
    run_ffmpeg(["-v", "error", "-threads", "1", "-i", str(path), "-map", "0:v:0", "-threads", "1", "-progress", "pipe:1", "-nostats", "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=receive, capture_limit=16384, progress_inactivity=True)
    return last_frame


def _linear_sources(graph: dict) -> list[dict]:
    nodes = graph.get("nodes")
    if not isinstance(nodes, list) or graph.get("range") is not None:
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: graph or range")
    if any(node.get("kind") not in {"source", "trim", "audio", "composite", "sink"} for node in nodes):
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: effects or global operations")
    profile = graph.get("profile") or {}
    if profile.get("fps") != 30 or not all(isinstance(profile.get(k), int) and profile[k] > 0 and profile[k] % 2 == 0 for k in ("width", "height")):
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: profile")
    if sum(node.get("kind") == "composite" for node in nodes) != 1 or sum(node.get("kind") == "sink" for node in nodes) != 1:
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: composition")
    sources = sorted((node for node in nodes if node.get("kind") == "source"), key=lambda node: integer(node["parameters"]["timeline_start"]))
    if not sources:
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: empty graph")
    prefixes = [source["node_id"][:-len("-source")] + "-" for source in sources if source["node_id"].endswith("-source")]
    if len(prefixes) != len(sources) or any(a != b and b.startswith(a) for a in prefixes for b in prefixes):
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: ambiguous clip identities")
    expected_start = 0
    track = None
    for source in sources:
        p = source["parameters"]
        if p.get("clip_kind", "media") not in {"media", "image"} or not isinstance(p.get("has_audio", True), bool) or p.get("audio_enabled", True) is not True:
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: media or audio source")
        if p.get("clip_kind") == "image" and p.get("has_audio", True):
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: image audio")
        if p.get("track_kind", "video") != "video" or p.get("track_enabled", True) is not True or p.get("track_muted", False) is not False or p.get("track_solo", False) is not False or p.get("track_opacity", 1) != 1 or p.get("track_blend_mode", "normal") != "normal":
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: track properties")
        if track is None:
            track = p.get("track_id")
        if not track or p.get("track_id") != track or integer(p["timeline_timescale"]) != 30 or integer(p["timeline_start"]) != expected_start:
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: track or non-contiguous timing")
        duration = integer(p["timeline_duration"])
        if duration <= 0:
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: duration")
        base = source["node_id"][:-len("-source")] + "-" if source["node_id"].endswith("-source") else None
        matching = [n for n in nodes if base and n["node_id"].startswith(base) and n is not source]
        if not base or sum(n["kind"] == "trim" for n in matching) != 1 or sum(n["kind"] == "audio" for n in matching) != 1:
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: clip nodes")
        audio = next(n.get("parameters", {}) for n in matching if n["kind"] == "audio")
        # Clip gain is compiled by the same graph compiler as the standard
        # executor and applied before each contiguous PCM segment is joined.
        # Do not reject an otherwise supported gain as long as the compiler's
        # ordinary finite-value and effect checks accept it.
        if audio.get("audio_role", "embedded") != "embedded" or audio.get("muted", False) or audio.get("solo", False) or audio.get("enabled", True) is not True:
            raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: audio policy")
        expected_start += duration
    if any(integer(s["parameters"]["timeline_total_duration"]) != expected_start for s in sources):
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: total duration")
    associated = {n["node_id"] for s in sources for n in nodes if n["node_id"].startswith(s["node_id"][:-len("-source")] + "-")}
    if any(n["kind"] in {"source", "trim", "audio"} and n["node_id"] not in associated for n in nodes):
        raise ValueError("BOUNDED_LINEAR_UNSUPPORTED: unassociated node")
    return sources


def _clip_graph(graph: dict, source_id: str, *, audio: bool) -> dict:
    segment = deepcopy(graph)
    prefix = source_id[:-len("-source")] + "-"
    segment["nodes"] = [n for n in segment["nodes"] if n["node_id"].startswith(prefix) or n["kind"] in {"composite", "sink"}]
    retained = {n["node_id"] for n in segment["nodes"]}
    segment["edges"] = [edge for edge in segment.get("edges", []) if edge["from"] in retained and edge["to"] in retained]
    source = next(n for n in segment["nodes"] if n["node_id"] == source_id)
    params = source["parameters"]
    params["timeline_start"] = "0n"
    params["timeline_total_duration"] = params["timeline_duration"]
    if not audio:
        params["has_audio"] = False
    for node in segment["nodes"]:
        if node["kind"] == "audio":
            node.get("parameters", {})["timeline_start"] = "0n"
    return segment


def render_bounded_linear(payload: dict, context: HandlerContext, output: Path) -> dict:
    """Render in a private workspace and atomically publish verified output."""
    workspace = context.workspace
    if workspace.is_symlink() or not workspace.is_dir() or output.parent.resolve() != workspace.resolve() or os.path.lexists(output):
        raise ValueError("BOUNDED_LINEAR_OUTPUT_PATH_INVALID")
    published_identity: tuple[int, int] | None = None
    try:
        with tempfile.TemporaryDirectory(prefix="bounded-linear-", dir=workspace) as directory:
            private = Path(directory)
            temporary = private / "verified.mp4"
            result = _render_bounded_linear(payload, replace(context, workspace=private), temporary)
            if context.cancelled.is_set():
                raise CommandCancelled("bounded render cancelled")
            with temporary.open("r+b") as handle:
                os.fsync(handle.fileno())
                info = os.fstat(handle.fileno())
                if not stat.S_ISREG(info.st_mode):
                    raise ValueError("BOUNDED_LINEAR_OUTPUT_PATH_INVALID")
                identity = (info.st_dev, info.st_ino)
            os.link(temporary, output, follow_symlinks=False)
            published_identity = identity
            if context.cancelled.is_set():
                raise CommandCancelled("bounded render cancelled")
    except BaseException as cause:
        if published_identity is not None:
            try:
                info = os.lstat(output)
                if stat.S_ISREG(info.st_mode) and (info.st_dev, info.st_ino) == published_identity:
                    output.unlink()
            except FileNotFoundError:
                pass
            except OSError as cleanup:
                raise BaseExceptionGroup("bounded render and output cleanup failed", [cause, cleanup]) from cause
        raise
    context.progress(1.0)
    return result


def _render_bounded_linear(payload: dict, context: HandlerContext, output: Path) -> dict:
    plan = validate_execution_request(payload)
    if plan["execution_policy"]["mode"] != "bounded-linear-v1":
        raise ValueError("BOUNDED_LINEAR_POLICY_REQUIRED")
    graph = payload["graph"]
    sources = _linear_sources(graph)
    frames_total = sum(integer(source["parameters"]["timeline_duration"]) for source in sources)
    profile = graph["profile"]
    # Estimate raw frame/PCM working space and reserve.  The raw yuv420p
    # intermediate needs 1.5 bytes per pixel; use two to include container
    # overhead and leave an additional safety margin for output and metadata.
    estimated = profile["width"] * profile["height"] * 2 * frames_total + frames_total * 1600 * 8 * 2 + 256 * 1024 * 1024
    if shutil.disk_usage(context.workspace).free < estimated:
        raise ValueError("BOUNDED_LINEAR_DISK_SPACE_INSUFFICIENT")
    # Validate every source and all original semantics before starting any output.
    original_compilation = compile_render_graph(graph)
    workspace = context.workspace
    video_files: list[Path] = []
    audio_path = workspace / "linear-audio.f32le"
    has_output_audio = original_compilation["audio_label"] is not None
    total_frames = 0
    last_progress = 0.0
    def report(completed_frames: float) -> None:
        nonlocal last_progress
        fraction = 0.99 * min(1.0, completed_frames / (8 * frames_total))
        if fraction > last_progress:
            last_progress = fraction
            context.progress(fraction)
    active_audio: Path | None = None
    with audio_path.open("xb") as mixed:
        for index, (source, offset, frames) in enumerate(_linear_segments(sources)):
            if context.cancelled.is_set():
                raise CommandCancelled("bounded render cancelled")
            p = source["parameters"]
            clip_frames = integer(p["timeline_duration"])
            samples = frames * 1600
            video_graph = _clip_graph(graph, source["node_id"], audio=False)
            compiled = compile_render_graph(video_graph)
            if compiled["expected_frame_count"] != clip_frames or compiled["audio_label"]:
                raise ValueError("BOUNDED_LINEAR_SEGMENT_INVALID")
            video = workspace / f"linear-video-{index:06d}.nut"
            base = 4 * total_frames
            def video_progress(line: str) -> None:
                if line.startswith("frame=") and line[6:].strip().isdigit():
                    report(base + min(frames, int(line[6:].strip())))
            # FFV1 can exhaust a 768 MiB container on a single 3120x4160
            # frame, even with one thread. Rawvideo keeps the exact output
            # pixels without an additional lossy generation; NUT preserves
            # frame boundaries for the final sequential encode.
            video_filters = compiled["filter_complex"] + f";[{compiled['video_label']}]trim=start_frame={offset}:end_frame={offset + frames},setpts=PTS-STARTPTS[linear-video]"
            run_ffmpeg(["-n", "-filter_threads", "1", "-filter_complex_threads", "1", *_single_thread_inputs(compiled["inputs"]), "-filter_complex", video_filters, "-map", "[linear-video]", "-an", "-frames:v", str(frames), "-c:v", "rawvideo", "-pix_fmt", "yuv420p", "-threads", "1", "-f", "nut", "-fps_mode", "passthrough", "-progress", "pipe:1", "-nostats", str(video)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=video_progress, capture_limit=16384, progress_inactivity=True)
            count = _count_video_frames(video, context, lambda frame: report(base + frames + min(frames, frame)))
            if count != frames:
                raise ValueError("BOUNDED_LINEAR_FRAME_COUNT_MISMATCH")
            video_files.append(video)
            if p.get("has_audio", True):
                # Padding a clip's source here would turn a truncated or absent
                # original audio range into apparently valid silence.  The
                # exact sample count below is the integrity boundary; silence
                # is generated separately only for clips known to have no audio.
                # Materialize the complete clip-local resampler output once.
                # Restarting resampling per block changes filter state; making
                # the final atrim repeatedly consume a separate video sink can
                # also trigger FFmpeg scheduler assertions on VFR sources.
                if offset == 0:
                    compiled_audio = compile_render_graph(_clip_graph(graph, source["node_id"], audio=True), pad_output_audio=False)
                    if not compiled_audio["audio_label"]:
                        raise ValueError("BOUNDED_LINEAR_AUDIO_MISSING")
                    active_audio = workspace / f"linear-audio-{index:06d}.f32le"
                    filters = _linear_audio_filter(compiled_audio, clip_frames * 1600)
                    def audio_progress(line: str) -> None:
                        if line.startswith("out_time_us=") and line[12:].strip().isdigit():
                            report(base + 2 * frames + min(frames, int(line[12:].strip()) * 30 / 1_000_000))
                    run_ffmpeg(["-n", "-filter_threads", "1", "-filter_complex_threads", "1", *_single_thread_inputs(compiled_audio["inputs"]), "-filter_complex", filters, "-map", "[linear-audio]", "-vn", "-c:a", "pcm_f32le", "-ar", "48000", "-ac", "2", "-progress", "pipe:1", "-nostats", "-f", "f32le", str(active_audio)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=audio_progress, capture_limit=16384, progress_inactivity=True)
                    if active_audio.stat().st_size != clip_frames * 1600 * 8:
                        raise ValueError("BOUNDED_LINEAR_SAMPLE_COUNT_MISMATCH")
                if active_audio is None:
                    raise ValueError("BOUNDED_LINEAR_AUDIO_MISSING")
                copied = 0
                with active_audio.open("rb") as reader:
                    reader.seek(offset * 1600 * 8)
                    while copied < samples * 8:
                        if context.cancelled.is_set():
                            raise CommandCancelled("bounded render cancelled")
                        chunk = reader.read(min(1024 * 1024, samples * 8 - copied))
                        if not chunk:
                            raise ValueError("BOUNDED_LINEAR_SAMPLE_COUNT_MISMATCH")
                        mixed.write(chunk)
                        copied += len(chunk)
                        report(base + 3 * frames + copied / (1600 * 8))
                if offset + frames == clip_frames:
                    active_audio.unlink()
                    active_audio = None
            elif has_output_audio:
                remaining = samples * 8
                zeros = bytes(1024 * 1024)
                while remaining:
                    if context.cancelled.is_set():
                        raise CommandCancelled("bounded render cancelled")
                    chunk = min(remaining, len(zeros))
                    mixed.write(zeros[:chunk])
                    remaining -= chunk
                    report(base + 3 * frames + (samples * 8 - remaining) / (1600 * 8))
            total_frames += frames
            report(4 * total_frames)
    listing = workspace / "linear-concat.ffconcat"
    with listing.open("x", encoding="utf-8", newline="\n") as handle:
        handle.write("ffconcat version 1.0\n")
        for video in video_files:
            handle.write("file '" + str(video).replace("'", "'\\''") + "'\n")
    if total_frames != frames_total:
        raise ValueError("BOUNDED_LINEAR_FRAME_COUNT_MISMATCH")
    _encode_linear_segments(listing, audio_path, has_output_audio, frames_total, context, output, report)
    return {"plan_id": plan["plan_id"], "semantic_graph_hash": plan["semantic_graph_hash"], "frames": total_frames, "samples": total_frames * 1600 if has_output_audio else 0, "source_order": original_compilation["source_order"]}


def _encode_linear_segments(listing: Path, audio_path: Path, has_output_audio: bool, frames_total: int, context: HandlerContext, output: Path, report) -> None:
    """Encode continuous verified segment media once and check final clocks."""
    workspace = context.workspace
    def final_progress(line: str) -> None:
        if line.startswith("frame=") and line[6:].strip().isdigit():
            report(4 * frames_total + min(frames_total, int(line[6:].strip())))
    # Encode the complete video and complete audio separately.  Encoding raw
    # high-resolution video and PCM in a single FFmpeg process can buffer
    # enough concurrent media to exhaust 768 MiB, even with one thread and
    # bounded x264 lookahead.  Each stream is encoded exactly once; the final
    # operation only remuxes bytes and retains their global timestamp grids.
    video_encoded = workspace / "linear-video-final.mp4"
    audio_encoded = workspace / "linear-audio-final.m4a"
    run_ffmpeg(["-n", "-filter_threads", "1", "-filter_complex_threads", "1", "-f", "concat", "-safe", "0", "-threads", "1", "-i", str(listing), "-map", "0:v:0", "-an", "-vf", "settb=1/30,setpts=N", "-enc_time_base:v", "1/30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-threads", "1", "-bf", "0", "-x264-params", "rc-lookahead=4:sync-lookahead=0", "-r", "30", "-fps_mode", "cfr", "-video_track_timescale", "48000", "-movie_timescale", "48000", "-progress", "pipe:1", "-nostats", str(video_encoded)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=final_progress, capture_limit=16384, progress_inactivity=True)
    def audio_encode_progress(line: str) -> None:
        if line.startswith("out_time_us=") and line[12:].strip().isdigit():
            report(5 * frames_total + min(frames_total, int(line[12:].strip()) * 30 / 1_000_000))
    if has_output_audio:
        run_ffmpeg(["-n", "-f", "f32le", "-ar", "48000", "-ac", "2", "-i", str(audio_path), "-vn", "-c:a", "aac", "-ar", "48000", "-movie_timescale", "48000", "-progress", "pipe:1", "-nostats", str(audio_encoded)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=audio_encode_progress, capture_limit=16384, progress_inactivity=True)
    else:
        report(6 * frames_total)
    # Both encoded streams remain on disk while muxing; require room for the
    # copy plus a reserve rather than risking a partial output at capacity.
    if shutil.disk_usage(workspace).free < video_encoded.stat().st_size + (audio_encoded.stat().st_size if has_output_audio else 0) + 256 * 1024 * 1024:
        raise ValueError("BOUNDED_LINEAR_DISK_SPACE_INSUFFICIENT")
    def mux_progress(line: str) -> None:
        if line.startswith("out_time_us=") and line[12:].strip().isdigit():
            report(6 * frames_total + min(frames_total, int(line[12:].strip()) * 30 / 1_000_000))
    mux_inputs = ["-i", str(video_encoded), "-i", str(audio_encoded), "-map", "0:v:0", "-map", "1:a:0"] if has_output_audio else ["-i", str(video_encoded), "-map", "0:v:0"]
    run_ffmpeg(["-n", *mux_inputs, "-c", "copy", "-video_track_timescale", "48000", "-movie_timescale", "48000", "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", str(output)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=mux_progress, capture_limit=16384, progress_inactivity=True)
    final_count = _count_video_frames(output, context, lambda frame: report(7 * frames_total + min(frames_total, frame)))
    probe = run_ffprobe(["-v", "error", "-show_entries", "stream=codec_type,start_pts,duration_ts,time_base,sample_rate,channels", "-of", "json", str(output)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    streams = json.loads(probe.stdout)["streams"]
    video_streams = [stream for stream in streams if stream.get("codec_type") == "video"]
    audio_streams = [stream for stream in streams if stream.get("codec_type") == "audio"]
    if len(video_streams) != 1 or final_count != frames_total:
        raise ValueError(f"BOUNDED_LINEAR_OUTPUT_FRAME_COUNT_MISMATCH:{video_streams}")
    if video_streams[0].get("start_pts") != 0 or Fraction(video_streams[0]["time_base"]) * int(video_streams[0]["duration_ts"]) * 30 != frames_total:
        raise ValueError(f"BOUNDED_LINEAR_OUTPUT_VIDEO_TIMESTAMP_MISMATCH:{video_streams}")
    if has_output_audio and (len(audio_streams) != 1 or audio_streams[0].get("start_pts") != 0 or audio_streams[0].get("sample_rate") != "48000" or audio_streams[0].get("channels") != 2 or Fraction(audio_streams[0]["time_base"]) * int(audio_streams[0]["duration_ts"]) * 48000 != frames_total * 1600):
        raise ValueError(f"BOUNDED_LINEAR_OUTPUT_SAMPLE_COUNT_MISMATCH:{audio_streams}")
    if not has_output_audio and audio_streams:
        raise ValueError(f"BOUNDED_LINEAR_UNEXPECTED_AUDIO:{audio_streams}")
