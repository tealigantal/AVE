from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]


def job(process, job_id, payload):
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": job_id, "payload": payload}) + "\n")
    process.stdin.flush()
    while True:
        line = process.stdout.readline()
        if not line:
            raise AssertionError("worker closed before job result")
        message = json.loads(line)
        if message.get("message_type") == "job_result" and message.get("job_id") == job_id:
            return message


with tempfile.TemporaryDirectory(prefix="ave-still-proxy-") as directory:
    root = Path(directory)
    process = subprocess.Popen([sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    try:
        process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        process.stdin.flush()
        handshake = json.loads(process.stdout.readline())
        assert "media.still-proxy.v1" in handshake["payload"]["capabilities"]

        source = root / "rotated.jpg"
        photo = Image.new("RGB", (1200, 800), (50, 100, 200))
        exif = Image.Exif()
        exif[274] = 6
        photo.save(source, exif=exif, icc_profile=b"fixture-icc")
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        payload = {"task_type": "media.still-proxy.v1", "input_path": str(source),
                   "output_dir": str(root / "photo-out"), "source_digest": digest, "max_edge": 960}
        result = job(process, "photo", payload)
        assert result["status"] == "succeeded", result
        output = result["outputs"][0]
        assert (output["width"], output["height"], output["alpha"]) == (640, 960, False)
        assert output["source_digest"] == digest and output["policy"] == "still-png-lanczos-v1"
        data = Path(output["path"]).read_bytes()
        assert output["content_digest"] == hashlib.sha256(data).hexdigest() and output["byte_length"] == len(data)
        with Image.open(output["path"]) as image:
            assert image.format == "PNG" and image.size == (640, 960)
            assert image.getexif().get(274, 1) == 1 and image.info.get("icc_profile") == b"fixture-icc"

        # A source larger than the full-resolution surface budget must use
        # JPEG's decoder-level reduction before EXIF orientation loads pixels.
        # Odd dimensions also exercise aspect rounding after draft decoding.
        large_source = root / "large-rotated.jpg"
        large = Image.new("RGB", (6503, 4001), (60, 120, 180))
        large.save(large_source, exif=exif, icc_profile=b"large-fixture-icc")
        large.close()
        large_payload = {**payload, "input_path": str(large_source), "output_dir": str(root / "large-out"),
                         "source_digest": hashlib.sha256(large_source.read_bytes()).hexdigest()}
        result = job(process, "large-jpeg", large_payload)
        assert result["status"] == "succeeded", result
        output = result["outputs"][0]
        assert output["producer_version"].endswith("; jpeg-draft-r1")
        expected = Image.new("1", (4001, 6503))
        expected.thumbnail((960, 960), Image.Resampling.LANCZOS)
        with Image.open(output["path"]) as image:
            assert image.size == expected.size == (output["width"], output["height"])
            assert max(image.size) == 960 and image.info.get("icc_profile") == b"large-fixture-icc"
            assert image.getexif().get(274, 1) == 1
        expected.close()

        # PNG has no decoder-level scaling here; reject rather than silently
        # switching to full-resolution decode or the original source.
        large_png = root / "large.png"
        image = Image.new("L", (6503, 4001), 128)
        image.save(large_png)
        image.close()
        invalid = job(process, "large-png", {**payload, "input_path": str(large_png),
                                             "output_dir": str(root / "large-png-out"),
                                             "source_digest": hashlib.sha256(large_png.read_bytes()).hexdigest()})
        assert invalid["status"] == "failed" and invalid["diagnostics"][0]["code"] == "STILL_PROXY_RESOURCE_EXHAUSTED"
        assert not (root / "large-png-out" / "still-proxy.png").exists()

        alpha_source = root / "alpha.png"
        alpha = Image.new("RGBA", (3, 2), (0, 0, 0, 0))
        alpha.putpixel((1, 0), (230, 100, 20, 127))
        alpha.save(alpha_source)
        alpha_payload = {**payload, "input_path": str(alpha_source), "output_dir": str(root / "alpha-out"),
                         "source_digest": hashlib.sha256(alpha_source.read_bytes()).hexdigest()}
        result = job(process, "alpha", alpha_payload)
        assert result["status"] == "succeeded", result
        with Image.open(result["outputs"][0]["path"]) as image:
            assert image.mode == "RGBA" and image.getpixel((1, 0)) == (230, 100, 20, 127)

        invalid = job(process, "missing-edge", {key: value for key, value in payload.items() if key != "max_edge"})
        assert invalid["status"] == "failed" and invalid["diagnostics"][0]["code"] == "STILL_PROXY_REQUEST_INVALID"
        invalid = job(process, "rebound", {**payload, "source_digest": "0" * 64, "output_dir": str(root / "bad-out")})
        assert invalid["status"] == "failed" and invalid["diagnostics"][0]["code"] == "STILL_PROXY_SOURCE_REBOUND"
        assert not (root / "bad-out" / "still-proxy.png").exists()
        animated = root / "animation.gif"
        Image.new("RGB", (2, 2), "red").save(animated, save_all=True,
                                                append_images=[Image.new("RGB", (2, 2), "blue")], duration=100)
        invalid = job(process, "animation", {**payload, "input_path": str(animated),
                                              "source_digest": hashlib.sha256(animated.read_bytes()).hexdigest()})
        assert invalid["status"] == "failed" and invalid["diagnostics"][0]["code"] == "STILL_PROXY_ANIMATION_UNSUPPORTED"
    finally:
        process.terminate()
        process.wait(timeout=10)
        assert process.stderr.read() == ""

print("still image preview proxy protocol passed")
