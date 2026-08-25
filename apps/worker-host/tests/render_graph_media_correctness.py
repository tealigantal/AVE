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
from worker_host.render.graph_compiler import compile_render_graph  # noqa: E402


WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]


def ffmpeg(*arguments: str, stdout=subprocess.DEVNULL) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *arguments],
        check=True,
        stdout=stdout,
    )


def worker_job(
    process: subprocess.Popen, job_id: str, graph: dict, output: Path
) -> dict:
    payload = {
        "task_type": "render.timeline.v1",
        "graph": graph,
        "execution_plan": create_execution_plan(graph),
        "output_dir": str(output),
    }
    process.stdin.write(
        json.dumps(
            {
                "protocol_version": 1,
                "message_type": "job",
                "job_id": job_id,
                "payload": payload,
            }
        )
        + "\n"
    )
    process.stdin.flush()
    while True:
        message = json.loads(process.stdout.readline())
        if (
            message.get("message_type") == "job_result"
            and message.get("job_id") == job_id
        ):
            if message.get("status") != "succeeded":
                raise AssertionError(message)
            return message


def source_node(
    clip_id: str,
    path: Path,
    start: int,
    end: int,
    timeline_start: int,
    timeline_duration: int,
    track: str,
    z: int,
    width: int = 64,
    height: int = 64,
) -> dict:
    return {
        "node_id": f"clip-{clip_id}-source",
        "kind": "source",
        "capability": "source.original",
        "parameters": {
            "asset_ref": clip_id,
            "source_ref": str(path),
            "source_kind": "original",
            "selected_width": width,
            "selected_height": height,
            "track_kind": "video",
            "track_id": track,
            "track_z_index": z,
            "track_order": z,
            "clip_id": clip_id,
            "source_start_pts": f"{start}n",
            "source_end_pts": f"{end}n",
            "source_timescale": "30n",
            "semantic_source_start_pts": f"{start}n",
            "semantic_source_end_pts": f"{end}n",
            "semantic_source_timescale": "30n",
            "timeline_start": f"{timeline_start}n",
            "timeline_duration": f"{timeline_duration}n",
            "timeline_timescale": "30n",
            "timeline_total_duration": "120n",
        },
    }


def audio_node(
    clip_id: str, timeline_start: int, timeline_duration: int, track: str, order: int
) -> dict:
    return {
        "node_id": f"clip-{clip_id}-audio",
        "kind": "audio",
        "capability": "timeline.audio",
        "parameters": {
            "track_id": track,
            "clip_id": clip_id,
            "timeline_start": f"{timeline_start}n",
            "timeline_duration": f"{timeline_duration}n",
            "timeline_timescale": "30n",
            "gain_db": 0,
            "enabled": True,
            "muted": False,
            "track_order": order,
        },
    }


