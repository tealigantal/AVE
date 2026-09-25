"""Extract actual source-bound frames/audio, never infer scene labels or dialogue."""
from __future__ import annotations

from builtins import BaseExceptionGroup

import hashlib
import json
import re
import time
import wave
from fractions import Fraction
from pathlib import Path

from .context import HandlerContext
from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut, run_ffmpeg, run_ffprobe
from ..adapters.filesystem import require_file

POLICY = "source-pts-sampling-v1"
SAFE_INTEGER = 9007199254740991


def _keys(value: object, fields: set[str]) -> dict:
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: fields differ from the current contract")
    return value


def _integer(value: object, minimum: int = 0) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or not minimum <= value <= SAFE_INTEGER:
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: exact bounded integer required")
    return value


def _time(value: object) -> Fraction:
    item = _keys(value, {"schema_version", "value", "timescale"})
    if item["schema_version"] != 1:
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: time schema")
    return Fraction(_integer(item["value"]), _integer(item["timescale"], 1))


def _rational(value: Fraction) -> dict:
    if abs(value.numerator) > SAFE_INTEGER or value.denominator > SAFE_INTEGER:
        raise ValueError("MEDIA_SAMPLE_TIME_UNREPRESENTABLE")
    return {"schema_version": 1, "value": value.numerator, "timescale": value.denominator}


