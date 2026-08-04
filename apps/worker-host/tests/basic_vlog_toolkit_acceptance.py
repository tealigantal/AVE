import array
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
from worker_host.render.execution_plan import create_execution_plan  # noqa: E402


WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]


def ffmpeg(*arguments: str, stdout=subprocess.DEVNULL) -> subprocess.CompletedProcess:
    return subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *arguments], check=True, stdout=stdout)


def worker_job(process: subprocess.Popen, job_id: str, graph: dict, output: Path, *, succeeds: bool = True) -> dict:
    payload = {"task_type": "render.timeline.v1", "graph": graph, "execution_plan": create_execution_plan(graph), "output_dir": str(output)}
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


def pixel(path: Path, time: float, x: int, y: int) -> tuple[int, int, int]:
    result = ffmpeg("-ss", str(time), "-i", str(path), "-vf", f"crop=2:2:{x}:{y}", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1", stdout=subprocess.PIPE)
    return tuple(result.stdout[:3])


def amplitude(path: Path, start: float, frequency: float, duration: float = 0.25) -> float:
    result = ffmpeg("-ss", str(start), "-t", str(duration), "-i", str(path), "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "pipe:1", stdout=subprocess.PIPE)
    samples = array.array("h")
    samples.frombytes(result.stdout)
    real = sum(sample * math.cos(2 * math.pi * frequency * index / 48000) for index, sample in enumerate(samples))
    imaginary = sum(sample * math.sin(2 * math.pi * frequency * index / 48000) for index, sample in enumerate(samples))
    return math.hypot(real, imaginary) / max(1, len(samples))


def probe(path: Path) -> dict:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", str(path)], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


with tempfile.TemporaryDirectory(prefix="ave-basic-vlog-") as directory:
    root = Path(directory)
    landscape, video_only, music, dialogue = root / "landscape.mp4", root / "video-only.mp4", root / "music.wav", root / "dialogue.wav"
    ffmpeg("-f", "lavfi", "-i", "color=red:s=80x90:r=30:d=4", "-f", "lavfi", "-i", "color=green:s=80x90:r=30:d=4", "-f", "lavfi", "-i", "color=blue:s=80x90:r=30:d=4", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-filter_complex", "[0:v][1:v][2:v]hstack=inputs=3[v];[3:a]volume=0.05[a]", "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(landscape))
    ffmpeg("-f", "lavfi", "-i", "color=white:s=240x90:r=30:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(video_only))
    ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-af", "volume=0.25", str(music))
    ffmpeg("-f", "lavfi", "-i", "aevalsrc=if(between(t\\,1\\,2)\\,0.8*sin(2*PI*880*t)\\,0):s=48000:d=4", str(dialogue))

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
        assert loudness_metrics["output_true_peak_db"] <= -0.9
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
            {"node_id": "audio-mix-vlog", "kind": "audio_mix", "capability": "timeline.audio_mix", "parameters": {"settings_version": 1, "enabled": True, "threshold_db": -35, "ratio": 12, "attack_ms": 20, "release_ms": 350, "max_reduction_db": 15}},
        ]
        ducking_result = worker_job(process, "ducking", graph("ducking", ducking_nodes), root)
        ducked = output_path(ducking_result)
        before, during = amplitude(ducked, 0.4, 440), amplitude(ducked, 1.4, 440)
        recovered = max(amplitude(ducked, point, 440) for point in (3.0, 3.3, 3.6))
        assert during < before * 0.75, (before, during, recovered)
        assert recovered > before * 0.8 and recovered > during * 1.5, (before, during, recovered)
        assert ducking_result["metrics"]["ducking_status"] == "applied"
        assert abs(float(probe(ducked)["format"]["duration"]) - 4) <= 0.08

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
