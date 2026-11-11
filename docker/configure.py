"""Write .env-selected credentials into the existing Host configuration contract."""
import json
import copy
import os
import sys
import re
from pathlib import Path
from urllib.parse import urlsplit


def dependencies(config, allow_local_profiles=False):
    """Validate the local service identities without disclosing configuration."""
    if not isinstance(config, dict) or config.get("version") != 1 or config.get("enabled") is not True:
        raise ValueError("An enabled version=1 model configuration is required")
    if "profiles" in config:
        if set(config) != {"version", "enabled", "default_profile", "profiles"} or not isinstance(config["profiles"], list) or not 1 <= len(config["profiles"]) <= 8:
            raise ValueError("Invalid cloud profiles configuration")
        ids, labels = set(), set()
        required = {"transcription": False, "sound": False}
        for profile in config["profiles"]:
            if not isinstance(profile, dict) or set(profile) != {"id", "label", "vision", "planner", "transcription", "sound"}:
                raise ValueError("Invalid cloud profile fields")
            profile_id, label = profile["id"], profile["label"]
            if not isinstance(profile_id, str) or not re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", profile_id) or profile_id in ids or not isinstance(label, str) or not label.strip() or len(label.encode("utf-16-le")) // 2 > 80 or re.search(r"[\x00-\x1f\x7f]", label) or label.strip() in labels:
                raise ValueError("Invalid cloud profile identity")
            ids.add(profile_id); labels.add(label.strip())
            local_roles = set()
            for role in ("vision", "planner", "transcription", "sound"):
                service = profile[role]
                local_spec = {
                    "transcription": ("local-whisper", "Systran/faster-whisper-small", "http://127.0.0.1:18080/v1"),
                    "sound": ("local-yamnet", "yamnet-tflite-1-10c95ea3eb9a7bb4", "http://127.0.0.1:18081/v1"),
                }.get(role)
                if allow_local_profiles and isinstance(service, dict) and local_spec and service.get("provider") == local_spec[0]:
                    if service.get("model") != local_spec[1] or service.get("base_url") != local_spec[2] or service.get("api_key") not in (None, "") or role == "transcription" and service.get("protocol") not in (None, "whisper") or role == "sound" and (service.get("audio_input") not in ("base64", "data-url") or service.get("response_mode") != "json" or service.get("structured_output") != "validated_json" or service.get("text_output_only") is not True):
                        raise ValueError(f"Invalid local {role} identity")
                    local_roles.add(role); required[role] = True
                    continue
                provider = "qwen" if role in ("vision", "planner") else "qwen-audio"
                if not isinstance(service, dict) or service.get("provider") != provider or not isinstance(service.get("model"), str) or not service["model"].startswith("qwen"):
                    raise ValueError(f"Invalid cloud {role} provider")
                if role == "transcription" and (service.get("protocol") != "qwen-audio-asr" or service.get("model") != "qwen-audio-3.1-asr-flash"):
                    raise ValueError("Invalid cloud transcription protocol")
                try:
                    endpoint = urlsplit(service.get("base_url", ""))
                    hostname = endpoint.hostname
                    expected_path = "/api/v1/services/aigc/multimodal-generation/generation" if role == "transcription" else "/compatible-mode/v1"
                    if endpoint.scheme != "https" or hostname != "dashscope.aliyuncs.com" or endpoint.path.rstrip("/") != expected_path or endpoint.username or endpoint.password or endpoint.query or endpoint.fragment or endpoint.port not in (None, 443):
                        raise ValueError()
                except (TypeError, ValueError):
                    raise ValueError(f"Invalid cloud {role} endpoint") from None
            if local_roles and local_roles != {"transcription", "sound"}:
                raise ValueError("Local audio profiles require both local services")
        if not isinstance(config["default_profile"], str) or config["default_profile"] not in ids:
            raise ValueError("Invalid default cloud profile")
        return required
    local = {}
    for role, provider, port in (("transcription", "local-whisper", 18080), ("sound", "local-yamnet", 18081)):
        service = config.get(role)
        if not isinstance(service, dict) or not isinstance(service.get("provider"), str) or not service["provider"].strip():
            raise ValueError(f"Invalid {role} provider")
        try:
            endpoint = urlsplit(service.get("base_url", ""))
            hostname, endpoint_port = endpoint.hostname, endpoint.port
            if endpoint.scheme not in ("http", "https") or not hostname or endpoint.username or endpoint.password or endpoint.query or endpoint.fragment:
                raise ValueError()
        except (TypeError, ValueError):
            raise ValueError(f"Invalid {role} endpoint") from None
        loopback = hostname in ("localhost", "127.0.0.1", "::1")
        is_local = service["provider"] == provider
        if is_local and not (loopback and endpoint.scheme == "http" and endpoint_port == port):
            raise ValueError(f"Invalid local {role} endpoint")
        if not is_local and loopback and endpoint_port in (18080, 18081):
            raise ValueError(f"Local model endpoint requires its matching provider for {role}")
        local[role] = is_local
    return local