def handle(payload: dict, context: HandlerContext) -> dict:
    _keys(payload, {"schema_version", "task_type", "input_path", "source_digest", "stream_index", "samples", "output_dir", "max_frame_edge", "timeout_seconds"})
    if payload["schema_version"] != 1 or payload["task_type"] != "media.sample.v1":
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: task identity")
    digest = payload["source_digest"]
    if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: source digest")
    stream_index = _integer(payload["stream_index"])
    edge = _integer(payload["max_frame_edge"], 1)
    _integer(payload["timeout_seconds"], 1)
    if not isinstance(payload["samples"], list) or not payload["samples"]:
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: explicit sample ranges required")
    samples, seen = [], set()
    for item in payload["samples"]:
        _keys(item, {"sample_id", "kind", "start", "end"})
        identity = item["sample_id"]
        if not isinstance(identity, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", identity) or identity in seen or item["kind"] not in {"frame", "audio"}:
            raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: unique safe sample ID and kind required")
        start, end = _time(item["start"]), _time(item["end"])
        if start >= end:
            raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: empty source range")
        seen.add(identity)
        samples.append((item, start, end))
    source = require_file(payload["input_path"], "input_path")
    if not isinstance(payload["output_dir"], str) or not payload["output_dir"]:
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: output directory")
    target = Path(payload["output_dir"]).absolute()
    # Host owns the staging directory. Never replace an existing file or clean an
    # arbitrary caller directory. Every newly created file is tracked below.
    if not target.is_dir() or target.is_symlink():
        raise ValueError("MEDIA_SAMPLE_STAGING_REQUIRED")
    started = time.monotonic()

    def check() -> None:
        if context.cancelled.is_set():
            raise CommandCancelled("media sampling cancelled")
        if time.monotonic() - started >= context.timeout_seconds:
            raise CommandTimedOut("media sampling deadline reached")

    def remaining() -> float:
        check()
        return context.timeout_seconds - (time.monotonic() - started)

    def source_hash() -> str:
        value = hashlib.sha256()
        with source.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                check()
                value.update(chunk)
        return value.hexdigest()

    if source_hash() != digest:
        raise ValueError("MEDIA_SAMPLE_SOURCE_MISMATCH")
    inspected = run_ffprobe(["-v", "error", "-select_streams", str(stream_index), "-show_streams", "-show_frames", "-show_entries", "stream=index,codec_type,time_base,sample_rate,channels,color_transfer:frame=pts,best_effort_timestamp,duration,pkt_duration,nb_samples", "-of", "json", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
    probe = json.loads(inspected.stdout)
    streams = probe.get("streams", [])
    if len(streams) != 1 or streams[0].get("index") != stream_index:
        raise ValueError("MEDIA_SAMPLE_STREAM_MISSING")
    stream = streams[0]
    timebase = Fraction(stream["time_base"])
    if timebase <= 0:
        raise ValueError("MEDIA_SAMPLE_TIMEBASE_INVALID")
    frames = probe.get("frames", [])
    pts: list[int] = []
    for frame in frames:
        point = frame.get("pts")
        if not isinstance(point, int) or frame.get("best_effort_timestamp") != point or abs(point) > SAFE_INTEGER:
            raise ValueError("MEDIA_SAMPLE_FRAME_PTS_REQUIRED")
        if pts and point <= pts[-1]:
            raise ValueError("MEDIA_SAMPLE_PTS_NONMONOTONIC")
        pts.append(point)
    tool = run_ffmpeg(["-version"], timeout_seconds=remaining(), cancelled=context.cancelled.is_set).stdout.splitlines()[0]
    published: list[Path] = []
    results = []
    consumed = 0
    try:
        for item, start, end in samples:
            check()
            identity, kind = item["sample_id"], item["kind"]
            extension = "png" if kind == "frame" else "wav"
            temporary = context.workspace / f"{identity}.{extension}"
            if kind == "frame":
                if stream["codec_type"] != "video":
                    raise ValueError("MEDIA_SAMPLE_STREAM_KIND_MISMATCH")
                if stream.get("color_transfer") in {"smpte2084", "arib-std-b67"}:
                    raise ValueError("MEDIA_SAMPLE_HDR_CONVERSION_REQUIRED")
                candidates = [index for index, point in enumerate(pts) if start <= point * timebase < end]
                if not candidates:
                    raise ValueError("MEDIA_SAMPLE_FRAME_UNAVAILABLE")
                index = candidates[0]
                actual_start = pts[index] * timebase
                duration = frames[index].get("duration", frames[index].get("pkt_duration"))
                actual_end = pts[index + 1] * timebase if index + 1 < len(pts) else actual_start + duration * timebase if isinstance(duration, int) and duration > 0 else None
                if actual_end is None or actual_end <= actual_start or actual_end > end:
                    raise ValueError("MEDIA_SAMPLE_FRAME_COVERAGE_UNPROVEN")
                # Decode by index and independently check emitted PTS. No decimal seek,
                # rate conversion, duplicate frame, or guessed fps-derived timestamp.
                filters = f"select=eq(n\\,{index}),showinfo,scale=w='min({edge},iw)':h='min({edge},ih)':force_original_aspect_ratio=decrease"
                result = run_ffmpeg(["-v", "info", "-copyts", "-i", str(source), "-map", f"0:{stream_index}", "-vf", filters, "-frames:v", "1", "-fps_mode", "passthrough", "-c:v", "png", "-pix_fmt", "rgb24", str(temporary)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
                emitted = re.findall(r"\bn:\s*\d+\s+pts:\s*(-?\d+)\s+pts_time:", result.stderr)
                bases = re.findall(r"config in time_base:\s*(\d+/\d+)", result.stderr)
                if emitted != [str(pts[index])] or len(bases) != 1 or Fraction(bases[0]) != timebase:
                    raise ValueError("MEDIA_SAMPLE_DECODE_IDENTITY_MISMATCH")
                raw = temporary.read_bytes()
                if raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR":
                    raise ValueError("MEDIA_SAMPLE_IMAGE_INVALID")
                detail = {"kind": "frame", "frame_index": index, "source_pts": pts[index], "source_time_base": {"numerator": timebase.numerator, "denominator": timebase.denominator}, "width": int.from_bytes(raw[16:20], "big"), "height": int.from_bytes(raw[20:24], "big"), "mime_type": "image/png"}
            else:
                if stream["codec_type"] != "audio":
                    raise ValueError("MEDIA_SAMPLE_STREAM_KIND_MISMATCH")
                rate = int(stream["sample_rate"])
                first, last = start * rate, end * rate
                if first.denominator != 1 or last.denominator != 1 or last.numerator > SAFE_INTEGER:
                    raise ValueError("MEDIA_SAMPLE_AUDIO_TIME_NOT_ALIGNED")
                # Check original decoded timestamps BEFORE asettb can quantize them.
                # A coarse container timebase is not proof of an exact sample boundary.
                for point, frame in zip(pts, frames):
                    count = frame.get("nb_samples")
                    if not isinstance(count, int) or count <= 0:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_COUNT_REQUIRED")
                    origin = point * timebase * rate
                    if origin < last and origin + count > first and origin.denominator != 1:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_TIME_NOT_ALIGNED: original source PTS is off the sample grid")
                filters = f"asettb=1/{rate},atrim=start_pts={first.numerator}:end_pts={last.numerator},ashowinfo,asetpts=PTS-STARTPTS"
                result = run_ffmpeg(["-v", "info", "-copyts", "-i", str(source), "-map", f"0:{stream_index}", "-af", filters, "-c:a", "pcm_s16le", str(temporary)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
                chunks = [(int(point), int(count)) for point, count in re.findall(r"\bn:\d+\s+pts:(-?\d+)\s+pts_time:.*?nb_samples:(\d+)", result.stderr)]
                cursor = first.numerator
                for point, count in chunks:
                    if point != cursor or count <= 0:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_GAP")
                    cursor += count
                if not chunks or cursor != last.numerator:
                    raise ValueError("MEDIA_SAMPLE_AUDIO_COVERAGE_UNPROVEN")
                with wave.open(str(temporary), "rb") as wav:
                    if wav.getframerate() != rate or wav.getnchannels() != stream["channels"] or wav.getnframes() != last - first or wav.getsampwidth() != 2:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_ENCODING_MISMATCH")
                    detail = {"kind": "audio", "sample_rate": rate, "channels": wav.getnchannels(), "sample_count": wav.getnframes(), "mime_type": "audio/wav"}
                actual_start, actual_end = start, end
            size = temporary.stat().st_size
            if size <= 0:
                raise ValueError("MEDIA_SAMPLE_OUTPUT_BUDGET_EXCEEDED")
            content_digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
            destination = target / f"{identity}.{extension}"
            # Exclusive creation avoids overwriting data in a retry/collision.
            with destination.open("xb") as output:
                published.append(destination)
                with temporary.open("rb") as content:
                    while chunk := content.read(1024 * 1024):
                        check()
                        output.write(chunk)
            consumed += size
            results.append({"schema_version": 1, "sample_id": identity, "source_digest": digest, "stream_index": stream_index, "requested_start": item["start"], "requested_end": item["end"], "actual_start": _rational(actual_start), "actual_end": _rational(actual_end), "path": str(destination), "content_digest": content_digest, "byte_length": size, "policy_version": POLICY, "ffmpeg_version": tool, "detail": detail})
            context.progress(len(results) / len(samples))
        if source_hash() != digest:
            raise ValueError("MEDIA_SAMPLE_SOURCE_CHANGED")
        check()
        return {"outputs": results, "metrics": {"sample_count": len(results), "output_bytes": consumed}}
    except BaseException as cause:
        cleanup = []
        for destination in published:
            try:
                destination.unlink()
            except OSError as error:
                cleanup.append(error)
        if cleanup:
            raise BaseExceptionGroup("media sampling and output cleanup failed", [cause, *cleanup]) from cause
        raise
