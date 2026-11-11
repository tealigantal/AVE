"""Ephemeral fixed-record media index; no project state or in-memory frame list."""
from __future__ import annotations

import math
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Iterator

_MISSING = -(1 << 63)
_RECORD = struct.Struct("<qqqqq128s?d")


@dataclass(frozen=True)
class Frame:
    pts: int
    duration: int | None
    pkt_duration: int | None
    nb_samples: int | None
    pkt_pos: str | None
    matched: bool = False
    score: float | None = None


class FrameIndex:
    def __init__(self, path: Path):
        self.file: BinaryIO = path.open("w+b", buffering=0)
        self.count = 0

    def __enter__(self) -> FrameIndex:
        return self

    def __exit__(self, *_: object) -> None:
        self.file.close()

    def _pack(self, row: Frame) -> bytes:
        values = [row.pts, row.duration, row.pkt_duration, row.nb_samples]
        if any(value is not None and (value <= _MISSING or value >= 1 << 63) for value in values):
            raise ValueError("MEDIA_FRAME_INDEX_INTEGER_UNREPRESENTABLE")
        position = b"" if row.pkt_pos is None else row.pkt_pos.encode("ascii")
        if len(position) >= 128 or b"\0" in position:
            raise ValueError("MEDIA_FRAME_INDEX_POSITION_UNREPRESENTABLE")
        return _RECORD.pack(*(value if value is not None else _MISSING for value in values), len(position) if row.pkt_pos is not None else -1, position, row.matched, row.score if row.score is not None else math.nan)

    def append(self, row: Frame) -> None:
        self.file.seek(self.count * _RECORD.size)
        if self.file.write(self._pack(row)) != _RECORD.size:
            raise OSError("MEDIA_FRAME_INDEX_SHORT_WRITE")
        self.count += 1

    def get(self, index: int) -> Frame | None:
        if index < 0 or index >= self.count:
            return None
        self.file.seek(index * _RECORD.size)
        data = self.file.read(_RECORD.size)
        if len(data) != _RECORD.size:
            raise ValueError("MEDIA_FRAME_INDEX_CORRUPT")
        pts, duration, packet_duration, samples, length, position, matched, score = _RECORD.unpack(data)
        if length < -1 or length >= 128:
            raise ValueError("MEDIA_FRAME_INDEX_CORRUPT")
        return Frame(pts, None if duration == _MISSING else duration, None if packet_duration == _MISSING else packet_duration, None if samples == _MISSING else samples, None if length == -1 else position[:length].decode("ascii"), matched, None if math.isnan(score) else score)

    def set(self, index: int, row: Frame) -> None:
        if not 0 <= index < self.count:
            raise ValueError("MEDIA_FRAME_INDEX_RANGE")
        self.file.seek(index * _RECORD.size)
        if self.file.write(self._pack(row)) != _RECORD.size:
            raise OSError("MEDIA_FRAME_INDEX_SHORT_WRITE")

    def lower_bound(self, pts: int) -> int:
        first, last = 0, self.count
        while first < last:
            middle = (first + last) // 2
            row = self.get(middle)
            if row is None:
                raise ValueError("MEDIA_FRAME_INDEX_CORRUPT")
            if row.pts < pts:
                first = middle + 1
            else:
                last = middle
        return first

    def rows(self) -> Iterator[Frame]:
        for index in range(self.count):
            row = self.get(index)
            if row is None:
                raise ValueError("MEDIA_FRAME_INDEX_CORRUPT")
            yield row
