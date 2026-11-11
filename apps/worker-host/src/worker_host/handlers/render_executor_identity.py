"""Report the actual local renderer identity without reading project data."""
from __future__ import annotations

import shutil
from pathlib import Path

from .context import HandlerContext
from .render_segment import _hash_file, _regular_identity
from .render_timeline import WORKER_VERSION
from ..adapters.ffmpeg import CommandCancelled, run_ffmpeg


def handle(payload: dict, context: HandlerContext) -> dict:
    if payload != {"task_type": "render.executor-identity.v1"}:
        raise ValueError("RENDER_EXECUTOR_IDENTITY_REQUEST_INVALID")
    path = shutil.which("ffmpeg")
    if not path:
        raise ValueError("RENDER_SEGMENT_FFMPEG_MISSING")
    executable = Path(path).resolve()
    identity = _regular_identity(executable)
    first = _hash_file(executable, context.cancelled.is_set, lambda fraction: context.progress(0.45 * fraction))
    if _regular_identity(executable) != identity:
        raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
    version = run_ffmpeg(["-version"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set, capture_limit=16384)
    lines = (version.stdout or version.stderr).splitlines()
    if not lines or not lines[0].startswith("ffmpeg version ") or len(lines[0]) > 1024:
        raise ValueError("RENDER_EXECUTOR_VERSION_INVALID")
    context.progress(0.5)
    second = _hash_file(executable, context.cancelled.is_set, lambda fraction: context.progress(0.5 + 0.49 * fraction))
    if first != second or _regular_identity(executable) != identity:
        raise ValueError("RENDER_SEGMENT_FFMPEG_IDENTITY_MISMATCH")
    if context.cancelled.is_set():
        raise CommandCancelled("render executor identity cancelled")
    context.progress(1.0)
    return {"outputs": [{"kind": "render_executor_identity", "worker_version": WORKER_VERSION, "ffmpeg_sha256": first, "ffmpeg_version": lines[0]}], "metrics": {}}
