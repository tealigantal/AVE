from pathlib import Path
from PIL import Image, ImageOps


def facts(path: Path) -> dict:
    with Image.open(path) as encoded:
        if encoded.format not in {"JPEG", "PNG", "WEBP", "GIF"} or getattr(encoded, "n_frames", 1) != 1:
            raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED")
        encoded.verify()
    with Image.open(path) as image:
        if image.format not in {"JPEG", "PNG", "WEBP", "GIF"} or getattr(image, "n_frames", 1) != 1:
            raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED")
        orientation = image.getexif().get(274, 1)
        if not isinstance(orientation, int) or isinstance(orientation, bool) or orientation not in range(0, 9):
            raise ValueError("MEDIA_IMAGE_ORIENTATION_INVALID")
        image.load()
        width, height = image.size
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


def thumbnail(path: Path, destination: Path, edge: int) -> None:
    facts(path)
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGBA")
        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        image.save(destination, "PNG")


def orientation_filter(path: Path) -> str:
    return {0: "", 1: "", 2: "hflip,", 3: "hflip,vflip,", 4: "vflip,", 5: "transpose=1,hflip,", 6: "transpose=1,", 7: "transpose=1,vflip,", 8: "transpose=2,"}[facts(path)["orientation"]]
