import json
import subprocess
import sys
import tempfile
import atexit
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]
input_directory = tempfile.TemporaryDirectory(prefix="ave-worker-media-input-")
atexit.register(input_directory.cleanup)
MEDIA = Path(input_directory.name) / "中文 媒体 input.mp4"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=96x64:rate=30:duration=1", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(MEDIA)], check=True)


def start():
    process = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", bufsize=1)
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
    process.stdin.flush()
    handshake = json.loads(process.stdout.readline())
    assert handshake["message_type"] == "handshake"
    assert {"media.probe.v1", "media.proxy.v1", "media.proxy.map.v1", "render.timeline.v1", "qc.master.v1"}.issubset(set(handshake["payload"]["capabilities"]))
    assert "render.preview.v1" not in handshake["payload"]["capabilities"] and "render.master.v1" not in handshake["payload"]["capabilities"]
    return process


def job(process, job_id, payload):
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": job_id, "payload": payload}) + "\n")
    process.stdin.flush()
    messages = []
    while True:
        message = json.loads(process.stdout.readline())
        messages.append(message)
        if message.get("message_type") == "job_result" and message.get("job_id") == job_id:
            return messages, message


with tempfile.TemporaryDirectory(prefix="ave-worker-media-") as directory:
    output = Path(directory)
    process = start()
    try:
        _, probe = job(process, "probe-1", {"task_type": "media.probe.v1", "input_path": str(MEDIA)})
        assert probe["status"] == "succeeded"
        _, fingerprint = job(process, "fingerprint-1", {"task_type": "media.fingerprint.v1", "input_path": str(MEDIA)})
        assert fingerprint["status"] == "succeeded" and len(fingerprint["outputs"][0]["digest"]) == 64
        _, proxy = job(process, "proxy-1", {"task_type": "media.proxy.v1", "input_path": str(MEDIA), "output_dir": str(output)})
        assert proxy["status"] == "succeeded" and proxy["outputs"][0]["proxy_map"]["schema_version"] == 1
        assert proxy["metrics"]["original_timing"]["streams"]
        _, qc = job(process, "qc-1", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "original"})
        assert qc["status"] == "succeeded" and qc["outputs"][0]["report"]["status"] == "passed"
        _, blocked = job(process, "qc-2", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "proxy"})
        assert blocked["status"] == "succeeded" and blocked["outputs"][0]["report"]["status"] == "blocked"
        _, timed_out = job(process, "timeout-1", {"task_type": "media.probe.v1", "input_path": str(MEDIA), "timeout_seconds": 0.0001})
        assert timed_out["status"] == "failed" and timed_out["diagnostics"][0]["code"] == "TIMEOUT"
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == "", "worker stderr must be isolated and empty for successful media jobs"

cancelled = start()
try:
    cancelled.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": "cancel-1", "payload": {"task_type": "media.proxy.v1", "input_path": str(MEDIA), "output_dir": tempfile.gettempdir()}}) + "\n")
    cancelled.stdin.write(json.dumps({"protocol_version": 1, "message_type": "cancel", "job_id": "cancel-1"}) + "\n")
    cancelled.stdin.flush()
    results = []
    while True:
        message = json.loads(cancelled.stdout.readline())
        results.append(message)
        if message.get("message_type") == "job_result" and message.get("job_id") == "cancel-1":
            break
    assert results[-1]["status"] == "cancelled" and results[-1]["diagnostics"][0]["code"] == "CANCELLED"
finally:
    cancelled.kill()
    cancelled.wait()

print("worker media protocol smoke passed")
