"""Ephemeral limits only. No credential value leaves this startup process/file."""
import json
import os
from pathlib import Path

config = json.loads(Path("/original-config/model-services.json").read_text())
expected = {"vision": "qwen3-vl-plus", "planner": "qwen3.7-max-2026-05-20"}
for role, model in expected.items():
    service = config[role]
    if service.get("provider") != "qwen" or service.get("model") != model or service.get("base_url") != "https://dashscope.aliyuncs.com/compatible-mode/v1":
        raise SystemExit("Actual deployment differs from authorization; contents withheld")
    if not isinstance(service.get("api_key"), str) or not service["api_key"].strip():
        raise SystemExit("Existing authentication unavailable; no new credential requested")
config["vision"].update(enable_thinking=False, max_tokens=1024)
config["vision"].pop("thinking_budget", None)
config["planner"].update(enable_thinking=True, max_tokens=8192, thinking_budget=4096)
directory = Path("/run/paid")
directory.mkdir(exist_ok=True)
path = directory / "model-services.json"
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as stream:
    json.dump(config, stream)
os.chown(path, 1000, 1000)
os.chown("/budget-ledger", 1000, 1000)
os.environ["AVE_MODEL_CONFIG"] = str(path)
os.environ["NODE_OPTIONS"] = "--import=/harness/install.mjs"
for name in list(os.environ):
    if name.endswith("_API_KEY") or name == "AVE_MODEL_SERVICES_JSON":
        del os.environ[name]
os.setgroups([])
os.setgid(1000)
os.setuid(1000)
os.environ.update(HOME="/home/node", USER="node", LOGNAME="node")
os.execv("/usr/local/bin/ave-desktop", ["/usr/local/bin/ave-desktop"])
