import errno
import hashlib
import json
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
from worker_host.adapters.animated_image import prepare_video  # noqa: E402
from worker_host.adapters.ffprobe import probe  # noqa: E402
from worker_host.handlers.context import HandlerContext  # noqa: E402
from worker_host.handlers.media_sample import handle  # noqa: E402
from worker_host.handlers.media_scene_scan_v2 import handle as scene_scan  # noqa: E402
from worker_host.render.graph_compiler import probe_video_dimensions  # noqa: E402
from worker_host.runtime.engine import HANDLERS, WorkerRuntime  # noqa: E402
from worker_host.render.execution_plan import create_execution_plan  # noqa: E402
from worker_host.handlers.render_timeline import handle as render_timeline  # noqa: E402

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
    for extension in ["jpg", "png", "webp", "gif"]:
        source = root / f"source.{extension}"
        image = Image.new("RGBA" if extension in {"png", "webp"} else "RGB", (63, 47), (20, 70, 110, 80) if extension in {"png", "webp"} else (20, 70, 110))
        if extension == "jpg":
            exif = image.getexif()
            exif[274] = 6
            image.save(source, exif=exif)
        else:
            image.save(source)
        actual = facts(source)
        assert (actual["width"], actual["height"]) == ((47, 63) if extension == "jpg" else (63, 47))
        if extension in {"jpg", "gif"}:
            suffixless = root / "sha256-copy"
            suffixless.write_bytes(source.read_bytes())
            named_probe = probe(source, timeout_seconds=30, cancelled=lambda: False)
            digest_probe = probe(suffixless, timeout_seconds=30, cancelled=lambda: False)
            assert named_probe["still_image"] == digest_probe["still_image"]
            assert named_probe["timing"]["streams"][0]["frame_pts"] == digest_probe["timing"]["streams"][0]["frame_pts"]
            assert len(digest_probe["timing"]["streams"][0]["frame_pts"]) == 1
        if extension == "jpg":
            emitted = []
            WorkerRuntime(emitted.append).run_job("probe-jpeg", "probe-jpeg-request", {"schema_version": 2, "task_type": "media.probe.v2", "input_path": str(suffixless), "source_digest": hashlib.sha256(suffixless.read_bytes()).hexdigest(), "output_dir": str(staging), "timeout_seconds": 30}, Event())
            assert emitted[-1]["status"] == "succeeded", emitted[-1]
            assert emitted[-1]["outputs"][0]["media_kind"] == "image" and emitted[-1]["outputs"][0]["record_count"] == 0
        assert probe_video_dimensions(source) == (actual["width"], actual["height"])
        payload = {"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(source), "source_digest": hashlib.sha256(source.read_bytes()).hexdigest(), "stream_index": 0, "samples": [{"sample_id": extension, "kind": "image", "start": zero, "end": zero}], "output_dir": str(staging), "max_frame_edge": 64, "timeout_seconds": 30}
        result = handle(payload, context)["outputs"][0]
        with Image.open(result["path"]) as decoded:
            assert decoded.size == (actual["width"], actual["height"])
            if extension in {"png", "webp"}:
                assert decoded.getpixel((0, 0))[3] == 80
        before = Path(result["path"]).read_bytes()
        try:
            handle(payload, context)
            raise AssertionError("existing destination must reject")
        except FileExistsError:
            pass
        assert Path(result["path"]).read_bytes() == before
    for extension in ["gif", "webp"]:
        animated = root / f"animated.{extension}"
        if extension == "gif":
            frames = []
            for color in [1, 2, 3]:
                frame = Image.new("P", (16, 16), 0)
                frame.putpalette([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255] + [0] * 756)
                for y in range(2, 14):
                    for x in range(2, 14):
                        frame.putpixel((x, y), color)
                frames.append(frame)
            frames[0].save(animated, save_all=True, append_images=frames[1:], duration=[70, 130, 210], loop=0, transparency=0, disposal=2)
        else:
            frames = [Image.new("RGBA", (16, 16), color) for color in [(255, 0, 0, 255), (0, 255, 0, 96), (0, 0, 255, 0)]]
            frames[0].save(animated, save_all=True, append_images=frames[1:], duration=[70, 130, 210], loop=0, lossless=True)
        # Immutable project originals have no extension. Format and animation
        # identity must come from the bytes, not a user-visible filename.
        suffixless = root / f"sha256-{extension}"
        suffixless.write_bytes(animated.read_bytes())
        for candidate in [animated, suffixless]:
            value = probe(candidate, timeout_seconds=30, cancelled=lambda: False)
            animation = value["animated_image"]
            assert animation["format"] == extension.upper()
            assert animation["frame_count"] == 3
            assert animation["frame_durations_ms"] == [70, 130, 210]
            assert animation["duration_ms"] == 410
            assert animation["alpha"] is True
            assert "still_image" not in value
            stream = value["streams"][0]
            assert stream["codec_type"] == "video"
            assert len(value["timing"]["streams"][stream["index"]]["frame_pts"]) == 3
        source_digest = hashlib.sha256(suffixless.read_bytes()).hexdigest()
        sample_work = root / f"sample-work-{extension}"
        sample_work.mkdir()
        sample_staging = root / f"sample-staging-{extension}"
        sample_staging.mkdir()
        sample_context = HandlerContext(f"sample-{extension}", sample_work, Event(), 30, lambda _: None)
        sample = handle({"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(suffixless), "source_digest": source_digest,
            "stream_index": 0, "samples": [{"sample_id": f"first-{extension}", "kind": "frame", "start": {"schema_version": 1, "value": 0, "timescale": 1000}, "end": {"schema_version": 1, "value": 70, "timescale": 1000}}],
            "output_dir": str(sample_staging), "max_frame_edge": 64, "timeout_seconds": 30}, sample_context)["outputs"][0]
        assert sample["source_digest"] == source_digest and sample["actual_start"] == {"schema_version": 1, "value": 0, "timescale": 1}
        scan = scene_scan({"schema_version": 2, "task_type": "media.scene_scan.v2", "input_path": str(suffixless), "source_digest": source_digest, "stream_index": 0, "threshold": 5, "timeout_seconds": 30, "output_dir": str(sample_staging)}, HandlerContext(f"scan-{extension}", root / f"scan-work-{extension}", Event(), 30, lambda _: None))["outputs"][0]
        assert scan["receipt"]["header"]["source_digest"] == source_digest and scan["receipt"]["end_pts"] == 410 and scan["receipt"]["frame_count"] == 3
        normalized = root / f"normalized-{extension}.mkv"
        prepare_video(suffixless, normalized, timeout_seconds=30, cancelled=lambda: False)
        converted = json.loads(subprocess.run([os.environ.get("AVE_FFPROBE", "ffprobe"), "-v", "error", "-select_streams", "v:0", "-show_streams", "-show_frames", "-show_entries", "stream=time_base:frame=pts", "-of", "json", str(normalized)], check=True, capture_output=True, text=True, timeout=30).stdout)
        assert converted["streams"][0]["time_base"] == "1/1000"
        assert [frame["pts"] for frame in converted["frames"]] == [0, 70, 200, 410]
        alpha_frame = subprocess.run([os.environ.get("AVE_FFMPEG", "ffmpeg"), "-v", "error", "-i", str(normalized), "-vf", r"select=eq(n\,2)", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"], check=True, capture_output=True, timeout=30).stdout
        assert len(alpha_frame) == 16 * 16 * 4
        assert alpha_frame[3] == 0, (extension, alpha_frame[:4])
        base = root / f"background-{extension}.mkv"
        subprocess.run([os.environ.get("AVE_FFMPEG", "ffmpeg"), "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=64x64:r=10:d=1.23", "-c:v", "ffv1", "-pix_fmt", "yuv420p", "-time_base", "1/1000", "-y", str(base)], check=True, timeout=30)
        def video_source(asset, path, z, end, duration):
            return {"node_id": f"{asset}-source", "kind": "source", "capability": "source.original", "parameters": {
                "asset_ref": asset, "source_ref": str(path), "source_kind": "original", "clip_kind": "media", "track_kind": "video",
                "track_id": f"{asset}-track", "track_z_index": z, "track_order": z, "clip_id": asset, "has_audio": False,
                "source_start_pts": "0n", "source_end_pts": f"{end}n", "source_timescale": "1000n",
                "semantic_source_start_pts": "0n", "semantic_source_end_pts": f"{end}n", "semantic_source_timescale": "1000n",
                "timeline_start": "0n", "timeline_duration": f"{duration}n", "timeline_timescale": "1000n",
                "selected_width": 64, "selected_height": 64,
            }}
        render_graph = {"schema_version": 1, "graph_id": f"animated-{extension}", "timeline_version": 1, "target": "master",
            "profile": {"width": 64, "height": 64, "fps": 100},
            "nodes": [video_source(f"bg-{extension}", base, 0, 1230, 1230), video_source(f"anim-{extension}", suffixless, 1, 410, 1230),
                      {"node_id": "composite", "kind": "composite", "capability": "timeline.composite"}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}],
            "edges": [], "source_refs": []}
        render_dir = root / f"render-{extension}"
        render_dir.mkdir()
        context = HandlerContext(f"animated-{extension}", root / f"render-work-{extension}", Event(), 60, lambda _: None)
        context.workspace.mkdir()
        output = render_timeline({"graph": render_graph, "execution_plan": create_execution_plan(render_graph), "output_dir": str(render_dir)}, context)
        master = Path(output["outputs"][0]["path"])
        def rgb(at, x, y):
            data = subprocess.run([os.environ.get("AVE_FFMPEG", "ffmpeg"), "-v", "error", "-i", str(master), "-ss", str(at), "-vf", f"crop=2:2:{x}:{y}", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], check=True, capture_output=True, timeout=30).stdout
            return tuple(data[:3])
        first, second, third, repeated = [rgb(at, 32, 32) for at in (0, 0.07, 0.2, 0.41)]
        transparent = rgb(0.2, 0, 0)
        assert first[0] > first[1] and first[0] > first[2], (extension, first)
        if extension == "webp":
            assert second[1] > second[0] and second[2] > second[1], (extension, second)
        else:
            assert second[1] > second[0] and second[1] > second[2], (extension, second)
        assert third[2] > third[0] and third[2] > third[1], (extension, third)
        assert repeated[0] > repeated[1] and repeated[0] > repeated[2], (extension, repeated)
        assert transparent[2] > transparent[0] and transparent[2] > transparent[1], (extension, transparent)
        try:
            facts(animated)
            raise AssertionError("animated input must not be classified as a still image")
        except ValueError as error:
            assert "MEDIA_ANIMATED_IMAGE_UNSUPPORTED" in str(error)
    mp4 = root / "ordinary-video.mp4"
    subprocess.run([os.environ.get("AVE_FFMPEG", "ffmpeg"), "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=64x48:r=5:d=0.6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", str(mp4)], check=True, timeout=30)
    video_probe = probe(mp4, timeout_seconds=30, cancelled=lambda: False)
    assert video_probe["streams"][0]["codec_type"] == "video"
    assert len(video_probe["timing"]["streams"][0]["frame_pts"]) > 1
print("JPEG suffixless identity, static JPEG/PNG/WebP/GIF, animated GIF/WebP frame timing and alpha, observation, scene scan, timeline repeat/composite render, and exclusive output preservation passed")
