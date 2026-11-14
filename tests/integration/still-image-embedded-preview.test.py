"""Extensionless immutable JPEGs must loop the image, not embedded JPEGs."""
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))
from worker_host.render.graph_compiler import compile_render_graph  # noqa: E402

with tempfile.TemporaryDirectory(prefix="ave-still-preview-") as directory:
    root = Path(directory)
    original = root / "immutable-object"
    first, thumbnail = io.BytesIO(), io.BytesIO()
    Image.new("RGB", (64, 48), (30, 150, 60)).save(first, format="JPEG")
    Image.new("RGB", (32, 24), (200, 0, 0)).save(thumbnail, format="JPEG")
    original.write_bytes(first.getvalue() + thumbnail.getvalue())
    params = {"asset_ref": "image", "source_ref": str(original), "source_kind": "original", "clip_kind": "image", "selected_width": 64, "selected_height": 48, "track_kind": "video", "track_id": "video", "track_z_index": 0, "track_order": 0, "clip_id": "image", "has_audio": False, "source_start_pts": "0n", "source_end_pts": "30n", "source_timescale": "30n", "semantic_source_start_pts": "0n", "semantic_source_end_pts": "30n", "semantic_source_timescale": "30n", "timeline_start": "0n", "timeline_duration": "30n", "timeline_timescale": "30n", "timeline_total_duration": "30n"}
    graph = {"schema_version": 1, "graph_id": "still-preview", "timeline_version": 1, "target": "master", "profile": {"name": "test", "width": 64, "height": 48, "fps": 30}, "nodes": [{"node_id": "source", "kind": "source", "capability": "source.original", "parameters": params}, {"node_id": "composite", "kind": "composite", "capability": "timeline.composite"}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": [], "source_refs": []}
    compiled = compile_render_graph(graph)
    output = root / "result.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *compiled["inputs"], "-filter_complex", compiled["filter_complex"], "-map", f"[{compiled['video_label']}]", "-fps_mode", "passthrough", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(output)], check=True)
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,width,height", "-of", "json", str(output)], check=True, capture_output=True, text=True).stdout)
    assert probe["streams"] == [{"width": 64, "height": 48, "nb_read_frames": "30"}], probe
    print("Extensionless JPEG with embedded preview renders all 30 frames")
