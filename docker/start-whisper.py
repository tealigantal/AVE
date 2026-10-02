"""Serve one pinned model on the selected CPU/CUDA device; no runtime fallback."""
import os
from pathlib import Path
from huggingface_hub import snapshot_download
from huggingface_hub.constants import HF_HUB_CACHE
from huggingface_hub.errors import LocalEntryNotFoundError


def select_device(requested, backend):
    if requested not in ("auto", "cpu", "cuda"):
        raise RuntimeError("AVE_WHISPER_DEVICE must be auto, cpu or cuda")
    count = backend.get_cuda_device_count() if requested != "cpu" else 0
    if requested == "cuda" and count == 0:
        raise RuntimeError("CUDA selected but no CUDA device is available")
    device = "cuda" if requested == "cuda" or requested == "auto" and count > 0 else "cpu"
    compute = "float32" if device == "cuda" else "int8"
    if compute not in backend.get_supported_compute_types(device):
        raise RuntimeError(f"{device} does not support required compute type {compute}")
    return device, compute

revision = "536b0662742c02347bc0e980a01041f333bce120"
model = "Systran/faster-whisper-small"
patterns = ["README.md", "config.json", "preprocessor_config.json", "model.bin", "tokenizer.json", "vocabulary.*"]
required = ["config.json", "model.bin", "tokenizer.json", "vocabulary.txt"]
try:
    cached = Path(snapshot_download(repo_id=model, revision=revision, local_files_only=True))
    complete = all((cached / name).is_file() for name in required)
except LocalEntryNotFoundError:
    complete = False
if not complete:
    print("Preparing pinned Whisper-small cache", flush=True)
    cached = Path(snapshot_download(repo_id=model, revision=revision, allow_patterns=patterns))
    if not all((cached / name).is_file() for name in required):
        raise RuntimeError("Pinned Whisper cache is incomplete after download")
# faster-whisper resolves its configured repository at 'main'. Bind that lookup
# to our immutable revision and serve offline after the explicit download.
reference = Path(HF_HUB_CACHE) / "models--Systran--faster-whisper-small" / "refs" / "main"
reference.parent.mkdir(parents=True, exist_ok=True)
reference.write_text(revision, encoding="utf-8")
os.environ["HF_HUB_OFFLINE"] = "1"
import ctranslate2
from faster_whisper import WhisperModel

device, compute = select_device(os.environ.get("AVE_WHISPER_DEVICE", "auto"), ctranslate2)
# Initialize the exact cached model now, so a driver/library error cannot look healthy.
probe = WhisperModel(str(reference.parent.parent / "snapshots" / revision), device=device, compute_type=compute)
del probe
os.environ["WHISPER__INFERENCE_DEVICE"] = device
os.environ["WHISPER__COMPUTE_TYPE"] = compute
print(f"AVE Whisper device={device} compute_type={compute}; pinned model unchanged", flush=True)
os.execvp("uvicorn", ["uvicorn", "--factory", "speaches.main:create_app", "--host", "127.0.0.1", "--port", "18080"])
