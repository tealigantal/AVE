"""One kernel-owned reservation per configured media resource domain.

The conservative reservation owns the entire domain budget. Locks, not stale
PID records or time-to-live, decide ownership; competing Workers wait. The
decoder runs in a bounded process tree and never receives a budget from a job.
"""
from __future__ import annotations

import ctypes
import hashlib
import json
import os
from pathlib import Path
import signal
import shutil
import subprocess
import sys
import tempfile
import threading
import time

from .ffmpeg import CommandCancelled, CommandTimedOut


def configuration():
    domain = os.environ.get("AVE_MEDIA_RESOURCE_DOMAIN", "local-media")
    budget = int(os.environ.get("AVE_MEDIA_MEMORY_BYTES", str(768 * 1024 * 1024)))
    if not domain or budget < 128 * 1024 * 1024:
        raise ValueError("MEDIA_RESOURCE_CONFIG_INVALID")
    return domain, budget


def try_lock(lock):
    lock.seek(0)
    try:
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except BlockingIOError:
        return False
    except OSError as error:
        if os.name == "nt" and error.errno in (13, 36):
            return False
        raise


class WindowsJob:
    def __init__(self, budget):
        from ctypes import wintypes as w
        class Basic(ctypes.Structure):
            _fields_ = [("process_time", ctypes.c_int64), ("job_time", ctypes.c_int64), ("flags", w.DWORD), ("min_working", ctypes.c_size_t), ("max_working", ctypes.c_size_t), ("active", w.DWORD), ("affinity", ctypes.c_size_t), ("priority", w.DWORD), ("scheduling", w.DWORD)]
        class IO(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in ("read_ops", "write_ops", "other_ops", "read_bytes", "write_bytes", "other_bytes")]
        class Extended(ctypes.Structure):
            _fields_ = [("basic", Basic), ("io", IO), ("process_memory", ctypes.c_size_t), ("job_memory", ctypes.c_size_t), ("peak_process", ctypes.c_size_t), ("peak_job", ctypes.c_size_t)]
        self.api = ctypes.WinDLL("kernel32", use_last_error=True)
        self.api.CreateJobObjectW.restype = w.HANDLE
        self.api.CreateJobObjectW.argtypes = [ctypes.c_void_p, w.LPCWSTR]
        self.api.SetInformationJobObject.argtypes = [w.HANDLE, ctypes.c_int, ctypes.c_void_p, w.DWORD]
        self.api.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
        self.api.TerminateJobObject.argtypes = [w.HANDLE, w.UINT]
        self.api.CloseHandle.argtypes = [w.HANDLE]
        self.handle = self.api.CreateJobObjectW(None, None)
        limits = Extended()
        limits.basic.flags = 0x2000 | 0x200  # KILL_ON_JOB_CLOSE | JOB_MEMORY
        limits.job_memory = budget
        if not self.handle or not self.api.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            self.close()
            raise OSError("MEDIA_RESOURCE_JOB_UNAVAILABLE", ctypes.get_last_error())

    def attach(self, process):
        if not self.api.AssignProcessToJobObject(self.handle, int(process._handle)):
            raise OSError("MEDIA_RESOURCE_JOB_UNAVAILABLE", ctypes.get_last_error())
        resume = ctypes.WinDLL("ntdll").NtResumeProcess
        resume.argtypes = [ctypes.c_void_p]
        if resume(int(process._handle)) != 0:
            raise OSError("MEDIA_RESOURCE_RESUME_FAILED")

    def close(self):
        if getattr(self, "handle", None):
            self.api.TerminateJobObject(self.handle, 1)
            self.api.CloseHandle(self.handle)
            self.handle = None


