"""Exact ISO-BMFF sample durations when the decoder omits a tail duration.

This bounded route requires a complete one-packet/one-frame correspondence and
the same integer DTS grid as the selected track's stts table. No FPS, floating
duration, stream-header end, or neighbouring frame is a duration substitute.
"""
from __future__ import annotations

import json
import time
from fractions import Fraction
from pathlib import Path
from typing import BinaryIO, Callable

from ..adapters.ffmpeg import CommandCancelled, CommandTimedOut, run_ffprobe


def _boxes(handle: BinaryIO, start: int, end: int, consume: Callable[[], None] = lambda: None) -> list[tuple[bytes, int, int]]:
    boxes: list[tuple[bytes, int, int]] = []
    while start < end:
        consume()
        if len(boxes) >= 4096:
            raise ValueError("MEDIA_TIMING_CONTAINER_BOX_LIMIT")
        handle.seek(start)
        header = handle.read(8)
        if len(header) != 8:
            raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
        size, kind = int.from_bytes(header[:4], "big"), header[4:]
        width = 8
        if size == 1:
            extended = handle.read(8)
            if len(extended) != 8:
                raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
            size, width = int.from_bytes(extended, "big"), 16
        elif size == 0:
            size = end - start
        if size < width or start + size > end:
            raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
        boxes.append((kind, start + width, start + size))
        start += size
    return boxes


def _one(boxes: list[tuple[bytes, int, int]], kind: bytes) -> tuple[bytes, int, int]:
    found = [box for box in boxes if box[0] == kind]
    if len(found) != 1:
        raise ValueError("MEDIA_TIMING_CONTAINER_EVIDENCE_REQUIRED")
    return found[0]


def _data(handle: BinaryIO, box: tuple[bytes, int, int], limit: int = 1024) -> bytes:
    if box[2] - box[1] > limit:
        raise ValueError("MEDIA_TIMING_CONTAINER_TABLE_LIMIT")
    handle.seek(box[1])
    value = handle.read(box[2] - box[1])
    if len(value) != box[2] - box[1]:
        raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
    return value


def exact_container_tail_duration(source: Path, stream: dict, frames: list[dict], timeout: float, cancelled: Callable[[], bool]) -> int:
    started = time.monotonic()
    boxes_remaining = 4096

    def check() -> None:
        if cancelled():
            raise CommandCancelled("container timing evidence cancelled")
        if time.monotonic() - started >= timeout:
            raise CommandTimedOut("container timing evidence deadline reached")

    def consume_box() -> None:
        nonlocal boxes_remaining
        check()
        boxes_remaining -= 1
        if boxes_remaining < 0:
            raise ValueError("MEDIA_TIMING_CONTAINER_BOX_LIMIT")

    check()
    if not frames or len({frame.get("pts") for frame in frames}) != len(frames):
        raise ValueError("MEDIA_TIMING_CONTAINER_SAMPLE_MISMATCH")
    identity = stream.get("id")
    if not isinstance(identity, str) or not identity.startswith("0x"):
        raise ValueError("MEDIA_TIMING_CONTAINER_EVIDENCE_REQUIRED")
    track_id = int(identity, 16)
    with source.open("rb") as handle:
        top = _boxes(handle, 0, source.stat().st_size, consume_box)
        if any(box[0] == b"moof" for box in top):
            raise ValueError("MEDIA_TIMING_FRAGMENTED_UNSUPPORTED")
        _one(top, b"ftyp")
        moov = _one(top, b"moov")
        matching = []
        movie = _boxes(handle, moov[1], moov[2], consume_box)
        if any(box[0] == b"mvex" for box in movie):
            raise ValueError("MEDIA_TIMING_FRAGMENTED_UNSUPPORTED")
        for track in movie:
            if track[0] != b"trak":
                continue
            children = _boxes(handle, track[1], track[2], consume_box)
            header = _data(handle, _one(children, b"tkhd"))
            offset = 12 if header[:1] == b"\x00" else 20 if header[:1] == b"\x01" else -1
            if offset < 0 or len(header) < offset + 4:
                raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
            if int.from_bytes(header[offset:offset + 4], "big") == track_id:
                matching.append(children)
        if len(matching) != 1:
            raise ValueError("MEDIA_TIMING_CONTAINER_EVIDENCE_REQUIRED")
        mdia = _one(matching[0], b"mdia")
        media = _boxes(handle, mdia[1], mdia[2], consume_box)
        if _data(handle, _one(media, b"hdlr"))[8:12] != b"vide":
            raise ValueError("MEDIA_TIMING_CONTAINER_EVIDENCE_REQUIRED")
        header = _data(handle, _one(media, b"mdhd"))
        offset = 12 if header[:1] == b"\x00" else 20 if header[:1] == b"\x01" else -1
        if offset < 0 or len(header) < offset + 4:
            raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
        scale = int.from_bytes(header[offset:offset + 4], "big")
        if scale <= 0 or Fraction(stream["time_base"]) != Fraction(1, scale):
            raise ValueError("MEDIA_TIMING_CONTAINER_TIMEBASE_MISMATCH")
        minf = _one(media, b"minf")
        stbl = _one(_boxes(handle, minf[1], minf[2], consume_box), b"stbl")
        table = _data(handle, _one(_boxes(handle, stbl[1], stbl[2], consume_box), b"stts"), 8 + len(frames) * 8)
        if len(table) < 8 or table[:4] != bytes(4) or len(table) != 8 + int.from_bytes(table[4:8], "big") * 8:
            raise ValueError("MEDIA_TIMING_CONTAINER_INVALID")
        durations: list[int] = []
        for offset in range(8, len(table), 8):
            check()
            count, delta = int.from_bytes(table[offset:offset + 4], "big"), int.from_bytes(table[offset + 4:offset + 8], "big")
            if count <= 0 or delta <= 0 or len(durations) + count > len(frames):
                raise ValueError("MEDIA_TIMING_CONTAINER_SAMPLE_MISMATCH")
            durations.extend([delta] * count)
    remaining = timeout - (time.monotonic() - started)
    if remaining <= 0:
        raise CommandTimedOut("container timing evidence deadline reached")
    result = json.loads(run_ffprobe(["-v", "error", "-select_streams", str(stream["index"]), "-show_packets", "-show_entries", "packet=pts,dts,pos,flags", "-of", "json", str(source)], timeout_seconds=remaining, cancelled=cancelled).stdout)
    packets = result.get("packets", [])
    if len(packets) != len(frames) or len(durations) != len(frames):
        raise ValueError("MEDIA_TIMING_CONTAINER_SAMPLE_MISMATCH")
    indexed = {}
    for index, packet in enumerate(packets):
        check()
        point, dts, position = packet.get("pts"), packet.get("dts"), packet.get("pos")
        if type(point) is not int or type(dts) is not int or not isinstance(position, str) or not position.isdigit() or not isinstance(packet.get("flags"), str) or "D" in packet["flags"] or point in indexed:
            raise ValueError("MEDIA_TIMING_CONTAINER_SAMPLE_MISMATCH")
        if index and dts - packets[index - 1]["dts"] != durations[index - 1]:
            raise ValueError("MEDIA_TIMING_CONTAINER_DTS_MISMATCH")
        indexed[point] = (position, durations[index])
    for frame in frames:
        check()
        if frame.get("pts") not in indexed or indexed[frame["pts"]][0] != frame.get("pkt_pos"):
            raise ValueError("MEDIA_TIMING_CONTAINER_SAMPLE_MISMATCH")
    return indexed[frames[-1]["pts"]][1]
