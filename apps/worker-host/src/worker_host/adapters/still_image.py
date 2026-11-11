import math
import os
import struct
import zlib
from pathlib import Path
from typing import Callable
from PIL import Image, ImageOps

from .ffmpeg import CommandCancelled


_MAX_DECODE_PIXELS = 24_000_000
_MAX_PNG_8BIT_PIXELS = 16_000_000
_MAX_PNG_16BIT_PIXELS = 8_000_000
_MAX_PNG_METADATA_CHUNK = 1024 * 1024
_MAX_PNG_METADATA_TOTAL = 4 * 1024 * 1024
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def verify_low_resource_png(path: Path, *, cancelled: Callable[[], bool] | None = None, resource_code: str = "MEDIA_IMAGE_RESOURCE_EXHAUSTED") -> bool:
    """Validate PNG structure and every chunk CRC without materializing IDAT.

    Return False outside explicit low-resource mode or for a non-PNG source.
    A successful result must still be followed by a real Pillow pixel decode.
    """
    if os.environ.get("AVE_LOW_RESOURCE") != "1":
        return False

    def check() -> None:
        if cancelled and cancelled():
            raise CommandCancelled("PNG validation cancelled")

    def invalid(message: str) -> None:
        raise ValueError(f"MEDIA_IMAGE_PNG_INVALID: {message}")

    with path.open("rb") as source:
        if source.read(8) != _PNG_SIGNATURE:
            return False
        seen_header = seen_idat = ended_idat = seen_palette = seen_icc = seen_exif = False
        metadata_bytes = 0
        color_type: int | None = None
        while True:
            check()
            header = source.read(8)
            if len(header) != 8:
                invalid("truncated PNG chunk header")
            length = struct.unpack(">I", header[:4])[0]
            kind = header[4:]
            if length > 0x7fffffff or not all(65 <= c <= 90 or 97 <= c <= 122 for c in kind) or kind[2] & 0x20:
                invalid("invalid PNG chunk type or length")
            if not seen_header and kind != b"IHDR":
                invalid("IHDR must be the first PNG chunk")
            if kind == b"IHDR" and (seen_header or length != 13):
                invalid("duplicate or malformed IHDR")
            if kind == b"IDAT":
                if ended_idat:
                    invalid("IDAT chunks must be consecutive")
                if color_type == 3 and not seen_palette:
                    invalid("indexed PNG requires a palette")
                seen_idat = True
            elif seen_idat and kind != b"IEND":
                ended_idat = True
            if kind == b"PLTE":
                if seen_palette or seen_idat or not length or length > 768 or length % 3:
                    invalid("invalid PNG palette")
                seen_palette = True
            if kind == b"IEND" and (length or not seen_idat):
                invalid("invalid PNG end chunk")
            if kind[0] & 0x20 == 0 and kind not in {b"IHDR", b"PLTE", b"IDAT", b"IEND"}:
                raise ValueError("MEDIA_IMAGE_PNG_UNSUPPORTED: unknown critical PNG chunk")
            if kind == b"fdAT":
                raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED: animated PNG frames cannot be treated as a still")
            if kind == b"acTL" and length != 8:
                invalid("invalid animation control")
            if kind not in {b"IHDR", b"PLTE", b"IDAT", b"IEND"}:
                metadata_bytes += length
                if length > _MAX_PNG_METADATA_CHUNK or metadata_bytes > _MAX_PNG_METADATA_TOTAL:
                    raise ValueError(f"{resource_code}: PNG metadata exceeds the bounded budget")
            if kind in {b"iCCP", b"eXIf"} and seen_idat:
                raise ValueError("MEDIA_IMAGE_PNG_UNSUPPORTED: late ICC or EXIF cannot be preserved")
            if kind == b"iCCP":
                if seen_icc:
                    invalid("duplicate ICC profile")
                seen_icc = True
            if kind == b"eXIf":
                if seen_exif:
                    invalid("duplicate EXIF metadata")
                seen_exif = True
            # Only bounded header/profile data is retained. IDAT and all other
            # chunks are checked with one fixed-size read buffer.
            retained = bytearray() if kind in {b"IHDR", b"iCCP", b"acTL"} else None
            crc, remaining = zlib.crc32(kind), length
            while remaining:
                check()
                block = source.read(min(1024 * 1024, remaining))
                if not block:
                    invalid("truncated PNG chunk")
                remaining -= len(block)
                crc = zlib.crc32(block, crc)
                if retained is not None:
                    retained.extend(block)
            stored_crc = source.read(4)
            if len(stored_crc) != 4 or struct.unpack(">I", stored_crc)[0] != crc:
                invalid("PNG chunk CRC mismatch")
            if kind == b"IHDR":
                assert retained is not None
                width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", retained)
                legal_depths = {0: {1, 2, 4, 8, 16}, 2: {8, 16}, 3: {1, 2, 4, 8}, 4: {8, 16}, 6: {8, 16}}
                if not width or not height or depth not in legal_depths.get(color, set()) or compression or filtering or interlace not in {0, 1}:
                    invalid("invalid PNG image header")
                limit = _MAX_PNG_16BIT_PIXELS if depth == 16 else _MAX_PNG_8BIT_PIXELS
                if width * height > limit:
                    raise ValueError(f"{resource_code}: PNG dimensions or bit depth exceed the bounded decode budget")
                color_type = color
                seen_header = True
            if kind == b"iCCP":
                assert retained is not None
                separator = retained.find(0)
                if separator < 1 or separator > 79 or len(retained) <= separator + 2 or retained[separator + 1] != 0:
                    invalid("invalid ICC profile header")
                try:
                    decoder = zlib.decompressobj()
                    profile = decoder.decompress(retained[separator + 2:], _MAX_PNG_METADATA_CHUNK + 1)
                    if len(profile) > _MAX_PNG_METADATA_CHUNK or decoder.unconsumed_tail:
                        raise ValueError(f"{resource_code}: decompressed ICC profile exceeds the bounded budget")
                    if not profile or not decoder.eof or decoder.unused_data:
                        invalid("invalid compressed ICC profile")
                except zlib.error as cause:
                    raise ValueError("MEDIA_IMAGE_PNG_INVALID: invalid compressed ICC profile") from cause
            if kind == b"acTL":
                assert retained is not None
                frame_count, _play_count = struct.unpack(">II", retained)
                if not frame_count:
                    invalid("animation frame count must be positive")
                if frame_count > 1:
                    raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED: animated PNG frames cannot be treated as a still")
            if kind == b"IEND":
                check()
                if source.read(1):
                    raise ValueError("MEDIA_IMAGE_PNG_UNSUPPORTED: trailing bytes after IEND")
                return True