def guarded_handler(module, payload, context):
    domain, budget = configuration()
    context.workspace.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix="media-resource-", dir=context.workspace))
    request = workspace / "request.json"
    response = workspace / "response.json"
    target = Path(payload["output_dir"]) if isinstance(payload.get("output_dir"), str) else None
    initial = set(target.iterdir()) if target and target.is_dir() else set()
    failure = None
    # Deliberately omit credentials, proxies, model settings and job-supplied env.
    env = {key: value for key, value in os.environ.items() if key.upper() in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PYTHONPATH", "PYTHONHOME", "AVE_LOW_RESOURCE"}}
    env.update(AVE_MEDIA_BOUNDED="1", OMP_NUM_THREADS="1", OPENBLAS_NUM_THREADS="1", PYTHONUNBUFFERED="1", PYTHONPATH=str(Path(__file__).resolve().parents[2]))
    job = None
    process = None
    supervisor_lock = None
    started = time.monotonic()
    try:
        if context.cancelled.is_set():
            raise CommandCancelled("media resource operation cancelled")
        # Keep a second lease in the supervising Worker until the entire Job or
        # process group has been terminated and reaped, including when the
        # decoder's own lease owner exits unexpectedly.
        lock_path = Path(tempfile.gettempdir()) / ("ave-media-supervisor-" + hashlib.sha256(domain.encode()).hexdigest() + ".lock")
        supervisor_lock = lock_path.open("a+b")
        if supervisor_lock.tell() == 0:
            supervisor_lock.write(b"\0"); supervisor_lock.flush()
        while not try_lock(supervisor_lock):
            if context.cancelled.is_set():
                raise CommandCancelled("media resource operation cancelled while waiting")
            if time.monotonic() - started >= context.timeout_seconds:
                raise CommandTimedOut("media resource lease deadline reached")
            time.sleep(0.02)
        request.write_text(json.dumps({"module": module, "payload": payload, "job_id": context.job_id, "workspace": str(workspace), "timeout": context.timeout_seconds, "domain": domain, "budget": budget}), encoding="utf8")
        job = WindowsJob(budget) if os.name == "nt" else None
        process = subprocess.Popen([sys.executable, "-m", "worker_host.adapters.media_resource", str(request), str(response)], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env, creationflags=4 if job else 0, start_new_session=not bool(job))
        if job:
            job.attach(process)
        while process.poll() is None:
            if context.cancelled.is_set():
                raise CommandCancelled("media resource operation cancelled")
            if time.monotonic() - started >= context.timeout_seconds:
                raise CommandTimedOut("media resource operation deadline reached")
            time.sleep(0.02)
        if not response.is_file():
            raise RuntimeError(f"MEDIA_RESOURCE_PROCESS_FAILED: exit {process.returncode}")
        result = json.loads(response.read_text(encoding="utf8"))
        if "error" in result:
            raise RuntimeError(result["message"] + ": " + result["error"])
        if process.returncode:
            raise RuntimeError(f"MEDIA_RESOURCE_PROCESS_FAILED: exit {process.returncode}")
        context.progress(1.0)
        if context.cancelled.is_set():
            raise CommandCancelled("media resource operation cancelled before publication")
        return result["result"]
    except BaseException as error:
        failure = error
        raise
    finally:
        if job:
            job.close()
        elif process:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        if process:
            process.wait()
        cleanup = []
        if supervisor_lock:
            try:
                supervisor_lock.close()
            except BaseException as error:
                cleanup.append(error)
        if failure is not None and target and target.is_dir():
            for path in set(target.iterdir()) - initial:
                if path.name.startswith(("probe-v2-", ".probe-v2-", "scene-v2-", ".scene-v2-")):
                    try:
                        if path.is_symlink() or not path.is_file() or path.stat().st_nlink != 1:
                            raise ValueError("MEDIA_RESOURCE_CLEANUP_IDENTITY_CHANGED")
                        path.unlink()
                    except BaseException as error:
                        cleanup.append(error)
        try:
            shutil.rmtree(workspace)
        except BaseException as error:
            cleanup.append(error)
        if cleanup:
            raise BaseExceptionGroup("media operation and cleanup failed", [*([failure] if failure else []), *cleanup]) from failure


def execute(request, response):
    from importlib import import_module
    from ..handlers.context import HandlerContext
    started = time.monotonic()
    if os.name != "nt":
        import resource
        # At most decoder + one encoder run together; reserve both in advance.
        resource.setrlimit(resource.RLIMIT_AS, (request["budget"] // 2,) * 2)
        resource.setrlimit(resource.RLIMIT_FSIZE, (8 * 1024 ** 3,) * 2)
    def expired():
        if os.name != "nt":
            os.killpg(os.getpgrp(), signal.SIGKILL)
        else:
            os._exit(124)
    watchdog = threading.Timer(request["timeout"], expired)
    watchdog.daemon = True
    watchdog.start()
    path = Path(tempfile.gettempdir()) / ("ave-media-domain-" + hashlib.sha256(request["domain"].encode()).hexdigest() + ".lock")
    try:
        with path.open("a+b") as lock:
            if lock.tell() == 0:
                lock.write(b"\0"); lock.flush()
            while not try_lock(lock):
                time.sleep(0.02)
            # Diagnostic record is never used to steal a live kernel lease.
            lock.seek(1); lock.truncate()
            lock.write(json.dumps({"domain": request["domain"], "job_id": request["job_id"], "pid": os.getpid(), "start_identity": time.time_ns(), "reserved_bytes": request["budget"]}).encode()); lock.flush()
            if os.name != "nt":
                os.environ["AVE_MEDIA_RESOURCE_LOCK_FD"] = str(lock.fileno())
            remaining = request["timeout"] - (time.monotonic() - started)
            if remaining <= 0:
                raise CommandTimedOut("media resource lease deadline reached")
            context = HandlerContext(request["job_id"], Path(request["workspace"]), threading.Event(), remaining, lambda _: None)
            result = import_module(request["module"])._handle(request["payload"], context)
            response.write_text(json.dumps({"result": result}), encoding="utf8")
    except BaseException as error:
        import traceback
        response.write_text(json.dumps({"message": str(error), "error": "".join(traceback.format_exception(error))}), encoding="utf8")
    finally:
        os.environ.pop("AVE_MEDIA_RESOURCE_LOCK_FD", None)
        watchdog.cancel()


if __name__ == "__main__":
    execute(json.loads(Path(sys.argv[1]).read_text(encoding="utf8")), Path(sys.argv[2]))
