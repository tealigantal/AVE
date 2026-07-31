from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import collect_output, output_directory, require_file
from ..adapters.ffmpeg import run_ffmpeg
from ..adapters.ffprobe import probe
from ..adapters.proxy_map import build_proxy_map


def handle(payload: dict, context: HandlerContext) -> dict:
    source = require_file(payload.get("input_path"), "input_path")
    target_dir = output_directory(payload.get("output_dir"))
    temporary = context.workspace / "proxy.mp4"
    run_ffmpeg(["-y", "-i", str(source), "-vf", "scale=160:-2", "-c:v", "libx264", "-c:a", "aac", str(temporary)], timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    proxy = collect_output(temporary, target_dir / "proxy.mp4")
    original_probe = probe(source, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    proxy_probe = probe(proxy, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    original_video = next((stream for stream in original_probe.get("streams", []) if stream.get("codec_type") == "video"), None)
    original_audio = next((stream for stream in original_probe.get("streams", []) if stream.get("codec_type") == "audio"), None)
    proxy_map = build_proxy_map(original_probe, proxy_probe, video_stream_index=int(original_video["index"]) if original_video else 0, audio_stream_index=int(original_audio["index"]) if original_audio else None)
    context.progress(1.0)
    return {"outputs": [{"kind": "proxy", "path": proxy, "source_kind": "original", "proxy_map": proxy_map}], "metrics": {"proxy_map": proxy_map, "original_timing": original_probe.get("timing"), "proxy_timing": proxy_probe.get("timing")}}
