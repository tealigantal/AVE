import hashlib
import importlib
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
        sync_issue = next(issue for issue in sync["outputs"][0]["report"]["issues"] if issue["code"] == "AV_SYNC")
        assert sync_issue["blocker"] and "exceeds tolerance 0.1s" in sync_issue["message"]
        assert len(sync_issue["evidence"]) == 2 and all("duration_ts=" in item and "time_base=" in item for item in sync_issue["evidence"])
        assert any('"sample_count":' in item for item in sync_issue["evidence"])
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

with tempfile.TemporaryDirectory(prefix="ave-qc-source-silence-") as directory:
    silent = Path(directory) / "silent-motion.mp4"
    audible = Path(directory) / "audible-motion.mp4"
    for path, audio in [(silent, "anullsrc=r=48000:cl=stereo"), (audible, "sine=frequency=440:sample_rate=48000")]:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=2", "-f", "lavfi", "-i", audio, "-t", "2", "-c:v", "libx264", "-c:a", "aac", str(path)], check=True)
    def source(path):
        return {"asset_id": "asset:sha256:" + hashlib.sha256(path.read_bytes()).hexdigest(), "path": str(path)}
    def payload(sources=None):
        result = {"task_type": "qc.master.v1", "master_path": str(silent), "source_kind": "original", "source_identity": IDENTITY}
        if sources is not None:
            result.update(source_audio_evidence=sources, render_graph_sources=[{"asset_id": item["asset_id"], "source_kind": "original"} for item in sources])
        return result
    process = start()
    try:
        absent = job(process, "silence-no-proof", payload())["outputs"][0]["report"]
        assert any(issue["code"] == "SILENCE" and issue["blocker"] for issue in absent["issues"])
        zero = job(process, "silence-verified-zero", payload([source(silent)]))["outputs"][0]["report"]
        assert zero["status"] == "passed", zero
        finding = next(issue for issue in zero["issues"] if issue["code"] == "SILENCE")
        assert not finding["blocker"] and any("strict_digital_zero=true" in item and "samples=" in item and source(silent)["asset_id"] in item for item in finding["evidence"])
        dropped = job(process, "silence-dropped-real-audio", payload([source(silent), source(audible)]))["outputs"][0]["report"]
        assert any(issue["code"] == "SILENCE" and issue["blocker"] for issue in dropped["issues"]), "any actual nonzero source keeps missing-audio detection blocking"
        wrong = job(process, "silence-wrong-identity", payload([{**source(silent), "asset_id": "asset:sha256:" + "0" * 64}]))["outputs"][0]["report"]
        assert any(issue["code"] == "DECODE_FAILED" and "QC_SOURCE_AUDIO_IDENTITY_MISMATCH" in issue["message"] for issue in wrong["issues"])
        incomplete = payload([source(silent)])
        incomplete["render_graph_sources"].append({"asset_id": source(audible)["asset_id"], "source_kind": "original"})
        mismatch = job(process, "silence-incomplete-source-set", incomplete)["outputs"][0]["report"]
        assert any(issue["code"] == "DECODE_FAILED" and "QC_SOURCE_AUDIO_EVIDENCE_INVALID" in issue["message"] for issue in mismatch["issues"])
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

# Actual PCM and encoded output: intentional fade silence is bounded, and another
# non-fading voice still makes missing mixed audio a blocking failure.
with tempfile.TemporaryDirectory(prefix="ave-qc-audio-fades-") as directory:
    folder = Path(directory)
    music, voice = folder / "music.wav", folder / "voice.wav"
    for target, frequency in [(music, 440), (voice, 660)]:
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"sine=frequency={frequency}:sample_rate=48000:duration=7", str(target)], check=True)
    outputs = []
    for name, volume in [("tail", "if(gte(t,5),0,1)"), ("middle", "if(between(t,2,4),0,1)")]:
        target = folder / f"{name}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=64x64:r=30:d=7", "-i", str(music), "-af", f"volume='{volume}':eval=frame", "-c:v", "libx264", "-c:a", "aac", "-shortest", str(target)], check=True)
        outputs.append(target)
    music_id = "asset:sha256:" + hashlib.sha256(music.read_bytes()).hexdigest()
    voice_id = "asset:sha256:" + hashlib.sha256(voice.read_bytes()).hexdigest()
    def time(value):
        return {"value": str(value), "timescale": "1"}
    envelope = {"asset_id": music_id, "clip_id": "music", "start": time(0), "end": time(7), "fades": [{"start": time(4), "end": time(7)}]}
    base = {"task_type": "qc.master.v1", "source_kind": "original", "source_identity": {**IDENTITY, "asset_id": music_id}, "render_graph_sources": [{"asset_id": music_id, "source_kind": "original"}], "source_audio_evidence": [{"asset_id": music_id, "path": str(music)}], "planned_audio_envelopes": [envelope]}
    process = start()
    try:
        planned = job(process, "committed-tail-fade", {**base, "master_path": str(outputs[0])})
        assert not any(i["code"] == "SILENCE" for i in planned["outputs"][0]["report"]["issues"])
        unexpected = job(process, "unexpected-middle-silence", {**base, "master_path": str(outputs[1])})
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in unexpected["outputs"][0]["report"]["issues"])
        other = {**base, "master_path": str(outputs[0]), "render_graph_sources": [*base["render_graph_sources"], {"asset_id": voice_id, "source_kind": "original"}], "source_audio_evidence": [*base["source_audio_evidence"], {"asset_id": voice_id, "path": str(voice)}], "planned_audio_envelopes": [envelope, {"asset_id": voice_id, "clip_id": "voice", "start": time(0), "end": time(7), "fades": []}]}
        missing_voice = job(process, "fade-must-not-hide-missing-voice", other)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in missing_voice["outputs"][0]["report"]["issues"])
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""
print("QC committed fades: actual source identity, bounded tail allowance and blocking middle/overlapping voice silence passed")

sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
silence_within_committed_fades = importlib.import_module("worker_host.handlers.qc_master").silence_within_committed_fades
joined = {"render_graph_sources": [{"asset_id": "actual"}], "planned_audio_envelopes": [{"asset_id": "actual", "clip_id": "music", "start": {"value": 0, "timescale": 1}, "end": {"value": 4, "timescale": 1}, "fades": [{"start": {"value": 0, "timescale": 1}, "end": {"value": 2, "timescale": 1}}, {"start": {"value": 2, "timescale": 1}, "end": {"value": 4, "timescale": 1}}]}]}
assert silence_within_committed_fades(0, 4, joined, set()), "adjacent committed fade windows cover one detected interval without crossing contributors"
