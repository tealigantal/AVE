from __future__ import annotations

import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "apps/worker-host/src"))

from worker_host.adapters.ffmpeg import CommandCancelled, run_ffmpeg  # noqa: E402


with tempfile.TemporaryDirectory(prefix="ave-foundation-cancel-") as directory:
    output = Path(directory) / "cancelled.mp4"
    cancelled = threading.Event()
    timer = threading.Timer(0.2, cancelled.set)
    started = time.monotonic()
    timer.start()
    try:
        try:
            run_ffmpeg(
                ["-y", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=60", "-t", "120", str(output)],
                timeout_seconds=30,
                cancelled=cancelled.is_set,
            )
            raise AssertionError("FFmpeg cancellation unexpectedly completed")
        except CommandCancelled:
            pass
    finally:
        timer.cancel()
    time.sleep(0.1)
    assert time.monotonic() - started < 5, "cancellation must wait for FFmpeg termination, not its full 120-second workload"

print("foundation Worker cancellation smoke passed")
