"""Real-model service lifecycle test; run only in an isolated Linux container."""
import argparse
import base64
import io
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import wave

parser = argparse.ArgumentParser()
parser.add_argument("--directory", required=True)
args = parser.parse_args()
assert Path("/proc/self/status").exists(), "Linux /proc measurements required"


def rss(pid):
    try:
        return int(next(line.split()[1] for line in Path(f"/proc/{pid}/status").read_text().splitlines() if line.startswith("VmRSS:")))
    except (FileNotFoundError, StopIteration):
        return 0


def children(pid):
    result = set()
    for task in Path(f"/proc/{pid}/task").glob("*"):
        try:
            result.update(int(item) for item in (task / "children").read_text().split())
        except FileNotFoundError:
            continue
    return sorted(result)


def wait_for(predicate, seconds=60):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(.01)
    raise AssertionError("lifecycle wait timed out")

with tempfile.TemporaryDirectory(prefix="ave-yamnet-lifecycle-") as tmp:
    for name in ("yamnet.tflite", "yamnet_class_map.csv"):
        shutil.copyfile(Path(args.directory) / name, Path(tmp) / name)
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    service = subprocess.Popen([sys.executable, str(Path(__file__).with_name("yamnet_service.py")), "--directory", tmp, "--port", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        url = f"http://127.0.0.1:{port}"
        def health():
            try:
                return json.load(urllib.request.urlopen(url + "/health", timeout=1))
            except OSError:
                return None
        ready = wait_for(health)
        base_rss = rss(service.pid)
        for _ in range(5):
            assert health() == ready and not children(service.pid), "health must not start an inference child"
        audio = io.BytesIO()
        with wave.open(audio, "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(16000)
            wav.writeframes(b"\x00\x00" * (16000 * 20))
        data = json.dumps({"model": ready["model"], "messages": [{"content": [{"type": "input_audio", "input_audio": {"format": "wav", "data": base64.b64encode(audio.getvalue()).decode()}}]}]}).encode()
        result, failure = [], []
        def send():
            try:
                request = urllib.request.Request(url + "/v1/chat/completions", data=data, headers={"Content-Type": "application/json"})
                result.append(json.load(urllib.request.urlopen(request, timeout=60)))
            except Exception as error:
                failure.append(error)
        thread = threading.Thread(target=send); thread.start()
        child = wait_for(lambda: next(iter(children(service.pid)), None))
        peak = 0
        while thread.is_alive():
            peak = max(peak, rss(child))
            time.sleep(.01)
        thread.join(); assert not failure, failure
        assert result[0]["model"] == ready["model"] and result[0]["choices"][0]["finish_reason"] == "stop"
        assert not children(service.pid) and rss(child) == 0, "HTTP response must follow inference process exit"
        post_rss = rss(service.pid)
        assert post_rss <= base_rss + 8 * 1024, (base_rss, post_rss)
        before = len(result)
        pair = [threading.Thread(target=send) for _ in range(2)]
        for worker in pair: worker.start()
        while any(worker.is_alive() for worker in pair):
            assert len(children(service.pid)) <= 1, "simultaneous requests must never overlap inference children"
            time.sleep(.01)
        for worker in pair: worker.join()
        assert not failure and len(result) == before + 2 and not children(service.pid)
        # Once the request body was sent, disconnect the client. The child
        # must still finish and be reaped before another request is admitted.
        with socket.create_connection(("127.0.0.1", port)) as client:
            client.sendall(f"POST /v1/chat/completions HTTP/1.1\r\nHost: localhost\r\nContent-Length: {len(data)}\r\n\r\n".encode() + data)
        cancelled_child = wait_for(lambda: next(iter(children(service.pid)), None))
        wait_for(lambda: not children(service.pid), seconds=60)
        assert rss(cancelled_child) == 0 and health() == ready
        bad = urllib.request.Request(url + "/v1/chat/completions", data=b"{}", headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(bad, timeout=60)
            raise AssertionError("invalid request cannot succeed")
        except urllib.error.HTTPError as error:
            assert error.code == 400
        assert not children(service.pid) and health() == ready
        # TERM must stop accepting new work and wait for the already-started
        # inference child, rather than orphaning or killing it.
        before = len(result)
        pending = threading.Thread(target=send); pending.start()
        draining_child = wait_for(lambda: next(iter(children(service.pid)), None))
        service.terminate()
        deadline = time.monotonic() + 60
        while Path(f"/proc/{draining_child}").exists() and time.monotonic() < deadline:
            assert service.poll() is None, "service exited while inference child was still alive"
            time.sleep(.01)
        assert not Path(f"/proc/{draining_child}").exists(), "inference child did not drain"
        assert service.wait(timeout=10) == 0
        pending.join(timeout=10)
        assert not pending.is_alive() and not failure and len(result) == before + 1, failure
        peak_file = Path("/sys/fs/cgroup/memory.peak")
        print(json.dumps({"parent_baseline_rss_kib": base_rss, "inference_child_peak_rss_kib": peak, "parent_post_rss_kib": post_rss, "container_peak_bytes": int(peak_file.read_text().strip()) if peak_file.exists() else None, "health_model": ready["model"], "cancelled_child_reaped": True, "malformed_reaped": True, "term_drained_child": True}))
    finally:
        service.terminate()
        try: service.wait(timeout=10)
        except subprocess.TimeoutExpired:
            service.kill(); service.wait()
