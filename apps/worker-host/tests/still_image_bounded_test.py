from __future__ import annotations

import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageCms, ImageDraw, ImageOps, JpegImagePlugin, PngImagePlugin

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


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(data, zlib.crc32(kind)))


def large_single_idat_png(path: Path, *, width: int, height: int, icc: bytes, exif: bytes, bit_depth: int = 8) -> int:
    """Create a high-entropy PNG without loading its compressed IDAT at once."""
    staged = path.with_suffix(".idat")
    compressor = zlib.compressobj(1)
    with staged.open("wb") as out:
        for _ in range(height):
            out.write(compressor.compress(b"\0" + os.urandom(width * (4 if bit_depth == 8 else 8))))
        out.write(compressor.flush())
    with path.open("wb") as out, staged.open("rb") as source:
        out.write(b"\x89PNG\r\n\x1a\n")
        out.write(png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, bit_depth, 6, 0, 0, 0)))
        out.write(png_chunk(b"iCCP", b"sRGB\0\0" + zlib.compress(icc)))
        out.write(png_chunk(b"eXIf", exif[6:] if exif.startswith(b"Exif\0\0") else exif))
        out.write(struct.pack(">I", staged.stat().st_size) + b"IDAT")
        crc = zlib.crc32(b"IDAT")
        while block := source.read(1024 * 1024):
            out.write(block)
            crc = zlib.crc32(block, crc)
        crc_offset = out.tell()
        out.write(struct.pack(">I", crc))
        out.write(png_chunk(b"IEND", b""))
    staged.unlink()
    return crc_offset


