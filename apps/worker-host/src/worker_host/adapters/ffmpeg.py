from __future__ import annotations

import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Callable, Sequence


class CommandCancelled(RuntimeError):
    pass


class CommandTimedOut(RuntimeError):
    pass


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str
    returncode: int


def run_command(
    command: Sequence[str],
    *,
    timeout_seconds: float,
    cancelled: Callable[[], bool],
) -> CommandResult:
    process = subprocess.Popen(
        list(command),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    stdout_chunks: list[str] = []
    stderr_chunks: list[str] = []
    stdout_reader = threading.Thread(target=lambda: stdout_chunks.append(process.stdout.read() if process.stdout else ""), daemon=True)
    stderr_reader = threading.Thread(target=lambda: stderr_chunks.append(process.stderr.read() if process.stderr else ""), daemon=True)
    stdout_reader.start()
    stderr_reader.start()
    started = time.monotonic()
    try:
        while process.poll() is None:
            if cancelled():
                process.terminate()
                try:
                    process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                raise CommandCancelled("media subprocess cancelled")
            if time.monotonic() - started > timeout_seconds:
                process.terminate()
                try:
                    process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                raise CommandTimedOut(f"media subprocess timed out after {timeout_seconds}s")
            time.sleep(0.02)
        stdout_reader.join(timeout=1)
        stderr_reader.join(timeout=1)
        return CommandResult("".join(stdout_chunks), "".join(stderr_chunks), process.returncode or 0)
    except BaseException:
        if process.poll() is None:
            process.kill()
            process.wait()
        raise


def run_ffmpeg(args: Sequence[str], *, timeout_seconds: float, cancelled: Callable[[], bool]) -> CommandResult:
    result = run_command(["ffmpeg", "-hide_banner", *args], timeout_seconds=timeout_seconds, cancelled=cancelled)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-4000:] or f"ffmpeg exited with {result.returncode}")
    return result


def run_ffprobe(args: Sequence[str], *, timeout_seconds: float, cancelled: Callable[[], bool]) -> CommandResult:
    result = run_command(["ffprobe", "-hide_banner", *args], timeout_seconds=timeout_seconds, cancelled=cancelled)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-4000:] or f"ffprobe exited with {result.returncode}")
    return result
