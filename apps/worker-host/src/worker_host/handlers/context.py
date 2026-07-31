from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Event
from typing import Callable


@dataclass(frozen=True)
class HandlerContext:
    job_id: str
    workspace: Path
    cancelled: Event
    timeout_seconds: float
    progress: Callable[[float], None]
