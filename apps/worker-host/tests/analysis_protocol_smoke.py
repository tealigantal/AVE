import json
import subprocess
import sys

worker = [sys.executable, "apps/worker-host/src/worker_host/main.py"]
asset = "asset:sha256:" + "a" * 64


def run(message):
    completed = subprocess.run(worker, input=json.dumps(message) + "\n", text=True, capture_output=True, check=True)
    return [json.loads(line) for line in completed.stdout.splitlines()]


valid = run({"protocol_version": 1, "message_type": "job", "job_id": "analysis-1", "payload": {"analysis_type": "asr", "records": [{"segment_id": "seg-1", "asset_id": asset, "start_pts": 0, "end_pts": 12, "text": "明确证据"}]}})
assert valid[-1]["status"] == "succeeded"
assert valid[-1]["outputs"][0]["source"] == "asr"

empty = run({"protocol_version": 1, "message_type": "job", "job_id": "analysis-2", "payload": {"analysis_type": "ocr", "records": []}})
assert empty[-1]["status"] == "failed" and empty[-1]["diagnostics"][0]["code"] == "EMPTY_ANALYSIS"

bad_range = run({"protocol_version": 1, "message_type": "job", "job_id": "analysis-3", "payload": {"analysis_type": "scene", "records": [{"asset_id": asset, "start_pts": 5, "end_pts": 5, "label": "室内"}]}})
assert bad_range[-1]["status"] == "failed" and bad_range[-1]["diagnostics"][0]["code"] == "INVALID_RANGE"

unsupported = run({"protocol_version": 1, "message_type": "job", "job_id": "analysis-4", "payload": {"analysis_type": "inference", "records": [{"asset_id": asset, "start_pts": 0, "end_pts": 1, "text": "不应接受"}]}})
assert unsupported[-1]["status"] == "failed" and unsupported[-1]["diagnostics"][0]["code"] == "UNSUPPORTED_ANALYSIS"
print("analysis worker protocol smoke passed")
