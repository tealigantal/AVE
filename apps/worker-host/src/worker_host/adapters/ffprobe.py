from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path
from typing import Callable

from .ffmpeg import run_ffprobe
from .still_image import facts as still_facts


def decoded_audio_bounds(stream: dict, entries: list[dict]) -> dict | None:
    """Report an exact contiguous decoded sample interval, never an assumed zero."""
    if stream.get("codec_type") != "audio" or not stream.get("sample_rate") or not stream.get("time_base"):
        return None
    rate, timebase = int(stream["sample_rate"]), Fraction(stream["time_base"])
    if rate <= 0 or timebase <= 0:
        return None
    frames = [entry for entry in entries if entry.get("type") == "frame"]
    if not frames:
        return None
    first, end, samples = None, None, 0
    for frame in frames:
        if frame.get("best_effort_timestamp") is None or frame.get("nb_samples") is None:
            return None
        start, count = int(frame["best_effort_timestamp"]), int(frame["nb_samples"])
        duration = Fraction(count, rate) / timebase
        if count <= 0 or duration.denominator != 1 or end is not None and start != end:
            return None
        if first is None:
            first = start
        end, samples = start + duration.numerator, samples + count
    return {"method": "decoded-contiguous-samples-v1", "start_pts": first, "end_pts": end, "frame_count": len(frames), "sample_count": samples, "sample_rate": rate}


def probe(path: Path, *, timeout_seconds: float, cancelled: Callable[[], bool]) -> dict:
    result = run_ffprobe(
        ["-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        timeout_seconds=timeout_seconds,
        cancelled=cancelled,
    )
    value = json.loads(result.stdout)
    # Decode identity comes from file bytes, never an extension or invented
    # video interval. Animated WebP is excluded from the still-image subset.
    with path.open("rb") as source:
        signature = source.read(32)
    still = signature.startswith(b"\xff\xd8\xff") or signature.startswith(b"\x89PNG\r\n\x1a\n") or signature.startswith(b"RIFF") and signature[8:12] == b"WEBP"
    if still:
        streams = value.get("streams", [])
        if len(streams) != 1 or streams[0].get("codec_type") != "video":
            raise ValueError("MEDIA_IMAGE_STREAM_INVALID")
        stream = streams[0]
        value["still_image"] = {"stream_index": stream["index"], "pixel_format": stream["pix_fmt"], **still_facts(path)}
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
        if stream.get("codec_type") == "audio":
            by_stream[index]["decoded_audio_bounds"] = decoded_audio_bounds(stream, entries)
    if still and (len([entry for entry in packets_and_frames if entry.get('type') == 'frame']) != 1 or value['streams'][0]['codec_name'] not in {'mjpeg','png','webp'}):
        raise ValueError('MEDIA_ANIMATED_IMAGE_UNSUPPORTED')
    value["timing"] = {"streams": by_stream, "audio_sample_rates": [item["sample_rate"] for item in by_stream.values() if item["sample_rate"] is not None]}
    return value
