"""Exercise resource cleanup and contention without using private media."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import subprocess
import signal
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from worker_host.adapters import media_resource
from worker_host.adapters.ffmpeg import CommandCancelled, CommandTimedOut, run_command
from worker_host.handlers.context import HandlerContext


class ResourceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="ave-resource-test-")
        self.root = Path(self.tmp.name)
        self.workspace = self.root / "workspace"
        self.workspace.mkdir()
        self.output = self.root / "output"
        self.output.mkdir()
        self.cancel = threading.Event()
        self.context = HandlerContext("test", self.workspace, self.cancel, 2, lambda _: None)
        self.payload = {"output_dir": str(self.output)}
        self.domain = "test-" + uuid4().hex
        self.environment = patch.dict(os.environ, {"AVE_MEDIA_RESOURCE_DOMAIN": self.domain})
        self.environment.start()

    def tearDown(self):
        self.environment.stop()
        self.tmp.cleanup()

    def assert_clean(self):
        self.assertEqual(list(self.workspace.iterdir()), [])
        self.assertEqual(list(self.output.iterdir()), [])

    def test_pre_cancel_and_spawn_failure_clean_workspace(self):
        self.cancel.set()
        with self.assertRaises(CommandCancelled):
            media_resource.guarded_handler("unused", self.payload, self.context)
        self.assert_clean()
        self.cancel.clear()
        with patch.object(media_resource.subprocess, "Popen", side_effect=OSError("spawn failed")):
            with self.assertRaisesRegex(OSError, "spawn failed"):
                media_resource.guarded_handler("unused", self.payload, self.context)
        self.assert_clean()

    def test_reader_start_failure_terminates_spawned_process(self):
        real_popen = subprocess.Popen
        processes = []
        def spawn(*args, **kwargs):
            process = real_popen(*args, **kwargs)
            processes.append(process)
            return process
        original_start = threading.Thread.start
        for failed_start in (1, 2):
            count = 0
            def start(thread):
                nonlocal count
                count += 1
                if count == failed_start:
                    raise RuntimeError("reader start failed")
                return original_start(thread)
            with patch("worker_host.adapters.ffmpeg.subprocess.Popen", side_effect=spawn), patch.object(threading.Thread, "start", start):
                with self.assertRaisesRegex(RuntimeError, "reader start failed"):
                    run_command([sys.executable, "-c", "import time; time.sleep(30)"], timeout_seconds=10, cancelled=lambda: False)
            self.assertIsNotNone(processes[-1].poll(), "child must be reaped before error escapes")
    @unittest.skipUnless(os.name == "nt", "Windows Job Object initialization")
    def test_job_creation_failure_cleans_workspace(self):
        with patch.object(media_resource, "WindowsJob", side_effect=OSError("job failed")):
            with self.assertRaisesRegex(OSError, "job failed"):
                media_resource.guarded_handler("unused", self.payload, self.context)
        self.assert_clean()

    @unittest.skipIf(os.name == "nt", "Linux flock inheritance")
    def test_decoder_retains_lease_when_its_owner_crashes(self):
        import fcntl
        lock_path = self.root / "crash.lock"
        ready = self.root / "decoder.pid"
        script = r'''
import fcntl, os, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from worker_host.adapters.ffmpeg import run_command
with open(sys.argv[2], 'w+b') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    os.environ['AVE_MEDIA_RESOURCE_LOCK_FD'] = str(lock.fileno())
    child = "import os,time; from pathlib import Path; Path(%r).write_text(str(os.getpid())); time.sleep(30)" % sys.argv[3]
    run_command([sys.executable, '-c', child], timeout_seconds=25, cancelled=lambda: False)
'''
        owner = subprocess.Popen([sys.executable, "-c", script, str(Path(__file__).resolve().parents[1] / "src"), str(lock_path), str(ready)])
        decoder = None
        try:
            deadline = time.monotonic() + 10
            while not ready.exists() and time.monotonic() < deadline:
                if owner.poll() is not None:
                    self.fail("resource owner exited before decoder started")
                time.sleep(0.02)
            self.assertTrue(ready.exists(), "decoder did not start")
            decoder = int(ready.read_text())
            owner.kill()
            owner.wait(timeout=10)
            with lock_path.open("r+b") as contender:
                with self.assertRaises(BlockingIOError):
                    fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
                os.kill(decoder, signal.SIGKILL)
                decoder = None
                deadline = time.monotonic() + 10
                while True:
                    try:
                        fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
                        break
                    except BlockingIOError:
                        if time.monotonic() >= deadline:
                            self.fail("lease not released after decoder exit")
                        time.sleep(0.02)
        finally:
            if owner.poll() is None:
                owner.kill()
                owner.wait(timeout=10)
            if decoder is not None:
                try:
                    os.kill(decoder, signal.SIGKILL)
                except ProcessLookupError:
                    pass

    def test_waiter_cancel_and_timeout_do_not_steal_live_lock(self):
        lock_path = Path(tempfile.gettempdir()) / ("ave-media-domain-" + hashlib.sha256(self.domain.encode()).hexdigest() + ".lock")
        ready = self.root / "ready"
        script = r'''
import os, sys, time
from pathlib import Path
with open(sys.argv[1], 'a+b') as lock:
    if lock.tell() == 0: lock.write(b'\0'); lock.flush()
    lock.seek(0)
    if os.name == 'nt':
        import msvcrt
        msvcrt.locking(lock.fileno(), msvcrt.LK_LOCK, 1)
    else:
        import fcntl
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
    Path(sys.argv[2]).write_text('ready')
    time.sleep(20)
'''
        holder = subprocess.Popen([sys.executable, "-c", script, str(lock_path), str(ready)])
        try:
            deadline = time.monotonic() + 10
            while not ready.exists() and time.monotonic() < deadline:
                if holder.poll() is not None:
                    self.fail("lock holder exited before acquiring lock")
                time.sleep(0.02)
            self.assertTrue(ready.exists(), "lock holder did not start")
            timer = threading.Timer(0.4, self.cancel.set)
            timer.start()
            try:
                with self.assertRaises(CommandCancelled):
                    media_resource.guarded_handler("unused", self.payload, self.context)
            finally:
                timer.cancel()
            self.assertIsNone(holder.poll())
            self.assert_clean()
            self.cancel.clear()
            with self.assertRaises(CommandTimedOut):
                media_resource.guarded_handler("unused", self.payload, self.context)
            self.assertIsNone(holder.poll())
            self.assert_clean()
            holder.terminate()
            holder.wait(timeout=10)
            # The kernel releases a dead owner's lock. Reaching handler input
            # import proves a subsequent task can actually acquire it. This
            # module deliberately has no handler and needs no media libraries.
            with self.assertRaisesRegex(RuntimeError, "has no attribute '_handle'"):
                media_resource.guarded_handler("worker_host.handlers.context", {}, self.context)
            self.assert_clean()
        finally:
            if holder.poll() is None:
                holder.terminate()
                holder.wait(timeout=10)
            lock_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
