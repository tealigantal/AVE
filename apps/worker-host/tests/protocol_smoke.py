import json
import subprocess
import sys

request = "\n".join([
    json.dumps({"protocol_version": 1, "message_type": "handshake"}),
    json.dumps({"protocol_version": 1, "message_type": "job", "job_id": "job-1", "payload": {"analysis_type": "asr", "records": [{"asset_id": "asset:sha256:" + "a" * 64, "start_pts": 0, "end_pts": 2, "text": "protocol"}]}}),
]) + "\n"
process = subprocess.run([sys.executable, "apps/worker-host/src/worker_host/main.py"], input=request, text=True, capture_output=True, check=True)
messages = [json.loads(line) for line in process.stdout.splitlines()]
assert [message["message_type"] for message in messages] == ["handshake", "progress", "job_result"]
assert messages[-1]["status"] == "succeeded"
print("worker protocol check passed")
