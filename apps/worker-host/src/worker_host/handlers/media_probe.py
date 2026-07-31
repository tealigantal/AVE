from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import require_file
from ..adapters.ffprobe import probe


def handle(payload: dict, context: HandlerContext) -> dict:
    path = require_file(payload.get("input_path"), "input_path")
    context.progress(0.1)
    value = probe(path, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    context.progress(1.0)
    return {"outputs": [{"kind": "media.probe", "input_path": str(path), "value": value}], "metrics": {"streams": len(value.get("streams", []))}}
