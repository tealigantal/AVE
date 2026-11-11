"""Render one authorized lossless segment without touching project state."""
from __future__ import annotations

from builtins import BaseExceptionGroup
import hashlib
import json
import os
import re
import shutil
import stat
import tempfile
from pathlib import Path

from .context import HandlerContext
from ..adapters.ffmpeg import CommandCancelled, run_ffmpeg, run_ffprobe
from ..adapters.filesystem import output_directory
from ..render.bounded_linear import _clip_graph, _count_video_frames, _linear_audio_filter, _linear_sources, _single_thread_inputs
from ..render.execution_plan import canonical_json, validate_execution_request
from ..render.graph_compiler import compile_render_graph, integer


def _digest(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def _hash_file(path: Path, cancelled, progress=None) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        length = os.fstat(handle.fileno()).st_size
        copied = 0
        while chunk := handle.read(1024 * 1024):
            if cancelled():
                raise CommandCancelled("segment hashing cancelled")
            digest.update(chunk)
            copied += len(chunk)
            if progress and length:
                progress(min(1.0, copied / length))
    if cancelled():
        raise CommandCancelled("segment hashing cancelled")
    return digest.hexdigest()


def _regular_identity(path: Path) -> tuple[int, int, int, int, int]:
    value = path.lstat()
    if not stat.S_ISREG(value.st_mode) or stat.S_ISLNK(value.st_mode):
        raise ValueError("RENDER_SEGMENT_SOURCE_INVALID")
    return value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns


def _validate_segment(payload: dict) -> tuple[dict, dict, dict, int, int]:
    if set(payload) != {"task_type", "graph", "execution_plan", "segment_plan", "output_dir"} or payload.get("task_type") != "render.segment.v1":
        raise ValueError("RENDER_SEGMENT_REQUEST_INVALID")
    execution = validate_execution_request(payload)
    graph = payload["graph"]
    plan = payload.get("segment_plan")
    required = {"schema_version", "segment_id", "project_id", "execution_plan_id", "execution_cache_key", "semantic_graph_hash", "graph_hash", "target", "execution_policy", "worker_version", "ffmpeg_sha256", "source", "segment_index", "clip_id", "clip_frame_offset", "frame_start", "frame_end", "sample_start", "sample_end", "has_audio", "dependency_ids"}
    if not isinstance(plan, dict) or set(plan) != required:
        raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    identity = {key: value for key, value in plan.items() if key != "segment_id"}
    def sha(value: object) -> bool:
        return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value) is not None
    source = plan.get("source")
    if type(plan.get("schema_version")) is not int or plan["schema_version"] != 1 or plan.get("target") not in {"preview", "master"} or plan.get("segment_id") != f"segment-{plan['target']}-{_digest(identity)[:24]}" or not isinstance(plan.get("project_id"), str) or not plan["project_id"] or not isinstance(plan.get("clip_id"), str) or not plan["clip_id"] or not all(sha(plan.get(key)) for key in ("execution_cache_key", "semantic_graph_hash", "graph_hash", "ffmpeg_sha256")) or plan.get("execution_policy") != "bounded-linear-v1" or plan.get("worker_version") != "ave-worker-host-r18" or plan.get("dependency_ids") != []:
        raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    if not isinstance(source, dict) or set(source) != {"asset_ref", "source_kind", "selected_hash", "original_hash", "authorization_hash"} or not isinstance(source.get("asset_ref"), str) or not all(sha(source.get(key)) for key in ("selected_hash", "original_hash", "authorization_hash")) or source.get("source_kind") not in {"original", "proxy"} or source["asset_ref"] != f"asset:sha256:{source['original_hash']}" or source["source_kind"] == "original" and source["selected_hash"] != source["original_hash"] or plan["target"] == "master" and source["source_kind"] != "original":
        raise ValueError("RENDER_SEGMENT_SOURCE_INVALID")
    for key in ("segment_index", "clip_frame_offset", "frame_start", "frame_end", "sample_start", "sample_end"):
        if type(plan.get(key)) is not int or not 0 <= plan[key] <= 9007199254740991:
            raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    if type(plan.get("has_audio")) is not bool or execution.get("execution_policy", {}).get("mode") != "bounded-linear-v1" or plan["execution_plan_id"] != execution["plan_id"] or plan["execution_cache_key"] != execution["cache_key"] or plan["semantic_graph_hash"] != execution["semantic_graph_hash"] or plan["target"] != graph.get("target") or plan["graph_hash"] != _digest(graph):
        raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    sources = _linear_sources(graph)
    matches = [node for node in sources if node.get("parameters", {}).get("clip_id") == plan["clip_id"]]
    if len(matches) != 1:
        raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    node = matches[0]
    parameters = node["parameters"]
    offset = plan["clip_frame_offset"]
    count = plan["frame_end"] - plan["frame_start"]
    start = integer(parameters["timeline_start"]) + offset
    if count < 1 or count > 300 or offset + count > integer(parameters["timeline_duration"]) or plan["segment_index"] != plan["frame_start"] or parameters.get("asset_ref") != source["asset_ref"] or parameters.get("source_kind") != source["source_kind"] or parameters.get("has_audio", True) is not plan["has_audio"] or start != plan["frame_start"] or start + count != plan["frame_end"] or start * 1600 != plan["sample_start"] or (start + count) * 1600 != plan["sample_end"]:
        raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    return plan, execution, node, offset, count