def model_configuration(environ):
    cloud_mode = environ.get("AVE_CLOUD_PROFILES") == "1"
    mixed_mode = environ.get("AVE_MODEL_PROFILES") == "1"
    legacy_planner_uses_vision = False
    if cloud_mode and mixed_mode:
        raise SystemExit("Cloud-only and mixed profile modes are mutually exclusive")
    # The 6085 overlay uses an independent cloud-only override. A legacy
    # AVE_MODEL_SERVICES_JSON must never select local models in this mode.
    template = environ.get("AVE_CLOUD_MODEL_SERVICES_JSON") if cloud_mode else environ.get("AVE_MODEL_SERVICES_JSON")
    try:
        default = "/opt/ave/model-services.cloud.template.json" if cloud_mode else "/opt/ave/model-services.template.json"
        config = json.loads(template) if template else json.loads(Path(default).read_text(encoding="utf-8"))
        if mixed_mode:
            # Preserve the existing exact local deployment, including its
            # planning parameters. The cloud alternatives come from the
            # independent cloud template and do not rewrite the legacy JSON.
            required = {"version", "enabled", "vision", "transcription", "sound"}
            if not isinstance(config, dict) or not required.issubset(config) or set(config) - (required | {"planner"}) or config["version"] != 1 or config["enabled"] is not True:
                raise ValueError("existing local configuration is not a single enabled deployment")
            legacy_planner_uses_vision = "planner" not in config
            local_audio = {"id": "local_audio", "label": "本地音频（默认）", **{role: copy.deepcopy(config[role]) for role in ("vision", "transcription", "sound")}, "planner": copy.deepcopy(config.get("planner", config["vision"]))}
            cloud = json.loads(Path("/opt/ave/model-services.cloud.template.json").read_text(encoding="utf-8"))
            if not isinstance(cloud, dict) or not isinstance(cloud.get("profiles"), list):
                raise ValueError("cloud profile template missing")
            config = {"version": 1, "enabled": True, "default_profile": "local_audio", "profiles": [local_audio, *cloud["profiles"]]}
    except (ValueError, OSError, KeyError, TypeError):
        raise SystemExit("Invalid model configuration template; input withheld") from None
    try:
        local = dependencies(config, allow_local_profiles=mixed_mode)
    except ValueError as error:
        raise SystemExit(str(error)) from None
    if "profiles" in config and not (cloud_mode or mixed_mode):
        raise SystemExit("Profiles require an explicit startup mode")
    if cloud_mode and "profiles" not in config:
        raise SystemExit("Cloud profiles mode requires remote profile configuration")
    for services in config.get("profiles", [config]):
        for role in ("vision", "planner"):
            source_role = "vision" if mixed_mode and legacy_planner_uses_vision and services.get("id") == "local_audio" and role == "planner" else role
            key = environ.get(f"AVE_{source_role.upper()}_API_KEY", "").strip()
            if not key:
                raise SystemExit(f"Set AVE_{source_role.upper()}_API_KEY in .env")
            services[role]["api_key"] = key
        for role in ("transcription", "sound"):
            role_local = services[role].get("provider") == {"transcription": "local-whisper", "sound": "local-yamnet"}[role] if "profiles" in config else local[role]
            source = environ.get(f"AVE_{role.upper()}_API_KEY_SOURCE", "").strip()
            allowed = {"AVE_VISION_API_KEY", "AVE_PLANNER_API_KEY", "AVE_TRANSCRIPTION_API_KEY", "AVE_SOUND_API_KEY"}
            if source:
                if source not in allowed or role_local and "profiles" not in config:
                    raise SystemExit(f"Invalid {role} credential source")
                if not role_local:
                    key = environ.get(source, "").strip()
                    if not key:
                        raise SystemExit(f"Missing selected {role} credential")
                    services[role]["api_key"] = key
            credential = services[role].get("api_key")
            if credential is not None and not isinstance(credential, str):
                raise SystemExit(f"Invalid {role} credential")
            hostname = urlsplit(services[role]["base_url"]).hostname
            if not role_local and hostname not in ("localhost", "127.0.0.1", "::1") and not (credential or "").strip():
                raise SystemExit(f"Missing {role} credential")
    return config


def configure():
    config = model_configuration(os.environ)
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
    if sys.argv[1:] == ["--dependencies"]:
        try:
            mixed = os.environ.get("AVE_MODEL_PROFILES") == "1"
            cloud = os.environ.get("AVE_CLOUD_PROFILES") == "1"
            current = json.loads(Path("/run/ave/model-services.json").read_text())
            if mixed and cloud or ("profiles" in current) != (mixed or cloud):
                raise ValueError("configured profile mode differs from startup mode")
            result = dependencies(current, allow_local_profiles=mixed)
        except (OSError, ValueError, TypeError):
            raise SystemExit("Invalid model configuration; input withheld") from None
        print(" ".join(role for role in ("transcription", "sound") if result[role]))
        sys.exit(0)
    configure()
    if "--launch" in sys.argv:
        # Initialization owns this privilege only; Host/Worker run as node.
        os.setgroups([])
        os.setgid(1000)
        os.setuid(1000)
        os.environ.update(HOME="/home/node", USER="node", LOGNAME="node")
        for name in list(os.environ):
            if name.endswith("_API_KEY") or name in ("AVE_MODEL_SERVICES_JSON", "AVE_CLOUD_MODEL_SERVICES_JSON"):
                del os.environ[name]
        os.execv("/usr/local/bin/ave-desktop", ["/usr/local/bin/ave-desktop"])
