from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, require_file
from ..adapters.ffmpeg import run_ffmpeg


def handle(payload: dict, context: HandlerContext) -> dict:
    source = require_file(payload.get("input_path"), "input_path")
    target_dir = output_directory(payload.get("output_dir"))
    temporary = context.workspace / "waveform.png"
    run_ffmpeg(["-y", "-i", str(source), "-filter_complex", "aformat=channel_layouts=mono,showwavespic=s=1200x240", "-frames:v", "1", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    path = collect_output(temporary, target_dir / "waveform.png")
    context.progress(1.0)
    return {"outputs": [{"kind": "waveform", "path": path}], "metrics": {}}
