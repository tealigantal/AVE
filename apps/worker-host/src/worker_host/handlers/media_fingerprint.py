from __future__ import annotations

from .context import HandlerContext
from ..adapters.filesystem import require_file, sha256_file


def handle(payload: dict, context: HandlerContext) -> dict:
    path = require_file(payload.get("input_path"), "input_path")
    digest = sha256_file(path)
    context.progress(1.0)
    return {"outputs": [{"kind": "media.fingerprint", "input_path": str(path), "algorithm": "sha256", "digest": digest, "byte_length": path.stat().st_size}], "metrics": {}}
