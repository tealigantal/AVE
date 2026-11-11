from __future__ import annotations

import json
import math
import re
from fractions import Fraction
from itertools import zip_longest
from pathlib import Path

from .context import HandlerContext
from ..adapters.ffmpeg import CommandCancelled, low_resource_decode_args, low_resource_filter_args, run_command, run_ffmpeg
from ..adapters.filesystem import collect_output, output_directory, require_file, sha256_file


def _metadata(path: Path, context: HandlerContext) -> list[dict]:
    result = run_command(
        ["ffprobe", *low_resource_decode_args(), "-v", "error", "-show_entries", "stream=index,codec_type,codec_name,time_base,start_pts,duration_ts,sample_rate,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries", "-of", "json", str(path)],
        timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=262144,
    )
    if result.returncode or len(result.stdout) >= 262144:
        raise ValueError("PREVIEW_PROXY_PROBE_FAILED: invalid or excessive stream metadata")
    value = json.loads(result.stdout)
    if not isinstance(value.get("streams"), list):
        raise ValueError("PREVIEW_PROXY_PROBE_FAILED: missing streams")
    return value["streams"]


def _stream(streams: list[dict], kind: str, *, required: bool) -> dict | None:
    matches = [stream for stream in streams if stream.get("codec_type") == kind]
    if not matches and not required:
        return None
    if len(matches) != 1:
        raise ValueError(f"PREVIEW_PROXY_STREAM_UNSUPPORTED: expected one {kind} stream")
    return matches[0]


def _clock(stream: dict) -> Fraction:
    try:
        clock = Fraction(stream["time_base"])
    except (KeyError, ValueError, ZeroDivisionError) as error:
        raise ValueError("PREVIEW_PROXY_TIMEBASE_INVALID") from error
    if clock <= 0:
        raise ValueError("PREVIEW_PROXY_TIMEBASE_INVALID")
    return clock


def _records(path: Path, stream: dict, kind: str, destination: Path, context: HandlerContext) -> int:
    # ffprobe output is streamed to a private workspace file, not accumulated
    # in memory. Each record is a numeric timestamp and optional duration.
    selector = str(stream["index"])
    entries = "frame=best_effort_timestamp" if kind == "video" else "packet=pts,duration,data_hash"
    mode = "-show_frames" if kind == "video" else "-show_packets"
    count = 0
    pending: dict[str, str] | None = None
    with destination.open("x", encoding="ascii", newline="\n") as output:
        def receive(line: str) -> None:
            nonlocal count, pending
            if not line:
                return
            continuation = line.startswith("|")
            if continuation != (pending is not None):
                raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_TIMESTAMP_MISSING")
            fields = pending if pending is not None else {}
            relevant = {"best_effort_timestamp"} if kind == "video" else {"pts", "duration", "data_hash"}
            for part in line.split("|"):
                key, separator, value = part.partition("=")
                if separator and key in relevant:
                    if key in fields:
                        raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_TIMESTAMP_MISSING")
                    fields[key] = value
            names = ["best_effort_timestamp"] if kind == "video" else ["pts", "duration", "data_hash"]
            if kind == "audio" and "data_hash" not in fields:
                if "pts" not in fields or "duration" not in fields or continuation:
                    raise ValueError("PREVIEW_PROXY_AUDIO_TIMESTAMP_MISSING")
                pending = fields
                return
            if set(fields) != set(names) or any(not re.fullmatch(r"-?\d+", fields[name]) for name in names[:2 if kind == "audio" else 1]) or kind == "audio" and not re.fullmatch(r"SHA256:[0-9a-f]{64}", fields["data_hash"]):
                raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_TIMESTAMP_MISSING")
            output.write(",".join(fields[name] for name in names) + "\n")
            pending = None
            count += 1
        result = run_command(
            ["ffprobe", *low_resource_decode_args(), "-v", "error", "-select_streams", selector, mode, "-show_entries", entries, *(["-show_data_hash", "sha256"] if kind == "audio" else []), "-of", "compact=p=0:nk=0", str(path)],
            timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set,
            stdout_line=receive, capture_limit=4096,
        )
    if result.returncode or count == 0 or pending is not None:
        raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_TIMESTAMP_MISSING")
    return count


