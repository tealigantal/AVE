import hashlib
import importlib
import json
import subprocess
import sys
import tempfile
from copy import deepcopy
from fractions import Fraction
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
silence_within_planned_interval = importlib.import_module("worker_host.handlers.qc_master").silence_within_planned_interval
silence_covered_by_zero_sources = importlib.import_module("worker_host.handlers.qc_master").silence_covered_by_zero_sources
silence_covered_by_verified_segments = importlib.import_module("worker_host.handlers.qc_master").silence_covered_by_verified_segments
validated_graph_output_end = importlib.import_module("worker_host.handlers.qc_master").validated_graph_output_end
joined = {"render_graph_sources": [{"asset_id": "actual"}], "planned_audio_envelopes": [{"asset_id": "actual", "clip_id": "music", "start": {"value": 0, "timescale": 1}, "end": {"value": 4, "timescale": 1}, "fades": [{"start": {"value": 0, "timescale": 1}, "end": {"value": 2, "timescale": 1}}, {"start": {"value": 2, "timescale": 1}, "end": {"value": 4, "timescale": 1}}]}]}
assert silence_within_committed_fades(0, 4, joined, set()), "adjacent committed fade windows cover one detected interval without crossing contributors"
gap = [{"start": {"value": 0, "timescale": 1}, "end": {"value": 3, "timescale": 1}}]
assert silence_within_planned_interval(0, 3.000146, gap, [{"active": True, "start": 3, "end": 6}]), "encoded boundary drift does not turn an adjacent clip into gap audio"
assert not silence_within_planned_interval(0, 3.000146, gap, [{"active": True, "start": 2, "end": 6}]), "planned gaps cannot hide overlapping audio"
assert not silence_within_planned_interval(0, 3.04, gap, [{"active": True, "start": 3.01, "end": 3.03}]), "tolerance cannot hide a complete short active clip"
assert not silence_within_planned_interval(0, 3.06, gap, [{"active": True, "start": 3, "end": 6}]), "observed silence extending beyond tolerance remains a finding"
zero_clips = [{"identity": "zero-a", "active": True, "start": 0, "end": 2}, {"identity": "zero-b", "active": True, "start": 2, "end": 3}]
assert silence_covered_by_zero_sources(1, 3.02, zero_clips, {"zero-a", "zero-b"}, Fraction(3)), "adjacent verified sources and proven terminal encoder padding"
assert not silence_covered_by_zero_sources(1, 3.02, zero_clips, {"zero-a", "zero-b"}), "last clip end alone is not proof of output end"
assert not silence_covered_by_verified_segments(1, 3.02, zero_clips, {"zero-a", "zero-b"}, [{"start": {"value": 3, "timescale": 1}, "end": {"value": 4, "timescale": 1}}])[0], "unproven output tail cannot be relabeled a planned gap"
assert not silence_covered_by_zero_sources(1, 3.06, zero_clips, {"zero-a", "zero-b"}, Fraction(3)), "unbounded output tail is not source proof"
assert not silence_covered_by_zero_sources(1, 3, [zero_clips[0], {**zero_clips[1], "start": 2.001}], {"zero-a", "zero-b"}), "an uncovered internal gap is not source proof"
assert not silence_covered_by_zero_sources(1, 3, [*zero_clips, {"identity": "voice", "active": True, "start": 2.98, "end": 2.99}], {"zero-a", "zero-b"}), "even a short audible contributor must not be hidden by tolerance"
assert not silence_covered_by_zero_sources(1, 3, zero_clips, {"zero-a"}), "an unverified source cannot be assumed silent"
fractional_clips = [{"identity": "zero-a", "active": True, "start": Fraction(0), "end": Fraction(1, 3)}, {"identity": "zero-b", "active": True, "start": Fraction(10000, 30000), "end": Fraction(2, 3)}]
assert silence_covered_by_zero_sources(0, Fraction(2, 3), fractional_clips, {"zero-a", "zero-b"}), "exact adjacency remains equal across different source timebases"
assert not silence_covered_by_zero_sources(0, Fraction(2, 3), [fractional_clips[0], {**fractional_clips[1], "start": Fraction(10001, 30000)}], {"zero-a", "zero-b"}), "a real 1/30000-second internal gap is never rounded away"
assert silence_covered_by_zero_sources(1, 3.05, zero_clips, {"zero-a", "zero-b"}, Fraction(3)), "exactly 50ms after proven output end is allowed"
assert not silence_covered_by_zero_sources(1, 3.050001, zero_clips, {"zero-a", "zero-b"}, Fraction(3)), "even a small amount beyond 50ms remains blocked"
one_frame_gap = [{"start": {"value": 33, "timescale": 30}, "end": {"value": 34, "timescale": 30}}]
zero_first = [{"identity": "zero", "active": True, "start": Fraction(0), "end": Fraction(33, 30)}, {"identity": "voice", "active": True, "start": Fraction(34, 30), "end": Fraction(2)}]
assert silence_covered_by_verified_segments(0, Fraction(34, 30), zero_first, {"zero"}, one_frame_gap) == (True, True)
assert not silence_covered_by_verified_segments(0, Fraction(34, 30), zero_first, {"zero"}, [])[0], "an unplanned internal gap blocks"
assert not silence_covered_by_verified_segments(0, Fraction(34, 30), zero_first, set(), [{"start": {"value": 0, "timescale": 1}, "end": {"value": 2, "timescale": 1}}])[0], "forged plan cannot cover an unverified active source"
sample_overlap = [*zero_first, {"identity": "short-voice", "active": True, "start": Fraction(33, 30), "end": Fraction(33, 30) + Fraction(1, 48000)}]
assert not silence_covered_by_verified_segments(0, Fraction(34, 30), sample_overlap, {"zero"}, one_frame_gap)[0], "one active nonzero sample cannot be hidden by a planned gap"
assert silence_covered_by_verified_segments(0, 1, [{"identity": "muted", "active": False, "start": Fraction(0), "end": Fraction(1)}], set(), [{"start": {"value": 0, "timescale": 1}, "end": {"value": 1, "timescale": 1}}]) == (True, False), "a wholly inactive declared gap does not require zero-source evidence"
fraction_gap = [{"start": {"value": 1, "timescale": 3}, "end": {"value": 2, "timescale": 3}}]
assert silence_covered_by_verified_segments(0, Fraction(2, 3), fractional_clips[:1], {"zero-a"}, fraction_gap, Fraction(2, 3))[0], "different timebases meet exactly"
assert not silence_covered_by_verified_segments(0, Fraction(2, 3), fractional_clips[:1], {"zero-a"}, [{"start": {"value": 10001, "timescale": 30000}, "end": {"value": 2, "timescale": 3}}], Fraction(2, 3))[0], "a 1/30000-second uncovered internal gap blocks"
extent_payload = {"qc_audio_context": {"graph": {"nodes": [{"kind": "composite", "parameters": {"timeline_duration": "6n", "timeline_timescale": "2n"}}, {"kind": "source", "parameters": {"timeline_total_duration": "90n", "timeline_timescale": "30n"}}]}}}
assert validated_graph_output_end(extent_payload, zero_clips) == Fraction(3)
extent_payload["qc_audio_context"]["graph"]["nodes"][1]["parameters"]["timeline_total_duration"] = "120n"
assert validated_graph_output_end(extent_payload, zero_clips) is None, "source/composite disagreement cannot prove tail"
extent_payload["qc_audio_context"]["graph"]["range"] = {"start": 0, "end": 3}
assert validated_graph_output_end(extent_payload, zero_clips) is None, "unknown target range cannot borrow full graph tail"

