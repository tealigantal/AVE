"""Private file-backed scene evidence. The existing v1 task is unchanged."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import stat
import tempfile
import time
from builtins import BaseExceptionGroup
from dataclasses import replace
from fractions import Fraction
from pathlib import Path
from uuid import uuid4

from .context import HandlerContext
from .frame_index import Frame, FrameIndex
from .media_sample import SAFE_INTEGER, _integer, _keys
from .media_timing import exact_indexed_tail_duration
from ..adapters.animated_image import prepare_video
from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut, low_resource_decode_args, low_resource_filter_args, run_ffmpeg, run_ffprobe
from ..adapters.filesystem import require_file
from ..adapters.media_evidence import write_frame_table
from ..adapters.still_image import animation_facts


def handle(payload: dict, context: HandlerContext) -> dict:
    _keys(payload, {"schema_version", "task_type", "input_path", "source_digest", "stream_index", "threshold", "timeout_seconds", "output_dir"})
    if payload["schema_version"] != 2 or payload["task_type"] != "media.scene_scan.v2":
        raise ValueError("MEDIA_SCENE_INPUT_INVALID")
    digest = payload["source_digest"]
    if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("MEDIA_SCENE_INPUT_INVALID: source digest")
    stream_index = _integer(payload["stream_index"])
    _integer(payload["timeout_seconds"], 1)
    threshold = payload["threshold"]
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 < threshold <= 100:
        raise ValueError("MEDIA_SCENE_INPUT_INVALID: positive percentage threshold required")
    target = Path(payload["output_dir"]).absolute() if isinstance(payload["output_dir"], str) and payload["output_dir"] else None
    if target is None or target.is_symlink() or not target.is_dir():
        raise ValueError("MEDIA_SCENE_STAGING_REQUIRED")
    original = require_file(payload["input_path"], "input_path")
    started = time.monotonic()

    def check() -> None:
        if context.cancelled.is_set():
            raise CommandCancelled("scene scan cancelled")
        if time.monotonic() - started >= context.timeout_seconds:
            raise CommandTimedOut("scene scan deadline reached")

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
        raise ValueError("MEDIA_SCENE_SOURCE_MISMATCH")
    source = original
    with original.open("rb") as handle:
        signature = handle.read(12)
    # The existing animated-image decoder materializes every duration. Until
    # it has a bounded proof, this opt-in v2 route fails closed for that input.
    if signature.startswith((b"GIF87a", b"GIF89a")) or signature.startswith(b"RIFF") and signature[8:12] == b"WEBP":
        raise ValueError("MEDIA_SCENE_V2_ANIMATION_UNSUPPORTED")
    animation = animation_facts(original)
    if animation is not None:
        source = context.workspace / "scene-animation-v2.mkv"
        prepare_video(original, source, timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
    metadata = json.loads(run_ffprobe([*low_resource_decode_args(), "-v", "error", "-select_streams", str(stream_index), "-show_streams", "-show_entries", "stream=index,id,codec_type,time_base", "-of", "json", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set).stdout)
    streams = metadata.get("streams", [])
    if len(streams) != 1 or streams[0].get("index") != stream_index or streams[0].get("codec_type") != "video":
        raise ValueError("MEDIA_SCENE_VIDEO_STREAM_REQUIRED")
    timebase = Fraction(streams[0]["time_base"])
    if timebase <= 0 or max(timebase.numerator, timebase.denominator) > SAFE_INTEGER:
        raise ValueError("MEDIA_SCENE_TIMEBASE_INVALID")

    pending = target / f".scene-v2-{uuid4().hex}.pending"
    final = target / f"scene-v2-{uuid4().hex}.ndjson"
    published = False
    owned: tuple[int, int] | None = None
    failure: BaseException | None = None
    try:
        with tempfile.TemporaryDirectory(prefix="scene-index-", dir=context.workspace) as directory:
            with FrameIndex(Path(directory) / "frames.bin") as db:
                count = 0
                previous: int | None = None
                def frame_line(line: str) -> None:
                    nonlocal count, previous
                    check()
                    if not line:
                        return
                    fields = dict(part.split("=", 1) for part in line.split("|") if "=" in part)
                    def number(name: str) -> int | None:
                        raw = fields.get(name)
                        return int(raw) if raw is not None and re.fullmatch(r"-?\d+", raw) else None
                    point = number("pts")
                    if point is None or not 0 <= point <= SAFE_INTEGER or number("best_effort_timestamp") != point:
                        raise ValueError("MEDIA_SCENE_EXACT_PTS_REQUIRED")
                    if animation is not None and point >= animation["duration_ms"]:
                        return
                    if previous is not None and point <= previous:
                        raise ValueError("MEDIA_SCENE_PTS_NONMONOTONIC")
                    db.append(Frame(point, number("duration"), number("pkt_duration"), None, fields.get("pkt_pos")))
                    previous = point
                    count += 1
                run_ffprobe([*low_resource_decode_args(), "-v", "error", "-select_streams", str(stream_index), "-show_frames", "-show_entries", "frame=pts,best_effort_timestamp,duration,pkt_duration,pkt_pos", "-of", "compact=p=0:nk=0", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stdout_line=frame_line, capture_limit=8192)
                if not count:
                    raise ValueError("MEDIA_SCENE_NO_FRAMES")
                last = db.get(count - 1)
                if last is None:
                    raise ValueError("MEDIA_FRAME_INDEX_CORRUPT")
                point, duration, packet_duration = last.pts, last.duration, last.pkt_duration
                tail = duration if duration is not None else packet_duration
                from_container = tail is None
                if animation is not None:
                    tail = animation["duration_ms"] - point
                    from_container = False
                elif from_container:
                    tail = exact_indexed_tail_duration(source, streams[0], db, count, remaining(), context.cancelled.is_set)
                if not isinstance(tail, int) or tail <= 0 or point + tail > SAFE_INTEGER:
                    raise ValueError("MEDIA_SCENE_FINAL_FRAME_DURATION_REQUIRED")
                final_end = point + tail
                ordinal = 0
                pending_frame: int | None = None
                def score_line(line: str) -> None:
                    nonlocal ordinal, pending_frame
                    check()
                    frame = re.search(r"frame:(\d+)\s+pts:(-?\d+)\s+pts_time:", line)
                    score = re.search(r"lavfi\.scd\.score=([\d.]+)", line)
                    if frame:
                        row = db.get(ordinal)
                        if pending_frame is not None or row is None or int(frame[1]) != ordinal or int(frame[2]) != row.pts:
                            raise ValueError("MEDIA_SCENE_DECODE_COVERAGE_MISMATCH")
                        pending_frame = ordinal
                    elif score:
                        value = float(score[1])
                        if pending_frame is None or not math.isfinite(value) or not 0 <= value <= 100:
                            raise ValueError("MEDIA_SCENE_SCORE_INVALID")
                        row = db.get(pending_frame)
                        if row is None:
                            raise ValueError("MEDIA_FRAME_INDEX_CORRUPT")
                        db.set(pending_frame, replace(row, score=value))
                        ordinal += 1
                        pending_frame = None
                scan_filters = f"trim=end={animation['duration_ms'] / 1000:.3f}," if animation is not None else ""
                run_ffmpeg([*low_resource_filter_args(), "-v", "error", "-copyts", *low_resource_decode_args(), "-i", str(source), "-map", f"0:{stream_index}", "-an", "-vf", f"{scan_filters}scdet=threshold={threshold},metadata=mode=print:key=lavfi.scd.score:file=-", "-fps_mode", "passthrough", "-f", "null", "-"], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stdout_line=score_line, capture_limit=8192)
                if ordinal != count or pending_frame is not None:
                    raise ValueError("MEDIA_SCENE_DECODE_COVERAGE_MISMATCH")
                version = run_ffmpeg(["-version"], timeout_seconds=remaining(), cancelled=context.cancelled.is_set).stdout.splitlines()[0]
                def frame_records():
                    previous_row = None
                    for ordinal, row in enumerate(db.rows()):
                        check()
                        if previous_row is not None:
                            yield {"frame_index": ordinal - 1, "pts": previous_row.pts, "end_pts": row.pts, "change_score": previous_row.score}
                        previous_row = row
                    if previous_row is not None:
                        yield {"frame_index": count - 1, "pts": previous_row.pts, "end_pts": final_end, "change_score": previous_row.score}
                header = {"schema_version": 1, "source_digest": digest, "stream_index": stream_index, "time_base": {"numerator": timebase.numerator, "denominator": timebase.denominator}, "threshold": threshold, "policy_version": "decoded-pixel-change-v1", "ffmpeg_version": version}
                receipt = write_frame_table(pending, header, frame_records(), check)
                info = pending.lstat()
                if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                    raise ValueError("MEDIA_SCENE_OUTPUT_CHANGED")
                owned = (info.st_dev, info.st_ino)
                span_count = 1
                for ordinal, row in enumerate(db.rows()):
                    check()
                    if row.score is None:
                        raise ValueError("MEDIA_SCENE_DECODE_COVERAGE_MISMATCH")
                    if ordinal > 0 and row.score >= threshold:
                        span_count += 1
                if fingerprint() != digest:
                    raise ValueError("MEDIA_SCENE_SOURCE_CHANGED")
                check()
                os.link(pending, final, follow_symlinks=False)
                published = True
                if (pending.lstat().st_dev, pending.lstat().st_ino) != owned or (final.lstat().st_dev, final.lstat().st_ino) != owned:
                    raise ValueError("MEDIA_SCENE_OUTPUT_CHANGED")
                pending.unlink()
                check()
                context.progress(1.0)
                check()
                return {"outputs": [{"schema_version": 2, "path": str(final), "receipt": receipt, "span_count": span_count}], "metrics": {"frame_count": count, "candidate_span_count": span_count, "tail_duration_from_stts": int(from_container)}}
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
                            raise ValueError("MEDIA_SCENE_CLEANUP_IDENTITY_CHANGED")
                        path.unlink()
                except BaseException as error:
                    cleanup.append(error)
        if cleanup:
            raise BaseExceptionGroup("scene evidence and cleanup failed", [*([failure] if failure else []), *cleanup]) from failure
