"""Assemble verified intermediate segments without granting publication authority."""
from __future__ import annotations

from builtins import BaseExceptionGroup
import hashlib
import json
import os
import re
import shutil
import stat
from itertools import zip_longest
from pathlib import Path

from .context import HandlerContext
from .render_segment import _copy_output, _hash_file, _regular_identity, _validate_segment
from .render_timeline import WORKER_VERSION, _render_source_kind
from ..adapters.ffmpeg import CommandCancelled, run_ffmpeg, run_ffprobe
from ..adapters.filesystem import output_directory
from ..render.bounded_linear import _count_video_frames, _encode_linear_segments, _linear_sources
from ..render.execution_plan import canonical_json, validate_execution_request
from ..render.graph_compiler import integer


_LINE_LIMIT = 131072
_SHA = re.compile(r"^[0-9a-f]{64}$")


def _decode_row(raw: bytes) -> dict:
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                raise ValueError("RENDER_SEGMENT_MANIFEST_INVALID")
            value[key] = item
        return value
    try:
        row = json.loads(raw, object_pairs_hook=pairs, parse_constant=lambda _value: (_ for _ in ()).throw(ValueError("RENDER_SEGMENT_MANIFEST_INVALID")))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("RENDER_SEGMENT_MANIFEST_INVALID") from error
    if not isinstance(row, dict) or set(row) != {"schema_version", "plan", "result", "video_path", "audio_path"} or type(row.get("schema_version")) is not int or row["schema_version"] != 1 or raw != (canonical_json(row) + "\n").encode("utf-8"):
        raise ValueError("RENDER_SEGMENT_MANIFEST_INVALID")
    return row


def _rows(path: Path, identity: tuple[int, int, int, int, int], length: int, expected_hash: str, expected_count: int, context: HandlerContext):
    digest = hashlib.sha256()
    total = 0
    count = 0
    if _regular_identity(path) != identity or identity[2] != length:
        raise ValueError("RENDER_SEGMENT_MANIFEST_CHANGED")
    with path.open("rb") as handle:
        opened = os.fstat(handle.fileno())
        if (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns, opened.st_ctime_ns) != identity:
            raise ValueError("RENDER_SEGMENT_MANIFEST_CHANGED")
        while True:
            if context.cancelled.is_set():
                raise CommandCancelled("segment manifest cancelled")
            raw = handle.readline(_LINE_LIMIT + 1)
            if not raw:
                break
            if len(raw) > _LINE_LIMIT or not raw.endswith(b"\n"):
                raise ValueError("RENDER_SEGMENT_MANIFEST_INVALID")
            digest.update(raw)
            total += len(raw)
            count += 1
            if total > length or count > expected_count:
                raise ValueError("RENDER_SEGMENT_MANIFEST_INVALID")
            yield _decode_row(raw)
    if total != length or count != expected_count or digest.hexdigest() != expected_hash or _regular_identity(path) != identity:
        raise ValueError("RENDER_SEGMENT_MANIFEST_CHANGED")


def _object_file(root: Path, value: object, descriptor: object) -> tuple[Path, tuple[int, int, int, int, int]]:
    if not isinstance(value, str) or not value or any(character in value for character in "\x00\r\n") or not isinstance(descriptor, dict) or set(descriptor) != {"hash", "byte_length"} or not isinstance(descriptor.get("hash"), str) or not _SHA.fullmatch(descriptor["hash"]) or type(descriptor.get("byte_length")) is not int or not 0 < descriptor["byte_length"] <= 9007199254740991:
        raise ValueError("RENDER_SEGMENT_OBJECT_INVALID")
    expected = root / descriptor["hash"][:2] / descriptor["hash"]
    if os.path.normcase(os.path.abspath(value)) != os.path.normcase(os.path.abspath(expected)):
        raise ValueError("RENDER_SEGMENT_OBJECT_INVALID")
    shard = expected.parent.lstat()
    if not stat.S_ISDIR(shard.st_mode) or stat.S_ISLNK(shard.st_mode):
        raise ValueError("RENDER_SEGMENT_OBJECT_INVALID")
    identity = _regular_identity(expected)
    if identity[2] != descriptor["byte_length"]:
        raise ValueError("RENDER_SEGMENT_OBJECT_INVALID")
    return expected, identity


