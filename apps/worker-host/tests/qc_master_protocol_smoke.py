import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]
MEDIA = ROOT / "tests/fixtures/generated/p0-vfr.mp4"
IDENTITY = {"source_kind": "original", "asset_id": "asset:sha256:" + "a" * 64, "object_ref": "object:master", "render_graph_source_kind": "original"}


def start():
    process = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
    process.stdin.flush()
    assert json.loads(process.stdout.readline())["message_type"] == "handshake"
    return process


def job(process, job_id, payload):
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": job_id, "payload": payload}) + "\n")
    process.stdin.flush()
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("message_type") == "job_result" and message.get("job_id") == job_id:
            return message


process = start()
try:
    passed = job(process, "qc-pass", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "original", "source_identity": IDENTITY})
    assert passed["outputs"][0]["report"]["status"] == "passed"
    profile = job(process, "qc-profile", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "original", "source_identity": IDENTITY, "export_profile": {"width": 1920}})
    assert any(issue["code"] == "RESOLUTION" and issue["blocker"] for issue in profile["outputs"][0]["report"]["issues"])
    findings = job(process, "qc-findings", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "original", "source_identity": IDENTITY, "findings": [{"code": "SUBTITLE_BOUNDS", "message": "subtitle exceeds safe area", "evidence": ["caption-1"]}]})
    assert findings["outputs"][0]["report"]["issues"][0]["evidence"] == ["caption-1"]
    proxy = job(process, "qc-proxy", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "original", "source_identity": {**IDENTITY, "source_kind": "proxy"}})
    assert any(issue["code"] == "PROXY_USAGE" for issue in proxy["outputs"][0]["report"]["issues"])
    requirements = job(process, "qc-requirements", {"task_type": "qc.master.v1", "master_path": str(MEDIA), "source_kind": "original", "source_identity": IDENTITY, "qc_requirements": {"subtitle_bounds": {"satisfied": False, "message": "caption-1 outside safe area", "evidence": ["caption-1"]}, "missing_effects": {"satisfied": False, "evidence": ["effect-1"]}, "sponsor": {"satisfied": False, "evidence": ["sponsor-cta"]}, "privacy": {"satisfied": False, "evidence": ["face-1"]}}})
    requirement_codes = {issue["code"] for issue in requirements["outputs"][0]["report"]["issues"]}
    assert {"SUBTITLE_BOUNDS", "MISSING_EFFECT", "SPONSOR_REQUIREMENT", "PRIVACY_REQUIREMENT"}.issubset(requirement_codes)
finally:
    process.kill()
    process.wait()
    assert process.stderr.read() == ""

with tempfile.TemporaryDirectory(prefix="ave-qc-master-") as directory:
    black = Path(directory) / "black-silent.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x64:r=30:d=2", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "2", "-c:v", "libx264", "-c:a", "aac", str(black)], check=True)
    av_sync = Path(directory) / "av-sync.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=64x64:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-t", "2", "-c:v", "libx264", "-c:a", "aac", str(av_sync)], check=True)
    process = start()
    try:
        result = job(process, "qc-signals", {"task_type": "qc.master.v1", "master_path": str(black), "source_kind": "original", "source_identity": IDENTITY})
        codes = {issue["code"] for issue in result["outputs"][0]["report"]["issues"]}
        assert {"BLACK_FRAME", "FREEZE_FRAME", "SILENCE"}.intersection(codes)
        planned = job(process, "qc-planned-black", {"task_type": "qc.master.v1", "master_path": str(black), "source_kind": "original", "source_identity": IDENTITY, "planned_black_intervals": [{"start": {"value": "0n", "timescale": "1n"}, "end": {"value": "2n", "timescale": "1n"}}]})
        assert not any(issue["code"] == "BLACK_FRAME" for issue in planned["outputs"][0]["report"]["issues"])
        loudness = job(process, "qc-loudness", {"task_type": "qc.master.v1", "master_path": str(black), "source_kind": "original", "source_identity": IDENTITY, "loudness": {"target_lufs": -23, "tolerance_lufs": 1}})
        loudness_issue = next(issue for issue in loudness["outputs"][0]["report"]["issues"] if issue["code"] == "LOUDNESS")
        assert any(item.startswith("integrated_lufs=") for item in loudness_issue["evidence"])
        spoofed = job(process, "qc-loudness-spoofed", {"task_type": "qc.master.v1", "master_path": str(black), "source_kind": "original", "source_identity": IDENTITY, "loudness": {"target_lufs": -23, "tolerance_lufs": 1, "true_peak_db": -1}, "audio_normalization": {"status": "normalized", "input_integrated_lufs": -30, "input_true_peak_db": -6, "output_integrated_lufs": -23, "output_true_peak_db": -2, "target_lufs": -23, "true_peak_ceiling_db": -1, "tolerance_lufs": 1, "within_tolerance": True}})
        assert any(issue["code"] == "LOUDNESS" for issue in spoofed["outputs"][0]["report"]["issues"]), "QC must remeasure Master instead of trusting caller metrics"
        profile = job(process, "qc-profile-full", {"task_type": "qc.master.v1", "master_path": str(black), "source_kind": "original", "source_identity": IDENTITY, "export_profile": {"width": 64, "height": 64, "frame_rate": "30/1", "duration": 2, "duration_tolerance": 0.1}})
        assert not any(issue["code"] in {"RESOLUTION", "FRAME_RATE", "DURATION"} for issue in profile["outputs"][0]["report"]["issues"])
        sync = job(process, "qc-av-sync", {"task_type": "qc.master.v1", "master_path": str(av_sync), "source_kind": "original", "source_identity": IDENTITY, "av_sync_tolerance": 0.1})
        assert any(issue["code"] == "AV_SYNC" for issue in sync["outputs"][0]["report"]["issues"])
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

with tempfile.TemporaryDirectory(prefix="ave-qc-clipping-") as directory:
    clipping = Path(directory) / "clipping.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=64x64:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=48000:duration=2,volume=16", "-t", "2", "-c:v", "libx264", "-c:a", "aac", str(clipping)], check=True)
    process = start()
    try:
        result = job(process, "qc-clipping", {"task_type": "qc.master.v1", "master_path": str(clipping), "source_kind": "original", "source_identity": IDENTITY})
        assert any(issue["code"] == "CLIPPING" for issue in result["outputs"][0]["report"]["issues"])
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

print("master QC diagnostic smoke passed")
