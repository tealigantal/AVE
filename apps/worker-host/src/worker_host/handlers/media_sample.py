"""Extract actual source-bound frames/audio, never infer scene labels or dialogue."""
from __future__ import annotations

from builtins import BaseExceptionGroup

import hashlib
import json
import re
import tempfile
import time
import wave
from fractions import Fraction
from pathlib import Path

from .context import HandlerContext
from .frame_index import Frame, FrameIndex
from .media_timing import exact_indexed_tail_duration
from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut, low_resource_decode_args, low_resource_filter_args, low_resource_video_encoder_args, run_ffmpeg, run_ffprobe
from ..adapters.filesystem import require_file
from ..adapters.animated_image import prepare_video
from ..adapters.still_image import animation_facts

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
    with tempfile.TemporaryDirectory(prefix="sample-index-", dir=context.workspace) as directory:
        with FrameIndex(Path(directory) / "frames.bin") as index:
            return _handle_indexed(payload, context, index)


def _handle_indexed(payload: dict, context: HandlerContext, index: FrameIndex) -> dict:
    _keys(payload, {"schema_version", "task_type", "input_path", "source_digest", "stream_index", "samples", "output_dir", "max_frame_edge", "timeout_seconds"})
    if payload["schema_version"] != 1 or payload["task_type"] != "media.sample.v1":
        raise ValueError("MEDIA_SAMPLE_INPUT_INVALID: task identity")
    if isinstance(payload["samples"], list) and len(payload["samples"]) == 1 and payload["samples"][0].get("kind") == "image":
        return _still_sample(payload, context)
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
    original_source = require_file(payload["input_path"], "input_path")
    source = original_source
    animation = animation_facts(original_source)
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
        with original_source.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                check()
                value.update(chunk)
        return value.hexdigest()

    if source_hash() != digest:
        raise ValueError("MEDIA_SAMPLE_SOURCE_MISMATCH")
    if animation is not None:
        source = context.workspace / "sample-animation.mkv"
        prepare_video(original_source, source, timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
    inspected = run_ffprobe([*low_resource_decode_args(), "-v", "error", "-select_streams", str(stream_index), "-show_streams", "-show_entries", "stream=index,id,codec_type,time_base,sample_rate,channels,color_transfer", "-of", "json", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set)
    probe = json.loads(inspected.stdout)
    streams = probe.get("streams", [])
    if len(streams) != 1 or streams[0].get("index") != stream_index:
        raise ValueError("MEDIA_SAMPLE_STREAM_MISSING")
    stream = streams[0]
    timebase = Fraction(stream["time_base"])
    if timebase <= 0:
        raise ValueError("MEDIA_SAMPLE_TIMEBASE_INVALID")
    frame_count = 0
    previous: int | None = None

    def frame_line(line: str) -> None:
        nonlocal frame_count, previous
        check()
        if not line:
            return
        fields = dict(part.split("=", 1) for part in line.split("|") if "=" in part)
        def number(name: str) -> int | None:
            raw = fields.get(name)
            return int(raw) if raw is not None and re.fullmatch(r"-?\d+", raw) else None
        point = number("pts")
        if point is None or number("best_effort_timestamp") != point or abs(point) > SAFE_INTEGER:
            raise ValueError("MEDIA_SAMPLE_FRAME_PTS_REQUIRED")
        if animation is not None and point >= animation["duration_ms"]:
            return
        if previous is not None and point <= previous:
            raise ValueError("MEDIA_SAMPLE_PTS_NONMONOTONIC")
        index.append(Frame(point, number("duration"), number("pkt_duration"), number("nb_samples"), fields.get("pkt_pos")))
        previous = point
        frame_count += 1

    run_ffprobe([*low_resource_decode_args(), "-v", "error", "-select_streams", str(stream_index), "-show_frames", "-show_entries", "frame=pts,best_effort_timestamp,duration,pkt_duration,nb_samples,pkt_pos", "-of", "compact=p=0:nk=0", str(source)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stdout_line=frame_line, capture_limit=8192)
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
                first_pts = -(-(start / timebase).numerator // (start / timebase).denominator)
                frame_index = index.lower_bound(first_pts)
                frame = index.get(frame_index)
                if frame is None or frame.pts * timebase >= end:
                    raise ValueError("MEDIA_SAMPLE_FRAME_UNAVAILABLE")
                point, duration, packet_duration = frame.pts, frame.duration, frame.pkt_duration
                actual_start = point * timebase
                duration = duration if duration is not None else packet_duration
                if frame_index + 1 == frame_count and duration is None:
                    duration = exact_indexed_tail_duration(source, stream, index, frame_count, remaining(), context.cancelled.is_set)
                following = index.get(frame_index + 1)
                actual_end = following.pts * timebase if following else actual_start + duration * timebase if isinstance(duration, int) and duration > 0 else None
                if actual_end is None or actual_end <= actual_start or actual_end > end:
                    raise ValueError("MEDIA_SAMPLE_FRAME_COVERAGE_UNPROVEN")
                # Decode by index and independently check emitted PTS. No decimal seek,
                # rate conversion, duplicate frame, or guessed fps-derived timestamp.
                filters = f"select=eq(n\\,{frame_index}),showinfo,scale=w='min({edge},iw)':h='min({edge},ih)':force_original_aspect_ratio=decrease"
                emitted: list[str] = []
                bases: list[str] = []
                def frame_diagnostic(line: str) -> None:
                    check()
                    emitted.extend(re.findall(r"\bn:\s*\d+\s+pts:\s*(-?\d+)\s+pts_time:", line))
                    bases.extend(re.findall(r"config in time_base:\s*(\d+/\d+)", line))
                    if len(emitted) > 1 or len(bases) > 1:
                        raise ValueError("MEDIA_SAMPLE_DECODE_IDENTITY_MISMATCH")
                run_ffmpeg([*low_resource_filter_args(), "-v", "info", "-copyts", *low_resource_decode_args(), "-i", str(source), "-map", f"0:{stream_index}", "-vf", filters, "-frames:v", "1", "-fps_mode", "passthrough", "-c:v", "png", *low_resource_video_encoder_args(), "-pix_fmt", "rgb24", str(temporary)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stderr_line=frame_diagnostic, capture_limit=8192)
                if emitted != [str(point)] or len(bases) != 1 or Fraction(bases[0]) != timebase:
                    raise ValueError("MEDIA_SAMPLE_DECODE_IDENTITY_MISMATCH")
                with temporary.open("rb") as preview_input:
                    raw = preview_input.read(24)
                if raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR":
                    raise ValueError("MEDIA_SAMPLE_IMAGE_INVALID")
                detail = {"kind": "frame", "frame_index": frame_index, "source_pts": point, "source_time_base": {"numerator": timebase.numerator, "denominator": timebase.denominator}, "width": int.from_bytes(raw[16:20], "big"), "height": int.from_bytes(raw[20:24], "big"), "mime_type": "image/png"}
            else:
                if stream["codec_type"] != "audio":
                    raise ValueError("MEDIA_SAMPLE_STREAM_KIND_MISMATCH")
                rate = int(stream["sample_rate"])
                first, last = start * rate, end * rate
                if first.denominator != 1 or last.denominator != 1 or last.numerator > SAFE_INTEGER:
                    raise ValueError("MEDIA_SAMPLE_AUDIO_TIME_NOT_ALIGNED")
                # Check original decoded timestamps BEFORE asettb can quantize them.
                # A coarse container timebase is not proof of an exact sample boundary.
                for row in index.rows():
                    check()
                    point, count = row.pts, row.nb_samples
                    if not isinstance(count, int) or count <= 0:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_COUNT_REQUIRED")
                    origin = point * timebase * rate
                    if origin < last and origin + count > first and origin.denominator != 1:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_TIME_NOT_ALIGNED: original source PTS is off the sample grid")
                # Reconcile packet timestamp overlaps/gaps before measuring the
                # requested window. Hard compensation drops overlap or inserts
                # silence; async=1 disables soft stretching. Keep absolute PTS
                # until after the continuity/coverage check and never edit source.
                filters = f"aresample={rate}:async=1:min_comp=0:min_hard_comp=0:first_pts=0,asettb=1/{rate},atrim=start_pts={first.numerator}:end_pts={last.numerator},ashowinfo,asetpts=PTS-STARTPTS"
                cursor = first.numerator
                seen_chunks = 0
                def audio_line(line: str) -> None:
                    nonlocal cursor, seen_chunks
                    match = re.search(r"\bn:\d+\s+pts:(-?\d+)\s+pts_time:.*?nb_samples:(\d+)", line)
                    if match:
                        point, count = int(match[1]), int(match[2])
                        if point != cursor or count <= 0:
                            raise ValueError("MEDIA_SAMPLE_AUDIO_GAP")
                        cursor += count
                        seen_chunks += 1
                run_ffmpeg([*low_resource_filter_args(), "-v", "info", "-copyts", *low_resource_decode_args(), "-i", str(source), "-map", f"0:{stream_index}", "-af", filters, "-c:a", "pcm_s16le", str(temporary)], timeout_seconds=remaining(), cancelled=context.cancelled.is_set, stderr_line=audio_line, capture_limit=8192)
                if not seen_chunks or cursor != last.numerator:
                    raise ValueError("MEDIA_SAMPLE_AUDIO_COVERAGE_UNPROVEN")
                with wave.open(str(temporary), "rb") as wav:
                    if wav.getframerate() != rate or wav.getnchannels() != stream["channels"] or wav.getnframes() != last - first or wav.getsampwidth() != 2:
                        raise ValueError("MEDIA_SAMPLE_AUDIO_ENCODING_MISMATCH")
                    detail = {"kind": "audio", "sample_rate": rate, "channels": wav.getnchannels(), "sample_count": wav.getnframes(), "mime_type": "audio/wav"}
                actual_start, actual_end = start, end
            size = temporary.stat().st_size
            if size <= 0:
                raise ValueError("MEDIA_SAMPLE_OUTPUT_BUDGET_EXCEEDED")
            output_hash = hashlib.sha256()
            destination = target / f"{identity}.{extension}"
            # Exclusive creation avoids overwriting data in a retry/collision.
            with destination.open("xb") as output:
                published.append(destination)
                with temporary.open("rb") as content:
                    while chunk := content.read(1024 * 1024):
                        check()
                        output.write(chunk)
                        output_hash.update(chunk)
            content_digest = output_hash.hexdigest()
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


def _still_sample(payload: dict, context: HandlerContext) -> dict:
    """Static identity: zero coordinates explicitly carry no physical duration."""
    from ..adapters.ffprobe import probe
    source = require_file(payload["input_path"], "input_path")
    item = _keys(payload["samples"][0], {"sample_id", "kind", "start", "end"})
    if _time(item["start"]) != 0 or _time(item["end"]) != 0 or not isinstance(item["sample_id"], str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", item["sample_id"]):
        raise ValueError("MEDIA_IMAGE_STATIC_IDENTITY_INVALID")
    started = time.monotonic()
    def check() -> None:
        if context.cancelled.is_set():
            raise CommandCancelled("image sampling cancelled")
        if time.monotonic() - started >= context.timeout_seconds:
            raise CommandTimedOut("image sampling deadline reached")
    def source_hash() -> str:
        digest = hashlib.sha256()
        with source.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                check()
                digest.update(chunk)
        return digest.hexdigest()
    if source_hash() != payload["source_digest"]:
        raise ValueError("MEDIA_SAMPLE_SOURCE_MISMATCH")
    facts = probe(source, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).get("still_image")
    if not facts or facts["stream_index"] != payload["stream_index"]:
        raise ValueError("MEDIA_IMAGE_SOURCE_REQUIRED")
    target = Path(payload["output_dir"]).absolute()
    if not target.is_dir() or target.is_symlink():
        raise ValueError("MEDIA_SAMPLE_STAGING_REQUIRED")
    edge = _integer(payload["max_frame_edge"], 1)
    temporary = context.workspace / "still.png"
    from ..adapters.still_image import thumbnail
    thumbnail(source, temporary, edge, cancelled=context.cancelled.is_set)
    with temporary.open("rb") as handle:
        header = handle.read(33)
    if len(header) < 33 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("MEDIA_IMAGE_DECODE_INVALID")
    destination = target / f"{item['sample_id']}.png"
    created = False
    try:
        output_hash = hashlib.sha256()
        size = 0
        with destination.open("xb") as output:
            created = True
            with temporary.open("rb") as handle:
                while chunk := handle.read(1024 * 1024):
                    check()
                    output.write(chunk)
                    output_hash.update(chunk)
                    size += len(chunk)
        if source_hash() != payload["source_digest"]:
            raise ValueError("MEDIA_IMAGE_SOURCE_CHANGED")
        tool = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).stdout.splitlines()[0]
        zero = {"schema_version": 1, "value": 0, "timescale": 1}
        return {"outputs": [{"schema_version": 1, "sample_id": item["sample_id"], "source_digest": payload["source_digest"], "stream_index": facts["stream_index"], "requested_start": zero, "requested_end": zero, "actual_start": zero, "actual_end": zero, "path": str(destination), "content_digest": output_hash.hexdigest(), "byte_length": size, "policy_version": POLICY, "ffmpeg_version": tool, "detail": {"kind": "image", "width": int.from_bytes(header[16:20], "big"), "height": int.from_bytes(header[20:24], "big"), "mime_type": "image/png"}}], "metrics": {"sample_count": 1, "output_bytes": size}}
    except BaseException as cause:
        if created:
            try:
                destination.unlink()
            except OSError as cleanup:
                raise BaseExceptionGroup("image sampling and cleanup failed", [cause, cleanup]) from cause
        raise
