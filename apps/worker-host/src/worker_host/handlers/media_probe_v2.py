"""File-backed complete packet/frame timing for opt-in moving media."""
from __future__ import annotations

import hashlib
import json
import os
import re
import stat
import time
from builtins import BaseExceptionGroup
from fractions import Fraction
from pathlib import Path
from uuid import uuid4

from .context import HandlerContext
from .media_sample import SAFE_INTEGER, _integer, _keys
from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut, low_resource_decode_args, run_ffprobe
from ..adapters.filesystem import require_file
from ..adapters.still_image import facts as still_image_facts, animation_facts
from ..adapters.animated_image import prepare_video


def handle(payload: dict, context: HandlerContext) -> dict:
    from ..adapters.media_resource import guarded_handler
    return guarded_handler(__name__, payload, context)


def _handle(payload: dict, context: HandlerContext) -> dict:
    _keys(payload, {"schema_version", "task_type", "input_path", "source_digest", "timeout_seconds", "output_dir"})
    if payload["schema_version"] != 2 or payload["task_type"] != "media.probe.v2":
        raise ValueError("MEDIA_PROBE_INPUT_INVALID")
    digest = payload["source_digest"]
    if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("MEDIA_PROBE_INPUT_INVALID: source digest")
    _integer(payload["timeout_seconds"], 1)
    target = Path(payload["output_dir"]).absolute() if isinstance(payload["output_dir"], str) and payload["output_dir"] else None
    if target is None or target.is_symlink() or not target.is_dir():
        raise ValueError("MEDIA_PROBE_STAGING_REQUIRED")
    original = source = require_file(payload["input_path"], "input_path")
    started = time.monotonic()
    def check() -> None:
        if context.cancelled.is_set():
            raise CommandCancelled("media probe cancelled")
        if time.monotonic() - started >= context.timeout_seconds:
            raise CommandTimedOut("media probe deadline reached")
    def remaining() -> float:
        check()
        return context.timeout_seconds - (time.monotonic() - started)
    def fingerprint() -> str:
        value = hashlib.sha256()
        with original.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                check()
                value.update(chunk)
        return value.hexdigest()
    if fingerprint() != digest:
        raise ValueError("MEDIA_PROBE_SOURCE_MISMATCH")
    with source.open("rb") as handle:
        signature = handle.read(12)
    image_signature = signature.startswith((b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a")) or signature.startswith(b"RIFF") and signature[8:12] == b"WEBP"
    animation = animation_facts(original) if image_signature else None
    is_image = image_signature and animation is None
    if animation is not None:
        source = context.workspace / "probe-animation-v2.mkv"
        prepare_video(original, source, timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
    image_facts = still_image_facts(source, cancelled=context.cancelled.is_set) if is_image else None
    check()
    lines: list[str] = []
    metadata_size = 0
    def metadata_line(line: str) -> None:
        nonlocal metadata_size
        check()
        metadata_size += len(line.encode("utf8")) + 1
        if metadata_size > 8 * 1024 * 1024:
            raise ValueError("MEDIA_PROBE_METADATA_TOO_LARGE")
        lines.append(line)
    metadata_result = run_ffprobe([*low_resource_decode_args(), *(["-f", "image2"] if is_image else []), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stdout_line=metadata_line, capture_limit=8192)
    if metadata_result.stderr.strip():
        raise ValueError(f"MEDIA_DECODE_INVALID: {metadata_result.stderr[-4000:]}")
    try:
        metadata = json.loads("\n".join(lines))
    except ValueError as error:
        raise ValueError("MEDIA_PROBE_METADATA_INVALID") from error
    streams = metadata.get("streams") if isinstance(metadata, dict) else None
    if not isinstance(streams, list) or not streams:
        raise ValueError("MEDIA_PROBE_STREAM_MISSING")
    if is_image:
        if len(streams) != 1 or streams[0].get("codec_type") != "video" or image_facts is None:
            raise ValueError("MEDIA_IMAGE_STREAM_INVALID")
        for key in ("time_base", "start_pts", "start_time", "duration", "duration_ts", "nb_frames", "r_frame_rate", "avg_frame_rate"):
            streams[0].pop(key, None)
        if isinstance(metadata.get("format"), dict):
            for key in ("start_time", "duration"):
                metadata["format"].pop(key, None)
        if not isinstance(streams[0].get("pix_fmt"), str) or not streams[0]["pix_fmt"]:
            raise ValueError("MEDIA_IMAGE_METADATA_UNAVAILABLE")
        metadata["still_image"] = {"stream_index": streams[0]["index"], "pixel_format": streams[0]["pix_fmt"], **image_facts}
    if animation is not None:
        video = next((s for s in streams if s.get("codec_type") == "video"), None)
        if video is None or video.get("time_base") != "1/1000" or video.get("pix_fmt") != "bgra":
            raise ValueError("MEDIA_ANIMATION_STREAM_INVALID")
        video.update(start_pts=0, duration_ts=animation["duration_ms"], duration=str(Fraction(animation["duration_ms"], 1000)))
        metadata["animated_image"] = {"stream_index": video["index"], "pixel_format": video["pix_fmt"], **animation}
        metadata["format"]["filename"] = str(original)
    media_kind = "image" if is_image else "video" if any(s.get("codec_type") == "video" for s in streams if isinstance(s, dict)) else "audio" if any(s.get("codec_type") == "audio" for s in streams if isinstance(s, dict)) else None
    if media_kind is None:
        raise ValueError("MEDIA_PROBE_STREAM_MISSING")
    by_stream: dict[int, dict] = {}
    for stream in streams:
        index = stream.get("index") if isinstance(stream, dict) else None
        if not isinstance(index, int) or isinstance(index, bool) or index < 0 or index in by_stream:
            raise ValueError("MEDIA_PROBE_STREAM_INVALID")
        by_stream[index] = {"frame_count": 0, "packet_count": 0, "first_frame_pts": None, "first_packet_pts": None, "vfr": False, "video": stream.get("codec_type") == "video", "last_pts": None, "delta": None, "audio_valid": stream.get("codec_type") == "audio", "audio_start": None, "audio_end": None, "audio_samples": 0, "rate": int(stream["sample_rate"]) if stream.get("sample_rate") else None, "time_base": stream.get("time_base"), "duration": stream.get("duration"), "duration_ts": stream.get("duration_ts")}
    pending = target / f".probe-v2-{uuid4().hex}.pending"
    final = target / f"probe-v2-{uuid4().hex}.ndjson"
    published = False
    owned: tuple[int, int] | None = None
    failure: BaseException | None = None
    try:
        descriptor = os.open(pending, os.O_CREAT | os.O_EXCL | os.O_WRONLY | getattr(os, "O_BINARY", 0), 0o600)
        info = os.fstat(descriptor)
        owned = (info.st_dev, info.st_ino)
        try:
            output_stream = os.fdopen(descriptor, "wb")
        except BaseException as error:
            try:
                os.close(descriptor)
            except BaseException as close_error:
                raise BaseExceptionGroup("probe open and cleanup failed", [error, close_error]) from error
            raise
        with output_stream as output:
            output_hash = hashlib.sha256()
            length = 0
            record_count = 0
            def write_record(record: dict) -> None:
                nonlocal length
                check()
                line = (json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf8")
                if len(line) > 4096 or output.write(line) != len(line):
                    raise ValueError("MEDIA_PROBE_RECORD_INVALID")
                output_hash.update(line)
                length += len(line)
            write_record({"kind": "header", "schema_version": 2, "source_digest": digest, "policy_version": "ffprobe-complete-stream-v2"})
            def record_line(line: str) -> None:
                nonlocal record_count
                if not line:
                    return
                parts = line.split("|")
                kind = parts[0]
                if kind not in {"packet", "frame"}:
                    raise ValueError("MEDIA_PROBE_RECORD_INVALID")
                fields = dict(part.split("=", 1) for part in parts[1:] if "=" in part)
                raw_index = fields.get("stream_index", "")
                if not raw_index.isdigit() or int(raw_index) not in by_stream:
                    raise ValueError("MEDIA_PROBE_RECORD_INVALID")
                stream_index = int(raw_index)
                record: dict = {"kind": kind, "stream_index": stream_index}
                for key in ("pts", "dts", "best_effort_timestamp", "duration", "pkt_duration", "nb_samples"):
                    raw = fields.get(key)
                    if raw is not None and re.fullmatch(r"-?\d+", raw):
                        value = int(raw)
                        if abs(value) > SAFE_INTEGER:
                            raise ValueError("MEDIA_PROBE_TIME_UNREPRESENTABLE")
                        record[key] = value
                for key in ("pos", "pkt_pos", "flags"):
                    if key in fields:
                        record[key] = fields[key]
                if animation is not None and record.get("best_effort_timestamp", record.get("pts", -1)) >= animation["duration_ms"]:
                    return
                state = by_stream[stream_index]
                state[f"{kind}_count"] += 1
                point = record.get("best_effort_timestamp" if kind == "frame" else "pts")
                if state[f"first_{kind}_pts"] is None and point is not None:
                    state[f"first_{kind}_pts"] = point
                if kind == "frame" and point is not None:
                    last = state["last_pts"]
                    if last is not None and point > last:
                        delta = point - last
                        if state["video"] and state["delta"] is not None and state["delta"] != delta:
                            state["vfr"] = True
                        state["delta"] = delta
                    state["last_pts"] = point
                if kind == "frame" and state["audio_valid"]:
                    try:
                        rate, base, samples = state["rate"], Fraction(state["time_base"]), record["nb_samples"]
                        if point is None or not rate or rate <= 0 or base <= 0 or samples <= 0:
                            raise ValueError("invalid audio frame")
                        duration = Fraction(samples, rate) / base
                        if duration.denominator != 1 or state["audio_end"] is not None and point != state["audio_end"]:
                            raise ValueError("noncontiguous audio")
                        if state["audio_start"] is None:
                            state["audio_start"] = point
                        state["audio_end"] = point + duration.numerator
                        state["audio_samples"] += samples
                    except (KeyError, TypeError, ValueError, ZeroDivisionError):
                        state["audio_valid"] = False
                write_record(record)
                record_count += 1
            if not is_image:
                timing_result = run_ffprobe([*low_resource_decode_args(), "-v", "error", "-show_packets", "-show_frames", "-show_entries", "packet=stream_index,pts,dts,pos,flags:frame=stream_index,pts,best_effort_timestamp,duration,pkt_duration,pkt_pos,nb_samples", "-of", "compact=p=1:nk=0", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stdout_line=record_line, capture_limit=8192)
                if timing_result.stderr.strip():
                    raise ValueError(f"MEDIA_DECODE_INVALID: {timing_result.stderr[-4000:]}")
            if not is_image and not record_count:
                raise ValueError("MEDIA_PROBE_NO_RECORDS")
            summaries = {}
            for index, state in by_stream.items():
                summaries[str(index)] = {key: state[key] for key in ("frame_count", "packet_count", "first_frame_pts", "first_packet_pts", "vfr", "time_base", "duration", "duration_ts")}
                summaries[str(index)]["sample_rate"] = state["rate"]
                if state["audio_valid"] and state["frame_count"]:
                    summaries[str(index)]["decoded_audio_bounds"] = {"method": "decoded-contiguous-samples-v1", "start_pts": state["audio_start"], "end_pts": state["audio_end"], "frame_count": state["frame_count"], "sample_count": state["audio_samples"], "sample_rate": state["rate"]}
            metadata["timing_summary"] = {"streams": summaries}
            metadata_json = json.dumps(metadata, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
            if len(metadata_json.encode("utf8")) > 8 * 1024 * 1024:
                raise ValueError("MEDIA_PROBE_METADATA_TOO_LARGE")
            write_record({"kind": "footer", "record_count": record_count, "metadata_sha256": hashlib.sha256(metadata_json.encode("utf8")).hexdigest()})
            check()
            output.flush()
            os.fsync(output.fileno())
            info = os.fstat(output.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size != length or (info.st_dev, info.st_ino) != owned:
                raise ValueError("MEDIA_PROBE_OUTPUT_CHANGED")
        current = pending.lstat()
        if stat.S_ISLNK(current.st_mode) or (current.st_dev, current.st_ino, current.st_size, current.st_mtime_ns, current.st_ctime_ns) != (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns):
            raise ValueError("MEDIA_PROBE_OUTPUT_CHANGED")
        if fingerprint() != digest:
            raise ValueError("MEDIA_PROBE_SOURCE_CHANGED")
        check()
        os.link(pending, final, follow_symlinks=False)
        published = True
        if (pending.lstat().st_dev, pending.lstat().st_ino) != owned or (final.lstat().st_dev, final.lstat().st_ino) != owned:
            raise ValueError("MEDIA_PROBE_OUTPUT_CHANGED")
        pending.unlink()
        check()
        context.progress(1.0)
        check()
        return {"outputs": [{"schema_version": 2, "path": str(final), "source_digest": digest, "byte_length": length, "sha256": output_hash.hexdigest(), "record_count": record_count, "media_kind": media_kind, "metadata_json": metadata_json, "policy_version": "ffprobe-complete-stream-v2"}], "metrics": {"streams": len(streams), "record_count": record_count}}
    except BaseException as error:
        failure = error
        raise
    finally:
        cleanup: list[BaseException] = []
        for path in (pending, final if failure is not None and published else None):
            if path is not None:
                try:
                    if path.exists() or path.is_symlink():
                        info = path.lstat()
                        if owned is None or stat.S_ISLNK(info.st_mode) or (info.st_dev, info.st_ino) != owned:
                            raise ValueError("MEDIA_PROBE_CLEANUP_IDENTITY_CHANGED")
                        path.unlink()
                except BaseException as error:
                    cleanup.append(error)
        if cleanup:
            raise BaseExceptionGroup("probe evidence and cleanup failed", [*([failure] if failure else []), *cleanup]) from failure
