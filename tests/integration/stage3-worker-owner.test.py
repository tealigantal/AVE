"""Actual OS process-owner smoke; usable in the Linux verification environment."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time


def process_alive(pid):
    if sys.platform == "win32":
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        handle = kernel.OpenProcess(0x100000, False, pid)
        if not handle:
            error = ctypes.get_last_error()
            if error == 87:
                return False
            raise OSError(error, "cannot inspect producer process")
        try:
            status = kernel.WaitForSingleObject(handle, 0)
            assert status in (0, 258), status
            return status == 258
        finally:
            assert kernel.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False

OWNER = Path(__file__).resolve().parents[2] / "packages/platform/worker-client/src/process-owner.py"
WORKER = r"""
import os, pathlib, subprocess, sys, time
mode, root = sys.argv[1:]
root = pathlib.Path(root)
writer = "import os,pathlib,sys,time\np=pathlib.Path(sys.argv[1]); (p/'pid').write_text(str(os.getpid())); f=(p/'bytes').open('ab',buffering=0)\nwhile True:\n f.write(b'x'); time.sleep(.01)"
middle = "import subprocess,sys,pathlib; subprocess.Popen([sys.executable,'-c',sys.argv[1],sys.argv[2]],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=(pathlib.Path(sys.argv[2])/'writer.stderr').open('wb'),start_new_session=True)"
subprocess.Popen([sys.executable,'-c',middle,writer,str(root)], stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).wait()
deadline=time.monotonic()+5
while not (root/'bytes').exists():
 if time.monotonic()>deadline: raise RuntimeError('writer startup timeout')
 time.sleep(.01)
if mode=='crash': os._exit(17)
while True: time.sleep(1)
"""

with tempfile.TemporaryDirectory(prefix="ave-owner-smoke-") as temporary:
    root = Path(temporary)
    for mode in ("crash", "close-blocked-input"):
        directory = root / mode
        directory.mkdir()
        token = f"owned-{mode}"
        owner = subprocess.Popen([sys.executable, str(OWNER), token, sys.executable, "-c", WORKER, mode, str(directory)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            deadline = time.monotonic() + 10
            while not (directory / "bytes").exists():
                if owner.poll() is not None or time.monotonic() >= deadline:
                    raise AssertionError(f"producer did not start: {owner.stderr.read().decode()}")
                time.sleep(.01)
            if mode == "close-blocked-input":
                owner.stdin.write(b"x" * (4 * 1024 * 1024))
                owner.stdin.close()
                owner.stdin = None
            else:
                # communicate() closes stdin; let the actual crash, not our EOF,
                # cause the owner to drain in this case.
                owner.wait(timeout=20)
            stdout, stderr = owner.communicate(timeout=20)
            assert f"\nAVE_WORKER_OWNER_DRAINED:{token}\n".encode() in stderr, stderr.decode()
            assert stdout == b"", stdout
            if mode == "crash":
                assert owner.returncode == 17, (owner.returncode, stderr.decode())
            pid = int((directory / "pid").read_text())
            assert not process_alive(pid), f"producer {pid} survived confirmed drain"
            before = (directory / "bytes").read_bytes()
            time.sleep(.1)
            assert (directory / "bytes").read_bytes() == before
        finally:
            if owner.poll() is None:
                owner.stdin.close()
                owner.wait(timeout=20)
    print(f"Stage3 {sys.platform} process owner: orphaned detached grandchild, preserved crash code, blocked stdin and confirmed drain passed")