def _copy_output(source: Path, destination: Path, expected_hash: str, cancelled, progress=None) -> bool:
    """Install verified bytes exclusively, preserving existing cache files."""
    fd, name = tempfile.mkstemp(prefix=".segment-", suffix=".partial", dir=destination.parent)
    temporary = Path(name)
    failure: BaseException | None = None
    fd_open = True
    try:
        digest = hashlib.sha256()
        output = os.fdopen(fd, "wb")
        fd_open = False
        with output, source.open("rb") as input_file:
            length = os.fstat(input_file.fileno()).st_size
            copied = 0
            while chunk := input_file.read(1024 * 1024):
                if cancelled():
                    raise CommandCancelled("segment output copy cancelled")
                digest.update(chunk)
                output.write(chunk)
                copied += len(chunk)
                if progress and length:
                    progress(0.5 * min(1.0, copied / length))
            output.flush()
            os.fsync(output.fileno())
        if digest.hexdigest() != expected_hash:
            raise ValueError("RENDER_SEGMENT_OUTPUT_HASH_MISMATCH")
        if cancelled():
            raise CommandCancelled("segment output copy cancelled")
        try:
            os.link(temporary, destination, follow_symlinks=False)
            if progress:
                progress(1.0)
            return True
        except FileExistsError:
            identity = _regular_identity(destination)
            verify_progress = (lambda fraction: progress(0.5 + 0.5 * fraction)) if progress else None
            if _hash_file(destination, cancelled, verify_progress) != expected_hash or _regular_identity(destination) != identity:
                raise ValueError("RENDER_SEGMENT_OUTPUT_COLLISION")
            return False
    except BaseException as error:
        failure = error
        raise
    finally:
        cleanup_errors: list[BaseException] = []
        if fd_open:
            try:
                os.close(fd)
            except OSError as cleanup:
                cleanup_errors.append(cleanup)
        try:
            temporary.unlink(missing_ok=True)
        except OSError as cleanup:
            cleanup_errors.append(cleanup)
        if cleanup_errors:
            raise BaseExceptionGroup("segment output copy and cleanup failed", [*([failure] if failure else []), *cleanup_errors]) from failure


