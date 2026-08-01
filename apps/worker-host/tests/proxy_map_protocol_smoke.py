from fractions import Fraction
import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]
MEDIA = ROOT / "tests/fixtures/generated/p0-vfr.mp4"


def ensure_media(path: Path) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=48000",
            "-vf", "select='if(lt(t,0.5),not(mod(n,2)),1)'", "-fps_mode", "vfr", "-t", "1",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def job(process, job_id, payload):
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": job_id, "payload": payload}) + "\n")
    process.stdin.flush()
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("message_type") == "job_result" and message.get("job_id") == job_id:
            return message


def locate(segments, key, value):
    for segment in segments:
        start = segment[key + "_start"]
        end = segment[key + "_end"]
        if Fraction(start["value"], start["timescale"]) <= value <= Fraction(end["value"], end["timescale"]):
            return segment
    return segments[-1]


def interpolate(value, start, end, out_start, out_end):
    ratio = (value - Fraction(start["value"], start["timescale"])) / (Fraction(end["value"], end["timescale"]) - Fraction(start["value"], start["timescale"]))
    return Fraction(out_start["value"], out_start["timescale"]) + ratio * (Fraction(out_end["value"], out_end["timescale"]) - Fraction(out_start["value"], out_start["timescale"]))


with tempfile.TemporaryDirectory(prefix="ave-proxy-map-") as directory:
    ensure_media(MEDIA)
    process = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    try:
        process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        process.stdin.flush()
        json.loads(process.stdout.readline())
        result = job(process, "proxy-map-1", {"task_type": "media.proxy.v1", "input_path": str(MEDIA), "output_dir": directory})
        assert result["status"] == "succeeded", result
        proxy_map = result["outputs"][0]["proxy_map"]
        assert result["metrics"]["original_timing"]["streams"]["0"]["vfr"] is True
        assert proxy_map["audio"] == {"original_sample_rate": 48000, "proxy_sample_rate": 48000}
        segments = proxy_map["segments"]
        randomizer = random.Random(11)
        for _ in range(20):
            segment = randomizer.choice(segments)
            proxy_start = Fraction(segment["proxy_start"]["value"], segment["proxy_start"]["timescale"])
            proxy_end = Fraction(segment["proxy_end"]["value"], segment["proxy_end"]["timescale"])
            proxy_value = proxy_start + (proxy_end - proxy_start) * Fraction(randomizer.randint(0, 1000), 1000)
            original_value = interpolate(proxy_value, segment["proxy_start"], segment["proxy_end"], segment["original_start"], segment["original_end"])
            roundtrip = interpolate(original_value, segment["original_start"], segment["original_end"], segment["proxy_start"], segment["proxy_end"])
            assert abs(roundtrip - proxy_value) <= Fraction(1, proxy_map["proxy_timebase"]), (roundtrip, proxy_value)
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

print("proxy map VFR roundtrip smoke passed")
