from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageOps, __version__ as pillow_version

from .context import HandlerContext
from ..adapters.ffmpeg import CommandCancelled
from ..adapters.filesystem import collect_output, output_directory, require_file, sha256_file
from ..adapters.still_image import bounded_jpeg_draft, thumbnail_size, verify_low_resource_png


def handle(payload: dict, context: HandlerContext) -> dict:
    """Produce a source-bound, orientation-normalized lossless preview image."""
    allowed = {"task_type", "input_path", "output_dir", "source_digest", "max_edge", "timeout_seconds"}
    if set(payload) - allowed or payload.get("task_type") != "media.still-proxy.v1":
        raise ValueError("STILL_PROXY_REQUEST_INVALID: unexpected or missing task type")
    if any(not isinstance(payload.get(field), str) or not payload[field] for field in ("input_path", "output_dir")):
        raise ValueError("STILL_PROXY_REQUEST_INVALID: input and output paths are required")
    digest, edge = payload.get("source_digest"), payload.get("max_edge")
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise ValueError("STILL_PROXY_REQUEST_INVALID: source digest is required")
    if isinstance(edge, bool) or not isinstance(edge, int) or edge < 2 or edge > 960:
        raise ValueError("STILL_PROXY_REQUEST_INVALID: max_edge must be between 2 and 960")
    source = require_file(payload.get("input_path"), "input_path")

    def check() -> None:
        if context.cancelled.is_set():
            raise CommandCancelled("still-image proxy cancelled")

    check()
    if sha256_file(source) != digest:
        raise ValueError("STILL_PROXY_SOURCE_REBOUND: source digest changed")
    png_verified = verify_low_resource_png(source, cancelled=context.cancelled.is_set, resource_code="STILL_PROXY_RESOURCE_EXHAUSTED")
    with Image.open(source) as encoded:
        if encoded.format not in {"JPEG", "PNG", "WEBP", "GIF"} or getattr(encoded, "n_frames", 1) != 1:
            raise ValueError("STILL_PROXY_ANIMATION_UNSUPPORTED: source must be a supported still image")
        # Only JPEG offers Pillow's bounded DCT-scale decode. Other formats
        # retain the existing pre-decode limit rather than allocating their
        # full-resolution pixel surfaces under the low-resource budget.
        if encoded.width * encoded.height > 24_000_000 and encoded.format != "JPEG":
            raise ValueError("STILL_PROXY_RESOURCE_EXHAUSTED: image requires a bounded decoder")
        if not png_verified:
            encoded.verify()
    check()
    temporary = context.workspace / "still-proxy.png"
    with Image.open(source) as encoded:
        orientation = encoded.getexif().get(274, 1)
        if not isinstance(orientation, int) or isinstance(orientation, bool) or orientation not in range(0, 9):
            raise ValueError("STILL_PROXY_ORIENTATION_INVALID: invalid EXIF orientation")
        has_alpha = "A" in encoded.getbands() or "transparency" in encoded.info
        icc = encoded.info.get("icc_profile")
        large_jpeg = encoded.format == "JPEG" and encoded.width * encoded.height > 24_000_000
        original_width, original_height = encoded.size
        if orientation in (5, 6, 7, 8):
            original_width, original_height = original_height, original_width
        desired_size = thumbnail_size(original_width, original_height, edge)
        if large_jpeg:
            # draft() requests a decoder-native 1/2, 1/4 or 1/8 reduction
            # before exif_transpose()/convert() cause Pillow to load pixels.
            # Check the actual decoder choice: unsupported modes must fail
            # before decoding rather than falling back to a huge allocation.
            bounded_jpeg_draft(encoded)
            check()
        image = ImageOps.exif_transpose(encoded).convert("RGBA" if has_alpha else "RGB")
        if large_jpeg:
            # JPEG's reduced decoder rounds source dimensions up. Derive the
            # final aspect from the original oriented dimensions, not those
            # rounded decoded dimensions, so odd-sized photos keep the same
            # geometry as the existing full-resolution thumbnail policy.
            if image.size != desired_size:
                image = image.resize(desired_size, Image.Resampling.LANCZOS)
        else:
            image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        image.save(temporary, "PNG", **({"icc_profile": icc} if isinstance(icc, bytes) else {}))
        width, height = image.size
    check()
    if sha256_file(source) != digest:
        raise ValueError("STILL_PROXY_SOURCE_REBOUND: source changed during preparation")
    target = output_directory(payload.get("output_dir"))
    path = Path(collect_output(temporary, target / "still-proxy.png"))
    return {"outputs": [{"kind": "still_proxy", "path": str(path), "source_digest": digest,
                         "content_digest": sha256_file(path), "byte_length": path.stat().st_size,
                         "width": width, "height": height, "alpha": has_alpha,
                         "policy": "still-png-lanczos-v1", "producer_version": f"Pillow {pillow_version}{'; jpeg-draft-r1' if large_jpeg else ''}"}], "metrics": {}}
