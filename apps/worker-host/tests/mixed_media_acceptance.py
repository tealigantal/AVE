import errno
import hashlib
import os
import subprocess
import sys
import tempfile
from builtins import ExceptionGroup
from pathlib import Path
from threading import Event

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
from worker_host.adapters.still_image import facts, orientation_filter, thumbnail  # noqa: E402
from worker_host.adapters.ffprobe import probe  # noqa: E402
from worker_host.handlers.context import HandlerContext  # noqa: E402
from worker_host.handlers.media_sample import handle  # noqa: E402
from worker_host.render.graph_compiler import probe_video_dimensions  # noqa: E402
from worker_host.runtime.engine import HANDLERS, WorkerRuntime  # noqa: E402

for grouped in [False, True]:
    for error_number, expected_code in [(errno.EACCES, "EACCES"), (errno.ENOSPC, "ENOSPC")]:
        failure = OSError(error_number, "injected operating system boundary", "private-source")
        def fail_handler(_payload, _context):
            if grouped:
                raise ExceptionGroup("original and cleanup failure", [ValueError("MEDIA_DECODE_INVALID: original damaged"), failure])
            raise failure
        HANDLERS["import-fault-test"] = fail_handler
        emitted = []
        try:
            WorkerRuntime(emitted.append).run_job("import-fault", "import-request", {"task_type": "import-fault-test"}, Event())
            result = emitted[-1]
            assert result["status"] == "failed"
            assert result["request_id"] == "import-request"
            assert result["diagnostics"][-1]["code"] == expected_code
            assert "private-source" in result["diagnostics"][-1]["message"]
            if grouped:
                assert result["diagnostics"][0]["code"] == "MEDIA_DECODE_INVALID"
        finally:
            del HANDLERS["import-fault-test"]

with tempfile.TemporaryDirectory(prefix="ave-still-") as directory:
    root = Path(directory)
    work, staging = root / "work", root / "staging"
    work.mkdir()
    staging.mkdir()
    context = HandlerContext("static", work, Event(), 30, lambda _: None)
    colors = [(250, 10, 10, 255), (10, 250, 10, 230), (10, 10, 250, 180), (240, 200, 10, 100), (10, 220, 220, 60), (200, 10, 220, 0)]
    layouts = {
        0: [[0, 1, 2], [3, 4, 5]], 1: [[0, 1, 2], [3, 4, 5]],
        2: [[2, 1, 0], [5, 4, 3]], 3: [[5, 4, 3], [2, 1, 0]],
        4: [[3, 4, 5], [0, 1, 2]], 5: [[0, 3], [1, 4], [2, 5]],
        6: [[3, 0], [4, 1], [5, 2]], 7: [[5, 2], [4, 1], [3, 0]],
        8: [[2, 5], [1, 4], [0, 3]],
    }
    for orientation in [None, *range(9)]:
        source = root / f"orientation-{orientation}.png"
        image = Image.new("RGBA", (3, 2))
        image.putdata(colors)
        exif = image.getexif()
        if orientation is not None:
            exif[274] = orientation
        image.save(source, exif=exif)
        original_digest = hashlib.sha256(source.read_bytes()).hexdigest()
        value = facts(source)
        inspected = probe(source, timeout_seconds=30, cancelled=lambda: False)
        assert inspected["still_image"]["orientation"] == value["orientation"]
        assert inspected["timing"]["streams"][0]["frame_pts"]
        layout = layouts[orientation if orientation is not None else 1]
        expected = bytes(channel for row in layout for pixel in row for channel in colors[pixel])
        thumb = root / f"thumb-{orientation}.png"
        thumbnail(source, thumb, 64)
        with Image.open(thumb) as decoded:
            assert decoded.size == (len(layout[0]), len(layout))
            assert decoded.convert("RGBA").tobytes() == expected
        master = root / f"master-{orientation}.png"
        filters = orientation_filter(source).rstrip(",") or "null"
        subprocess.run([os.environ.get("AVE_FFMPEG", "ffmpeg"), "-v", "error", "-noautorotate", "-i", str(source), "-vf", filters, "-frames:v", "1", "-pix_fmt", "rgba", str(master)], check=True, timeout=30)
        with Image.open(master) as decoded:
            assert decoded.convert("RGBA").tobytes() == expected
        assert value["orientation"] == (orientation if orientation is not None else 1)
        assert hashlib.sha256(source.read_bytes()).hexdigest() == original_digest
    invalid = root / "invalid-orientation.png"
    image = Image.new("RGB", (16, 16))
    exif = image.getexif()
    exif[274] = 9
    image.save(invalid, exif=exif)
    try:
        facts(invalid)
        raise AssertionError("invalid EXIF must be rejected")
    except ValueError as failure:
        assert "MEDIA_IMAGE_ORIENTATION_INVALID" in str(failure)
    damaged = root / "damaged.png"
    damaged.write_bytes((root / "orientation-1.png").read_bytes()[:-16])
    try:
        facts(damaged)
        raise AssertionError("damaged encoded image must be rejected")
    except (OSError, SyntaxError):
        pass
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
