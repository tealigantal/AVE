"""Bounded, independently verifiable frame tables for a future media protocol.

This is not wired to v1 receipts and does not change their span IDs or digests.
Consumers must stage derived results and publish only after the iterator ends.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import stat
from builtins import BaseExceptionGroup
from collections.abc import Callable, Iterable, Iterator, Mapping
from pathlib import Path
from typing import Any, BinaryIO

_MAX_INTEGER = 9007199254740991
_MAX_LINE = 4096
_FRAME_KEYS = {"frame_index", "pts", "end_pts", "change_score"}
_HEADER_KEYS = {"schema_version", "source_digest", "stream_index", "time_base", "threshold", "policy_version", "ffmpeg_version"}


def _integer(value: Any, minimum: int = 0) -> bool:
    return type(value) is int and minimum <= value <= _MAX_INTEGER


def _header(value: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(value, Mapping) or set(value) != _HEADER_KEYS or value["schema_version"] != 1 or type(value["schema_version"]) is not int:
        raise ValueError("MEDIA_EVIDENCE_HEADER_INVALID")
    timebase = value["time_base"]
    if not isinstance(value["source_digest"], str) or not re.fullmatch(r"[a-f0-9]{64}", value["source_digest"]) or not _integer(value["stream_index"]) or not isinstance(timebase, dict) or set(timebase) != {"numerator", "denominator"} or not all(_integer(timebase[key], 1) for key in timebase):
        raise ValueError("MEDIA_EVIDENCE_HEADER_INVALID")
    threshold = value["threshold"]
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 < threshold <= 100 or value["policy_version"] != "decoded-pixel-change-v1" or not isinstance(value["ffmpeg_version"], str) or not value["ffmpeg_version"]:
        raise ValueError("MEDIA_EVIDENCE_HEADER_INVALID")
    return {**value, "time_base": dict(timebase)}


def _encoded(value: Mapping[str, Any]) -> bytes:
    data = (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode("utf8")
    if len(data) > _MAX_LINE:
        raise ValueError("MEDIA_EVIDENCE_RECORD_TOO_LARGE")
    return data


def _frame(value: Mapping[str, Any], index: int, previous_end: int | None) -> dict[str, Any]:
    if not isinstance(value, Mapping) or set(value) != _FRAME_KEYS or value["frame_index"] != index or not _integer(value["frame_index"]) or not _integer(value["pts"]) or not _integer(value["end_pts"], 1) or value["end_pts"] <= value["pts"] or previous_end is not None and value["pts"] != previous_end:
        raise ValueError("MEDIA_EVIDENCE_FRAME_INVALID")
    score = value["change_score"]
    if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score) or not 0 <= score <= 100:
        raise ValueError("MEDIA_EVIDENCE_FRAME_INVALID")
    return dict(value)


def _identity(value: os.stat_result) -> tuple[int, int, int, int, int]:
    return value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns


def write_frame_table(path: Path, header: Mapping[str, Any], frames: Iterable[Mapping[str, Any]], check: Callable[[], None]) -> dict[str, Any]:
    """Create an exclusive private artifact; unlink only the exact file we own."""
    header = _header(header)
    check()
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | getattr(os, "O_BINARY", 0), 0o600)
    initial = os.fstat(descriptor)
    try:
        handle = os.fdopen(descriptor, "wb")
    except BaseException as failure:
        open_errors: list[BaseException] = []
        try:
            os.close(descriptor)
        except BaseException as error:
            open_errors.append(error)
        try:
            current = path.lstat()
            if stat.S_ISLNK(current.st_mode) or (current.st_dev, current.st_ino) != (initial.st_dev, initial.st_ino):
                raise ValueError("MEDIA_EVIDENCE_CLEANUP_IDENTITY_CHANGED")
            path.unlink()
        except BaseException as error:
            open_errors.append(error)
        if open_errors:
            raise BaseExceptionGroup("media evidence open and cleanup failed", [failure, *open_errors]) from failure
        raise
    digest = hashlib.sha256()
    count = 0
    first: int | None = None
    last: int | None = None
    size = 0
    try:
        if not stat.S_ISREG(initial.st_mode) or initial.st_nlink != 1:
            raise ValueError("MEDIA_EVIDENCE_PATH_INVALID")
        def append(data: bytes) -> None:
            nonlocal size
            check()
            if handle.write(data) != len(data):
                raise OSError("MEDIA_EVIDENCE_WRITE_INCOMPLETE")
            digest.update(data)
            size += len(data)
        append(_encoded(header))
        for item in frames:
            frame = _frame(item, count, last)
            append(_encoded(frame))
            if first is None:
                first = frame["pts"]
            last = frame["end_pts"]
            count += 1
            if count > _MAX_INTEGER:
                raise ValueError("MEDIA_EVIDENCE_FRAME_INVALID")
        if not count:
            raise ValueError("MEDIA_EVIDENCE_EMPTY")
        check()
        handle.flush()
        os.fsync(handle.fileno())
        current = os.fstat(handle.fileno())
        target = path.lstat()
        if stat.S_ISLNK(target.st_mode) or current.st_nlink != 1 or _identity(current) != _identity(target) or current.st_size != size:
            raise ValueError("MEDIA_EVIDENCE_PATH_CHANGED")
        handle.close()
        return {"schema_version": 1, "header": header, "frame_count": count, "start_pts": first, "end_pts": last, "byte_length": size, "sha256": digest.hexdigest()}
    except BaseException as failure:
        errors: list[BaseException] = []
        try:
            handle.close()
        except BaseException as error:
            errors.append(error)
        try:
            current = path.lstat()
            if stat.S_ISLNK(current.st_mode) or (current.st_dev, current.st_ino) != (initial.st_dev, initial.st_ino):
                raise ValueError("MEDIA_EVIDENCE_CLEANUP_IDENTITY_CHANGED")
            path.unlink()
        except FileNotFoundError:
            pass
        except BaseException as error:
            errors.append(error)
        if errors:
            raise BaseExceptionGroup("media evidence and cleanup failed", [failure, *errors]) from failure
        raise


def _decode(line: bytes) -> dict[str, Any]:
    if not line.endswith(b"\n") or len(line) > _MAX_LINE:
        raise ValueError("MEDIA_EVIDENCE_RECORD_INVALID")
    try:
        value = json.loads(line)
    except (ValueError, UnicodeError) as cause:
        raise ValueError("MEDIA_EVIDENCE_RECORD_INVALID") from cause
    if not isinstance(value, dict) or _encoded(value) != line:
        raise ValueError("MEDIA_EVIDENCE_RECORD_INVALID")
    return value


def _scan(handle: BinaryIO, receipt: Mapping[str, Any], check: Callable[[], None]) -> None:
    digest = hashlib.sha256()
    first = last = None
    count = size = 0
    while True:
        check()
        line = handle.readline(_MAX_LINE + 1)
        if not line:
            break
        size += len(line)
        digest.update(line)
        value = _decode(line)
        if size == len(line):
            if _header(value) != receipt["header"]:
                raise ValueError("MEDIA_EVIDENCE_IDENTITY_CHANGED")
        else:
            frame = _frame(value, count, last)
            if first is None:
                first = frame["pts"]
            last = frame["end_pts"]
            count += 1
    if count == 0 or count != receipt["frame_count"] or size != receipt["byte_length"] or first != receipt["start_pts"] or last != receipt["end_pts"] or digest.hexdigest() != receipt["sha256"]:
        raise ValueError("MEDIA_EVIDENCE_HASH_MISMATCH")


def iter_verified_frames(path: Path, receipt: Mapping[str, Any], check: Callable[[], None]) -> Iterator[dict[str, Any]]:
    """Verify the whole file first, then recheck its open identity for each row."""
    if not isinstance(receipt, Mapping) or set(receipt) != {"schema_version", "header", "frame_count", "start_pts", "end_pts", "byte_length", "sha256"} or receipt["schema_version"] != 1 or type(receipt["schema_version"]) is not int or not _integer(receipt["frame_count"], 1) or not _integer(receipt["start_pts"]) or not _integer(receipt["end_pts"], 1) or receipt["end_pts"] <= receipt["start_pts"] or not _integer(receipt["byte_length"], 1) or not isinstance(receipt["sha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", receipt["sha256"]):
        raise ValueError("MEDIA_EVIDENCE_RECEIPT_INVALID")
    _header(receipt["header"])
    check()
    if path.is_symlink():
        raise ValueError("MEDIA_EVIDENCE_PATH_INVALID")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        stream = os.fdopen(descriptor, "rb")
    except BaseException as failure:
        try:
            os.close(descriptor)
        except BaseException as cleanup:
            raise BaseExceptionGroup("media evidence open and cleanup failed", [failure, cleanup]) from failure
        raise
    with stream as handle:
        before = os.fstat(handle.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or _identity(before) != _identity(path.lstat()):
            raise ValueError("MEDIA_EVIDENCE_PATH_INVALID")
        def current() -> None:
            check()
            if _identity(before) != _identity(os.fstat(handle.fileno())) or _identity(before) != _identity(path.lstat()):
                raise ValueError("MEDIA_EVIDENCE_PATH_CHANGED")
        _scan(handle, receipt, check)
        current()
        handle.seek(0)
        second_digest = hashlib.sha256()
        line = handle.readline(_MAX_LINE + 1)
        _decode(line)
        second_digest.update(line)
        previous = None
        for ordinal in range(receipt["frame_count"]):
            current()
            line = handle.readline(_MAX_LINE + 1)
            frame = _frame(_decode(line), ordinal, previous)
            second_digest.update(line)
            previous = frame["end_pts"]
            current()
            yield frame
        current()
        if second_digest.hexdigest() != receipt["sha256"]:
            raise ValueError("MEDIA_EVIDENCE_HASH_MISMATCH")


def iter_scene_spans(frames: Iterable[Mapping[str, Any]], threshold: float) -> Iterator[dict[str, int]]:
    """Derive all v1-equivalent cuts without buffering the verified frame table."""
    if isinstance(threshold, bool) or not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 < threshold <= 100:
        raise ValueError("MEDIA_EVIDENCE_THRESHOLD_INVALID")
    first = previous = None
    ordinal = 0
    span_index = 0
    for item in frames:
        frame = _frame(item, ordinal, None if previous is None else previous["end_pts"])
        if first is not None and frame["change_score"] >= threshold:
            assert previous is not None
            yield {"span_index": span_index, "first_frame_index": first["frame_index"], "last_frame_index": previous["frame_index"], "start_pts": first["pts"], "end_pts": previous["end_pts"]}
            first = None
            span_index += 1
        if first is None:
            first = frame
        previous = frame
        ordinal += 1
    if first is None or previous is None:
        raise ValueError("MEDIA_EVIDENCE_EMPTY")
    yield {"span_index": span_index, "first_frame_index": first["frame_index"], "last_frame_index": previous["frame_index"], "start_pts": first["pts"], "end_pts": previous["end_pts"]}
