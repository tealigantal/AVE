from array import array
import copy
import hashlib
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
from worker_host.render.execution_plan import (  # noqa: E402
    canonical_json,
    create_execution_plan,
)


WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]
DUCKING_WINDOWS = (0.4, 1.4, 3.0, 3.3, 3.6, 3.75)


def ffmpeg(*arguments: str, stdout=subprocess.DEVNULL) -> subprocess.CompletedProcess:
    return subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *arguments], check=True, stdout=stdout)


def worker_job(process: subprocess.Popen, job_id: str, graph: dict, output: Path, *, succeeds: bool = True, execution_plan: dict | None = None) -> dict:
    payload = {"task_type": "render.timeline.v1", "graph": graph, "execution_plan": execution_plan if execution_plan is not None else create_execution_plan(graph), "output_dir": str(output)}
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": job_id, "payload": payload}) + "\n")
    process.stdin.flush()
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("message_type") == "job_result" and message.get("job_id") == job_id:
            if succeeds and message.get("status") != "succeeded":
                raise AssertionError(message)
            if not succeeds and message.get("status") == "succeeded":
                raise AssertionError(message)
            return message


def source_node(clip: str, path: Path, track: str, kind: str, source_timescale: int, duration_pts: int, timeline_timescale: int, order: int, *, has_audio: bool) -> dict:
    return {
        "node_id": f"clip-{clip}-source", "kind": "source", "capability": "source.original",
        "parameters": {
            "asset_ref": clip, "source_ref": str(path), "source_kind": "original", "track_kind": kind,
            "track_id": track, "track_z_index": order, "track_order": order, "clip_id": clip,
            "has_audio": has_audio, "source_start_pts": "0n", "source_end_pts": f"{duration_pts}n",
            "source_timescale": f"{source_timescale}n", "semantic_source_start_pts": "0n",
            "semantic_source_end_pts": f"{duration_pts}n", "semantic_source_timescale": f"{source_timescale}n",
            "timeline_start": "0n", "timeline_duration": f"{timeline_timescale * 4}n",
            "timeline_timescale": f"{timeline_timescale}n", "timeline_total_duration": f"{timeline_timescale * 4}n",
        },
    }


def audio_node(clip: str, track: str, role: str, order: int, timeline_timescale: int) -> dict:
    return {
        "node_id": f"clip-{clip}-audio", "kind": "audio", "capability": "timeline.audio",
        "parameters": {"track_id": track, "clip_id": clip, "timeline_start": "0n", "timeline_duration": f"{timeline_timescale * 4}n", "timeline_timescale": f"{timeline_timescale}n", "gain_db": 0, "enabled": True, "muted": False, "track_order": order, "audio_role": role},
    }


