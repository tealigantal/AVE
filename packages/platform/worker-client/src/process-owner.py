"""Own the Worker producer tree; report drain only after the OS confirms exit.

No project access or worker protocol rewriting. stdin EOF requests forced stop.
Windows: suspended create/assign/resume in a non-breakaway kill-on-close Job.
Linux: dedicated subreaper, unreaped leader and directly owned adopted children.
https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
https://man7.org/linux/man-pages/man2/PR_SET_CHILD_SUBREAPER.2const.html
"""
from __future__ import annotations

import ctypes
import os
import queue
import shutil
import signal
import subprocess
import sys
import threading
import time
import traceback


def input_pump(write):
    stopped = threading.Event()
    chunks = queue.Queue()
    failures = []

    def receive():
        try:
            while True:
                chunk = os.read(0, 65536)
                if not chunk:
                    break
                chunks.put(chunk)
        except BaseException as error:
            failures.append(error)
        finally:
            stopped.set()
            chunks.put(None)

    def forward():
        try:
            while not stopped.is_set():
                chunk = chunks.get()
                if chunk is None:
                    break
                write(chunk)
        except BaseException as error:
            failures.append(error)
            stopped.set()

    threading.Thread(target=receive, daemon=True).start()
    writer = threading.Thread(target=forward, daemon=True)
    writer.start()
    return stopped, chunks, writer, failures


def run_linux(command):
    signal.signal(signal.SIGCHLD, signal.SIG_DFL)
    libc = ctypes.CDLL(None, use_errno=True)
    # This dedicated process becomes the owner of orphaned grandchildren.
    if libc.prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
        raise OSError(ctypes.get_errno(), "WORKER_OWNER_SUBREAPER_FAILED")
    process = subprocess.Popen(command, stdin=subprocess.PIPE, start_new_session=True, bufsize=0)

    def write(chunk):
        view = memoryview(chunk)
        while view:
            count = os.write(process.stdin.fileno(), view)
            view = view[count:]

    stopped, chunks, writer, failures = input_pump(write)
    status = None
    try:
        while not stopped.is_set():
            # Keep the leader unreaped until the last group signal. A recycled
            # numeric PID must never become authority over an unrelated group.
            status = os.waitid(os.P_PID, process.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT)
            if status is not None:
                break
            stopped.wait(0.02)
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass  # The unreaped leader still reserves this identity.
        deadline = time.monotonic() + 15
        children_path = f"/proc/self/task/{os.getpid()}/children"
        while True:
            # These are our own unreaped children, not arbitrary PID ancestry.
            # Reparented descendants that created another session are included.
            with open(children_path, encoding="ascii") as children:
                owned = [int(value) for value in children.read().split()]
            for pid in owned:
                os.kill(pid, signal.SIGKILL)
            no_children = False
            while True:
                try:
                    pid, result = os.waitpid(-1, os.WNOHANG)
                except ChildProcessError:
                    no_children = True
                    break
                if pid == 0:
                    break
                if pid == process.pid:
                    process.returncode = os.waitstatus_to_exitcode(result)
            if no_children:
                break
            if time.monotonic() >= deadline:
                raise RuntimeError("WORKER_OWNER_DRAIN_TIMEOUT")
            time.sleep(0.01)
        stopped.set()
        chunks.put(None)
        writer.join(2)
        if writer.is_alive():
            raise RuntimeError("WORKER_OWNER_INPUT_DRAIN_TIMEOUT")
        process.stdin.close()
        if failures and not all(isinstance(error, BrokenPipeError) for error in failures):
            raise ExceptionGroup("WORKER_OWNER_INPUT_FAILED", failures)
        return process.returncode
    finally:
        # Exceptions do not produce a drain receipt. Node poisons the client.
        stopped.set()


