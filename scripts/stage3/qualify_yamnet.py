"""Local evaluator: HTTP protocol controls; labels never enter inference inputs.

Provide a JSON list of {name,path,provenance,expected}; each attempt creates its own
report. Expected annotations remain evaluator-only and are never sent to service.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import time
import traceback
import urllib.request
import uuid


def qualify(manifest, directory, endpoint):
    output = Path(directory) / ("qualification-" + str(uuid.uuid4()))
    output.mkdir()
    health = json.load(urllib.request.urlopen(endpoint + "/health"))
    results = []
    for item in json.loads(Path(manifest).read_text(encoding="utf-8-sig")):
        record = {"control": item, "started_at": time.time()}
        try:
            data = Path(item["path"]).read_bytes()
            record["sha256"] = hashlib.sha256(data).hexdigest()
            payload = {"model": health["model"], "stream": False, "messages": [{"role": "user", "content": [
                {"type": "input_audio", "input_audio": {"format": "wav", "data": base64.b64encode(data).decode("ascii")}}]}]}
            request = urllib.request.Request(endpoint + "/v1/chat/completions", json.dumps(payload).encode(), {"Content-Type": "application/json"})
            response = json.load(urllib.request.urlopen(request, timeout=120))
            record.update(response=response, status="response")
            facts = json.loads((Path(directory) / "runs" / (response["id"] + ".json")).read_text(encoding="utf-8"))["facts"]
            record["window_top"] = [{"start": w["start"], "end": w["end"], "zero": w["pcm_exact_zero"], "top": w["top"]} for w in facts["windows"]]
            record["exact_zero_pcm"] = facts["exact_zero_pcm"]
        except Exception as error:
            record.update(status="failed", cause=type(error).__name__, message=str(error), stack=traceback.format_exc())
        record["completed_at"] = time.time()
        (output / (item["name"] + ".json")).write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        results.append({"name": item["name"], "status": record["status"], "seconds": round(record["completed_at"] - record["started_at"], 3)})
    (output / "summary.json").write_text(json.dumps({"quality": "not_automatically_accepted", "results": results}, indent=2), encoding="utf-8")
    print(json.dumps({"directory": str(output), "results": results}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--directory", required=True)
    parser.add_argument("--endpoint", default="http://127.0.0.1:18081")
    args = parser.parse_args()
    qualify(args.manifest, args.directory, args.endpoint)
