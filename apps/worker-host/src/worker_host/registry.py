from __future__ import annotations

from collections.abc import Callable

from .handlers import analysis, build_preview_proxy, build_proxy, build_still_proxy, build_thumbnail, build_waveform, media_browse, media_decode_check, media_fingerprint, media_probe_v2, media_proxy_map, media_sample, media_scene_scan_v2, qc_master, render_executor_identity, render_segment, render_segment_assembly, render_timeline

Handler = Callable[[dict, object], dict]

HANDLERS: dict[str, Handler] = {
    "media.browse.v1": media_browse.handle,
    "analysis.v1": analysis.handle,
    "media.probe.v2": media_probe_v2.handle,
    "media.decode_check.v1": media_decode_check.handle,
    "media.fingerprint.v1": media_fingerprint.handle,
    "media.proxy.v1": build_proxy.handle,
    "media.preview-proxy.v1": build_preview_proxy.handle,
    "media.still-proxy.v1": build_still_proxy.handle,
    "media.proxy.map.v1": media_proxy_map.handle,
    "media.thumbnail.v1": build_thumbnail.handle,
    "media.waveform.v1": build_waveform.handle,
    "media.sample.v1": media_sample.handle,
    "media.scene_scan.v2": media_scene_scan_v2.handle,
    "render.timeline.v1": render_timeline.handle,
    "render.segment.v1": render_segment.handle,
    "render.segment.assemble.v1": render_segment_assembly.handle,
    "render.executor-identity.v1": render_executor_identity.handle,
    "qc.master.v1": qc_master.handle,
}