def _compare_records(original: Path, proxy: Path, original_clock: Fraction, proxy_clock: Fraction,
                     *, kind: str, expected_offset: Fraction | None = None) -> tuple[Fraction, int, int, int]:
    offset = expected_offset
    first_original = last_original = None
    count = 0
    with original.open(encoding="ascii") as left, proxy.open(encoding="ascii") as right:
        for a, b in zip_longest(left, right):
            if a is None or b is None:
                raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_COUNT_MISMATCH")
            old, new = a.strip().split(","), b.strip().split(",")
            old_pts, new_pts = int(old[0]), int(new[0])
            if kind == "video" and last_original is not None and old_pts <= last_original:
                raise ValueError("PREVIEW_PROXY_VIDEO_TIMESTAMPS_UNORDERED")
            point_offset = new_pts * proxy_clock - old_pts * original_clock
            if offset is None:
                offset = point_offset
            if point_offset != offset or kind == "audio" and (int(old[1]) * original_clock != int(new[1]) * proxy_clock or old[2] != new[2]):
                raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_TIMING_MISMATCH")
            first_original = old_pts if first_original is None else first_original
            last_original = old_pts
            count += 1
    if count == 0 or offset is None or first_original is None or last_original is None:
        raise ValueError(f"PREVIEW_PROXY_{kind.upper()}_TIMESTAMP_MISSING")
    return offset, first_original, last_original, count


