"""Pixel-change candidate boundaries; this is not semantic scene understanding."""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
from fractions import Fraction

from .context import HandlerContext
from .media_sample import SAFE_INTEGER, _integer, _keys
from ..adapters.filesystem import require_file
from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut, run_ffmpeg, run_ffprobe


def handle(payload: dict, context: HandlerContext) -> dict:
    _keys(payload, {"schema_version", "task_type", "input_path", "source_digest", "stream_index", "threshold", "timeout_seconds"})
    if payload["schema_version"] != 1 or payload["task_type"] != "media.scene_scan.v1":
        raise ValueError("MEDIA_SCENE_INPUT_INVALID")
    digest = payload["source_digest"]
    if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("MEDIA_SCENE_INPUT_INVALID: source digest")
    index = _integer(payload["stream_index"])
    _integer(payload["timeout_seconds"], 1)
    threshold = payload["threshold"]
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 < threshold <= 100:
        raise ValueError("MEDIA_SCENE_INPUT_INVALID: positive percentage threshold required")
    source = require_file(payload["input_path"], "input_path")
    started = time.monotonic()

    def remaining() -> float:
        if context.cancelled.is_set():
            raise CommandCancelled("scene scan cancelled")
        seconds = context.timeout_seconds - (time.monotonic() - started)
        if seconds <= 0:
            raise CommandTimedOut("scene scan deadline reached")
        return seconds

    def fingerprint() -> str:
        result = hashlib.sha256()
        with source.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                remaining()
                result.update(chunk)
        return result.hexdigest()

    if fingerprint() != digest:
        raise ValueError("MEDIA_SCENE_SOURCE_MISMATCH")
    probe = json.loads(run_ffprobe(["-v", "error", "-select_streams", str(index), "-show_streams", "-show_frames", "-show_entries", "stream=index,codec_type,time_base:frame=pts,best_effort_timestamp,duration,pkt_duration", "-of", "json", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set).stdout)
    streams = probe.get("streams", [])
    if len(streams) != 1 or streams[0].get("index") != index or streams[0].get("codec_type") != "video":
        raise ValueError("MEDIA_SCENE_VIDEO_STREAM_REQUIRED")
    timebase = Fraction(streams[0]["time_base"])
    if timebase <= 0 or max(timebase.numerator, timebase.denominator) > SAFE_INTEGER:
        raise ValueError("MEDIA_SCENE_TIMEBASE_INVALID")
    source_frames = probe.get("frames", [])
    pts: list[int] = []
    for frame in source_frames:
        point = frame.get("pts")
        if not isinstance(point, int) or not 0 <= point <= SAFE_INTEGER or frame.get("best_effort_timestamp") != point:
            raise ValueError("MEDIA_SCENE_EXACT_PTS_REQUIRED")
        if pts and point <= pts[-1]:
            raise ValueError("MEDIA_SCENE_PTS_NONMONOTONIC")
        pts.append(point)
    if not pts:
        raise ValueError("MEDIA_SCENE_NO_FRAMES")
    tail = source_frames[-1].get("duration", source_frames[-1].get("pkt_duration"))
    if not isinstance(tail, int) or tail <= 0 or pts[-1] + tail > SAFE_INTEGER:
        raise ValueError("MEDIA_SCENE_FINAL_FRAME_DURATION_REQUIRED")
    final_end = pts[-1] + tail
    result = run_ffmpeg(["-v", "error", "-copyts", "-i", str(source), "-map", f"0:{index}", "-an", "-vf", f"scdet=threshold={threshold},metadata=mode=print:key=lavfi.scd.score:file=-", "-fps_mode", "passthrough", "-f", "null", "-"], timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
    measured = re.findall(r"frame:(\d+)\s+pts:(-?\d+)\s+pts_time:[^\r\n]+\r?\n\s*lavfi\.scd\.score=([\d.]+)", result.stdout)
    if len(measured) != len(pts) or any(int(number) != ordinal or int(point) != pts[ordinal] for ordinal, (number, point, _score) in enumerate(measured)):
        raise ValueError("MEDIA_SCENE_DECODE_COVERAGE_MISMATCH")
    frames = [{"frame_index": ordinal, "pts": pts[ordinal], "end_pts": pts[ordinal + 1] if ordinal + 1 < len(pts) else final_end, "change_score": float(score)} for ordinal, (_number, _point, score) in enumerate(measured)]
    if any(not math.isfinite(frame["change_score"]) or not 0 <= frame["change_score"] <= 100 for frame in frames):
        raise ValueError("MEDIA_SCENE_SCORE_INVALID")
    boundaries = [0, *[ordinal for ordinal, frame in enumerate(frames) if ordinal > 0 and frame["change_score"] >= threshold]]
    spans = [{"span_index": ordinal, "first_frame_index": first, "last_frame_index": boundaries[ordinal + 1] - 1 if ordinal + 1 < len(boundaries) else len(frames) - 1, "start_pts": pts[first], "end_pts": pts[boundaries[ordinal + 1]] if ordinal + 1 < len(boundaries) else final_end} for ordinal, first in enumerate(boundaries)]
    version = run_ffmpeg(["-version"], timeout_seconds=remaining(), cancelled=context.cancelled.is_set).stdout.splitlines()[0]
    if fingerprint() != digest:
        raise ValueError("MEDIA_SCENE_SOURCE_CHANGED")
    remaining()
    context.progress(1.0)
    return {"outputs": [{"schema_version": 1, "source_digest": digest, "stream_index": index, "time_base": {"numerator": timebase.numerator, "denominator": timebase.denominator}, "start_pts": pts[0], "end_pts": final_end, "frames": frames, "spans": spans, "threshold": threshold, "policy_version": "decoded-pixel-change-v1", "ffmpeg_version": version}], "metrics": {"frame_count": len(frames), "candidate_span_count": len(spans)}}
