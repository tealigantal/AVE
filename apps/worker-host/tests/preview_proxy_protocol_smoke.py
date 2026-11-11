from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
from worker_host.handlers.build_preview_proxy import _compare_records  # noqa: E402


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


with tempfile.TemporaryDirectory(prefix="ave-preview-proxy-") as directory:
    root = Path(directory)
    source = root / "source.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=30:duration=2",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2",
        "-map", "1:a", "-map", "0:v", "-c:v", "libx264", "-c:a", "aac", str(source),
    ], check=True)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    worker = subprocess.Popen([sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    try:
        worker.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        worker.stdin.flush()
        handshake = json.loads(worker.stdout.readline())
        assert "media.preview-proxy.v1" in handshake["payload"]["capabilities"]
        payload = {"task_type": "media.preview-proxy.v1", "input_path": str(source), "output_dir": str(root / "out"),
                   "source_digest": digest, "max_edge": 160}
        result = job(worker, "valid", payload)
        assert result["status"] == "succeeded", result
        output = result["outputs"][0]
        assert output["source_digest"] == digest and output["policy"] == "h264-preserved-timestamps-v1"
        assert (output["width"], output["height"], output["frame_count"]) == (160, 90, 60)
        assert output["proxy_map"]["audio"] == {"original_sample_rate": 48000, "proxy_sample_rate": 48000}
        assert output["proxy_map"]["segments"][0]["original_end"] == {"value": 30720, "timescale": 15360}
        assert hashlib.sha256(Path(output["path"]).read_bytes()).hexdigest() == output["content_digest"]
        mismatch = job(worker, "rebound", {**payload, "output_dir": str(root / "bad"), "source_digest": "0" * 64})
        assert mismatch["status"] == "failed" and mismatch["diagnostics"][0]["code"] == "PREVIEW_PROXY_SOURCE_REBOUND"
        assert not (root / "bad" / "preview-proxy.mp4").exists()
        invalid = job(worker, "missing-edge", {key: value for key, value in payload.items() if key != "max_edge"})
        assert invalid["status"] == "failed" and invalid["diagnostics"][0]["code"] == "PREVIEW_PROXY_REQUEST_INVALID"
        shifted = root / "shifted.mp4"
        subprocess.run([
            "ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=30:duration=2",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-map", "1:a", "-map", "0:v",
            "-c:v", "libx264", "-c:a", "aac", "-output_ts_offset", "2", str(shifted),
        ], check=True)
        shifted_result = job(worker, "shifted", {**payload, "input_path": str(shifted), "output_dir": str(root / "shifted-out"),
                                                  "source_digest": hashlib.sha256(shifted.read_bytes()).hexdigest()})
        assert shifted_result["status"] == "succeeded", shifted_result
        segment = shifted_result["outputs"][0]["proxy_map"]["segments"][0]
        assert Fraction(segment["original_start"]["value"], segment["original_start"]["timescale"]) == 2
        assert Fraction(segment["proxy_start"]["value"], segment["proxy_start"]["timescale"]) == Fraction(11, 500)
        vfr = root / "vfr.mp4"
        subprocess.run([
            "ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=30:duration=1",
            "-vf", "select='if(lt(t,0.5),not(mod(n,2)),1)'", "-fps_mode", "vfr", "-c:v", "libx264", str(vfr),
        ], check=True)
        vfr_result = job(worker, "vfr", {**payload, "input_path": str(vfr), "output_dir": str(root / "vfr-out"),
                                        "source_digest": hashlib.sha256(vfr.read_bytes()).hexdigest()})
        assert vfr_result["status"] == "succeeded", vfr_result
        assert vfr_result["outputs"][0]["frame_count"] == 23
    finally:
        worker.terminate()
        worker.wait(timeout=10)
        assert worker.stderr.read() == ""

    left, right = root / "left", root / "right"
    left.write_text("0\n100\n200\n", encoding="ascii")
    right.write_text("0\n100\n", encoding="ascii")
    try:
        _compare_records(left, right, Fraction(1, 1000), Fraction(1, 1000), kind="video")
    except ValueError as error:
        assert "COUNT_MISMATCH" in str(error)
    else:
        raise AssertionError("frame truncation must not yield a partial map")
    right.write_text("0\n101\n200\n", encoding="ascii")
    try:
        _compare_records(left, right, Fraction(1, 1000), Fraction(1, 1000), kind="video")
    except ValueError as error:
        assert "TIMING_MISMATCH" in str(error)
    else:
        raise AssertionError("nonlinear timestamp drift must fail closed")

print("preview proxy full-frame and audio identity protocol passed")
