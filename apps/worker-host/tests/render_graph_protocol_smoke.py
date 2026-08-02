import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
WORKER = [sys.executable, str(ROOT / "apps/worker-host/src/worker_host/main.py")]
MEDIA = ROOT / "tests/fixtures/generated/p0-vfr.mp4"


def run(process, job_id, payload):
    process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "job", "job_id": job_id, "payload": payload}) + "\n")
    process.stdin.flush()
    while True:
        message = json.loads(process.stdout.readline())
        if message.get("message_type") == "job_result" and message.get("job_id") == job_id:
            return message


with tempfile.TemporaryDirectory(prefix="ave-worker-render-graph-") as directory:
    output = Path(directory)
    graphic = output / "graphic.png"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=yellow:s=64x64", "-frames:v", "1", str(graphic)], check=True)
    process = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    try:
        process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        process.stdin.flush()
        handshake = json.loads(process.stdout.readline())
        assert "render.timeline.v1" in handshake["payload"]["capabilities"]
        def source(asset, kind, source_path=MEDIA):
            return {"node_id": f"{asset}-source", "kind": "source", "capability": f"source.{kind}", "parameters": {"asset_ref": asset, "source_ref": str(source_path), "source_kind": kind, "track_kind": "video", "source_start_pts": "0n", "source_end_pts": "30n", "source_timescale": "30n", "timeline_start": "0n"}}
        map_segments = json.dumps([{"segment_id": "forward", "timeline_start": "0n", "timeline_end": "30n", "source_start": "0n", "source_end": "30n", "mode": "speed"}])
        graph = {"schema_version": 1, "graph_id": "smoke", "target": "master", "profile": {"width": 320, "height": 180}, "nodes": [source("b", "original"), {"node_id": "b-time-map", "kind": "time_map", "capability": "timeline.time_map", "parameters": {"segments_json": map_segments}}, {"node_id": "b-transform", "kind": "transform", "capability": "timeline.transform", "parameters": {"scale_x": 1, "scale_y": 1, "crop_left": 0.1, "crop_top": 0, "crop_right": 0.1, "crop_bottom": 0, "flip_x": True}}, source("a", "original"), {"node_id": "composite", "kind": "composite", "capability": "timeline.composite"}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": [{"from": "b-source", "to": "b-time-map"}, {"from": "b-time-map", "to": "b-transform"}, {"from": "b-transform", "to": "composite"}, {"from": "a-source", "to": "composite"}, {"from": "composite", "to": "sink"}]}
        graph["nodes"][0]["parameters"].update({"track_id": "base", "track_z_index": 0})
        graph["nodes"][3]["parameters"].update({"track_id": "overlay", "track_z_index": 1})
        result = run(process, "render-graph-1", {"task_type": "render.timeline.v1", "graph": graph, "output_dir": str(output)})
        assert result["status"] == "succeeded", result
        assert Path(result["outputs"][0]["path"]).is_file()
        assert result["metrics"]["worker_version"].startswith("ave-worker-host-r10")
        assert result["metrics"]["ffmpeg_version"].startswith("ffmpeg version")
        assert "trim=start_pts=0:end_pts=30" in result["metrics"]["filter_complex"]
        assert "crop=iw*0.8:ih*1:iw*0.1:ih*0" in result["metrics"]["filter_complex"]
        assert "hflip" in result["metrics"]["filter_complex"]
        assert "overlay=shortest=1:eof_action=pass" in result["metrics"]["filter_complex"]
        left, right = source("left", "original"), source("right", "original")
        left["parameters"].update({"track_id": "v1", "track_z_index": 0, "clip_id": "left", "timeline_start": "0n", "timeline_duration": "15n"})
        right["parameters"].update({"track_id": "v1", "track_z_index": 0, "clip_id": "right", "timeline_start": "15n", "timeline_duration": "15n"})
        transition_graph = {"schema_version": 1, "graph_id": "transition", "target": "master", "profile": {"width": 320, "height": 180}, "nodes": [left, right, {"node_id": "dissolve", "kind": "transition", "capability": "timeline.transition", "parameters": {"transition_kind": "dissolve", "from_clip_id": "left", "to_clip_id": "right", "duration": "5n"}}, {"node_id": "composite", "kind": "composite", "capability": "timeline.composite"}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": []}
        transitioned = run(process, "render-graph-transition", {"task_type": "render.timeline.v1", "graph": transition_graph, "output_dir": str(output)})
        assert transitioned["status"] == "succeeded", transitioned
        assert "xfade=transition=fade" in transitioned["metrics"]["filter_complex"]
        for kind, backend_name in (("whip", "hblur"), ("zoom", "zoomin"), ("luma_wipe", "pixelize")):
            transition_graph["nodes"][2]["parameters"]["transition_kind"] = kind
            transitioned = run(process, f"render-graph-transition-{kind}", {"task_type": "render.timeline.v1", "graph": transition_graph, "output_dir": str(output)})
            assert transitioned["status"] == "succeeded", transitioned
            assert f"xfade=transition={backend_name}" in transitioned["metrics"]["filter_complex"]
        color_source = source("color", "original")
        color_source["parameters"].update({"track_id": "v1", "track_z_index": 0, "clip_id": "color", "timeline_duration": "30n"})
        color_graph = {"schema_version": 1, "graph_id": "color", "target": "master", "profile": {"width": 320, "height": 180}, "nodes": [color_source, {"node_id": "color-grade", "kind": "color", "capability": "timeline.color", "parameters": {"brightness": 0.1, "contrast": 1.1, "input_space": "rec709", "working_space": "rec709", "output_space": "rec709", "bit_depth": 8, "range": "limited"}}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": []}
        colored = run(process, "render-graph-color", {"task_type": "render.timeline.v1", "graph": color_graph, "output_dir": str(output)})
        assert colored["status"] == "succeeded", colored
        assert "eq=brightness=0.1:contrast=1.1" in colored["metrics"]["filter_complex"]
        color_graph["nodes"][1]["parameters"] = {"lut_path": str(output / "missing.cube")}
        missing_lut = run(process, "render-graph-color-missing-lut", {"task_type": "render.timeline.v1", "graph": color_graph, "output_dir": str(output)})
        assert missing_lut["status"] == "failed" and "COLOR_LUT_MISSING" in missing_lut["diagnostics"][0]["message"]
        mask_source = source("mask", "original")
        mask_source["parameters"].update({"track_id": "v1", "track_z_index": 0, "clip_id": "mask", "timeline_duration": "30n"})
        mask_graph = {"schema_version": 1, "graph_id": "mask", "target": "master", "profile": {"width": 320, "height": 180}, "nodes": [mask_source, {"node_id": "mask-mosaic", "kind": "mask", "capability": "timeline.mask", "parameters": {"mode": "mosaic", "x": 0.2, "y": 0.2, "width": 0.2, "height": 0.2}}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": []}
        masked = run(process, "render-graph-mask", {"task_type": "render.timeline.v1", "graph": mask_graph, "output_dir": str(output)})
        assert masked["status"] == "succeeded", masked
        assert "flags=neighbor" in masked["metrics"]["filter_complex"]
        mask_graph["nodes"][1]["parameters"]["mode"] = "alpha"
        alpha_mask = run(process, "render-graph-mask-alpha", {"task_type": "render.timeline.v1", "graph": mask_graph, "output_dir": str(output)})
        assert alpha_mask["status"] == "succeeded", alpha_mask
        assert "alphamerge" in alpha_mask["metrics"]["filter_complex"]
        graphic_source = source("graphic", "original", graphic)
        graphic_source["parameters"].update({"clip_kind": "graphic", "track_id": "graphics", "track_z_index": 1, "clip_id": "graphic", "timeline_duration": "30n"})
        graphic_graph = {"schema_version": 1, "graph_id": "graphic", "target": "master", "profile": {"width": 320, "height": 180}, "nodes": [graphic_source, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": []}
        graphic_result = run(process, "render-graph-graphic", {"task_type": "render.timeline.v1", "graph": graphic_graph, "output_dir": str(output)})
        assert graphic_result["status"] == "succeeded", graphic_result
        assert "anullsrc" in graphic_result["metrics"]["filter_complex"]
        invalid = dict(graph, nodes=[source("proxy", "proxy"), graph["nodes"][4], graph["nodes"][5]])
        blocked = run(process, "render-graph-2", {"task_type": "render.timeline.v1", "graph": invalid, "output_dir": str(output)})
        assert blocked["status"] == "failed" and blocked["diagnostics"][0]["code"] == "MASTER_ORIGINAL_REQUIRED"
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

print("worker render graph protocol smoke passed")