def graph(name: str, nodes: list[dict], width: int = 90, height: int = 160) -> dict:
    return {"schema_version": 1, "graph_id": name, "timeline_version": 1, "target": "master", "profile": {"name": name, "width": width, "height": height}, "nodes": [*nodes, {"node_id": "composite", "kind": "composite", "capability": "timeline.composite"}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": [], "source_refs": []}


def output_path(result: dict) -> Path:
    return Path(next(item for item in result["outputs"] if item["kind"] == "render")["path"])


def plan_for_adapter(plan: dict, adapter_version: str) -> dict:
    candidate = copy.deepcopy(plan)
    candidate["adapter_version"] = adapter_version
    candidate["capability_snapshot"]["adapter_version"] = adapter_version
    cache_payload = json.loads(candidate["cache_key_payload"])
    cache_payload["adapter_version"] = adapter_version
    candidate["cache_key_payload"] = canonical_json(cache_payload)
    candidate["cache_key"] = hashlib.sha256(candidate["cache_key_payload"].encode("utf-8")).hexdigest()
    candidate["plan_id"] = f"plan-{candidate['target']}-{candidate['cache_key'][:24]}"
    return candidate


def pixel(path: Path, time: float, x: int, y: int) -> tuple[int, int, int]:
    result = ffmpeg("-ss", str(time), "-i", str(path), "-vf", f"crop=2:2:{x}:{y}", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1", stdout=subprocess.PIPE)
    return tuple(result.stdout[:3])


def amplitude(path: Path, start: float, frequency: float, duration: float = 0.25) -> float:
    result = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "info", "-ss", str(start), "-t", str(duration), "-i", str(path), "-vn", "-af", f"bandpass=f={frequency}:width_type=h:w=20,volumedetect", "-f", "null", "-"], check=True, capture_output=True, text=True)
    match = re.search(r"mean_volume:\s*(-?inf|-?\d+(?:\.\d+)?)\s+dB", result.stderr)
    if not match:
        raise AssertionError("volumedetect did not report mean_volume")
    return 0 if match.group(1) == "-inf" else 10 ** (float(match.group(1)) / 20)


def band_amplitudes(path: Path, starts: tuple[float, ...], frequency: float, duration: float = 0.25) -> tuple[float, ...]:
    sample_rate = 48000
    result = ffmpeg(
        "-i", str(path), "-vn",
        "-af", f"bandpass=f={frequency}:width_type=h:w=20,aformat=sample_rates={sample_rate}:channel_layouts=mono",
        "-f", "f64le", "-acodec", "pcm_f64le", "pipe:1",
        stdout=subprocess.PIPE,
    )
    samples = array("d")
    samples.frombytes(result.stdout)
    if sys.byteorder != "little":
        samples.byteswap()
    window_samples = round(duration * sample_rate)
    levels: list[float] = []
    for start in starts:
        first = round(start * sample_rate)
        window = samples[first:first + window_samples]
        assert len(window) == window_samples, (start, len(window), window_samples)
        levels.append(math.sqrt(sum(sample * sample for sample in window) / len(window)))
    return tuple(levels)


def assert_ducking_recovery(path: Path, windows: tuple[float, ...] = DUCKING_WINDOWS, duration: float = 0.25) -> None:
    before, during, *recovered_levels = band_amplitudes(path, windows, 440, duration)
    assert during < before * 0.75, (before, during, recovered_levels)
    assert during > before * 0.03, (before, during, recovered_levels)
    assert all(recovered > before * 0.95 and recovered > during * 1.3 for recovered in recovered_levels), (before, during, recovered_levels)


def decoded_audio_sample_count(path: Path) -> int:
    result = ffmpeg(
        "-i", str(path), "-vn", "-af", "aformat=sample_rates=48000:channel_layouts=mono",
        "-f", "f64le", "-acodec", "pcm_f64le", "pipe:1", stdout=subprocess.PIPE,
    )
    assert len(result.stdout) % 8 == 0
    return len(result.stdout) // 8


def probe(path: Path) -> dict:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", str(path)], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


with tempfile.TemporaryDirectory(prefix="ave-basic-vlog-") as directory:
    root = Path(directory)
    landscape, video_only, music, dialogue = root / "landscape.mp4", root / "video-only.mp4", root / "music.wav", root / "dialogue.wav"
    ffmpeg("-f", "lavfi", "-i", "color=red:s=80x90:r=30:d=4", "-f", "lavfi", "-i", "color=green:s=80x90:r=30:d=4", "-f", "lavfi", "-i", "color=blue:s=80x90:r=30:d=4", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-filter_complex", "[0:v][1:v][2:v]hstack=inputs=3[v];[3:a]volume=0.05[a]", "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(landscape))
    ffmpeg("-f", "lavfi", "-i", "color=white:s=240x90:r=30:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(video_only))
    ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-af", "volume=0.25", str(music))
    ffmpeg("-f", "lavfi", "-i", "aevalsrc=if(between(t\\,1\\,2)\\,0.8*sin(2*PI*1000*t)\\,0):s=48000:d=2.5", str(dialogue))

    process = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    try:
        process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        process.stdin.flush()
        json.loads(process.stdout.readline())

        reframe_outputs: dict[str, Path] = {}
        for mode, focal in (("crop-left", 0.0), ("crop-right", 1.0), ("contain", 0.5), ("blurred_background", 0.5)):
            actual_mode = "crop_fill" if mode.startswith("crop-") else mode
            nodes = [source_node(mode, landscape, "video", "video", 30, 120, 30, 0, has_audio=True), {"node_id": f"clip-{mode}-static-reframe", "kind": "static_reframe", "capability": "timeline.static_reframe", "parameters": {"settings_version": 1, "mode": actual_mode, "focal_x": focal, "focal_y": 0.5}}, audio_node(mode, "video", "embedded", 0, 30)]
            result = worker_job(process, mode, graph(mode, nodes), root)
            reframe_outputs[mode] = output_path(result)
            video_stream = next(stream for stream in probe(reframe_outputs[mode])["streams"] if stream["codec_type"] == "video")
            assert (video_stream["width"], video_stream["height"]) == (90, 160)
        left_center, right_center = pixel(reframe_outputs["crop-left"], 1, 45, 80), pixel(reframe_outputs["crop-right"], 1, 45, 80)
        assert left_center[0] > left_center[2] * 2, left_center
        assert right_center[2] > right_center[0] * 2, right_center
        assert max(pixel(reframe_outputs["contain"], 1, 45, 5)) < 20
        assert max(pixel(reframe_outputs["blurred_background"], 1, 45, 5)) > 30

        loudness_nodes = [source_node("loudness", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), audio_node("loudness", "video", "embedded", 0, 30), {"node_id": "audio-master-vlog", "kind": "audio_master", "capability": "timeline.audio_master", "parameters": {"settings_version": 1, "enabled": True, "target_lufs": -14, "true_peak_db": -1, "tolerance_lufs": 1}}]
        loudness_graph = graph("loudness", loudness_nodes)
        loudness_result = worker_job(process, "loudness", loudness_graph, root)
        loudness_metrics = loudness_result["metrics"]["audio_normalization"]
        assert loudness_metrics["status"] == "normalized" and loudness_metrics["within_tolerance"], loudness_metrics
        assert abs(loudness_metrics["output_integrated_lufs"] + 14) <= 1
        assert loudness_metrics["output_true_peak_db"] <= -1.2, loudness_metrics
        repeated = worker_job(process, "loudness-repeat", loudness_graph, root)
        assert repeated["metrics"]["output_hash"] == loudness_result["metrics"]["output_hash"]
        no_audio_nodes = [source_node("silent", video_only, "video", "video", 30, 120, 30, 0, has_audio=False), audio_node("silent", "video", "embedded", 0, 30), loudness_nodes[-1]]
        no_audio_result = worker_job(process, "loudness-no-audio", graph("loudness-no-audio", no_audio_nodes), root)
        assert no_audio_result["metrics"]["audio_normalization"]["status"] == "no_audio"
        assert {stream["codec_type"] for stream in probe(output_path(no_audio_result))["streams"]} == {"video"}

        ducking_nodes = [
            source_node("duck-video", video_only, "video", "video", 30, 120, 1000, 0, has_audio=False), audio_node("duck-video", "video", "embedded", 0, 1000),
            source_node("music", music, "music", "audio", 48000, 192000, 1000, 1, has_audio=True), audio_node("music", "music", "music", 1, 1000),
            source_node("dialogue", dialogue, "dialogue", "audio", 48000, 192000, 1000, 2, has_audio=True), audio_node("dialogue", "dialogue", "dialogue", 2, 1000),
            {"node_id": "audio-mix-vlog", "kind": "audio_mix", "capability": "timeline.audio_mix", "parameters": {"settings_version": 1, "enabled": True, "threshold_db": -30, "ratio": 8, "attack_ms": 20, "release_ms": 350, "max_reduction_db": 12}},
        ]
        ducking_graph = graph("ducking", ducking_nodes)
        ducking_plan = create_execution_plan(ducking_graph)
        assert ducking_plan["adapter_version"] == "v3"
        legacy_ducking_plan = plan_for_adapter(ducking_plan, "v2")
        assert legacy_ducking_plan["cache_key"] != ducking_plan["cache_key"]
        legacy_output = root / f"{legacy_ducking_plan['plan_id']}-master-{legacy_ducking_plan['cache_key'][:16]}.mp4"
        legacy_output.write_bytes(b"legacy-v2-truncated-ducking-output")
        rejected_legacy = worker_job(process, "ducking-legacy-v2", ducking_graph, root, succeeds=False, execution_plan=legacy_ducking_plan)
        assert "EXECUTION_PLAN_BINDING_INVALID" in json.dumps(rejected_legacy), rejected_legacy
        ducking_result = worker_job(process, "ducking", ducking_graph, root)
        ducked = output_path(ducking_result)
        assert ducked != legacy_output and legacy_output.read_bytes() == b"legacy-v2-truncated-ducking-output"
        assert ducking_result["metrics"]["worker_version"].startswith("ave-worker-host-r13")
        assert_ducking_recovery(ducked)
        assert ducking_result["metrics"]["ducking_status"] == "applied"
        ducking_filter = ducking_result["metrics"]["filter_complex"]
        assert "[music-audio-0-placed]asetnsamples=n=1024:p=0[music-sidechain-main]" in ducking_filter
        assert "[dialogue-sidechain-source]apad,atrim=duration=4,asetnsamples=n=1024:p=0[dialogue-sidechain]" in ducking_filter
        assert abs(float(probe(ducked)["format"]["duration"]) - 4) <= 0.08
        for repeat_index in range(4):
            repeated_ducking = worker_job(process, f"ducking-repeat-{repeat_index}", ducking_graph, root)
            assert repeated_ducking["metrics"]["execution_plan_id"] == ducking_result["metrics"]["execution_plan_id"]
            assert repeated_ducking["metrics"]["cache_key"] == ducking_result["metrics"]["cache_key"]
            assert repeated_ducking["metrics"]["output_hash"] == ducking_result["metrics"]["output_hash"]
            assert_ducking_recovery(output_path(repeated_ducking))

        multi_bus_nodes = [
            source_node("multi-video", video_only, "video", "video", 30, 120, 1000, 0, has_audio=False), audio_node("multi-video", "video", "embedded", 0, 1000),
            source_node("music-a", music, "music-a", "audio", 48000, 192000, 1000, 1, has_audio=True), audio_node("music-a", "music-a", "music", 1, 1000),
            source_node("music-b", music, "music-b", "audio", 48000, 192000, 1000, 2, has_audio=True), audio_node("music-b", "music-b", "music", 2, 1000),
            source_node("dialogue-a", dialogue, "dialogue-a", "audio", 48000, 192000, 1000, 3, has_audio=True), audio_node("dialogue-a", "dialogue-a", "dialogue", 3, 1000),
            source_node("narration-a", dialogue, "narration-a", "audio", 48000, 192000, 1000, 4, has_audio=True), audio_node("narration-a", "narration-a", "narration", 4, 1000),
            ducking_nodes[-1],
        ]
        multi_bus_graph = graph("ducking-multi-bus", multi_bus_nodes)
        multi_bus_result = worker_job(process, "ducking-multi-bus", multi_bus_graph, root)
        multi_bus_filter = multi_bus_result["metrics"]["filter_complex"]
        assert "[music-bus]asetnsamples=n=1024:p=0[music-sidechain-main]" in multi_bus_filter
        assert "[dialogue-bus]asplit=2[dialogue-main][dialogue-sidechain-source]" in multi_bus_filter
        assert_ducking_recovery(output_path(multi_bus_result))
        repeated_multi_bus = worker_job(process, "ducking-multi-bus-repeat", multi_bus_graph, root)
        assert repeated_multi_bus["metrics"]["execution_plan_id"] == multi_bus_result["metrics"]["execution_plan_id"]
        assert repeated_multi_bus["metrics"]["cache_key"] == multi_bus_result["metrics"]["cache_key"]
        assert repeated_multi_bus["metrics"]["output_hash"] == multi_bus_result["metrics"]["output_hash"]
        assert_ducking_recovery(output_path(repeated_multi_bus))

        whole_frame_nodes = copy.deepcopy(ducking_nodes)
        for node in whole_frame_nodes:
            parameters = node.get("parameters", {})
            if "timeline_duration" in parameters:
                parameters["timeline_duration"] = "112n"
                parameters["timeline_timescale"] = "30n"
            if "timeline_total_duration" in parameters:
                parameters["timeline_total_duration"] = "112n"
        whole_frame_graph = graph("ducking-whole-frame", whole_frame_nodes)
        whole_frame_result = worker_job(process, "ducking-whole-frame", whole_frame_graph, root)
        whole_frame_output = output_path(whole_frame_result)
        assert decoded_audio_sample_count(whole_frame_output) == 179200, "112/30 seconds must remain exactly 175 x 1024 audio samples"
        assert_ducking_recovery(whole_frame_output, (0.4, 1.4, 3.0, 3.3, 3.5, 3.55), 0.15)
        repeated_whole_frame = worker_job(process, "ducking-whole-frame-repeat", whole_frame_graph, root)
        assert repeated_whole_frame["metrics"]["output_hash"] == whole_frame_result["metrics"]["output_hash"]
        assert decoded_audio_sample_count(output_path(repeated_whole_frame)) == 179200

        fade_nodes = [source_node("fade", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), {"node_id": "clip-fade-clip-fade", "kind": "clip_fade", "capability": "timeline.clip_fade", "parameters": {"settings_version": 1, "video_fade_in_value": "30n", "video_fade_in_timescale": "30n", "video_fade_out_value": "30n", "video_fade_out_timescale": "30n", "audio_fade_in_value": "30n", "audio_fade_in_timescale": "30n", "audio_fade_out_value": "30n", "audio_fade_out_timescale": "30n"}}, audio_node("fade", "video", "embedded", 0, 30)]
        faded = output_path(worker_job(process, "fade", graph("fade", fade_nodes), root))
        early, middle, late = pixel(faded, 0.1, 45, 80), pixel(faded, 2.0, 45, 80), pixel(faded, 3.9, 45, 80)
        assert sum(early) < sum(middle) * 0.35 and sum(late) < sum(middle) * 0.35, (early, middle, late)
        assert amplitude(faded, 0.05, 440) < amplitude(faded, 1.5, 440) * 0.4
        assert amplitude(faded, 3.7, 440) < amplitude(faded, 1.5, 440) * 0.5
        invalid_nodes = [source_node("invalid-fade", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), {"node_id": "clip-invalid-fade-clip-fade", "kind": "clip_fade", "capability": "timeline.clip_fade", "parameters": {"settings_version": 1, "video_fade_in_value": "150n", "video_fade_in_timescale": "30n"}}, audio_node("invalid-fade", "video", "embedded", 0, 30)]
        failure = worker_job(process, "invalid-fade", graph("invalid-fade", invalid_nodes), root, succeeds=False)
        assert "CLIP_FADE_TOO_LONG" in json.dumps(failure)
        invalid_sum_node = {"node_id": "clip-invalid-sum-clip-fade", "kind": "clip_fade", "capability": "timeline.clip_fade", "parameters": {"settings_version": 1, "video_fade_in_value": "90n", "video_fade_in_timescale": "30n", "video_fade_out_value": "90n", "video_fade_out_timescale": "30n", "audio_fade_in_value": "90n", "audio_fade_in_timescale": "30n", "audio_fade_out_value": "90n", "audio_fade_out_timescale": "30n"}}
        invalid_sum_nodes = [source_node("invalid-sum", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), invalid_sum_node, audio_node("invalid-sum", "video", "embedded", 0, 30)]
        assert "CLIP_FADE_SUM_TOO_LONG" in json.dumps(worker_job(process, "invalid-fade-sum", graph("invalid-fade-sum", invalid_sum_nodes), root, succeeds=False))
        music_only_nodes = [source_node("music-only-video", video_only, "video", "video", 30, 120, 1000, 0, has_audio=False), audio_node("music-only-video", "video", "embedded", 0, 1000), source_node("music-only", music, "music-only", "audio", 48000, 192000, 1000, 1, has_audio=True), audio_node("music-only", "music-only", "music", 1, 1000), ducking_nodes[-1]]
        music_only_result = worker_job(process, "ducking-no-dialogue", graph("ducking-no-dialogue", music_only_nodes), root)
        assert music_only_result["metrics"]["ducking_status"] == "no_dialogue"
        invalid_reframe_nodes = [source_node("invalid-reframe", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), {"node_id": "clip-invalid-reframe-static-reframe", "kind": "static_reframe", "capability": "timeline.static_reframe", "parameters": {"settings_version": 1, "mode": "crop_fill", "focal_x": 1.5, "focal_y": 0.5}}, audio_node("invalid-reframe", "video", "embedded", 0, 30)]
        assert "STATIC_REFRAME_INVALID" in json.dumps(worker_job(process, "invalid-reframe", graph("invalid-reframe", invalid_reframe_nodes), root, succeeds=False))
        missing_canvas = graph("missing-canvas", reframe_outputs and [source_node("missing-canvas", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), {"node_id": "clip-missing-canvas-static-reframe", "kind": "static_reframe", "capability": "timeline.static_reframe", "parameters": {"settings_version": 1, "mode": "crop_fill", "focal_x": 0.5, "focal_y": 0.5}}])
        missing_canvas["profile"] = {"name": "missing-canvas"}
        assert "PROFILE_CANVAS_REQUIRED" in json.dumps(worker_job(process, "missing-canvas", missing_canvas, root, succeeds=False))
        assert "STATIC_REFRAME_9_16_PROFILE_REQUIRED" in json.dumps(worker_job(process, "wrong-canvas", graph("wrong-canvas", invalid_reframe_nodes[:1] + [{**invalid_reframe_nodes[1], "parameters": {**invalid_reframe_nodes[1]["parameters"], "focal_x": 0.5}}], 160, 90), root, succeeds=False))
        transform_conflict = [source_node("reframe-transform", landscape, "video", "video", 30, 120, 30, 0, has_audio=True), {"node_id": "clip-reframe-transform-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {"scale_x": 1, "scale_y": 1}}, {"node_id": "clip-reframe-transform-static-reframe", "kind": "static_reframe", "capability": "timeline.static_reframe", "parameters": {"settings_version": 1, "mode": "crop_fill", "focal_x": 0.5, "focal_y": 0.5}}]
        assert "STATIC_REFRAME_TRANSFORM_CONFLICT" in json.dumps(worker_job(process, "reframe-transform", graph("reframe-transform", transform_conflict), root, succeeds=False))
        invalid_ducking = dict(ducking_nodes[-1])
        invalid_ducking["parameters"] = {**invalid_ducking["parameters"], "ratio": 25}
        assert "DUCKING_INVALID" in json.dumps(worker_job(process, "invalid-ducking", graph("invalid-ducking", [*ducking_nodes[:-1], invalid_ducking]), root, succeeds=False))
        invalid_loudness = dict(loudness_nodes[-1])
        invalid_loudness["parameters"] = {**invalid_loudness["parameters"], "target_lufs": -4}
        assert "MASTER_LOUDNESS_INVALID" in json.dumps(worker_job(process, "invalid-loudness", graph("invalid-loudness", [*loudness_nodes[:-1], invalid_loudness]), root, succeeds=False))
        invalid_role = audio_node("silent", "video", "arbitrary", 0, 30)
        invalid_role["parameters"]["muted"] = True
        assert "DUCKING_ROLE_UNSUPPORTED" in json.dumps(worker_job(process, "invalid-muted-role", graph("invalid-muted-role", [source_node("silent", video_only, "video", "video", 30, 120, 30, 0, has_audio=False), invalid_role]), root, succeeds=False))
        dialogue_only_nodes = [source_node("silent-picture", video_only, "video", "video", 30, 120, 1000, 0, has_audio=False), audio_node("silent-picture", "video", "embedded", 0, 1000), source_node("speechsolo", dialogue, "dialogue-only", "audio", 48000, 192000, 1000, 1, has_audio=True), audio_node("speechsolo", "dialogue-only", "dialogue", 1, 1000), ducking_nodes[-1]]
        assert worker_job(process, "ducking-no-music", graph("ducking-no-music", dialogue_only_nodes), root)["metrics"]["ducking_status"] == "no_music"
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

print("basic Vlog toolkit encoded-media acceptance passed: reframe pixels, loudness/true peak, ducking recovery, and A/V fades")