with tempfile.TemporaryDirectory(prefix="ave-still-bounded-") as directory:
    root = Path(directory)
    source = root / "photo.jpg"
    exif = Image.Exif()
    exif[274] = 6
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    image = Image.new("RGB", (6503, 4001), (20, 40, 160))
    ImageDraw.Draw(image).rectangle((0, 0, 3200, 2000), fill=(200, 30, 20))
    image.save(source, exif=exif, icc_profile=icc, quality=90)
    image.close()
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    # The ordinary execution mode must retain the original full decode path.
    sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
    from worker_host.adapters.ffmpeg import CommandCancelled
    from worker_host.adapters.still_image import facts as still_facts, verify_low_resource_png
    with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "0"}), patch.object(JpegImagePlugin.JpegImageFile, "draft", side_effect=AssertionError("unexpected draft")):
        standard_facts = still_facts(source)
    assert (standard_facts["width"], standard_facts["height"], standard_facts["orientation"]) == (4001, 6503, 6)
    environment = {**os.environ, "AVE_LOW_RESOURCE": "1"}
    process = subprocess.Popen([sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               text=True, bufsize=1, env=environment)
    try:
        process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        process.stdin.flush()
        handshake = json.loads(process.stdout.readline())
        assert "media.probe.v1" in handshake["payload"]["capabilities"]
        result = job(process, "probe", {"task_type": "media.probe.v1", "input_path": str(source), "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        facts = result["outputs"][0]["value"]["still_image"]
        assert (facts["width"], facts["height"], facts["orientation"], facts["alpha"]) == (4001, 6503, 6, False)
        assert facts["stream_index"] == 0

        sample_dir = root / "sample"
        sample_dir.mkdir()
        zero = {"schema_version": 1, "value": 0, "timescale": 1}
        result = job(process, "sample", {"schema_version": 1, "task_type": "media.sample.v1",
                     "input_path": str(source), "source_digest": digest, "stream_index": 0,
                     "samples": [{"sample_id": "s1", "kind": "image", "start": zero, "end": zero}],
                     "output_dir": str(sample_dir), "max_frame_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        output = result["outputs"][0]
        with Image.open(output["path"]) as sampled:
            assert sampled.size == (591, 960) and sampled.info.get("icc_profile") == icc
            assert sampled.getexif().get(274, 1) == 1
            # EXIF orientation 6 moves the original top-left quadrant to top-right.
            red, green, blue, alpha = sampled.getpixel((500, 200))
            assert red > 150 and green < 80 and blue < 80 and alpha == 255

        browse_dir = root / "browse"
        browse_dir.mkdir()
        result = job(process, "browse", {"schema_version": 1, "task_type": "media.browse.v1",
                     "input_path": str(source), "source_digest": digest, "output_dir": str(browse_dir),
                     "policy": "full-browse-h264-aac-png-v1", "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        with Image.open(result["outputs"][0]["path"]) as browsed:
            assert browsed.size == (2520, 4096) and browsed.info.get("icc_profile") == icc

        corrupted = root / "truncated.jpg"
        corrupted.write_bytes(source.read_bytes()[:-100])
        result = job(process, "corrupt", {"task_type": "media.probe.v1", "input_path": str(corrupted), "timeout_seconds": 90})
        assert result["status"] == "failed", "truncated JPEG must not be accepted"
        assert "truncated" in result["diagnostics"][0]["message"].lower(), "the actual decode failure must remain visible"

        png = root / "large.png"
        image = Image.new("L", (6503, 4001), 128)
        image.save(png)
        image.close()
        result = job(process, "png", {"task_type": "media.probe.v1", "input_path": str(png), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_RESOURCE_EXHAUSTED"

        # Ordinary transparent images retain their alpha behavior in low mode.
        alpha_path = root / "alpha.png"
        image = Image.new("RGBA", (3, 2), (0, 0, 0, 0))
        image.putpixel((1, 0), (230, 100, 20, 127))
        image.save(alpha_path)
        image.close()
        alpha_dir = root / "alpha"
        alpha_dir.mkdir()
        result = job(process, "alpha", {"schema_version": 1, "task_type": "media.sample.v1",
                     "input_path": str(alpha_path), "source_digest": hashlib.sha256(alpha_path.read_bytes()).hexdigest(),
                     "stream_index": 0, "samples": [{"sample_id": "s2", "kind": "image", "start": zero, "end": zero}],
                     "output_dir": str(alpha_dir), "max_frame_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        with Image.open(result["outputs"][0]["path"]) as sampled:
            assert sampled.getpixel((1, 0)) == (230, 100, 20, 127)

        # Cover low-bit-depth, grayscale, grayscale-alpha, indexed tRNS and
        # RGB branches without changing their decoded pixel/alpha semantics.
        for mode, color in [("1", 1), ("L", 130), ("LA", (130, 91)), ("P", 0), ("RGB", (90, 120, 180))]:
            source = root / f"mode-{mode}.png"
            image = Image.new(mode, (7, 5), color)
            if mode == "P":
                image.putpalette([90, 120, 180] + [0] * 765)
                image.info["transparency"] = 127
            expected_pixels = image.convert("RGBA").tobytes()
            image.save(source)
            image.close()
            mode_dir = root / f"mode-{mode}"
            mode_dir.mkdir()
            result = job(process, f"mode-{mode}", {"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(source),
                         "source_digest": hashlib.sha256(source.read_bytes()).hexdigest(), "stream_index": 0,
                         "samples": [{"sample_id": "small", "kind": "image", "start": zero, "end": zero}],
                         "output_dir": str(mode_dir), "max_frame_edge": 960, "timeout_seconds": 90})
            assert result["status"] == "succeeded", result
            with Image.open(result["outputs"][0]["path"]) as sampled:
                assert sampled.size == (7, 5) and sampled.convert("RGBA").tobytes() == expected_pixels

        # Build a real Adam7 PNG so interlace handling is exercised even when
        # the local Pillow encoder does not itself write interlaced files.
        interlaced = root / "adam7.png"
        width, height = 9, 7
        passes = [(0, 0, 8, 8), (4, 0, 8, 8), (0, 4, 4, 8), (2, 0, 4, 4), (0, 2, 2, 4), (1, 0, 2, 2), (0, 1, 1, 2)]
        def pixel(x: int, y: int) -> bytes:
            return bytes((x * 23, y * 31, 47, (x * 11 + y * 19) % 256))
        raw_passes = bytearray()
        for x0, y0, dx, dy in passes:
            if x0 < width:
                for y in range(y0, height, dy):
                    raw_passes.extend(b"\0" + b"".join(pixel(x, y) for x in range(x0, width, dx)))
        interlaced.write_bytes(b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 1)) + png_chunk(b"IDAT", zlib.compress(raw_passes)) + png_chunk(b"IEND", b""))
        interlace_dir = root / "interlace-sample"
        interlace_dir.mkdir()
        result = job(process, "adam7", {"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(interlaced),
                     "source_digest": hashlib.sha256(interlaced.read_bytes()).hexdigest(), "stream_index": 0,
                     "samples": [{"sample_id": "adam7", "kind": "image", "start": zero, "end": zero}],
                     "output_dir": str(interlace_dir), "max_frame_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        with Image.open(result["outputs"][0]["path"]) as sampled:
            assert sampled.size == (width, height)
            assert sampled.tobytes() == b"".join(pixel(x, y) for y in range(height) for x in range(width))

        # One valid IDAT is deliberately much larger than the verification
        # buffer; Pillow.verify's whole-chunk join must not be used in low mode.
        big_png = root / "single-idat.png"
        crc_offset = large_single_idat_png(big_png, width=4000, height=4000, icc=icc, exif=exif.tobytes())
        assert crc_offset > 60 * 1024 * 1024
        with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "1"}), patch.object(PngImagePlugin.PngImageFile, "verify", side_effect=AssertionError("whole-chunk verify used")):
            png_facts = still_facts(big_png)
        assert (png_facts["width"], png_facts["height"], png_facts["orientation"], png_facts["alpha"]) == (4000, 4000, 6, True)
        with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "0"}), patch.object(PngImagePlugin.PngImageFile, "verify", side_effect=AssertionError("standard verify used")):
            try:
                still_facts(alpha_path)
            except AssertionError as error:
                assert str(error) == "standard verify used"
            else:
                raise AssertionError("standard mode no longer used its original validation path")
        checks = 0
        def cancel_png() -> bool:
            global checks
            checks += 1
            return checks > 10
        with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "1"}):
            try:
                verify_low_resource_png(big_png, cancelled=cancel_png)
            except CommandCancelled:
                pass
            else:
                raise AssertionError("PNG preflight ignored cancellation")

        png_digest = hashlib.sha256()
        with big_png.open("rb") as source:
            while block := source.read(1024 * 1024):
                png_digest.update(block)
        png_sample_dir = root / "png-sample"
        png_sample_dir.mkdir()
        result = job(process, "png-sample", {"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(big_png),
                     "source_digest": png_digest.hexdigest(), "stream_index": 0,
                     "samples": [{"sample_id": "s3", "kind": "image", "start": zero, "end": zero}],
                     "output_dir": str(png_sample_dir), "max_frame_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        with Image.open(big_png) as original:
            expected = ImageOps.exif_transpose(original).convert("RGBA")
            expected.thumbnail((960, 960), Image.Resampling.LANCZOS)
        with Image.open(result["outputs"][0]["path"]) as sampled:
            assert sampled.size == expected.size and sampled.mode == "RGBA" and sampled.tobytes() == expected.tobytes()
            assert sampled.info.get("icc_profile") == icc
        expected.close()
        png_proxy_dir = root / "png-proxy"
        result = job(process, "png-proxy", {"task_type": "media.still-proxy.v1", "input_path": str(big_png),
                     "source_digest": png_digest.hexdigest(), "output_dir": str(png_proxy_dir), "max_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded" and result["outputs"][0]["alpha"] is True, result
        with Image.open(result["outputs"][0]["path"]) as proxied:
            assert proxied.info.get("icc_profile") == icc and proxied.mode == "RGBA"

        corrupt_png = root / "bad-crc.png"
        shutil.copyfile(big_png, corrupt_png)
        with corrupt_png.open("r+b") as handle:
            handle.seek(crc_offset)
            byte = handle.read(1)
            handle.seek(crc_offset)
            handle.write(bytes([byte[0] ^ 1]))
        result = job(process, "bad-crc", {"task_type": "media.probe.v1", "input_path": str(corrupt_png), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_PNG_INVALID", result
        assert "CRC" in result["diagnostics"][0]["message"]

        # Unsupported critical chunks and post-IEND content fail explicitly.
        raw = alpha_path.read_bytes()
        unknown = root / "unknown-critical.png"
        unknown.write_bytes(raw[:33] + png_chunk(b"ABCD", b"payload") + raw[33:])
        result = job(process, "unknown-critical", {"task_type": "media.probe.v1", "input_path": str(unknown), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_PNG_UNSUPPORTED", result
        trailing = root / "trailing.png"
        trailing.write_bytes(raw + b"unexpected")
        result = job(process, "trailing", {"task_type": "media.probe.v1", "input_path": str(trailing), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_PNG_UNSUPPORTED", result

        late_profile = root / "late-profile.png"
        late_profile.write_bytes(raw[:-12] + png_chunk(b"iCCP", b"fixture\0\0" + zlib.compress(icc)) + raw[-12:])
        result = job(process, "late-profile", {"task_type": "media.probe.v1", "input_path": str(late_profile), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_PNG_UNSUPPORTED", result

        # A correct CRC is not proof of valid compressed pixels. A truncated
        # deflate stream with its CRC recomputed must still fail actual decode.
        bad_pixels = root / "bad-pixels.png"
        offset = 8
        while raw[offset + 4:offset + 8] != b"IDAT":
            offset += 12 + struct.unpack(">I", raw[offset:offset + 4])[0]
        length = struct.unpack(">I", raw[offset:offset + 4])[0]
        assert length > 4
        bad_pixels.write_bytes(raw[:offset] + png_chunk(b"IDAT", raw[offset + 8:offset + 8 + length // 2]) + raw[offset + 12 + length:])
        result = job(process, "bad-pixels", {"task_type": "media.probe.v1", "input_path": str(bad_pixels), "timeout_seconds": 90})
        assert result["status"] == "failed", "verified chunk CRC must not replace a full decode"

        metadata = root / "metadata.png"
        metadata.write_bytes(raw[:33] + png_chunk(b"tEXt", b"x" * (1024 * 1024 + 1)) + raw[33:])
        result = job(process, "metadata-budget", {"task_type": "media.probe.v1", "input_path": str(metadata), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_RESOURCE_EXHAUSTED", result

        png_over_limit = root / "eight-over-limit.png"
        image = Image.new("L", (4001, 4000), 128)
        image.save(png_over_limit)
        image.close()
        result = job(process, "eight-budget", {"task_type": "media.probe.v1", "input_path": str(png_over_limit), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_RESOURCE_EXHAUSTED", result
        with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "0"}):
            assert still_facts(png_over_limit)["width"] == 4001

        profile_bomb = root / "profile-bomb.png"
        profile_bomb.write_bytes(raw[:33] + png_chunk(b"iCCP", b"fixture\0\0" + zlib.compress(b"x" * (1024 * 1024 + 1))) + raw[33:])
        result = job(process, "profile-budget", {"task_type": "media.probe.v1", "input_path": str(profile_bomb), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_RESOURCE_EXHAUSTED", result
        bad_profile = root / "bad-profile.png"
        bad_profile.write_bytes(raw[:33] + png_chunk(b"iCCP", b"fixture\0\0not-zlib") + raw[33:])
        result = job(process, "profile-corrupt", {"task_type": "media.probe.v1", "input_path": str(bad_profile), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_PNG_INVALID", result

        # Boundary test for 16-bit RGBA using a high-entropy single IDAT.
        sixteen_max = root / "sixteen-max.png"
        large_single_idat_png(sixteen_max, width=4000, height=2000, icc=icc, exif=exif.tobytes(), bit_depth=16)
        sixteen_digest = hashlib.sha256()
        with sixteen_max.open("rb") as source:
            while block := source.read(1024 * 1024):
                sixteen_digest.update(block)
        result = job(process, "sixteen-max-probe", {"task_type": "media.probe.v1", "input_path": str(sixteen_max), "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        info = result["outputs"][0]["value"]["still_image"]
        assert (info["width"], info["height"], info["alpha"]) == (2000, 4000, True)
        sixteen_dir = root / "sixteen-sample"
        sixteen_dir.mkdir()
        result = job(process, "sixteen-max-sample", {"schema_version": 1, "task_type": "media.sample.v1", "input_path": str(sixteen_max),
                     "source_digest": sixteen_digest.hexdigest(), "stream_index": 0,
                     "samples": [{"sample_id": "s4", "kind": "image", "start": zero, "end": zero}],
                     "output_dir": str(sixteen_dir), "max_frame_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        with Image.open(sixteen_max) as original:
            expected = ImageOps.exif_transpose(original).convert("RGBA")
            expected.thumbnail((960, 960), Image.Resampling.LANCZOS)
        with Image.open(result["outputs"][0]["path"]) as sampled:
            assert sampled.size == expected.size == (480, 960) and sampled.tobytes() == expected.tobytes()
            assert sampled.info.get("icc_profile") == icc
        expected.close()
        sixteen_proxy = root / "sixteen-proxy"
        result = job(process, "sixteen-max-proxy", {"task_type": "media.still-proxy.v1", "input_path": str(sixteen_max),
                     "source_digest": sixteen_digest.hexdigest(), "output_dir": str(sixteen_proxy), "max_edge": 960, "timeout_seconds": 90})
        assert result["status"] == "succeeded" and result["outputs"][0]["alpha"] is True, result
        sixteen_browse = root / "sixteen-browse"
        sixteen_browse.mkdir()
        result = job(process, "sixteen-max-browse", {"schema_version": 1, "task_type": "media.browse.v1", "input_path": str(sixteen_max),
                     "source_digest": sixteen_digest.hexdigest(), "output_dir": str(sixteen_browse),
                     "policy": "full-browse-h264-aac-png-v1", "timeout_seconds": 90})
        assert result["status"] == "succeeded", result
        with Image.open(result["outputs"][0]["path"]) as browsed:
            assert browsed.size == (2000, 4000) and browsed.mode == "RGBA" and browsed.info.get("icc_profile") == icc

        sixteen = root / "sixteen.png"
        image = Image.new("I;16", (4001, 2000), 40000)
        image.save(sixteen)
        image.close()
        result = job(process, "sixteen-budget", {"task_type": "media.probe.v1", "input_path": str(sixteen), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_IMAGE_RESOURCE_EXHAUSTED", result
        with patch.dict(os.environ, {"AVE_LOW_RESOURCE": "0"}):
            assert still_facts(sixteen)["width"] == 4001

        animation = root / "animated.png"
        image = Image.new("RGBA", (10, 10), "red")
        image.save(animation, save_all=True, append_images=[Image.new("RGBA", (10, 10), "blue")], duration=100)
        image.close()
        result = job(process, "apng", {"task_type": "media.probe.v1", "input_path": str(animation), "timeout_seconds": 90})
        assert result["status"] == "failed" and result["diagnostics"][0]["code"] == "MEDIA_ANIMATED_IMAGE_UNSUPPORTED", result
    finally:
        process.terminate()
        process.wait(timeout=10)
        assert process.stderr.read() == ""

print("bounded still-image real probe, sample and browse protocol passed")