def _checked_row(payload: dict, row: dict, root: Path, cursor: int) -> tuple[dict, dict, dict, int, Path, tuple[int, int, int, int, int], Path | None, tuple[int, int, int, int, int] | None]:
    probe = {"task_type": "render.segment.v1", "graph": payload["graph"], "execution_plan": payload["execution_plan"], "segment_plan": row.get("plan"), "output_dir": payload["output_dir"]}
    plan, execution, node, _offset, frames = _validate_segment(probe)
    result = row.get("result")
    required = {"schema_version", "segment_id", "execution_plan_id", "status", "frame_count", "sample_count", "video", "audio", "worker_version", "ffmpeg_sha256", "diagnostics"}
    if not isinstance(result, dict) or set(result) != required or type(result.get("schema_version")) is not int or result["schema_version"] != 1 or result.get("status") != "complete" or result.get("segment_id") != plan["segment_id"] or result.get("execution_plan_id") != execution["plan_id"] or result.get("worker_version") != WORKER_VERSION or result.get("ffmpeg_sha256") != payload["ffmpeg_sha256"] or result.get("diagnostics") != [] or type(result.get("frame_count")) is not int or result["frame_count"] != frames or type(result.get("sample_count")) is not int or result["sample_count"] != (frames * 1600 if plan["has_audio"] else 0) or plan["project_id"] != payload["project_id"] or plan["ffmpeg_sha256"] != payload["ffmpeg_sha256"] or plan["frame_start"] != cursor:
        raise ValueError("RENDER_SEGMENT_COVERAGE_INVALID")
    video, video_identity = _object_file(root, row.get("video_path"), result.get("video"))
    if plan["has_audio"]:
        audio, audio_identity = _object_file(root, row.get("audio_path"), result.get("audio"))
        if audio_identity[2] != frames * 1600 * 8:
            raise ValueError("RENDER_SEGMENT_SAMPLE_COUNT_MISMATCH")
    else:
        if result.get("audio") is not None or row.get("audio_path") is not None:
            raise ValueError("RENDER_SEGMENT_AUDIO_INVALID")
        audio, audio_identity = None, None
    return plan, result, node, frames, video, video_identity, audio, audio_identity


