import hashlib
import sys
import tempfile
from pathlib import Path
from threading import Event

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
from worker_host.adapters.still_image import facts  # noqa: E402
from worker_host.handlers.context import HandlerContext  # noqa: E402
from worker_host.handlers.media_sample import handle  # noqa: E402
from worker_host.render.graph_compiler import probe_video_dimensions  # noqa: E402

with tempfile.TemporaryDirectory(prefix="ave-still-") as directory:
    root = Path(directory)
    work, staging = root / "work", root / "staging"
    work.mkdir()
    staging.mkdir()
    context = HandlerContext("static", work, Event(), 30, lambda _: None)
    zero = {"schema_version": 1, "value": 0, "timescale": 1}
    for extension in ["jpg", "png", "webp"]:
        source = root / f"source.{extension}"
        image = Image.new("RGBA" if extension != "jpg" else "RGB", (63, 47), (20, 70, 110, 80) if extension != "jpg" else (20, 70, 110))
        if extension == "jpg":
            exif = image.getexif()
            exif[274] = 6
            image.save(source, exif=exif)
        else:
            image.save(source)
        actual = facts(source)
        assert (actual["width"], actual["height"]) == ((47, 63) if extension == "jpg" else (63, 47))
        assert probe_video_dimensions(source) == (actual["width"], actual["height"])
        payload = {"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(source), "source_digest": hashlib.sha256(source.read_bytes()).hexdigest(), "stream_index": 0, "samples": [{"sample_id": extension, "kind": "image", "start": zero, "end": zero}], "output_dir": str(staging), "max_frame_edge": 64, "timeout_seconds": 30}
        result = handle(payload, context)["outputs"][0]
        with Image.open(result["path"]) as decoded:
            assert decoded.size == (actual["width"], actual["height"])
            if extension != "jpg":
                assert decoded.getpixel((0, 0))[3] == 80
        before = Path(result["path"]).read_bytes()
        try:
            handle(payload, context)
            raise AssertionError("existing destination must reject")
        except FileExistsError:
            pass
        assert Path(result["path"]).read_bytes() == before
    animated = root / "animated.webp"
    Image.new("RGB", (16, 16), "red").save(animated, save_all=True, append_images=[Image.new("RGB", (16, 16), "blue")], duration=100, loop=0)
    try:
        facts(animated)
        raise AssertionError("animation must reject")
    except ValueError as error:
        assert "MEDIA_ANIMATED_IMAGE_UNSUPPORTED" in str(error)
print("JPEG orientation, odd dimensions, PNG/WebP alpha, static identity, exclusive output preservation and animation rejection passed")
