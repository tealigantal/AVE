from __future__ import annotations

import hashlib
import shutil
import tempfile
from pathlib import Path
from typing import Iterator
from contextlib import contextmanager


@contextmanager
def temporary_workspace(job_id: str) -> Iterator[Path]:
    path = Path(tempfile.mkdtemp(prefix=f"ave-worker-{job_id}-"))
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)


def require_file(value: object, field: str) -> Path:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{field} is required")
    path = Path(value).expanduser().resolve()
    if not path.is_file():
        raise ValueError(f"{field} does not exist: {path}")
    return path


def output_directory(value: object) -> Path:
    if not isinstance(value, str) or not value:
        raise ValueError("output_dir is required")
    path = Path(value).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def collect_output(source: Path, destination: Path) -> str:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return str(destination)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