def handle(payload: dict, context: HandlerContext) -> dict:
    required = {"task_type", "project_id", "graph", "execution_plan", "manifest_path", "manifest_sha256", "manifest_byte_length", "segment_count", "object_store_root", "ffmpeg_sha256", "output_dir"}
    if set(payload) != required or payload.get("task_type") != "render.segment.assemble.v1" or not isinstance(payload.get("project_id"), str) or not payload["project_id"] or not all(isinstance(payload.get(key), str) and payload[key] for key in ("manifest_path", "object_store_root", "output_dir")) or not all(isinstance(payload.get(key), str) and _SHA.fullmatch(payload[key]) for key in ("manifest_sha256", "ffmpeg_sha256")) or any(type(payload.get(key)) is not int or not 0 < payload[key] <= 9007199254740991 for key in ("manifest_byte_length", "segment_count")) or payload["manifest_byte_length"] > payload["segment_count"] * _LINE_LIMIT:
        raise ValueError("RENDER_SEGMENT_ASSEMBLY_REQUEST_INVALID")
    execution = validate_execution_request(payload)
    if execution["execution_policy"]["mode"] != "bounded-linear-v1":
        raise ValueError("RENDER_SEGMENT_PLAN_INVALID")
    graph = payload["graph"]
    sources = _linear_sources(graph)
    frames_total = sum(integer(node["parameters"]["timeline_duration"]) for node in sources)
    has_audio = any(node["parameters"].get("has_audio", True) for node in sources)
    root = Path(payload["object_store_root"])
    root_info = root.lstat()
    if not root.is_absolute() or not stat.S_ISDIR(root_info.st_mode) or stat.S_ISLNK(root_info.st_mode):
        raise ValueError("RENDER_SEGMENT_OBJECT_INVALID")
    manifest = Path(payload["manifest_path"])
    if not manifest.is_absolute():
        raise ValueError("RENDER_SEGMENT_MANIFEST_INVALID")
    manifest_identity = _regular_identity(manifest)
    if manifest_identity[2] != payload["manifest_byte_length"]:
        raise ValueError("RENDER_SEGMENT_MANIFEST_CHANGED")
    executable_name = shutil.which("ffmpeg")
    if not executable_name:
        raise ValueError("RENDER_SEGMENT_FFMPEG_MISSING")
    executable = Path(executable_name).resolve()
    executable_identity = _regular_identity(executable)
    if _hash_file(executable, context.cancelled.is_set) != payload["ffmpeg_sha256"] or _regular_identity(executable) != executable_identity:
        raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
    version = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=16384)
    version_lines = (version.stdout or version.stderr).splitlines()
    if not version_lines or not version_lines[0].startswith("ffmpeg version ") or len(version_lines[0]) > 1024:
        raise ValueError("RENDER_EXECUTOR_VERSION_INVALID")
    target = output_directory(payload["output_dir"])
    width, height = graph["profile"]["width"], graph["profile"]["height"]
    raw_estimate = width * height * 3 * frames_total // 2 + frames_total * 65536 + 1024 * 1024
    audio_estimate = frames_total * 1600 * 8 if has_audio else 0
    reserve = 256 * 1024 * 1024
    workspace_required = 2 * raw_estimate + 3 * audio_estimate + reserve
    target_required = raw_estimate + audio_estimate + reserve
    same_device = context.workspace.stat().st_dev == target.stat().st_dev
    if shutil.disk_usage(context.workspace).free < workspace_required + (target_required if same_device else 0) or not same_device and shutil.disk_usage(target).free < target_required:
        raise ValueError("RENDER_SEGMENT_DISK_SPACE_INSUFFICIENT")
    last_progress = 0.0
    def report(value: float) -> None:
        nonlocal last_progress
        value = min(0.99, max(0.0, value))
        if value > last_progress:
            last_progress = value
            context.progress(value)
    listing = context.workspace / "linear-concat.ffconcat"
    audio_path = context.workspace / "linear-audio.f32le"
    snapshots = context.workspace / "segment-snapshots.jsonl"
    source_identities: dict[str, tuple] = {}
    cursor = 0
    row_args = (manifest, manifest_identity, payload["manifest_byte_length"], payload["manifest_sha256"], payload["segment_count"], context)
    with listing.open("x", encoding="utf-8", newline="\n") as concat, audio_path.open("xb") as mixed, snapshots.open("x", encoding="utf-8", newline="\n") as saved:
        concat.write("ffconcat version 1.0\n")
        for row in _rows(*row_args):
            plan, result, node, frames, video, video_identity, audio, audio_identity = _checked_row(payload, row, root, cursor)
            base, weight = cursor / frames_total, frames / frames_total
            def stage_progress(stage: float) -> None:
                report(0.02 + 0.50 * (base + weight * stage))
            source_path = Path(node["parameters"]["source_ref"])
            source_identity = _regular_identity(source_path)
            token = (str(source_path), source_identity, plan["source"]["selected_hash"], plan["source"]["original_hash"], plan["source"]["authorization_hash"], plan["source"]["source_kind"])
            prior = source_identities.get(plan["source"]["asset_ref"])
            if prior is None:
                if _hash_file(source_path, context.cancelled.is_set, lambda part: stage_progress(0.20 * part)) != plan["source"]["selected_hash"] or _regular_identity(source_path) != source_identity:
                    raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
                source_identities[plan["source"]["asset_ref"]] = token
            elif prior != token:
                raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
            stage_progress(0.20)
            if _hash_file(video, context.cancelled.is_set, lambda part: stage_progress(0.20 + 0.35 * part)) != result["video"]["hash"] or _regular_identity(video) != video_identity:
                raise ValueError("RENDER_SEGMENT_CACHE_CORRUPT")
            if _count_video_frames(video, context, lambda count: stage_progress(0.55 + 0.25 * min(1.0, count / frames))) != frames:
                raise ValueError("RENDER_SEGMENT_FRAME_COUNT_MISMATCH")
            probe = run_ffprobe(["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,pix_fmt", "-of", "json", str(video)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=65536)
            streams = json.loads(probe.stdout).get("streams")
            if not isinstance(streams, list) or len(streams) != 1 or streams[0].get("codec_type") != "video" or streams[0].get("codec_name") != "rawvideo" or streams[0].get("pix_fmt") != "yuv420p" or streams[0].get("width") != width or streams[0].get("height") != height:
                raise ValueError("RENDER_SEGMENT_VIDEO_METADATA_INVALID")
            if audio is not None:
                if audio_identity is None:
                    raise ValueError("RENDER_SEGMENT_AUDIO_INVALID")
                checksum, copied = hashlib.sha256(), 0
                with audio.open("rb") as stream:
                    while chunk := stream.read(1024 * 1024):
                        if context.cancelled.is_set():
                            raise CommandCancelled("segment audio assembly cancelled")
                        checksum.update(chunk)
                        mixed.write(chunk)
                        copied += len(chunk)
                        stage_progress(0.80 + 0.20 * min(1.0, copied / audio_identity[2]))
                if copied != audio_identity[2] or checksum.hexdigest() != result["audio"]["hash"] or _regular_identity(audio) != audio_identity:
                    raise ValueError("RENDER_SEGMENT_CACHE_CORRUPT")
            elif has_audio:
                remaining = frames * 1600 * 8
                zero = bytes(1024 * 1024)
                while remaining:
                    if context.cancelled.is_set():
                        raise CommandCancelled("segment audio assembly cancelled")
                    size = min(remaining, len(zero))
                    mixed.write(zero[:size])
                    remaining -= size
                    stage_progress(0.80 + 0.20 * (1 - remaining / (frames * 1600 * 8)))
            name = str(video)
            if any(character in name for character in "\x00\r\n"):
                raise ValueError("RENDER_SEGMENT_OBJECT_INVALID")
            concat.write("file '" + name.replace("'", "'\\''") + "'\n")
            saved.write(canonical_json({"segment_id": plan["segment_id"], "video_identity": list(video_identity), "audio_identity": list(audio_identity) if audio_identity else None}) + "\n")
            cursor = plan["frame_end"]
            stage_progress(1.0)
    if cursor != frames_total or has_audio and audio_path.stat().st_size != frames_total * 1600 * 8:
        raise ValueError("RENDER_SEGMENT_COVERAGE_INVALID")
    assembled = context.workspace / "assembled.mp4"
    def encode_progress(units: float) -> None:
        report(0.52 + 0.32 * max(0.0, min(1.0, (units / frames_total - 4) / 4)))
    _encode_linear_segments(listing, audio_path, has_audio, frames_total, context, assembled, encode_progress)
    # Re-read the signed manifest and every segment after FFmpeg consumed them;
    # no cached segment is modified or deleted by this handler.
    cursor = 0
    with snapshots.open("r", encoding="utf-8") as saved:
        for row, line in zip_longest(_rows(*row_args), saved):
            if row is None or line is None:
                raise ValueError("RENDER_SEGMENT_MANIFEST_CHANGED")
            plan, result, _node, frames, video, video_identity, audio, audio_identity = _checked_row(payload, row, root, cursor)
            snapshot = json.loads(line)
            if snapshot != {"segment_id": plan["segment_id"], "video_identity": list(video_identity), "audio_identity": list(audio_identity) if audio_identity else None}:
                raise ValueError("RENDER_SEGMENT_CACHE_CORRUPT")
            base, weight = cursor / frames_total, frames / frames_total
            if _hash_file(video, context.cancelled.is_set, lambda part: report(0.84 + 0.08 * (base + weight * 0.5 * part))) != result["video"]["hash"] or _regular_identity(video) != video_identity:
                raise ValueError("RENDER_SEGMENT_CACHE_CORRUPT")
            if audio is not None and (_hash_file(audio, context.cancelled.is_set, lambda part: report(0.84 + 0.08 * (base + weight * (0.5 + 0.5 * part)))) != result["audio"]["hash"] or _regular_identity(audio) != audio_identity):
                raise ValueError("RENDER_SEGMENT_CACHE_CORRUPT")
            cursor = plan["frame_end"]
            report(0.84 + 0.08 * cursor / frames_total)
    if cursor != frames_total:
        raise ValueError("RENDER_SEGMENT_COVERAGE_INVALID")
    source_count = len(source_identities)
    for source_index, (path_string, identity, selected_hash, _original, _authorization, _kind) in enumerate(source_identities.values()):
        path = Path(path_string)
        if _regular_identity(path) != identity or _hash_file(path, context.cancelled.is_set, lambda part: report(0.92 + 0.02 * (source_index + part) / source_count)) != selected_hash or _regular_identity(path) != identity:
            raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
    if _regular_identity(executable) != executable_identity or _hash_file(executable, context.cancelled.is_set, lambda part: report(0.94 + 0.01 * part)) != payload["ffmpeg_sha256"] or _regular_identity(executable) != executable_identity:
        raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
    output_hash = _hash_file(assembled, context.cancelled.is_set, lambda part: report(0.95 + 0.02 * part))
    if shutil.disk_usage(target).free < assembled.stat().st_size + reserve:
        raise ValueError("RENDER_SEGMENT_DISK_SPACE_INSUFFICIENT")
    destination = target / f"{execution['plan_id']}-{graph['target']}-{execution['cache_key'][:16]}-{output_hash}.mp4"
    installed = False
    published_identity = None
    try:
        installed = _copy_output(assembled, destination, output_hash, context.cancelled.is_set, lambda part: report(0.97 + 0.015 * part))
        if installed:
            published_identity = _regular_identity(destination)
        cursor = 0
        with snapshots.open("r", encoding="utf-8") as saved:
            for row, line in zip_longest(_rows(*row_args), saved):
                if row is None or line is None:
                    raise ValueError("RENDER_SEGMENT_MANIFEST_CHANGED")
                plan, _result, _node, _frames, _video, video_identity, _audio, audio_identity = _checked_row(payload, row, root, cursor)
                if json.loads(line) != {"segment_id": plan["segment_id"], "video_identity": list(video_identity), "audio_identity": list(audio_identity) if audio_identity else None}:
                    raise ValueError("RENDER_SEGMENT_CACHE_CORRUPT")
                cursor = plan["frame_end"]
                report(0.985 + 0.005 * cursor / frames_total)
        if cursor != frames_total:
            raise ValueError("RENDER_SEGMENT_COVERAGE_INVALID")
        for path_string, identity, _selected_hash, _original, _authorization, _kind in source_identities.values():
            if _regular_identity(Path(path_string)) != identity:
                raise ValueError("RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH")
        if context.cancelled.is_set():
            raise CommandCancelled("segment assembly cancelled")
        if _regular_identity(executable) != executable_identity:
            raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
        context.progress(1.0)
        return {"outputs": [{"kind": "render", "path": str(destination), "hash": output_hash, "source_kind": _render_source_kind(graph), "target": graph["target"], "execution_plan_id": execution["plan_id"], "semantic_graph_hash": execution["semantic_graph_hash"], "cache_key": execution["cache_key"]}], "metrics": {"worker_version": WORKER_VERSION, "source_order": [str(node.get("parameters", {}).get("asset_ref", node.get("node_id"))) for node in graph["nodes"] if node.get("kind") == "source"], "ffmpeg_version": version_lines[0], "ffmpeg_returncode": 0, "execution_plan_id": execution["plan_id"], "semantic_graph_hash": execution["semantic_graph_hash"], "cache_key": execution["cache_key"], "output_hash": output_hash, "audio_normalization": None, "ducking_status": "disabled" if has_audio else "no_audio", "execution_strategy": "bounded-linear-v1"}}
    except BaseException as cause:
        if installed and published_identity:
            try:
                if _regular_identity(destination) == published_identity:
                    destination.unlink()
            except FileNotFoundError:
                pass
            except OSError as cleanup:
                raise BaseExceptionGroup("segment assembly and cleanup failed", [cause, cleanup]) from cause
        raise