def handle(payload: dict, context: HandlerContext) -> dict:
    allowed = {"task_type", "input_path", "output_dir", "source_digest", "max_edge", "timeout_seconds"}
    if set(payload) - allowed or payload.get("task_type") != "media.preview-proxy.v1":
        raise ValueError("PREVIEW_PROXY_REQUEST_INVALID")
    if any(not isinstance(payload.get(field), str) or not payload[field] for field in ("input_path", "output_dir")):
        raise ValueError("PREVIEW_PROXY_REQUEST_INVALID: input and output paths are required")
    digest, edge = payload.get("source_digest"), payload.get("max_edge")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest) or isinstance(edge, bool) or not isinstance(edge, int) or not 2 <= edge <= 960:
        raise ValueError("PREVIEW_PROXY_REQUEST_INVALID: digest or max_edge")
    source = require_file(payload["input_path"], "input_path")
    if sha256_file(source) != digest:
        raise ValueError("PREVIEW_PROXY_SOURCE_REBOUND")
    original_streams = _metadata(source, context)
    video = _stream(original_streams, "video", required=True)
    audio = _stream(original_streams, "audio", required=False)
    assert video is not None
    # Do not erase alpha, 10-bit or HDR semantics by silently making an 8-bit
    # H.264 proxy. Such inputs need a separately authorized proxy strategy.
    if video.get("pix_fmt") not in {"yuv420p", "yuvj420p"} or video.get("color_transfer") in {"smpte2084", "arib-std-b67"}:
        raise ValueError("PREVIEW_PROXY_COLOR_UNSUPPORTED")
    original_clock = _clock(video)
    # Preserve the common source video/audio timestamp grid when rebasing
    # nonzero media starts; a video-only clock can quantize the A/V offset.
    output_timescale = math.lcm(original_clock.denominator, _clock(audio).denominator if audio else 1)
    if output_timescale > 2147483647:
        raise ValueError("PREVIEW_PROXY_TIMEBASE_UNSUPPORTED")
    temporary = context.workspace / "preview-proxy.mp4"
    mapping = ["-map", f"0:{video['index']}"] + (["-map", f"0:{audio['index']}"] if audio else [])
    run_ffmpeg(
        [*low_resource_filter_args(), "-n", "-copyts", "-start_at_zero", "-threads", "1", "-i", str(source), *mapping,
         "-vf", f"scale='min({edge},iw)':'min({edge},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
         "-c:v", "libx264", "-threads:v", "1", "-pix_fmt", "yuv420p", "-fps_mode", "passthrough",
         "-enc_time_base:v", f"1:{output_timescale}", "-video_track_timescale", str(output_timescale), "-c:a", "copy", str(temporary)],
        timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=16384,
    )
    proxy_streams = _metadata(temporary, context)
    proxy_video = _stream(proxy_streams, "video", required=True)
    proxy_audio = _stream(proxy_streams, "audio", required=audio is not None)
    assert proxy_video is not None
    if (audio is None) != (proxy_audio is None):
        raise ValueError("PREVIEW_PROXY_AUDIO_STREAM_MISMATCH")
    for field in ("color_range", "color_space", "color_transfer", "color_primaries"):
        if video.get(field) not in (None, "unknown", "unspecified") and video.get(field) != proxy_video.get(field):
            raise ValueError("PREVIEW_PROXY_COLOR_MISMATCH")
    proxy_clock = _clock(proxy_video)
    first_file, second_file = context.workspace / "original-video-pts", context.workspace / "proxy-video-pts"
    _records(source, video, "video", first_file, context)
    _records(temporary, proxy_video, "video", second_file, context)
    offset, first, last, frame_count = _compare_records(first_file, second_file, original_clock, proxy_clock, kind="video")
    try:
        original_end = int(video["start_pts"]) + int(video["duration_ts"])
        proxy_start = int(proxy_video["start_pts"])
        proxy_end = proxy_start + int(proxy_video["duration_ts"])
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("PREVIEW_PROXY_DURATION_MISSING") from error
    if first != int(video["start_pts"]) or last >= original_end or proxy_start * proxy_clock != first * original_clock + offset or proxy_end * proxy_clock != original_end * original_clock + offset:
        raise ValueError("PREVIEW_PROXY_DURATION_MISMATCH")
    proxy_map = {"schema_version": 1, "original_timebase": original_clock.denominator, "proxy_timebase": proxy_clock.denominator,
                 "segments": [{"original_start": {"value": first * original_clock.numerator, "timescale": original_clock.denominator},
                               "original_end": {"value": original_end * original_clock.numerator, "timescale": original_clock.denominator},
                               "proxy_start": {"value": proxy_start * proxy_clock.numerator, "timescale": proxy_clock.denominator},
                               "proxy_end": {"value": proxy_end * proxy_clock.numerator, "timescale": proxy_clock.denominator}}]}
    if audio and proxy_audio:
        if audio.get("codec_name") != proxy_audio.get("codec_name") or audio.get("sample_rate") != proxy_audio.get("sample_rate") or not audio.get("sample_rate"):
            raise ValueError("PREVIEW_PROXY_AUDIO_STREAM_MISMATCH")
        first_file, second_file = context.workspace / "original-audio-pts", context.workspace / "proxy-audio-pts"
        _records(source, audio, "audio", first_file, context)
        _records(temporary, proxy_audio, "audio", second_file, context)
        _compare_records(first_file, second_file, _clock(audio), _clock(proxy_audio), kind="audio", expected_offset=offset)
        proxy_map["audio"] = {"original_sample_rate": int(audio["sample_rate"]), "proxy_sample_rate": int(proxy_audio["sample_rate"])}
    if context.cancelled.is_set():
        raise CommandCancelled("preview proxy cancelled")
    if sha256_file(source) != digest:
        raise ValueError("PREVIEW_PROXY_SOURCE_REBOUND")
    width, height = int(proxy_video["width"]), int(proxy_video["height"])
    if min(width, height) < 1 or max(width, height) > edge:
        raise ValueError("PREVIEW_PROXY_GEOMETRY_INVALID")
    version = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=4096)
    producer_version = version.stdout.splitlines()[0] if version.stdout else ""
    if not producer_version.startswith("ffmpeg version "):
        raise ValueError("PREVIEW_PROXY_VERSION_MISSING")
    path = Path(collect_output(temporary, output_directory(payload["output_dir"]) / "preview-proxy.mp4"))
    return {"outputs": [{"kind": "preview_proxy", "path": str(path), "source_digest": digest, "content_digest": sha256_file(path),
                         "byte_length": path.stat().st_size, "width": width, "height": height, "frame_count": frame_count,
                         "proxy_map": proxy_map, "policy": "h264-preserved-timestamps-v1", "producer_version": producer_version}], "metrics": {}}
