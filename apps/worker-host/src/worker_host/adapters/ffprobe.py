from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from .ffmpeg import run_ffprobe


def probe(path: Path, *, timeout_seconds: float, cancelled: Callable[[], bool]) -> dict:
    result = run_ffprobe(
        ["-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        timeout_seconds=timeout_seconds,
        cancelled=cancelled,
    )
    value = json.loads(result.stdout)
    timing_result = run_ffprobe(
        ["-v", "error", "-show_packets", "-show_frames", "-of", "json", str(path)],
        timeout_seconds=timeout_seconds,
        cancelled=cancelled,
    )
    packets_and_frames = json.loads(timing_result.stdout).get("packets_and_frames", [])
    by_stream: dict[int, dict] = {}
    for stream in value.get("streams", []):
        index = int(stream["index"])
        entries = [entry for entry in packets_and_frames if int(entry.get("stream_index", -1)) == index]
        frame_pts = [int(entry["best_effort_timestamp"]) for entry in entries if entry.get("type") == "frame" and entry.get("best_effort_timestamp") is not None]
        packet_pts = [int(entry["pts"]) for entry in entries if entry.get("type") == "packet" and entry.get("pts") is not None]
        deltas = {right - left for left, right in zip(frame_pts, frame_pts[1:]) if right > left}
        by_stream[index] = {"time_base": stream.get("time_base"), "duration": stream.get("duration"), "duration_ts": stream.get("duration_ts"), "packet_pts": packet_pts, "frame_pts": frame_pts, "vfr": stream.get("codec_type") == "video" and len(deltas) > 1, "sample_rate": int(stream["sample_rate"]) if stream.get("sample_rate") else None}
    value["timing"] = {"streams": by_stream, "audio_sample_rates": [item["sample_rate"] for item in by_stream.values() if item["sample_rate"] is not None]}
    return value
