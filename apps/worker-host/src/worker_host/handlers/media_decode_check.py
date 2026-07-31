from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import require_file
from ..adapters.ffmpeg import run_ffmpeg


def handle(payload: dict, context: HandlerContext) -> dict:
    path = require_file(payload.get("input_path"), "input_path")
    run_ffmpeg(["-v", "error", "-i", str(path), "-f", "null", "-"], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    context.progress(1.0)
    return {"outputs": [{"kind": "media.decode_check", "input_path": str(path), "status": "passed"}], "metrics": {}}
