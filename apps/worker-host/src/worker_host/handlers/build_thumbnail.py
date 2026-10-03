from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, require_file
from ..adapters.ffmpeg import run_ffmpeg


def handle(payload: dict, context: HandlerContext) -> dict:
    source = require_file(payload.get("input_path"), "input_path")
    target_dir = output_directory(payload.get("output_dir"))
    from ..adapters.ffprobe import probe
    if probe(source, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set).get("still_image"):
        from ..adapters.still_image import thumbnail
        temporary = context.workspace / "thumbnail.png"
        thumbnail(source, temporary, 512)
        path = collect_output(temporary, target_dir / "thumbnail.png")
        context.progress(1.0)
        return {"outputs": [{"kind": "thumbnail", "path": path}], "metrics": {}}
    temporary = context.workspace / "thumbnail.jpg"
    run_ffmpeg(["-y", "-i", str(source), "-frames:v", "1", "-q:v", "3", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    path = collect_output(temporary, target_dir / "thumbnail.jpg")
    context.progress(1.0)
    return {"outputs": [{"kind": "thumbnail", "path": path}], "metrics": {}}