def thumbnail_size(width: int, height: int, edge: int) -> tuple[int, int]:
    """Preserve Pillow thumbnail geometry even when JPEG draft rounds dimensions."""
    if width <= edge and height <= edge:
        return width, height
    aspect = width / height
    if width <= height:
        exact = edge * aspect
        out_width = max(min(math.floor(exact), math.ceil(exact), key=lambda value: abs(aspect - value / edge)), 1)
        return out_width, edge
    exact = edge / aspect
    out_height = max(min(math.floor(exact), math.ceil(exact), key=lambda value: 0 if value == 0 else abs(aspect - edge / value)), 1)
    return edge, out_height


def bounded_jpeg_draft(image: Image.Image) -> None:
    """Decode the largest native JPEG scale inside the pixel budget, or fail."""
    width, height = image.size
    for factor in (2, 4, 8):
        if ((width + factor - 1) // factor) * ((height + factor - 1) // factor) <= _MAX_DECODE_PIXELS:
            image.draft(None, (max(1, width // factor), max(1, height // factor)))
            break
    if image.width * image.height > _MAX_DECODE_PIXELS:
        raise ValueError("STILL_PROXY_RESOURCE_EXHAUSTED: JPEG decoder cannot bound pixel allocation")


def _bounded_large_image(image: Image.Image) -> bool:
    if os.environ.get("AVE_LOW_RESOURCE") != "1" or image.width * image.height <= _MAX_DECODE_PIXELS:
        return False
    if image.format != "JPEG":
        raise ValueError("MEDIA_IMAGE_RESOURCE_EXHAUSTED: image requires a bounded decoder")
    bounded_jpeg_draft(image)
    return True


def facts(path: Path, *, cancelled: Callable[[], bool] | None = None) -> dict:
    png_verified = verify_low_resource_png(path, cancelled=cancelled)
    with Image.open(path) as encoded:
        if encoded.format not in {"JPEG", "PNG", "WEBP", "GIF"} or getattr(encoded, "n_frames", 1) != 1:
            raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED")
        if not png_verified:
            encoded.verify()
    with Image.open(path) as image:
        if image.format not in {"JPEG", "PNG", "WEBP", "GIF"} or getattr(image, "n_frames", 1) != 1:
            raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED")
        orientation = image.getexif().get(274, 1)
        if not isinstance(orientation, int) or isinstance(orientation, bool) or orientation not in range(0, 9):
            raise ValueError("MEDIA_IMAGE_ORIENTATION_INVALID")
        width, height = image.size
        _bounded_large_image(image)
        # Load even after format verification: decoding must still reject
        # truncated or corrupt media rather than declaring it valid.
        image.load()
        if orientation in {5, 6, 7, 8}:
            width, height = height, width
        return {"width": width, "height": height, "orientation": orientation, "alpha": "A" in image.getbands() or "transparency" in image.info}


def animation_facts(path: Path) -> dict | None:
    """Inspect frame presentation timing without treating extensions as identity."""
    with path.open("rb") as source:
        signature = source.read(12)
    if not signature.startswith((b"GIF87a", b"GIF89a")) and not (signature.startswith(b"RIFF") and signature[8:12] == b"WEBP"):
        return None
    with Image.open(path) as image:
        if image.format not in {"GIF", "WEBP"}:
            return None
        frame_count = getattr(image, "n_frames", 1)
        if frame_count <= 1:
            return None
        durations: list[int] = []
        alpha = "A" in image.getbands() or "transparency" in image.info
        for index in range(frame_count):
            image.seek(index)
            image.load()
            duration = image.info.get("duration")
            if not isinstance(duration, int) or isinstance(duration, bool) or duration <= 0:
                raise ValueError("MEDIA_ANIMATION_FRAME_DURATION_UNSUPPORTED")
            durations.append(duration)
            alpha = alpha or "A" in image.getbands() or "transparency" in image.info
        width, height = image.size
        return {
            "format": image.format,
            "width": width,
            "height": height,
            "frame_count": frame_count,
            "frame_durations_ms": durations,
            "duration_ms": sum(durations),
            "alpha": alpha,
            "loop_count": image.info.get("loop"),
            "duration_source": "decoded-frame-metadata-v1",
        }


def thumbnail(path: Path, destination: Path, edge: int, *, cancelled: Callable[[], bool] | None = None) -> None:
    facts(path, cancelled=cancelled)
    with Image.open(path) as source:
        orientation = source.getexif().get(274, 1)
        width, height = source.size
        if orientation in {5, 6, 7, 8}:
            width, height = height, width
        expected = thumbnail_size(width, height, edge)
        icc = source.info.get("icc_profile")
        bounded = _bounded_large_image(source)
        image = ImageOps.exif_transpose(source).convert("RGBA")
        if bounded:
            if image.size != expected:
                image = image.resize(expected, Image.Resampling.LANCZOS)
            image.save(destination, "PNG", **({"icc_profile": icc} if isinstance(icc, bytes) else {}))
        else:
            image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
            image.save(destination, "PNG")


def orientation_filter(path: Path) -> str:
    return {0: "", 1: "", 2: "hflip,", 3: "hflip,vflip,", 4: "vflip,", 5: "transpose=1,hflip,", 6: "transpose=1,", 7: "transpose=1,vflip,", 8: "transpose=2,"}[facts(path)["orientation"]]
