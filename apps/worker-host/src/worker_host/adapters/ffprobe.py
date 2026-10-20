from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Callable

from .ffmpeg import run_ffprobe
from .still_image import animation_facts, facts as still_facts


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


def probe(path: Path | str, *, timeout_seconds: float, cancelled: Callable[[], bool]) -> dict:
    path = Path(path)
    with path.open("rb") as source:
        signature = source.read(32)
    # Digest-only immutable paths have no suffix for ffprobe to use when
    # selecting a demuxer. Auto-detected JPEGs use jpeg_pipe, which can expose
    # one still image as multiple frames. JPEG bytes identify image2 safely;
    # retain auto-detection for other formats so animated images stay visible.
    is_jpeg = signature.startswith(b"\xff\xd8\xff")
    is_png = signature.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = signature.startswith(b"RIFF") and signature[8:12] == b"WEBP"
    is_gif = signature.startswith((b"GIF87a", b"GIF89a"))
    demuxer_args = ["-f", "image2"] if is_jpeg else []
    animation = animation_facts(path) if is_webp or is_gif else None
    if animation is not None:
        from .animated_image import prepare_video

        with TemporaryDirectory(prefix="ave-animation-probe-") as directory:
            normalized = Path(directory) / "animation.mkv"
            prepare_video(path, normalized, timeout_seconds=timeout_seconds, cancelled=cancelled)
            value = probe(normalized, timeout_seconds=timeout_seconds, cancelled=cancelled)
        if isinstance(value.get("format"), dict):
            value["format"]["filename"] = str(path)
        video = next((stream for stream in value.get("streams", []) if stream.get("codec_type") == "video"), None)
        if video is None:
            raise ValueError("MEDIA_ANIMATION_STREAM_INVALID")
        time_base = Fraction(video["time_base"])
        exact_duration = Fraction(animation["duration_ms"], 1000)
        if time_base <= 0 or exact_duration / time_base != int(exact_duration / time_base):
            raise ValueError("MEDIA_ANIMATION_DURATION_UNREPRESENTABLE")
        duration_ticks = int(exact_duration / time_base)
        video["duration_ts"], video["duration"], video["start_pts"] = str(duration_ticks), str(float(exact_duration)), "0"
        timing = value["timing"]["streams"][int(video["index"])]
        timing["duration_ts"], timing["duration"] = str(duration_ticks), str(float(exact_duration))
        timing["frame_pts"] = [point for point in timing["frame_pts"] if point < duration_ticks]
        if len(timing["frame_pts"]) != animation["frame_count"]:
            raise ValueError("MEDIA_ANIMATION_FRAME_COUNT_MISMATCH")
        animation["pixel_format"] = video.get("pix_fmt")
        if video.get("pix_fmt") != "bgra":
            raise ValueError("MEDIA_ANIMATION_ALPHA_FORMAT_UNSUPPORTED")
        value["animated_image"] = {"stream_index": video["index"], **animation}
        return value
    still = (is_jpeg or is_png or is_webp or is_gif) and animation is None
    still_image_info = still_facts(path) if still else None
    result = run_ffprobe(
        [*demuxer_args, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        timeout_seconds=timeout_seconds,
        cancelled=cancelled,
    )
    if result.stderr.strip():
        raise RuntimeError(f"MEDIA_DECODE_INVALID: {result.stderr[-4000:]}")
    value = json.loads(result.stdout)
    # Decode identity comes from file bytes, never an extension or invented
    # video interval. Animated WebP is excluded from the still-image subset.
    if still:
        streams = value.get("streams", [])
        if len(streams) != 1 or streams[0].get("codec_type") != "video":
            raise ValueError("MEDIA_IMAGE_STREAM_INVALID")
        if still_image_info is None:
            raise ValueError("MEDIA_IMAGE_METADATA_UNAVAILABLE")
        stream = streams[0]
        value["still_image"] = {"stream_index": stream["index"], "pixel_format": stream["pix_fmt"], **still_image_info}
    timing_result = run_ffprobe(
        [*demuxer_args, "-v", "error", "-show_packets", "-show_frames", "-of", "json", str(path)],
        timeout_seconds=timeout_seconds,
        cancelled=cancelled,
    )
    if timing_result.stderr.strip():
        raise RuntimeError(f"MEDIA_DECODE_INVALID: {timing_result.stderr[-4000:]}")
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
    if animation:
        streams = value.get("streams", [])
        if len(streams) != 1 or streams[0].get("codec_type") != "video":
            raise ValueError("MEDIA_ANIMATION_STREAM_INVALID")
        stream = streams[0]
        frame_entries = [entry for entry in packets_and_frames if entry.get("type") == "frame" and int(entry.get("stream_index", -1)) == int(stream["index"])]
        if len(frame_entries) != animation["frame_count"]:
            raise ValueError("MEDIA_ANIMATION_FRAME_COUNT_MISMATCH")
        animation["pixel_format"] = stream.get("pix_fmt")
        value["animated_image"] = {"stream_index": stream["index"], **animation}
    value["timing"] = {"streams": by_stream, "audio_sample_rates": [item["sample_rate"] for item in by_stream.values() if item["sample_rate"] is not None]}
    return value
