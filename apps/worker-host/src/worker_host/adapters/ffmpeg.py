from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from collections import deque
from builtins import BaseExceptionGroup
from dataclasses import dataclass
from typing import Callable, Sequence


class CommandCancelled(RuntimeError):
    pass


class CommandTimedOut(RuntimeError):
    pass


def low_resource_decode_args() -> list[str]:
    """Bound decoder threads for low-resource or memory-limited media jobs."""
    return ["-threads", "1"] if os.environ.get("AVE_LOW_RESOURCE") == "1" or os.environ.get("AVE_MEDIA_BOUNDED") == "1" else []


def low_resource_filter_args() -> list[str]:
    """Keep simple and complex analysis filters to one thread in low mode."""
    return ["-filter_threads", "1", "-filter_complex_threads", "1"] if os.environ.get("AVE_LOW_RESOURCE") == "1" or os.environ.get("AVE_MEDIA_BOUNDED") == "1" else []


def low_resource_video_encoder_args() -> list[str]:
    return ["-threads:v", "1"] if os.environ.get("AVE_LOW_RESOURCE") == "1" else []


def low_resource_thumbnail_args() -> list[str]:
    if os.environ.get("AVE_LOW_RESOURCE") != "1":
        return []
    return ["-vf", "scale=w='min(960,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease"]


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
    stdout_line: Callable[[str], None] | None = None,
    stderr_line: Callable[[str], None] | None = None,
    on_exit: Callable[[str, int | None], None] | None = None,
    on_tick: Callable[[], None] | None = None,
    capture_limit: int | None = None,
    progress_inactivity: bool = False,
    absolute_timeout_seconds: float = 86400,
) -> CommandResult:
    if capture_limit is not None and capture_limit < 1:
        raise ValueError("capture_limit must be positive")
    if progress_inactivity and not 0 < absolute_timeout_seconds <= 86400:
        raise ValueError("absolute_timeout_seconds must be in (0, 86400]")
    # A guarded Linux media child inherits the open lock description. If its
    # Python owner crashes, a still-running decoder must keep the reservation
    # until it exits; otherwise a competing Worker could oversubscribe memory.
    lease = os.environ.get("AVE_MEDIA_RESOURCE_LOCK_FD") if os.name != "nt" else None
    inherited = (int(lease),) if lease is not None else ()
    process = subprocess.Popen(
        list(command),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        **({"pass_fds": inherited} if inherited else {}),
    )
    started = time.monotonic()
    last_progress_time = started
    progress_values = {"frame": 0, "out_time_us": 0}
    progress_lock = threading.Lock()
    stdout_chunks: deque[str] = deque()
    stderr_chunks: deque[str] = deque()
    captured = {"stdout": 0, "stderr": 0}
    def append(chunks: deque[str], name: str, line: str) -> None:
        chunks.append(line)
        captured[name] += len(line)
        if capture_limit is not None:
            while captured[name] > capture_limit:
                excess = captured[name] - capture_limit
                head = chunks.popleft()
                if len(head) > excess:
                    chunks.appendleft(head[excess:])
                    captured[name] -= excess
                    break
                captured[name] -= len(head)
    reader_errors: list[BaseException] = []
    def read_stdout() -> None:
        nonlocal last_progress_time
        try:
            if process.stdout:
                for line in process.stdout:
                    if progress_inactivity:
                        key, separator, value = line.strip().partition("=")
                        if separator and key in progress_values and value.isdecimal():
                            number = int(value)
                            with progress_lock:
                                if number > progress_values[key]:
                                    progress_values[key] = number
                                    last_progress_time = time.monotonic()
                    append(stdout_chunks, "stdout", line)
                    if stdout_line:
                        stdout_line(line.rstrip("\r\n"))
        except BaseException as error:
            reader_errors.append(error)
    stdout_reader = threading.Thread(target=read_stdout, daemon=True)
    def read_stderr() -> None:
        try:
            if process.stderr:
                for line in process.stderr:
                    append(stderr_chunks, "stderr", line)
                    if stderr_line:
                        stderr_line(line.rstrip("\r\n"))
        except BaseException as error:
            reader_errors.append(error)
    stderr_reader = threading.Thread(target=read_stderr, daemon=True)
    next_tick = started
    state = "failed"
    started_readers = []
    try:
        stdout_reader.start()
        started_readers.append(stdout_reader)
        stderr_reader.start()
        started_readers.append(stderr_reader)
        while process.poll() is None:
            if on_tick and time.monotonic() >= next_tick:
                on_tick()
                next_tick = time.monotonic() + 1
            if reader_errors:
                raise reader_errors[0]
            if cancelled():
                state = "cancelled"
                process.terminate()
                try:
                    process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                raise CommandCancelled("media subprocess cancelled")
            now = time.monotonic()
            with progress_lock:
                inactive = now - last_progress_time
            absolute_expired = progress_inactivity and now - started > absolute_timeout_seconds
            inactivity_expired = inactive > timeout_seconds if progress_inactivity else now - started > timeout_seconds
            if absolute_expired or inactivity_expired:
                state = "timeout"
                process.terminate()
                try:
                    process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                reason = f"absolute deadline {absolute_timeout_seconds}s" if absolute_expired else (f"no advancing media progress for {timeout_seconds}s" if progress_inactivity else f"deadline {timeout_seconds}s")
                raise CommandTimedOut(f"media subprocess timed out: {reason}")
            time.sleep(0.02)
        for reader in started_readers:
            reader.join(timeout=1)
        if reader_errors:
            raise reader_errors[0]
        state = "succeeded" if process.returncode == 0 else "failed"
        return CommandResult("".join(stdout_chunks), "".join(stderr_chunks), process.returncode or 0)
    except BaseException:
        if process.poll() is None:
            process.kill()
            process.wait()
        raise
    finally:
        prior_error = sys.exception()
        for reader in started_readers:
            reader.join(timeout=1)
        if process.stdout and not stdout_reader.is_alive():
            process.stdout.close()
        if process.stderr and not stderr_reader.is_alive():
            process.stderr.close()
        if on_exit:
            try:
                on_exit(state, process.returncode)
            except BaseException as error:
                if prior_error:
                    raise BaseExceptionGroup("media subprocess and diagnostic emission failed", [prior_error, error]) from prior_error
                raise