def graph(
    graph_id: str,
    nodes: list[dict],
    duration: int,
    fps: int = 30,
    width: int = 64,
    height: int = 64,
) -> dict:
    for node in nodes:
        if node.get("kind") == "source":
            node["parameters"]["timeline_total_duration"] = f"{duration}n"
    return {
        "schema_version": 1,
        "graph_id": graph_id,
        "timeline_version": 1,
        "target": "master",
        "profile": {"name": graph_id, "width": width, "height": height, "fps": fps},
        "nodes": [
            *nodes,
            {
                "node_id": "composite",
                "kind": "composite",
                "capability": "timeline.composite",
            },
            {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"},
        ],
        "edges": [],
        "source_refs": [],
    }


def output_path(result: dict) -> Path:
    return Path(
        next(item for item in result["outputs"] if item["kind"] == "render")["path"]
    )


def duration_and_streams(path: Path) -> tuple[float, set[str]]:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_type",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    value = json.loads(probe.stdout)
    return float(value["format"]["duration"]), {
        stream["codec_type"] for stream in value["streams"]
    }


def pixel(path: Path, time: float, x: int, y: int) -> tuple[int, int, int]:
    result = ffmpeg(
        "-i",
        str(path),
        "-ss",
        str(time),
        "-vf",
        f"crop=2:2:{x}:{y}",
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
        stdout=subprocess.PIPE,
    )
    return tuple(result.stdout[:3])


def bright_bbox(path: Path, time: float, threshold: int = 20) -> tuple[int, int, int, int]:
    result = ffmpeg(
        "-ss", str(time), "-i", str(path), "-frames:v", "1",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
        stdout=subprocess.PIPE,
    )
    points: list[tuple[int, int]] = []
    for index in range(64 * 64):
        red, green, blue = result.stdout[index * 3 : index * 3 + 3]
        if max(red, green, blue) > threshold:
            points.append((index % 64, index // 64))
    if not points:
        raise AssertionError((path, time, "no bright pixels"))
    return min(point[0] for point in points), min(point[1] for point in points), max(point[0] for point in points), max(point[1] for point in points)


def video_frame_hashes(path: Path) -> list[str]:
    result = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(path),
            "-map",
            "0:v:0",
            "-f",
            "framemd5",
            "pipe:1",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return [
        line.rsplit(",", 1)[-1].strip()
        for line in result.stdout.splitlines()
        if line and not line.startswith("#")
    ]


def automation_node(clip_id: str, index: int, property_path: str, start: float, end: float, duration: int = 60) -> dict:
    curve = {
        "curve_id": f"{clip_id}-{property_path}",
        "target_id": clip_id,
        "property_path": property_path,
        "value_kind": "number",
        "keyframes": [
            {"keyframe_id": f"{clip_id}-{index}-start", "time": "0n", "value": start, "interpolation": "linear"},
            {"keyframe_id": f"{clip_id}-{index}-end", "time": f"{duration}n", "value": end},
        ],
    }
    return {
        "node_id": f"clip-{clip_id}-automation-{index}",
        "kind": "automation",
        "capability": "timeline.automation",
        "parameters": {
            "curve_id": curve["curve_id"],
            "target_id": clip_id,
            "property_path": property_path,
            "curves_json": json.dumps([curve], separators=(",", ":")),
            "timescale": "30n",
        },
    }


def tone_amplitude(path: Path, start: float, frequency: float) -> float:
    result = ffmpeg(
        "-ss",
        str(start),
        "-t",
        "0.5",
        "-i",
        str(path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "48000",
        "-f",
        "s16le",
        "pipe:1",
        stdout=subprocess.PIPE,
    )
    samples = array.array("h")
    samples.frombytes(result.stdout)
    real = sum(
        sample * math.cos(2 * math.pi * frequency * index / 48000)
        for index, sample in enumerate(samples)
    )
    imaginary = sum(
        sample * math.sin(2 * math.pi * frequency * index / 48000)
        for index, sample in enumerate(samples)
    )
    return math.hypot(real, imaginary) / max(1, len(samples))


def assert_duration(path: Path, expected: float) -> None:
    actual, streams = duration_and_streams(path)
    assert streams == {"video", "audio"}, (path, streams)
    assert abs(actual - expected) <= 0.08, (path, actual, expected)


def frame_count(path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_frames",
            "-show_entries",
            "frame=pts",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return len(json.loads(result.stdout).get("frames", []))


with tempfile.TemporaryDirectory(prefix="ave-render-correctness-") as directory:
    root = Path(directory)
    base = root / "base.mp4"
    overlay = root / "overlay.mp4"
    transform_source = root / "transform-source.mp4"
    large_transform_source = root / "large-transform-source.mp4"
    alpha_source = root / "alpha-source.mov"
    ffmpeg(
        "-f",
        "lavfi",
        "-i",
        "color=c=red:s=64x64:r=30:d=2",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=64x64:r=30:d=2",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000:duration=4",
        "-filter_complex",
        "[0:v][1:v]concat=n=2:v=1:a=0[v]",
        "-map",
        "[v]",
        "-map",
        "2:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        base,
    )
    ffmpeg(
        "-f",
        "lavfi",
        "-i",
        "color=c=green:s=64x64:r=30:d=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:sample_rate=48000:duration=1",
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        overlay,
    )
    ffmpeg(
        "-f", "lavfi", "-i", "color=c=white:s=20x12:r=30:d=2",
        "-f", "lavfi", "-i", "sine=frequency=660:sample_rate=48000:duration=2",
        "-vf", "drawbox=x=0:y=0:w=5:h=4:color=red:t=fill",
        "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", transform_source,
    )
    ffmpeg(
        "-f", "lavfi", "-i", "color=c=white:s=1000x600:r=1:d=2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", large_transform_source,
    )
    ffmpeg(
        "-f", "lavfi", "-i", "color=c=white@0.5:s=20x12:r=30:d=2,format=argb",
        "-c:v", "qtrle", alpha_source,
    )
    process = subprocess.Popen(
        WORKER,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    try:
        process.stdin.write(
            json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n"
        )
        process.stdin.flush()
        json.loads(process.stdout.readline())

        placement_nodes = [
            source_node("base", base, 0, 120, 0, 120, "base-track", 0),
            audio_node("base", 0, 120, "base-track", 0),
            source_node("pip", overlay, 0, 30, 60, 30, "pip-track", 1),
            {
                "node_id": "clip-pip-transform",
                "kind": "transform",
                "capability": "timeline.transform",
                "parameters": {"scale_x": 0.25, "scale_y": 0.25, "x": 40, "y": 40},
            },
            audio_node("pip", 60, 30, "pip-track", 1),
        ]
        placed_result = worker_job(
            process, "placement", graph("placement", placement_nodes, 120), root
        )
        placed = output_path(placed_result)
        assert_duration(placed, 4.0)
        before, during, after = (
            pixel(placed, 1.0, 48, 48),
            pixel(placed, 2.5, 48, 48),
            pixel(placed, 3.5, 48, 48),
        )
        assert before[0] > before[1] and before[0] > before[2], before
        assert during[1] > during[0] and during[1] > during[2], during
        assert after[2] > after[0] and after[2] > after[1], after
        pre_880 = tone_amplitude(placed, 1.0, 880)
        during_880 = tone_amplitude(placed, 2.25, 880)
        assert during_880 > pre_880 * 5, (
            pre_880,
            during_880,
            [
                tone_amplitude(placed, time, 880)
                for time in (0, 0.5, 1, 1.5, 2, 2.25, 2.5, 3, 3.5)
            ],
            placed_result["metrics"]["filter_complex"],
        )
        assert tone_amplitude(placed, 1.0, 440) > 100
        assert tone_amplitude(placed, 2.25, 440) > 100

        transform_curves = [
            ("transform.x", 32, 40),
            ("transform.y", 32, 24),
            ("transform.scale_x", 1, 1.5),
            ("transform.scale_y", 1, 0.75),
            ("transform.rotation", 0, 90),
            ("transform.anchor_x", 0.25, 0.75),
            ("transform.anchor_y", 0.25, 0.75),
            ("transform.opacity", 1, 0.5),
        ]
        transform_nodes = [
            source_node("animated", transform_source, 0, 60, 0, 60, "animated-track", 0, 20, 12),
            *[automation_node("animated", index, path, start_value, end_value) for index, (path, start_value, end_value) in enumerate(transform_curves)],
            {"node_id": "clip-animated-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
            audio_node("animated", 0, 60, "animated-track", 0),
        ]
        high_fps_transform_graph = graph("transform-automation", transform_nodes, 60, fps=120)
        transformed_result = worker_job(process, "transform-automation", high_fps_transform_graph, root)
        transformed = output_path(transformed_result)
        assert_duration(transformed, 2.0)
        start_bbox, end_bbox = bright_bbox(transformed, 0.1), bright_bbox(transformed, 1.8)
        start_width, start_height = start_bbox[2] - start_bbox[0] + 1, start_bbox[3] - start_bbox[1] + 1
        end_width, end_height = end_bbox[2] - end_bbox[0] + 1, end_bbox[3] - end_bbox[1] + 1
        assert start_width > start_height, (start_bbox, end_bbox, transformed_result["metrics"]["filter_complex"])
        assert end_height > end_width * 1.3, (start_bbox, end_bbox, transformed_result["metrics"]["filter_complex"])
        start_center = ((start_bbox[0] + start_bbox[2]) / 2, (start_bbox[1] + start_bbox[3]) / 2)
        end_center = ((end_bbox[0] + end_bbox[2]) / 2, (end_bbox[1] + end_bbox[3]) / 2)
        assert abs(start_center[0] - 32.4) <= 3 and abs(start_center[1] - 31.6) <= 3, (start_center, start_bbox)
        assert abs(end_center[0] - 40.0) <= 3 and end_center[1] < 21, (end_center, end_bbox)
        start_luma = sum(pixel(transformed, 0.1, round(start_center[0]), round(start_center[1])))
        end_luma = sum(pixel(transformed, 1.8, round(end_center[0]), round(end_center[1])))
        assert start_luma > end_luma * 1.35, (start_luma, end_luma)
        filter_complex = transformed_result["metrics"]["filter_complex"]
        assert "pivot-surface-seed" in filter_complex and "split=2" in filter_complex and "crop=1:1:0:0" in filter_complex, filter_complex
        assert "pad=w=66:h=66" in filter_complex, filter_complex
        assert "fps=120" in filter_complex and filter_complex.index("fps=120") < filter_complex.index("transform-scale"), filter_complex
        assert "tpad=stop_mode=clone:stop=1,fps=120,trim=end_frame=240,settb=expr=1/120,setpts=N" in filter_complex, filter_complex
        assert "geq=" in filter_complex and "eval=frame" in filter_complex, filter_complex
        high_fps_hashes = video_frame_hashes(transformed)
        high_fps_duplicates = [index for index in range(1, len(high_fps_hashes)) if high_fps_hashes[index] == high_fps_hashes[index - 1]]
        high_fps_two_frame_duplicates = [index for index in range(2, len(high_fps_hashes)) if high_fps_hashes[index] == high_fps_hashes[index - 2]]
        assert len(high_fps_hashes) == 240 and len(set(high_fps_hashes)) >= 216 and len(high_fps_duplicates) <= 24 and all(index < 12 or index >= 228 for index in high_fps_two_frame_duplicates), {
            "frame_count": len(high_fps_hashes),
            "unique_frames": len(set(high_fps_hashes)),
            "duplicate_pairs": high_fps_duplicates,
            "two_frame_duplicate_pairs": high_fps_two_frame_duplicates,
        }

        fractional_position_nodes = [
            source_node("fractional-position", transform_source, 0, 60, 0, 60, "fractional-position-track", 0, 20, 12),
            automation_node("fractional-position", 0, "transform.x", 2, 43),
            automation_node("fractional-position", 1, "transform.y", 2, 51),
            {"node_id": "clip-fractional-position-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
        ]
        fractional_position_result = worker_job(
            process,
            "fractional-position",
            graph("fractional-position", fractional_position_nodes, 60, fps=120),
            root,
        )
        fractional_position_filter = fractional_position_result["metrics"]["filter_complex"]
        assert "fractional-position-seed" in fractional_position_filter, fractional_position_filter
        assert "perspective=" in fractional_position_filter and "eval=frame:interpolation=linear" in fractional_position_filter, fractional_position_filter
        assert "content-2x" not in fractional_position_filter, fractional_position_filter
        fractional_hashes = video_frame_hashes(output_path(fractional_position_result))
        fractional_adjacent_duplicates = [index for index in range(1, len(fractional_hashes)) if fractional_hashes[index] == fractional_hashes[index - 1]]
        fractional_two_frame_duplicates = [index for index in range(2, len(fractional_hashes)) if fractional_hashes[index] == fractional_hashes[index - 2]]
        assert len(fractional_hashes) == 240 and len(set(fractional_hashes)) >= 228 and len(fractional_adjacent_duplicates) <= 12 and len(fractional_two_frame_duplicates) <= 1, {
            "frame_count": len(fractional_hashes),
            "unique_frames": len(set(fractional_hashes)),
            "adjacent_duplicate_pairs": fractional_adjacent_duplicates,
            "two_frame_duplicate_pairs": fractional_two_frame_duplicates,
        }

        alpha_position_nodes = [
            source_node("alpha-position", alpha_source, 0, 60, 0, 60, "alpha-position-track", 0, 20, 12),
            automation_node("alpha-position", 0, "transform.x", 2, 43),
            automation_node("alpha-position", 1, "transform.y", 2, 51),
            {"node_id": "clip-alpha-position-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
        ]
        alpha_position_filter = compile_render_graph(
            graph("alpha-position", alpha_position_nodes, 60, fps=120)
        )["filter_complex"]
        assert "content-2x" in alpha_position_filter and "perspective=" not in alpha_position_filter, alpha_position_filter

        derived_alpha_nodes = [
            source_node("derived-alpha-position", transform_source, 0, 60, 0, 60, "derived-alpha-track", 0, 20, 12),
            automation_node("derived-alpha-position", 0, "transform.x", 2, 43),
            automation_node("derived-alpha-position", 1, "transform.y", 2, 51),
            {
                "node_id": "clip-derived-alpha-position-mask",
                "kind": "mask",
                "capability": "timeline.mask",
                "parameters": {"mode": "alpha", "x": 0.25, "y": 0.25, "width": 0.5, "height": 0.5},
            },
            {"node_id": "clip-derived-alpha-position-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
            audio_node("derived-alpha-position", 0, 60, "derived-alpha-track", 0),
        ]
        derived_alpha_result = worker_job(
            process,
            "derived-alpha-position",
            graph("derived-alpha-position", derived_alpha_nodes, 60, fps=120),
            root,
        )
        derived_alpha_filter = derived_alpha_result["metrics"]["filter_complex"]
        assert derived_alpha_filter.index("alphamerge") < derived_alpha_filter.index("content-2x"), derived_alpha_filter
        assert "perspective=" not in derived_alpha_filter, derived_alpha_filter
        derived_alpha_start = bright_bbox(output_path(derived_alpha_result), 0.1)
        derived_alpha_end = bright_bbox(output_path(derived_alpha_result), 1.8)
        assert derived_alpha_end[0] - derived_alpha_start[0] > 30 and derived_alpha_end[1] - derived_alpha_start[1] > 35, {
            "start": derived_alpha_start,
            "end": derived_alpha_end,
        }

        edge_crossing_nodes = [
            source_node("edge-crossing-position", transform_source, 0, 60, 0, 60, "edge-crossing-track", 0, 20, 12),
            automation_node("edge-crossing-position", 0, "transform.x", -5, 45),
            {"node_id": "clip-edge-crossing-position-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {"y": 20}},
            audio_node("edge-crossing-position", 0, 60, "edge-crossing-track", 0),
        ]
        edge_crossing_result = worker_job(
            process,
            "edge-crossing-position",
            graph("edge-crossing-position", edge_crossing_nodes, 60, fps=120),
            root,
        )
        edge_crossing_filter = edge_crossing_result["metrics"]["filter_complex"]
        assert "content-2x" in edge_crossing_filter and "perspective=" not in edge_crossing_filter, edge_crossing_filter
        edge_start = bright_bbox(output_path(edge_crossing_result), 0.1)
        edge_end = bright_bbox(output_path(edge_crossing_result), 1.8)
        assert edge_end[0] - edge_start[0] > 35 and abs(edge_end[1] - edge_start[1]) <= 2, {
            "start": edge_start,
            "end": edge_end,
        }
        invalid_fps_graph = graph("invalid-profile-fps", transform_nodes, 60)
        invalid_fps_graph["profile"]["fps"] = 0
        try:
            compile_render_graph(invalid_fps_graph)
            raise AssertionError("zero profile fps must fail closed")
        except ValueError as error:
            assert str(error) == "PROFILE_FPS_INVALID", error

        large_position_nodes = [
            source_node("large-position", large_transform_source, 0, 2, 0, 60, "large-position-track", 0, 1000, 600),
            automation_node("large-position", 0, "transform.x", 200, 400),
            automation_node("large-position", 1, "transform.y", 100, 200),
            {"node_id": "clip-large-position-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
        ]
        try:
            compile_render_graph(graph("large-position", large_position_nodes, 60, fps=120, width=640, height=360))
            raise AssertionError("position supersampling must reject doubled source content outside its resource envelope")
        except ValueError as error:
            assert str(error) == "AUTOMATION_POSITION_SUPERSAMPLE_RESOURCE_LIMIT", error

        maximum_scale_nodes = [
            source_node("maximum-scale", large_transform_source, 0, 2, 0, 60, "maximum-scale-track", 0, 1000, 600),
            automation_node("maximum-scale", 0, "transform.x", 200, 400),
            automation_node("maximum-scale", 1, "transform.scale_x", 1.9, 1.9),
            automation_node("maximum-scale", 2, "transform.scale_y", 1.7, 1.7),
            {"node_id": "clip-maximum-scale-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
        ]
        try:
            compile_render_graph(graph("maximum-scale", maximum_scale_nodes, 60, fps=120, width=640, height=360))
            raise AssertionError("position supersampling must reject a doubled maximum scale envelope outside its resource limits")
        except ValueError as error:
            assert str(error) == "AUTOMATION_POSITION_SUPERSAMPLE_RESOURCE_LIMIT", error

        def render_transform_case(case_id: str, path: str, start_value: float, end_value: float, parameters: dict) -> tuple[dict, tuple[int, int, int, int], tuple[int, int, int, int]]:
            nodes = [
                source_node(case_id, transform_source, 0, 60, 0, 60, f"{case_id}-track", 0, 20, 12),
                automation_node(case_id, 0, path, start_value, end_value),
                {"node_id": f"clip-{case_id}-transform", "kind": "transform", "capability": "timeline.transform", "parameters": parameters},
                audio_node(case_id, 0, 60, f"{case_id}-track", 0),
            ]
            result = worker_job(process, case_id, graph(case_id, nodes, 60), root)
            output = output_path(result)
            return result, bright_bbox(output, 0.1), bright_bbox(output, 1.8)

        property_measurements: dict[str, dict] = {}
        for path, start_value, end_value, parameters in [
            ("transform.x", 10, 30, {"y": 20}),
            ("transform.y", 10, 30, {"x": 20}),
            ("transform.scale_x", 0.75, 1.5, {"x": 20, "y": 20}),
            ("transform.scale_y", 0.75, 1.5, {"x": 20, "y": 20}),
            ("transform.rotation", 0, 90, {"x": 32, "y": 32}),
            ("transform.anchor_x", 0.1, 0.9, {"x": 32, "y": 20}),
            ("transform.anchor_y", 0.1, 0.9, {"x": 20, "y": 32}),
            ("transform.opacity", 1, 0.25, {"x": 20, "y": 20}),
        ]:
            case_id = path.replace(".", "-").replace("_", "-")
            result, start_box, end_box = render_transform_case(case_id, path, start_value, end_value, parameters)
            start_center = ((start_box[0] + start_box[2]) / 2, (start_box[1] + start_box[3]) / 2)
            end_center = ((end_box[0] + end_box[2]) / 2, (end_box[1] + end_box[3]) / 2)
            start_size = (start_box[2] - start_box[0] + 1, start_box[3] - start_box[1] + 1)
            end_size = (end_box[2] - end_box[0] + 1, end_box[3] - end_box[1] + 1)
            property_measurements[path] = {"start_center": start_center, "end_center": end_center, "start_size": start_size, "end_size": end_size}
            if path == "transform.x":
                assert end_center[0] - start_center[0] > 15, property_measurements[path]
            elif path == "transform.y":
                assert end_center[1] - start_center[1] > 15, property_measurements[path]
            elif path == "transform.scale_x":
                assert end_size[0] > start_size[0] * 1.6 and abs(end_size[1] - start_size[1]) <= 2, property_measurements[path]
            elif path == "transform.scale_y":
                assert end_size[1] > start_size[1] * 1.6 and abs(end_size[0] - start_size[0]) <= 2, property_measurements[path]
            elif path == "transform.rotation":
                assert start_size[0] > start_size[1] and end_size[1] > end_size[0], property_measurements[path]
                hashes = video_frame_hashes(output_path(result))
                duplicate_pairs = [index for index in range(1, len(hashes)) if hashes[index] == hashes[index - 1]]
                assert len(hashes) == 60 and not duplicate_pairs, {
                    **property_measurements[path],
                    "frame_count": len(hashes),
                    "duplicate_pairs": duplicate_pairs,
                }
            elif path == "transform.anchor_x":
                assert start_center[0] - end_center[0] > 12, property_measurements[path]
            elif path == "transform.anchor_y":
                assert start_center[1] - end_center[1] > 7, property_measurements[path]
            elif path == "transform.opacity":
                output = output_path(result)
                start_luma = sum(pixel(output, 0.1, round(start_center[0]), round(start_center[1])))
                end_luma = sum(pixel(output, 1.8, round(end_center[0]), round(end_center[1])))
                assert start_luma > end_luma * 2.5, {**property_measurements[path], "start_luma": start_luma, "end_luma": end_luma}

        def opacity_only_framing_nodes(case_id: str, animated: bool) -> list[dict]:
            nodes = [source_node(case_id, transform_source, 0, 60, 0, 60, f"{case_id}-track", 0, 20, 12)]
            if animated:
                nodes.append(automation_node(case_id, 0, "transform.opacity", 1, 0.5))
            nodes.extend([
                {"node_id": f"clip-{case_id}-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {}},
                audio_node(case_id, 0, 60, f"{case_id}-track", 0),
            ])
            return nodes

        opacity_framing_baseline = worker_job(process, "opacity-framing-baseline", graph("opacity-framing-baseline", opacity_only_framing_nodes("opacity-framing-baseline", False), 60), root)
        opacity_framing_animated = worker_job(process, "opacity-framing-animated", graph("opacity-framing-animated", opacity_only_framing_nodes("opacity-framing-animated", True), 60), root)
        opacity_baseline_box = bright_bbox(output_path(opacity_framing_baseline), 0.1)
        opacity_animated_box = bright_bbox(output_path(opacity_framing_animated), 0.1)
        opacity_animated_end_box = bright_bbox(output_path(opacity_framing_animated), 1.8)
        opacity_baseline_luma = sum(pixel(output_path(opacity_framing_baseline), 1.8, 32, 32))
        opacity_animated_start_luma = sum(pixel(output_path(opacity_framing_animated), 0.1, 32, 32))
        opacity_animated_end_luma = sum(pixel(output_path(opacity_framing_animated), 1.8, 32, 32))
        assert opacity_animated_box == opacity_animated_end_box == opacity_baseline_box == (0, 0, 63, 63), (opacity_baseline_box, opacity_animated_box, opacity_animated_end_box)
        assert abs(opacity_animated_start_luma - opacity_baseline_luma) <= 40, (opacity_animated_start_luma, opacity_baseline_luma)
        assert opacity_baseline_luma * 0.35 < opacity_animated_end_luma < opacity_baseline_luma * 0.7, (opacity_animated_start_luma, opacity_animated_end_luma, opacity_baseline_luma)
        assert "force_original_aspect_ratio=increase,crop=64:64" in opacity_framing_animated["metrics"]["filter_complex"], opacity_framing_animated["metrics"]["filter_complex"]

        def alpha_nodes(case_id: str, opacity_curve: bool) -> list[dict]:
            source = source_node(case_id, alpha_source, 0, 60, 0, 60, f"{case_id}-track", 0, 20, 12)
            source["parameters"]["has_audio"] = False
            nodes = [source]
            if opacity_curve:
                nodes.append(automation_node(case_id, 0, "transform.opacity", 1, 0.5))
            nodes.append({"node_id": f"clip-{case_id}-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {"x": 20, "y": 20}})
            return nodes

        alpha_baseline_result = worker_job(process, "alpha-baseline", graph("alpha-baseline", alpha_nodes("alpha-baseline", False), 60), root)
        alpha_animated_result = worker_job(process, "alpha-multiplied", graph("alpha-multiplied", alpha_nodes("alpha-multiplied", True), 60), root)
        alpha_baseline = sum(pixel(output_path(alpha_baseline_result), 1.8, 25, 25))
        alpha_start = sum(pixel(output_path(alpha_animated_result), 0.1, 25, 25))
        alpha_end = sum(pixel(output_path(alpha_animated_result), 1.8, 25, 25))
        assert abs(alpha_start - alpha_baseline) <= 30, (alpha_start, alpha_baseline)
        assert alpha_end < alpha_baseline * 0.7, (alpha_start, alpha_end, alpha_baseline)
        assert alpha_end > alpha_baseline * 0.35, (alpha_start, alpha_end, alpha_baseline)

        trailing_nodes = [
            source_node("trailing", base, 0, 30, 0, 30, "trailing-track", 0),
            audio_node("trailing", 0, 30, "trailing-track", 0),
        ]
        trailing_result = worker_job(
            process, "trailing-duration", graph("trailing-duration", trailing_nodes, 60), root
        )
        trailing = output_path(trailing_result)
        assert_duration(trailing, 2.0)
        trailing_pixel = pixel(trailing, 1.5, 32, 32)
        assert max(trailing_pixel) < 16, trailing_pixel
        assert "trailing-track-gap-end" in trailing_result["metrics"]["filter_complex"]

        scenarios = [
            (
                "speed-2x",
                0,
                120,
                60,
                [
                    {
                        "segment_id": "speed",
                        "timeline_start": "0n",
                        "timeline_end": "60n",
                        "source_start": "0n",
                        "source_end": "120n",
                        "mode": "speed",
                        "speed_numerator": "2n",
                        "speed_denominator": "1n",
                    }
                ],
                2.0,
                "atempo=2",
            ),
            (
                "speed-quarter",
                0,
                30,
                120,
                [
                    {
                        "segment_id": "slow",
                        "timeline_start": "0n",
                        "timeline_end": "120n",
                        "source_start": "0n",
                        "source_end": "30n",
                        "mode": "speed",
                        "speed_numerator": "1n",
                        "speed_denominator": "4n",
                    }
                ],
                4.0,
                "atempo=0.5,atempo=0.5",
            ),
            (
                "hold",
                90,
                90,
                30,
                [
                    {
                        "segment_id": "hold",
                        "timeline_start": "0n",
                        "timeline_end": "30n",
                        "source_start": "90n",
                        "source_end": "90n",
                        "mode": "hold",
                    }
                ],
                1.0,
                "loop=loop=29",
            ),
            (
                "reverse",
                0,
                120,
                120,
                [
                    {
                        "segment_id": "reverse",
                        "timeline_start": "0n",
                        "timeline_end": "120n",
                        "source_start": "0n",
                        "source_end": "120n",
                        "mode": "reverse",
                    }
                ],
                4.0,
                "areverse",
            ),
        ]
        rendered = {}
        for (
            name,
            start,
            end,
            timeline_duration,
            segments,
            expected,
            marker,
        ) in scenarios:
            clip_start, clip_end = (0, 120) if name == "hold" else (start, end)
            nodes = [
                source_node(
                    name, base, clip_start, clip_end, 0, timeline_duration, "v1", 0
                ),
                {
                    "node_id": f"clip-{name}-time-map",
                    "kind": "time_map",
                    "capability": "timeline.time_map",
                    "parameters": {
                        "segments_json": json.dumps(segments, separators=(",", ":")),
                        "semantic_segments_json": json.dumps(
                            segments, separators=(",", ":")
                        ),
                    },
                },
                audio_node(name, 0, timeline_duration, "v1", 0),
            ]
            result = worker_job(
                process, name, graph(name, nodes, timeline_duration), root
            )
            path = output_path(result)
            assert_duration(path, expected)
            assert marker in result["metrics"]["filter_complex"], result["metrics"][
                "filter_complex"
            ]
            rendered[name] = path
        hold_frames = frame_count(rendered["hold"])
        assert hold_frames >= 29, hold_frames
        hold_pixel = pixel(rendered["hold"], 0, 32, 32)
        assert hold_pixel[2] > hold_pixel[0], hold_pixel
        reverse_first = pixel(rendered["reverse"], 0.25, 32, 32)
        reverse_last = pixel(rendered["reverse"], 3.75, 32, 32)
        assert reverse_first[2] > reverse_first[0], reverse_first
        assert reverse_last[0] > reverse_last[2], reverse_last
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

print("render graph media correctness acceptance passed")