def run_windows(command):
    from ctypes import wintypes as w
    import msvcrt

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    size_t = ctypes.c_size_t

    class Security(ctypes.Structure):
        _fields_ = [("length", w.DWORD), ("descriptor", w.LPVOID), ("inherit", w.BOOL)]

    class Limits(ctypes.Structure):
        _fields_ = [("process_time", ctypes.c_int64), ("job_time", ctypes.c_int64), ("flags", w.DWORD), ("min_working", size_t), ("max_working", size_t), ("active_limit", w.DWORD), ("affinity", size_t), ("priority", w.DWORD), ("scheduling", w.DWORD)]

    class IoCounters(ctypes.Structure):
        _fields_ = [(name, ctypes.c_uint64) for name in ("read_ops", "write_ops", "other_ops", "read_bytes", "write_bytes", "other_bytes")]

    class ExtendedLimits(ctypes.Structure):
        _fields_ = [("basic", Limits), ("io", IoCounters), ("process_memory", size_t), ("job_memory", size_t), ("peak_process", size_t), ("peak_job", size_t)]

    class Accounting(ctypes.Structure):
        _fields_ = [(name, ctypes.c_int64) for name in ("user", "kernel", "period_user", "period_kernel")] + [(name, w.DWORD) for name in ("faults", "total", "active", "terminated")]

    class Startup(ctypes.Structure):
        _fields_ = [("cb", w.DWORD), ("reserved", w.LPWSTR), ("desktop", w.LPWSTR), ("title", w.LPWSTR)] + [(name, w.DWORD) for name in ("x", "y", "x_size", "y_size", "x_chars", "y_chars", "fill", "flags")] + [("show", w.WORD), ("reserved_size", w.WORD), ("reserved_bytes", ctypes.POINTER(ctypes.c_byte)), ("stdin", w.HANDLE), ("stdout", w.HANDLE), ("stderr", w.HANDLE)]

    class Process(ctypes.Structure):
        _fields_ = [("process", w.HANDLE), ("thread", w.HANDLE), ("pid", w.DWORD), ("tid", w.DWORD)]

    signatures = {
        "CreateJobObjectW": ([w.LPVOID, w.LPCWSTR], w.HANDLE),
        "SetInformationJobObject": ([w.HANDLE, ctypes.c_int, w.LPVOID, w.DWORD], w.BOOL),
        "QueryInformationJobObject": ([w.HANDLE, ctypes.c_int, w.LPVOID, w.DWORD, w.LPVOID], w.BOOL),
        "CreatePipe": ([ctypes.POINTER(w.HANDLE), ctypes.POINTER(w.HANDLE), ctypes.POINTER(Security), w.DWORD], w.BOOL),
        "SetHandleInformation": ([w.HANDLE, w.DWORD, w.DWORD], w.BOOL),
        "GetCurrentProcess": ([], w.HANDLE),
        "DuplicateHandle": ([w.HANDLE, w.HANDLE, w.HANDLE, ctypes.POINTER(w.HANDLE), w.DWORD, w.BOOL, w.DWORD], w.BOOL),
        "CreateProcessW": ([w.LPCWSTR, w.LPWSTR, w.LPVOID, w.LPVOID, w.BOOL, w.DWORD, w.LPVOID, w.LPCWSTR, ctypes.POINTER(Startup), ctypes.POINTER(Process)], w.BOOL),
        "AssignProcessToJobObject": ([w.HANDLE, w.HANDLE], w.BOOL),
        "ResumeThread": ([w.HANDLE], w.DWORD),
        "WaitForSingleObject": ([w.HANDLE, w.DWORD], w.DWORD),
        "GetExitCodeProcess": ([w.HANDLE, ctypes.POINTER(w.DWORD)], w.BOOL),
        "TerminateJobObject": ([w.HANDLE, w.UINT], w.BOOL),
        "TerminateProcess": ([w.HANDLE, w.UINT], w.BOOL),
        "WriteFile": ([w.HANDLE, w.LPCVOID, w.DWORD, ctypes.POINTER(w.DWORD), w.LPVOID], w.BOOL),
        "CloseHandle": ([w.HANDLE], w.BOOL),
    }
    for name, (args, result) in signatures.items():
        function = getattr(kernel, name)
        function.argtypes, function.restype = args, result

    def checked(result, operation):
        if not result:
            raise OSError(ctypes.get_last_error(), f"WORKER_OWNER_{operation}_FAILED")
        return result

    handles = []
    process = Process()
    assigned = False
    job = checked(kernel.CreateJobObjectW(None, None), "CREATE_JOB")
    handles.append(job)
    try:
        limits = ExtendedLimits()
        limits.basic.flags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE; no breakaway
        checked(kernel.SetInformationJobObject(job, 9, ctypes.byref(limits), ctypes.sizeof(limits)), "SET_LIMITS")
        pipe_read, pipe_write = w.HANDLE(), w.HANDLE()
        security = Security(ctypes.sizeof(Security), None, True)
        checked(kernel.CreatePipe(ctypes.byref(pipe_read), ctypes.byref(pipe_write), ctypes.byref(security), 0), "CREATE_PIPE")
        handles.extend([pipe_read.value, pipe_write.value])
        checked(kernel.SetHandleInformation(pipe_write, 1, 0), "PIPE_NO_INHERIT")
        startup = Startup()
        startup.cb, startup.flags, startup.stdin = ctypes.sizeof(Startup), 0x100, pipe_read.value
        current = kernel.GetCurrentProcess()
        for fd, name in [(1, "stdout"), (2, "stderr")]:
            duplicate = w.HANDLE()
            checked(kernel.DuplicateHandle(current, msvcrt.get_osfhandle(fd), current, ctypes.byref(duplicate), 0, True, 2), "DUP_STDIO")
            handles.append(duplicate.value)
            setattr(startup, name, duplicate.value)
        executable = shutil.which(command[0])
        if executable is None:
            raise FileNotFoundError(f"WORKER_OWNER_COMMAND_NOT_FOUND: {command[0]}")
        line = ctypes.create_unicode_buffer(subprocess.list2cmdline([executable, *command[1:]]))
        checked(kernel.CreateProcessW(executable, line, None, None, True, 0x08000004, None, None, ctypes.byref(startup), ctypes.byref(process)), "CREATE_PROCESS")
        handles.extend([process.process, process.thread])
        # Only the child owns these ends now. Retaining our read end would keep
        # a blocked WriteFile alive after the Worker and its children exit.
        for inherited in (pipe_read.value, startup.stdout, startup.stderr):
            checked(kernel.CloseHandle(inherited), "CLOSE_PARENT_STDIO")
            handles.remove(inherited)
        checked(kernel.AssignProcessToJobObject(job, process.process), "ASSIGN_JOB")
        assigned = True
        if kernel.ResumeThread(process.thread) == 0xFFFFFFFF:
            raise OSError(ctypes.get_last_error(), "WORKER_OWNER_RESUME_FAILED")

        def write(chunk):
            remaining = chunk
            while remaining:
                written = w.DWORD()
                if not kernel.WriteFile(pipe_write, remaining, len(remaining), ctypes.byref(written), None):
                    code = ctypes.get_last_error()
                    if code in (109, 232):
                        raise BrokenPipeError(code, "worker input closed")
                    raise OSError(code, "WORKER_OWNER_WRITE_FAILED")
                remaining = remaining[written.value:]

        stopped, chunks, writer, failures = input_pump(write)
        code = w.DWORD(0)
        while not stopped.is_set():
            wait = kernel.WaitForSingleObject(process.process, 20)
            if wait == 0:
                checked(kernel.GetExitCodeProcess(process.process, ctypes.byref(code)), "GET_EXIT")
                break
            if wait != 258:
                raise OSError(ctypes.get_last_error(), "WORKER_OWNER_WAIT_FAILED")
        checked(kernel.TerminateJobObject(job, 1), "TERMINATE_JOB")
        deadline = time.monotonic() + 15
        while True:
            accounting = Accounting()
            checked(kernel.QueryInformationJobObject(job, 1, ctypes.byref(accounting), ctypes.sizeof(accounting), None), "QUERY_JOB")
            if accounting.active == 0:
                break
            if time.monotonic() >= deadline:
                raise RuntimeError("WORKER_OWNER_DRAIN_TIMEOUT")
            time.sleep(0.01)
        stopped.set()
        chunks.put(None)
        writer.join(2)
        if writer.is_alive():
            raise RuntimeError("WORKER_OWNER_INPUT_DRAIN_TIMEOUT")
        if failures and not all(isinstance(error, BrokenPipeError) for error in failures):
            raise ExceptionGroup("WORKER_OWNER_INPUT_FAILED", failures)
        checked(kernel.GetExitCodeProcess(process.process, ctypes.byref(code)), "GET_FINAL_EXIT")
        return code.value
    finally:
        # A failed assignment never permits the suspended process to run.
        if process.process and not assigned:
            checked(kernel.TerminateProcess(process.process, 1), "TERMINATE_UNASSIGNED")
            if kernel.WaitForSingleObject(process.process, 15000) != 0:
                raise RuntimeError("WORKER_OWNER_UNASSIGNED_DRAIN_FAILED")
        errors = []
        for handle in reversed(handles):
            try:
                checked(kernel.CloseHandle(handle), "CLOSE_HANDLE")
            except OSError as error:
                errors.append(error)
        if errors:
            raise ExceptionGroup("WORKER_OWNER_HANDLE_RELEASE_FAILED", errors)


def main():
    token, *command = sys.argv[1:]
    if not command:
        raise ValueError("WORKER_OWNER_COMMAND_REQUIRED")
    if sys.platform == "win32":
        code = run_windows(command)
    elif sys.platform == "linux":
        code = run_linux(command)
    else:
        raise RuntimeError(f"WORKER_OWNER_UNSUPPORTED: {sys.platform}")
    os.write(2, f"\nAVE_WORKER_OWNER_DRAINED:{token}\n".encode("ascii"))
    # Reader can remain blocked on Node's pipe after a Worker crash; all producer
    # processes and owned handles have already drained. Avoid daemon I/O teardown.
    os._exit(ctypes.c_int32(code).value if sys.platform == "win32" else code if code >= 0 else 128 - code)


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        os.write(2, traceback.format_exc().encode("utf-8"))
        os._exit(70)  # No drain receipt: the client must retain failed ownership.