def run_ffmpeg(args: Sequence[str], *, timeout_seconds: float, cancelled: Callable[[], bool], stdout_line: Callable[[str], None] | None = None, stderr_line: Callable[[str], None] | None = None, on_exit: Callable[[str, int | None], None] | None = None, on_tick: Callable[[], None] | None = None, capture_limit: int | None = None, progress_inactivity: bool = False, absolute_timeout_seconds: float = 86400) -> CommandResult:
    # Full capture remains the default: scene detection and QC parse complete streams.
    if progress_inactivity and not any(args[index] == "-progress" and args[index + 1] == "pipe:1" for index in range(len(args) - 1)):
        raise ValueError("progress_inactivity requires -progress pipe:1")
    result = run_command(["ffmpeg", "-hide_banner", *args], timeout_seconds=timeout_seconds, cancelled=cancelled, stdout_line=stdout_line, stderr_line=stderr_line, on_exit=on_exit, on_tick=on_tick, capture_limit=capture_limit, progress_inactivity=progress_inactivity, absolute_timeout_seconds=absolute_timeout_seconds)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-4000:] or f"ffmpeg exited with {result.returncode}")
    return result


def run_ffprobe(args: Sequence[str], *, timeout_seconds: float, cancelled: Callable[[], bool], stdout_line: Callable[[str], None] | None = None, capture_limit: int | None = None) -> CommandResult:
    result = run_command(["ffprobe", "-hide_banner", *args], timeout_seconds=timeout_seconds, cancelled=cancelled, stdout_line=stdout_line, capture_limit=capture_limit)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-4000:] or f"ffprobe exited with {result.returncode}")
    return result
