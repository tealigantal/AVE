from __future__ import annotations


def _timebase(value: str | None) -> int:
    if not value or "/" not in value:
        raise ValueError("PROXY_MAP_TIMEBASE_REQUIRED")
    numerator, denominator = value.split("/", 1)
    if int(numerator) <= 0 or int(denominator) <= 0:
        raise ValueError("PROXY_MAP_TIMEBASE_INVALID")
    return int(denominator)


def _stream_timing(probe: dict, stream_index: int) -> dict:
    stream = probe.get("timing", {}).get("streams", {}).get(str(stream_index)) or probe.get("timing", {}).get("streams", {}).get(stream_index)
    if not stream:
        raise ValueError("PROXY_MAP_TIMING_MISSING")
    return stream


def _points(timing: dict) -> list[int]:
    values = timing.get("frame_pts") or timing.get("packet_pts") or []
    points = [int(value) for value in values]
    duration = timing.get("duration_ts")
    if duration is not None and (not points or int(duration) > points[-1]):
        points.append(int(duration))
    if len(points) < 2:
        raise ValueError("PROXY_MAP_NEEDS_TWO_POINTS")
    return points


def build_proxy_map(original_probe: dict, proxy_probe: dict, *, video_stream_index: int = 0, audio_stream_index: int | None = None) -> dict:
    original = _stream_timing(original_probe, video_stream_index)
    proxy = _stream_timing(proxy_probe, video_stream_index)
    original_points = _points(original)
    proxy_points = _points(proxy)
    count = min(len(original_points), len(proxy_points))
    if count < 2:
        raise ValueError("PROXY_MAP_NEEDS_TWO_POINTS")
    segments = [{"original_start": {"value": original_points[index], "timescale": _timebase(original["time_base"])}, "original_end": {"value": original_points[index + 1], "timescale": _timebase(original["time_base"])}, "proxy_start": {"value": proxy_points[index], "timescale": _timebase(proxy["time_base"])}, "proxy_end": {"value": proxy_points[index + 1], "timescale": _timebase(proxy["time_base"])}} for index in range(count - 1)]
    result = {"schema_version": 1, "original_timebase": _timebase(original["time_base"]), "proxy_timebase": _timebase(proxy["time_base"]), "segments": segments}
    if audio_stream_index is not None:
        original_audio = _stream_timing(original_probe, audio_stream_index)
        proxy_audio = _stream_timing(proxy_probe, audio_stream_index)
        if original_audio.get("sample_rate") and proxy_audio.get("sample_rate"):
            result["audio"] = {"original_sample_rate": int(original_audio["sample_rate"]), "proxy_sample_rate": int(proxy_audio["sample_rate"])}
    return result
