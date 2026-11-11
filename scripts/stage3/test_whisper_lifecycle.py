"""Offline real Whisper lifecycle test; run in an isolated Linux container."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

model = "Systran/faster-whisper-small"
revision = "536b0662742c02347bc0e980a01041f333bce120"
source = Path("/cache/models--Systran--faster-whisper-small")
assert Path("/proc/self/status").exists()


def rss(pid):
    try:
        return int(next(line.split()[1] for line in Path(f"/proc/{pid}/status").read_text().splitlines() if line.startswith("VmRSS:")))
    except (FileNotFoundError, StopIteration):
        return 0


def read_json(path):
    try:
        with urllib.request.urlopen("http://127.0.0.1:18080" + path, timeout=2) as response:
            return json.load(response)
    except (OSError, ValueError):
        return None


def health():
    try:
        with urllib.request.urlopen("http://127.0.0.1:18080/health", timeout=2) as response:
            return response.status == 200 and response.read() == b"OK"
    except OSError:
        return False


def wait_for(predicate, service, timeout=180):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        if service.poll() is not None:
            raise RuntimeError(f"Whisper service exited: {service.returncode}")
        value = predicate()
        if value:
            return value
        time.sleep(.1)
    raise RuntimeError("Whisper lifecycle wait timed out")

with tempfile.TemporaryDirectory(prefix="ave-whisper-offline-") as temp:
    repo = Path(temp) / "models--Systran--faster-whisper-small"
    repo.mkdir()
    for name in ("blobs", "snapshots"):
        (repo / name).symlink_to(source / name, target_is_directory=True)
    env = dict(os.environ, HF_HUB_CACHE=temp, HF_HUB_OFFLINE="1", AVE_WHISPER_DEVICE="cpu", WHISPER__TTL="0", WHISPER__CPU_THREADS="2", DISABLE_TELEMETRY="1", HF_HUB_DISABLE_TELEMETRY="1")
    service = subprocess.Popen([sys.executable, "/startup/start-whisper.py"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        wait_for(health, service)
        initial_models = read_json("/api/ps")
        assert initial_models == {"models": []}, initial_models
        baseline = rss(service.pid)
        events_file = Path("/sys/fs/cgroup/memory.events")
        events_before = dict(line.split() for line in events_file.read_text().splitlines()) if events_file.exists() else {}
        for _ in range(5):
            assert health() and read_json("/api/ps") == {"models": []}
        health_rss = rss(service.pid)
        audio = Path("/audio/synthetic.wav").read_bytes()
        boundary = "ave-whisper-synthetic-boundary"
        fields = [("model", model), ("response_format", "verbose_json"), ("timestamp_granularities[]", "word"), ("timestamp_granularities[]", "segment")]
        body = bytearray()
        for name, value in fields:
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"synthetic.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode())
        body.extend(audio); body.extend(f"\r\n--{boundary}--\r\n".encode())
        result, failure = [], []
        def transcribe():
            try:
                request = urllib.request.Request("http://127.0.0.1:18080/v1/audio/transcriptions", data=bytes(body), headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
                with urllib.request.urlopen(request, timeout=180) as response:
                    result.append(json.load(response))
            except Exception as error:
                failure.append(str(error))
        started = time.monotonic(); peaks, unloaded, texts = [], [], []
        for attempt in range(6):
            worker = threading.Thread(target=transcribe); worker.start(); peak = 0
            while worker.is_alive():
                if service.poll() is not None: break
                peak = max(peak, rss(service.pid)); time.sleep(.05)
            worker.join(timeout=3)
            assert not failure and len(result) == attempt + 1 and not worker.is_alive(), (failure, service.poll())
            text = result[-1].get("text", "").strip()
            assert "local" in text.lower() and "test" in text.lower(), text
            assert result[-1].get("segments") and result[-1]["segments"][0].get("words"), "word-aligned transcription missing"
            wait_for(lambda: read_json("/api/ps") == {"models": []}, service)
            peaks.append(peak); unloaded.append(rss(service.pid)); texts.append(text)
        peak_file = Path("/sys/fs/cgroup/memory.peak")
        events_after = dict(line.split() for line in events_file.read_text().splitlines()) if events_file.exists() else {}
        event_delta = {key: int(value) - int(events_before.get(key, 0)) for key, value in events_after.items()}
        assert event_delta.get("oom", 0) == 0 and event_delta.get("oom_kill", 0) == 0, event_delta
        print(json.dumps({"model": model, "revision": revision, "device": "cpu", "compute": "int8", "ttl": 0, "baseline_rss_kib": baseline, "health_rss_kib": health_rss, "inference_sampled_peak_rss_kib": peaks, "post_unload_rss_kib": unloaded, "container_peak_bytes": int(peak_file.read_text().strip()) if peak_file.exists() else None, "memory_event_delta": event_delta, "seconds": round(time.monotonic() - started, 2), "texts": texts, "manager_empty_after_each": True}))
    finally:
        service.terminate()
        try: service.wait(timeout=10)
        except subprocess.TimeoutExpired:
            service.kill(); service.wait()
