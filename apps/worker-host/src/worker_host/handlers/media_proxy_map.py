from __future__ import annotations

from .context import HandlerContext
from ..adapters.ffprobe import probe
from ..adapters.filesystem import require_file
from ..adapters.proxy_map import build_proxy_map


def handle(payload: dict, context: HandlerContext) -> dict:
    original = require_file(payload.get("original_path"), "original_path")
    proxy = require_file(payload.get("proxy_path"), "proxy_path")
    original_probe = probe(original, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    context.progress(0.4)
    proxy_probe = probe(proxy, timeout_seconds=context.timeout_seconds, cancelled=context.cancelled.is_set)
    original_video = next((stream for stream in original_probe.get("streams", []) if stream.get("codec_type") == "video"), None)
    original_audio = next((stream for stream in original_probe.get("streams", []) if stream.get("codec_type") == "audio"), None)
    proxy_map = build_proxy_map(original_probe, proxy_probe, video_stream_index=int(original_video["index"]) if original_video else 0, audio_stream_index=int(original_audio["index"]) if original_audio else None)
    context.progress(1.0)
    return {"outputs": [{"kind": "proxy-map", "original_path": str(original), "proxy_path": str(proxy), "proxy_map": proxy_map}], "metrics": {"original_timing": original_probe.get("timing"), "proxy_timing": proxy_probe.get("timing")}}
