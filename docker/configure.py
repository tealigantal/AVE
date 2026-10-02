"""Write .env-selected credentials into the existing Host configuration contract."""
import json
import os
import sys
from pathlib import Path


def configure():
    template = os.environ.get("AVE_MODEL_SERVICES_JSON")
    try:
        config = json.loads(template) if template else json.loads(
            Path("/opt/ave/model-services.template.json").read_text())
    except (ValueError, OSError):
        raise SystemExit("Invalid model configuration template; input withheld") from None
    if config.get("version") != 1 or config.get("enabled") is not True:
        raise SystemExit("An enabled version=1 model configuration is required")
    for role in ("vision", "planner"):
        key = os.environ.get(f"AVE_{role.upper()}_API_KEY", "").strip()
        if not key:
            raise SystemExit(f"Set AVE_{role.upper()}_API_KEY in .env")
        config[role]["api_key"] = key
    directory = Path("/run/ave")
    directory.mkdir(parents=True, exist_ok=True)
    temporary = directory / "model-services.json.new"
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        json.dump(config, stream)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.chmod(temporary, 0o600)
    os.chown(temporary, 1000, 1000)
    os.replace(temporary, directory / "model-services.json")
    os.chown("/workspace/projects", 1000, 1000)
    os.chown("/workspace/uploads", 1000, 1000)
    print("AVE model configuration ready; credentials withheld")


if __name__ == "__main__":
    configure()
    if "--launch" in sys.argv:
        # Initialization owns this privilege only; Host/Worker run as node.
        os.setgroups([])
        os.setgid(1000)
        os.setuid(1000)
        os.environ.update(HOME="/home/node", USER="node", LOGNAME="node")
        for name in list(os.environ):
            if name.endswith("_API_KEY") or name == "AVE_MODEL_SERVICES_JSON":
                del os.environ[name]
        os.execv("/usr/local/bin/ave-desktop", ["/usr/local/bin/ave-desktop"])