# Executable graph participation and selected original interval regression.
create_execution_plan = importlib.import_module("worker_host.render.execution_plan").create_execution_plan
compile_render_graph = importlib.import_module("worker_host.render.graph_compiler").compile_render_graph
with tempfile.TemporaryDirectory(prefix="ave-qc-executable-") as directory:
    folder = Path(directory)
    silent, audible, partial = (folder / name for name in ("silent.mp4", "audible.mp4", "partial.wav"))
    for path, audio in [(silent, "anullsrc=r=48000:cl=stereo"), (audible, "sine=frequency=440:sample_rate=48000")]:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=2", "-f", "lavfi", "-i", audio, "-t", "2", "-c:v", "libx264", "-c:a", "aac", str(path)], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-af", "volume='if(lt(t,1),0,1)':eval=frame", str(partial)], check=True)
    no_audio = folder / "no-audio.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-c:v", "copy", "-an", str(no_audio)], check=True)
    actual_fade = folder / "actual-fade.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audible), "-c:v", "copy", "-af", "afade=t=out:st=0:d=2", "-c:a", "aac", str(actual_fade)], check=True)
    voice_then_zero = folder / "voice-then-zero.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audible), "-c:v", "copy", "-af", "volume='if(gte(t,1),0,1)':eval=frame", "-c:a", "aac", str(voice_then_zero)], check=True)
    one_second_silent = folder / "one-second-silent.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-t", "1", "-c:v", "libx264", "-c:a", "aac", str(one_second_silent)], check=True)
    ten_second_silent = folder / "ten-second-silent.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=10", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "10", "-c:v", "libx264", "-c:a", "aac", str(ten_second_silent)], check=True)
    zero_then_voice = folder / "zero-then-voice.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=0.8667", "-filter_complex", "[1:a]adelay=1133.333:all=1,apad=whole_dur=2[a]", "-map", "0:v", "-map", "[a]", "-t", "2", "-c:v", "libx264", "-c:a", "aac", str(zero_then_voice)], check=True)
    def fixture(entries, target="master"):
        nodes, edges, refs, states = [], [], {}, []
        total_ticks = max(30 if first_second else 60 for _, _, _, first_second in entries)
        for index, (path, muted, fade, first_second) in enumerate(entries):
            asset = "asset:sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()
            track, clip, base = f"track-{index}", f"clip-{index}", f"clip-clip-{index}-{index}"
            refs[asset] = {"asset_ref": asset, "original_ref": str(path), "original_object_ref": f"object-{asset}", "source_timescale": "30n", "original_timescale": "30n", "has_audio": True}
            states.append({"track_id": track, "kind": "video", "enabled": True, "muted": muted, "solo": False})
            dur = "30n" if first_second else "60n"
            source_start = "30n" if first_second == "second" else "0n"
            source_end = "60n" if first_second == "second" else dur
            timing = {"track_id": track, "track_kind": "video", "clip_id": clip, "timeline_start": "0n", "timeline_duration": dur, "timeline_timescale": "30n", "source_start_pts": source_start, "source_end_pts": source_end, "source_timescale": "30n", "semantic_source_start_pts": source_start, "semantic_source_end_pts": source_end, "semantic_source_timescale": "30n"}
            nodes.append({"node_id": base + "-source", "kind": "source", "capability": "source.original", "parameters": {**timing, "timeline_total_duration": f"{total_ticks}n", "asset_ref": asset, "source_ref": str(path), "source_kind": "original", "selected_object_ref": f"object-{asset}", "track_enabled": True, "track_muted": muted, "track_solo": False, "audio_enabled": not muted, "has_audio": True}})
            nodes.append({"node_id": base + "-audio", "kind": "audio", "capability": "timeline.audio", "parameters": {**timing, "enabled": True, "muted": muted, "solo": False, "gain_db": 0}})
            edges.append({"from": base + "-source", "to": base + "-audio"})
            if fade:
                nodes.append({"node_id": base + "-clip-fade", "kind": "clip_fade", "capability": "timeline.clip_fade", "parameters": {"audio_fade_out_value": "2n", "audio_fade_out_timescale": "1n"}})
                edges.append({"from": base + "-audio", "to": base + "-clip-fade"})
        nodes.append({"node_id": "composite", "kind": "composite", "capability": "timeline.composite", "parameters": {"track_states_json": json.dumps(states), "timeline_duration": f"{total_ticks}n", "timeline_timescale": "30n"}})
        graph = {"target": target, "timeline_version": 1, "nodes": nodes, "edges": edges, "source_refs": list(refs.values()), "profile": {}}
        return {"task_type": "qc.master.v1", "master_path": str(silent), "source_kind": "original", "source_identity": IDENTITY, "render_graph_sources": [{"asset_id": asset, "source_kind": "original", "object_ref": ref["original_object_ref"]} for asset, ref in refs.items()], "source_audio_evidence": [{"asset_id": asset, "path": ref["original_ref"]} for asset, ref in refs.items()], "qc_audio_context": {"schema_version": 1, "graph": graph, "execution_plan": create_execution_plan(graph)}}
    process = start()
    try:
        def check(name, payload):
            return job(process, name, payload)["outputs"][0]["report"]
        def zero_plus_planned_gap(target, first=silent):
            result = fixture([(first, False, False, False), (audible, False, False, False)], target)
            graph = result["qc_audio_context"]["graph"]
            for index, (start_tick, end_tick) in enumerate(((0, 33), (34, 60))):
                for node in graph["nodes"]:
                    if node["node_id"] in {f"clip-clip-{index}-{index}-source", f"clip-clip-{index}-{index}-audio"}:
                        duration = end_tick - start_tick
                        node["parameters"].update(timeline_start=f"{start_tick}n", timeline_duration=f"{duration}n", source_end_pts=f"{duration}n", semantic_source_end_pts=f"{duration}n")
            result["master_path"] = str(zero_then_voice)
            result["planned_silence_intervals"] = [{"start": {"value": "33", "timescale": "30"}, "end": {"value": "34", "timescale": "30"}}]
            result["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
            return result
        for target in ("preview", "master"):
            report = check("zero-plus-planned-gap-" + target, zero_plus_planned_gap(target))
            assert report["status"] == "passed", report
            assert any(i["code"] == "SILENCE" and not i["blocker"] and "strict digital zero" in i["message"] for i in report["issues"]), report
            assert not any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
            missing_gap = zero_plus_planned_gap(target)
            missing_gap["planned_silence_intervals"] = []
            report = check("mixed-gap-not-declared-" + target, missing_gap)
            assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
            forged = zero_plus_planned_gap(target, audible)
            forged["planned_silence_intervals"] = [{"start": {"value": "0", "timescale": "1"}, "end": {"value": "2", "timescale": "1"}}]
            report = check("forged-gap-cannot-hide-active-voice-" + target, forged)
            assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
            one_sample = fixture([(silent, False, False, False), (audible, False, False, False), (audible, False, False, False)], target)
            graph = one_sample["qc_audio_context"]["graph"]
            graph["profile"] = {"width": 160, "height": 90, "fps": 30}
            for index, (start_tick, duration_tick) in enumerate(((0, 33), (34, 26))):
                for node in graph["nodes"]:
                    if node["node_id"] in {f"clip-clip-{index}-{index}-source", f"clip-clip-{index}-{index}-audio"}:
                        node["parameters"].update(timeline_start=f"{start_tick * 1600}n", timeline_duration=f"{duration_tick * 1600}n", timeline_timescale="48000n", source_end_pts=f"{duration_tick}n", semantic_source_end_pts=f"{duration_tick}n")
            for node in graph["nodes"]:
                if node["node_id"] in {"clip-clip-2-2-source", "clip-clip-2-2-audio"}:
                    node["parameters"].update(timeline_start="52800n", timeline_duration="1n", timeline_timescale="48000n", source_start_pts="500n", source_end_pts="501n", source_timescale="48000n", semantic_source_start_pts="500n", semantic_source_end_pts="501n", semantic_source_timescale="48000n")
                if node["kind"] == "source":
                    node["parameters"]["timeline_total_duration"] = "96000n"
                if node["kind"] == "composite":
                    node["parameters"].update(timeline_duration="96000n", timeline_timescale="48000n")
            one_sample["master_path"] = str(zero_then_voice)
            one_sample["planned_silence_intervals"] = one_frame_gap
            one_sample["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
            compile_render_graph(graph)
            report = check("one-sample-active-overlap-" + target, one_sample)
            assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        def fractional_sequence(target, *, gap=False, audible_overlap=False):
            intervals = [(0,40),(40,40),(80,40),(120,40),(160,11),(171,50),(221,49),(270,30)]
            paths = [silent] * 8
            if audible_overlap:
                paths.append(audible)
                intervals.append((170, 2))
            result = fixture([(path, False, False, True) for path in paths], target)
            graph = result["qc_audio_context"]["graph"]
            for node in graph["nodes"]:
                if node["kind"] == "source":
                    node["parameters"]["timeline_total_duration"] = "300n"
                elif node["kind"] == "composite":
                    node["parameters"]["timeline_duration"] = "300n"
            for index, (start_tick, duration_tick) in enumerate(intervals):
                if gap and index == 5:
                    start_tick += 1
                for node in graph["nodes"]:
                    if node["node_id"] in {f"clip-clip-{index}-{index}-source", f"clip-clip-{index}-{index}-audio"}:
                        node["parameters"].update(timeline_start=f"{start_tick}n", timeline_duration=f"{duration_tick}n", source_end_pts=f"{duration_tick}n", semantic_source_end_pts=f"{duration_tick}n")
            result["master_path"] = str(ten_second_silent)
            result["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
            return result
        for target in ("preview", "master"):
            report = check("fractional-adjacent-" + target, fractional_sequence(target))
            assert any(i["code"] == "SILENCE" and not i["blocker"] for i in report["issues"]), report
            assert not any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
            report = check("fractional-real-gap-" + target, fractional_sequence(target, gap=True))
            assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
            report = check("fractional-audible-overlap-" + target, fractional_sequence(target, audible_overlap=True))
            assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        for target in ("preview", "master"):
            base = fixture([(audible, True, False, False), (silent, False, False, False)], target)
            report = check("muted-audible-" + target, base)
            assert report["status"] == "passed", report
        active = fixture([(audible, False, False, False), (silent, False, False, False)])
        for target in ("preview", "master"):
            sequential = fixture([(audible, False, False, True), (silent, False, False, False)], target)
            sequential["master_path"] = str(voice_then_zero)
            report = check("audible-then-proven-zero-" + target, sequential)
            assert any(i["code"] == "SILENCE" and not i["blocker"] and "strict digital zero" in i["message"] for i in report["issues"]), report
            assert not any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        overlapping_audible = fixture([(audible, False, False, False), (silent, False, False, False)])
        overlapping_audible["master_path"] = str(voice_then_zero)
        report = check("zero-source-cannot-hide-overlapping-voice", overlapping_audible)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        uncovered_tail = fixture([(audible, False, False, True), (silent, False, False, True)])
        uncovered_tail["master_path"] = str(voice_then_zero)
        report = check("zero-source-cannot-cover-unplanned-gap", uncovered_tail)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        missing_track = deepcopy(active)
        missing_track["master_path"], missing_track["require_audio"] = str(no_audio), False
        report = check("active-audio-track-missing", missing_track)
        assert any(i["code"] == "AUDIO_VIDEO_STREAM" and i["blocker"] for i in report["issues"]), report
        active["qc_requirements"] = {"planned_silence": True}
        active["planned_silence_intervals"] = [{"start": {"value": 0, "timescale": 1}, "end": {"value": 2, "timescale": 1}}]
        report = check("active-audio-dropped", active)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        multi = fixture([(audible, True, False, False), (audible, False, False, False), (silent, False, False, False)])
        report = check("same-original-multiple-clips", multi)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        faded = fixture([(audible, False, True, False)])
        report = check("declared-fade-fully-dropped", faded)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        faded["master_path"] = str(actual_fade)
        report = check("actual-fade", faded)
        assert report["status"] == "passed", report
        overlapping = fixture([(audible, False, True, False), (audible, False, False, False)])
        report = check("fade-overlapping-voice", overlapping)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        part = fixture([(partial, False, False, True)])
        part["master_path"] = str(one_second_silent)
        report = check("zero-selected-range", part)
        assert not any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        assert any("scope=(0, 30, 30)" in e for i in report["issues"] for e in i["evidence"]), report
        mixed_ranges = fixture([(partial, False, False, True), (partial, False, False, "second")])
        report = check("same-asset-audible-selected-range", mixed_ranges)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        fallback = fixture([(partial, False, False, True)])
        graph = fallback["qc_audio_context"]["graph"]
        graph["nodes"].append({"node_id": "clip-clip-0-0-speed", "kind": "speed", "capability": "timeline.speed", "parameters": {"numerator": "1n", "denominator": "1n"}})
        fallback["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
        report = check("speed-falls-back-to-full-original", fallback)
        assert any(i["code"] == "SILENCE" and i["blocker"] and any("scope=full_original" in e for e in i["evidence"]) for i in report["issues"]), report
        proxy = fixture([(silent, False, False, False)], "preview")
        graph = proxy["qc_audio_context"]["graph"]
        graph["source_refs"][0].update(proxy_ref=str(audible), proxy_object_ref="object-proxy")
        source = next(node for node in graph["nodes"] if node["kind"] == "source")
        source["capability"] = "source.proxy"
        source["parameters"].update(source_kind="proxy", source_ref=str(audible), selected_object_ref="object-proxy")
        proxy["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
        report = check("proxy-zero-original-not-proof", proxy)
        assert any(i["code"] == "SILENCE" and i["blocker"] for i in report["issues"]), report
        empty = fixture([(partial, False, False, True)])
        graph = empty["qc_audio_context"]["graph"]
        for node in graph["nodes"]:
            if node["kind"] in {"source", "audio"}:
                node["parameters"].update(source_start_pts="90n", source_end_pts="120n", semantic_source_start_pts="90n", semantic_source_end_pts="120n")
        empty["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
        report = check("empty-source-range", empty)
        assert any(i["code"] == "DECODE_FAILED" and "QC_SOURCE_AUDIO_MEASUREMENT_INVALID" in i["message"] for i in report["issues"]), report
        tampered = deepcopy(base)
        tampered["qc_audio_context"]["execution_plan"]["cache_key"] = "0" * 64
        assert any(i["code"] == "DECODE_FAILED" for i in check("tampered-plan", tampered)["issues"])
        wrong = deepcopy(base)
        wrong["source_audio_evidence"][0]["path"] = str(silent)
        assert any(i["code"] == "DECODE_FAILED" for i in check("wrong-original", wrong)["issues"])
        missing = deepcopy(base)
        graph = missing["qc_audio_context"]["graph"]
        graph["nodes"] = [node for node in graph["nodes"] if node["kind"] != "audio"]
        missing["qc_audio_context"]["execution_plan"] = create_execution_plan(graph)
        assert any(i["code"] == "DECODE_FAILED" for i in check("missing-node", missing)["issues"])
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""
print("QC graph participation, selected ranges, identities, fades and dropped audio passed")