def handle(payload: dict, context: HandlerContext) -> dict:
    plan, execution, node, offset, frames = _validate_segment(payload)
    last_progress = 0.0
    def report(value: float) -> None:
        nonlocal last_progress
        value = min(0.99, max(0.0, value))
        if value > last_progress:
            last_progress = value
            context.progress(value)
    source = Path(node["parameters"]["source_ref"])
    source_identity = _regular_identity(source)
    if _hash_file(source, context.cancelled.is_set, lambda fraction: report(0.04 * fraction)) != plan["source"]["selected_hash"] or _regular_identity(source) != source_identity:
        raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise ValueError("RENDER_SEGMENT_FFMPEG_MISSING")
    executable = Path(ffmpeg_path).resolve()
    executable_identity = _regular_identity(executable)
    if _hash_file(executable, context.cancelled.is_set, lambda fraction: report(0.04 + 0.01 * fraction)) != plan["ffmpeg_sha256"] or _regular_identity(executable) != executable_identity:
        raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
    if context.cancelled.is_set():
        raise CommandCancelled("segment cancelled")
    graph = payload["graph"]
    clip_frames = integer(node["parameters"]["timeline_duration"])
    width, height = graph["profile"]["width"], graph["profile"]["height"]
    target = output_directory(payload["output_dir"])
    reserve = 256 * 1024 * 1024
    video_estimate = width * height * 3 * frames // 2 + frames * 65536 + 1024 * 1024
    segment_audio = frames * 1600 * 8 if plan["has_audio"] else 0
    workspace_required = video_estimate + segment_audio + (clip_frames * 1600 * 8 if plan["has_audio"] else 0) + reserve
    target_required = video_estimate + segment_audio + reserve
    same_device = context.workspace.stat().st_dev == target.stat().st_dev
    if shutil.disk_usage(context.workspace).free < workspace_required + (target_required if same_device else 0) or not same_device and shutil.disk_usage(target).free < target_required:
        raise ValueError("RENDER_SEGMENT_DISK_SPACE_INSUFFICIENT")
    compiled = compile_render_graph(_clip_graph(graph, node["node_id"], audio=False))
    if compiled["expected_frame_count"] != clip_frames or compiled["audio_label"]:
        raise ValueError("RENDER_SEGMENT_GRAPH_INVALID")
    video = context.workspace / "segment-video.nut"
    filters = compiled["filter_complex"] + f";[{compiled['video_label']}]trim=start_frame={offset}:end_frame={offset + frames},setpts=PTS-STARTPTS[segment-video]"
    def progress(line: str) -> None:
        if line.startswith("frame=") and line[6:].strip().isdigit():
            report(0.05 + 0.35 * min(1.0, int(line[6:].strip()) / frames))
    run_ffmpeg(["-n", "-filter_threads", "1", "-filter_complex_threads", "1", *_single_thread_inputs(compiled["inputs"]), "-filter_complex", filters, "-map", "[segment-video]", "-an", "-frames:v", str(frames), "-c:v", "rawvideo", "-pix_fmt", "yuv420p", "-threads", "1", "-f", "nut", "-fps_mode", "passthrough", "-progress", "pipe:1", "-nostats", str(video)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=progress, capture_limit=16384, progress_inactivity=True)
    if _count_video_frames(video, context, lambda frame: report(0.40 + 0.07 * min(1.0, frame / frames))) != frames:
        raise ValueError("RENDER_SEGMENT_FRAME_COUNT_MISMATCH")
    probe = run_ffprobe(["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,pix_fmt", "-of", "json", str(video)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=65536)
    streams = json.loads(probe.stdout).get("streams")
    if not isinstance(streams, list) or len(streams) != 1 or streams[0].get("codec_type") != "video" or streams[0].get("codec_name") != "rawvideo" or streams[0].get("pix_fmt") != "yuv420p" or streams[0].get("width") != width or streams[0].get("height") != height:
        raise ValueError("RENDER_SEGMENT_VIDEO_METADATA_INVALID")
    report(0.47)
    audio: Path | None = None
    if plan["has_audio"]:
        compiled_audio = compile_render_graph(_clip_graph(graph, node["node_id"], audio=True), pad_output_audio=False)
        full_audio = context.workspace / "clip-audio.f32le"
        def audio_progress(line: str) -> None:
            if line.startswith("out_time_us=") and line[12:].strip().isdigit():
                report(0.47 + 0.18 * min(1.0, int(line[12:].strip()) * 30 / (clip_frames * 1_000_000)))
        run_ffmpeg(["-n", "-filter_threads", "1", "-filter_complex_threads", "1", *_single_thread_inputs(compiled_audio["inputs"]), "-filter_complex", _linear_audio_filter(compiled_audio, clip_frames * 1600), "-map", "[linear-audio]", "-vn", "-c:a", "pcm_f32le", "-ar", "48000", "-ac", "2", "-progress", "pipe:1", "-nostats", "-f", "f32le", str(full_audio)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, stdout_line=audio_progress, capture_limit=16384, progress_inactivity=True)
        if full_audio.stat().st_size != clip_frames * 1600 * 8:
            raise ValueError("RENDER_SEGMENT_SAMPLE_COUNT_MISMATCH")
        audio = context.workspace / "segment-audio.f32le"
        remaining = frames * 1600 * 8
        with full_audio.open("rb") as input_file, audio.open("xb") as output:
            input_file.seek(offset * 1600 * 8)
            while remaining:
                if context.cancelled.is_set():
                    raise CommandCancelled("segment audio copy cancelled")
                chunk = input_file.read(min(1024 * 1024, remaining))
                if not chunk:
                    raise ValueError("RENDER_SEGMENT_SAMPLE_COUNT_MISMATCH")
                output.write(chunk)
                remaining -= len(chunk)
                report(0.65 + 0.05 * (1 - remaining / (frames * 1600 * 8)))
    report(0.70)
    if context.cancelled.is_set():
        raise CommandCancelled("segment cancelled")
    if _regular_identity(source) != source_identity or _hash_file(source, context.cancelled.is_set, lambda fraction: report(0.70 + 0.05 * fraction)) != plan["source"]["selected_hash"] or _regular_identity(source) != source_identity:
        raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
    if _regular_identity(executable) != executable_identity or _hash_file(executable, context.cancelled.is_set, lambda fraction: report(0.75 + 0.01 * fraction)) != plan["ffmpeg_sha256"] or _regular_identity(executable) != executable_identity:
        raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
    video_hash = _hash_file(video, context.cancelled.is_set, lambda fraction: report(0.76 + 0.07 * fraction))
    audio_hash = _hash_file(audio, context.cancelled.is_set, lambda fraction: report(0.83 + 0.02 * fraction)) if audio else None
    report(0.85)
    if shutil.disk_usage(target).free < video.stat().st_size + (audio.stat().st_size if audio else 0) + reserve:
        raise ValueError("RENDER_SEGMENT_DISK_SPACE_INSUFFICIENT")
    result = {"schema_version": 1, "segment_id": plan["segment_id"], "execution_plan_id": execution["plan_id"], "status": "complete", "frame_count": frames, "sample_count": frames * 1600 if audio else 0, "video": {"hash": video_hash, "byte_length": video.stat().st_size}, "audio": {"hash": audio_hash, "byte_length": audio.stat().st_size} if audio else None, "worker_version": plan["worker_version"], "ffmpeg_sha256": plan["ffmpeg_sha256"], "diagnostics": []}
    published: list[tuple[Path, tuple[int, int, int, int, int]]] = []
    try:
        outputs = []
        for kind, path, checksum, extension in (("video", video, video_hash, "nut"), ("audio", audio, audio_hash, "f32le")):
            if path is None or checksum is None:
                continue
            destination = target / f"{plan['segment_id']}-{kind}-{checksum}.{extension}"
            lower, span = (0.85, 0.07) if kind == "video" else (0.92, 0.02)
            installed = _copy_output(path, destination, checksum, context.cancelled.is_set, lambda fraction: report(lower + span * fraction))
            if installed:
                published.append((destination, _regular_identity(destination)))
            outputs.append({"kind": f"render_segment_{kind}", "path": str(destination), "hash": checksum, "byte_length": path.stat().st_size})
        if context.cancelled.is_set():
            raise CommandCancelled("segment cancelled before return")
        report(0.94)
        if _regular_identity(source) != source_identity or _hash_file(source, context.cancelled.is_set, lambda fraction: report(0.94 + 0.03 * fraction)) != plan["source"]["selected_hash"] or _regular_identity(source) != source_identity:
            raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
        if _regular_identity(executable) != executable_identity or _hash_file(executable, context.cancelled.is_set, lambda fraction: report(0.97 + 0.02 * fraction)) != plan["ffmpeg_sha256"] or _regular_identity(executable) != executable_identity:
            raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
        context.progress(1.0)
        return {"outputs": outputs, "metrics": {"segment_result": result}}
    except BaseException as cause:
        cleanup: list[BaseException] = []
        for path, identity in published:
            try:
                if _regular_identity(path) == identity:
                    path.unlink()
            except FileNotFoundError:
                pass
            except OSError as error:
                cleanup.append(error)
        if cleanup:
            raise BaseExceptionGroup("segment publication and cleanup failed", [cause, *cleanup]) from cause
        raise
