import json
import subprocess
import sys

request = "\n".join([
    json.dumps({"protocol_version": 1, "message_type": "handshake"}),
    json.dumps({"protocol_version": 1, "message_type": "job", "job_id": "job-1"}),
]) + "\n"
process = subprocess.run([sys.executable, "apps/worker-host/src/worker_host/main.py"], input=request, text=True, capture_output=True, check=True)
messages = [json.loads(line) for line in process.stdout.splitlines()]
assert [message["message_type"] for message in messages] == ["handshake", "progress", "job_result"]
assert messages[-1]["status"] == "succeeded"
print("worker protocol check passed")
