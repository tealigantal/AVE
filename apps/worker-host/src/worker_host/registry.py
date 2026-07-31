from __future__ import annotations

from collections.abc import Callable

from .handlers import analysis, build_proxy, build_thumbnail, build_waveform, media_decode_check, media_fingerprint, media_probe, media_proxy_map, qc_master, render_master, render_preview, render_timeline

Handler = Callable[[dict, object], dict]

HANDLERS: dict[str, Handler] = {
    "analysis.v1": analysis.handle,
    "media.probe.v1": media_probe.handle,
    "media.decode_check.v1": media_decode_check.handle,
    "media.fingerprint.v1": media_fingerprint.handle,
    "media.proxy.v1": build_proxy.handle,
    "media.proxy.map.v1": media_proxy_map.handle,
    "media.thumbnail.v1": build_thumbnail.handle,
    "media.waveform.v1": build_waveform.handle,
    "render.preview.v1": render_preview.handle,
    "render.master.v1": render_master.handle,
    "render.timeline.v1": render_timeline.handle,
    "qc.master.v1": qc_master.handle,
}
