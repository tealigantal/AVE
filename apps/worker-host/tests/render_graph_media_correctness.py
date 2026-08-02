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
) -> dict:
    return {
        "node_id": f"clip-{clip_id}-source",
        "kind": "source",
        "capability": "source.original",
        "parameters": {
            "asset_ref": clip_id,
            "source_ref": str(path),
            "source_kind": "original",
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


def graph(graph_id: str, nodes: list[dict], duration: int) -> dict:
    for node in nodes:
        if node.get("kind") == "source":
            node["parameters"]["timeline_total_duration"] = f"{duration}n"
    return {
        "schema_version": 1,
        "graph_id": graph_id,
        "timeline_version": 1,
        "target": "master",
        "profile": {"name": graph_id, "width": 64, "height": 64},
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
                "loop=loop=-1",
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
