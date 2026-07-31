from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, require_file
from ..adapters.ffmpeg import run_ffmpeg


def handle(payload: dict, context: HandlerContext) -> dict:
    source = require_file(payload.get("input_path"), "input_path")
    target_dir = output_directory(payload.get("output_dir"))
    temporary = context.workspace / "preview.mp4"
    run_ffmpeg(["-y", "-i", str(source), "-c", "copy", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    preview = collect_output(temporary, target_dir / "preview.mp4")
    context.progress(1.0)
    return {"outputs": [{"kind": "preview", "path": preview, "source_kind": payload.get("source_kind", "proxy")}], "metrics": {}}
