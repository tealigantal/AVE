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
    process = subprocess.Popen(WORKER, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    try:
        process.stdin.write(json.dumps({"protocol_version": 1, "message_type": "handshake"}) + "\n")
        process.stdin.flush()
        handshake = json.loads(process.stdout.readline())
        assert "render.timeline.v1" in handshake["payload"]["capabilities"]
        def source(asset, kind):
            return {"node_id": f"{asset}-source", "kind": "source", "capability": f"source.{kind}", "parameters": {"asset_ref": asset, "source_ref": str(MEDIA), "source_kind": kind, "track_kind": "video", "source_start_pts": "0n", "source_end_pts": "30n", "source_timescale": "30n", "timeline_start": "0n"}}
        graph = {"schema_version": 1, "graph_id": "smoke", "target": "master", "nodes": [source("b", "original"), source("a", "original"), {"node_id": "composite", "kind": "composite", "capability": "timeline.composite"}, {"node_id": "sink", "kind": "sink", "capability": "sink.mp4"}], "edges": [{"from": "b-source", "to": "composite"}, {"from": "a-source", "to": "composite"}, {"from": "composite", "to": "sink"}]}
        result = run(process, "render-graph-1", {"task_type": "render.timeline.v1", "graph": graph, "output_dir": str(output)})
        assert result["status"] == "succeeded", result
        assert Path(result["outputs"][0]["path"]).is_file()
        assert result["metrics"]["worker_version"].startswith("ave-worker-host-r10")
        assert result["metrics"]["ffmpeg_version"].startswith("ffmpeg version")
        assert "trim=start_pts=0:end_pts=30" in result["metrics"]["filter_complex"]
        invalid = dict(graph, nodes=[source("proxy", "proxy"), graph["nodes"][2], graph["nodes"][3]])
        blocked = run(process, "render-graph-2", {"task_type": "render.timeline.v1", "graph": invalid, "output_dir": str(output)})
        assert blocked["status"] == "failed" and blocked["diagnostics"][0]["code"] == "MASTER_ORIGINAL_REQUIRED"
    finally:
        process.kill()
        process.wait()
        assert process.stderr.read() == ""

print("worker render graph protocol smoke passed")
