from pathlib import Path
from PIL import Image, ImageOps


def facts(path: Path) -> dict:
    with Image.open(path) as encoded:
        if encoded.format not in {"JPEG", "PNG", "WEBP"} or getattr(encoded, "n_frames", 1) != 1:
            raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED")
        encoded.verify()
    with Image.open(path) as image:
        if image.format not in {"JPEG", "PNG", "WEBP"} or getattr(image, "n_frames", 1) != 1:
            raise ValueError("MEDIA_ANIMATED_IMAGE_UNSUPPORTED")
        orientation = image.getexif().get(274, 1)
        if not isinstance(orientation, int) or isinstance(orientation, bool) or orientation not in range(0, 9):
            raise ValueError("MEDIA_IMAGE_ORIENTATION_INVALID")
        image.load()
        width, height = image.size
        if orientation in {5, 6, 7, 8}:
            width, height = height, width
        return {"width": width, "height": height, "orientation": orientation, "alpha": "A" in image.getbands() or "transparency" in image.info}


def thumbnail(path: Path, destination: Path, edge: int) -> None:
    facts(path)
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGBA")
        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        image.save(destination, "PNG")


def orientation_filter(path: Path) -> str:
    return {0: "", 1: "", 2: "hflip,", 3: "hflip,vflip,", 4: "vflip,", 5: "transpose=1,hflip,", 6: "transpose=1,", 7: "transpose=1,vflip,", 8: "transpose=2,"}[facts(path)["orientation"]]
