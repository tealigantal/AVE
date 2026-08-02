from __future__ import annotations

import hashlib
import shutil
import tempfile
import os
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
    if destination.exists():
        if sha256_file(source) != sha256_file(destination):
            raise ValueError(f"OUTPUT_COLLISION: immutable output already exists: {destination}")
        return str(destination)
    temporary = destination.with_name(f".{destination.name}.{os.getpid()}.partial")
    try:
        with source.open("rb") as source_handle, temporary.open("xb") as output_handle:
            shutil.copyfileobj(source_handle, output_handle, length=1024 * 1024)
            output_handle.flush()
            os.fsync(output_handle.fileno())
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return str(destination)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
