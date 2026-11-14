import { spawn } from "node:child_process";
import { constants, existsSync, openSync, writeFileSync, fsyncSync, closeSync, readFileSync, rmSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

// A kernel-held lock survives PID namespace reuse and is released on process
// death, including abrupt container termination. The guard file is never
// unlinked while a project can be opened, avoiding inode replacement races.
const PROJECT_LOCK_HELPER = `import sys,os,stat
p=sys.argv[1]
if os.path.islink(p):raise RuntimeError("PROJECT_LOCK_GUARD_UNSAFE")
fd=os.open(p,os.O_CREAT|os.O_RDWR|getattr(os,"O_NOFOLLOW",0),0o600)
f=os.fdopen(fd,"r+b",buffering=0)
a=os.fstat(fd); b=os.lstat(p)
if not stat.S_ISREG(a.st_mode) or stat.S_ISLNK(b.st_mode) or a.st_nlink!=1 or (a.st_dev,a.st_ino)!=(b.st_dev,b.st_ino):raise RuntimeError("PROJECT_LOCK_GUARD_UNSAFE")
try:
 if os.name=="nt":
  import msvcrt
  if os.fstat(f.fileno()).st_size==0:f.write(b"0")
  f.seek(0);msvcrt.locking(f.fileno(),msvcrt.LK_NBLCK,1)
 else:
  import fcntl
  fcntl.flock(f.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
except (OSError,BlockingIOError):
 print("BUSY",flush=True);sys.exit(2)
print("LOCKED",flush=True)
sys.stdin.buffer.read()
f.close()`;
export async function acquireProjectLock(projectDirectory) {
  const path = resolve(projectDirectory, "project.lock");
  // Windows cannot rename a directory containing an open lock handle. Keep
  // its guard alongside the project, with a stable path for every opener.
  const guardPath = process.platform === "win32"
    ? resolve(dirname(projectDirectory), `.ave-lock-${createHash("sha256").update(resolve(projectDirectory).toLowerCase()).digest("hex")}.guard`)
    : resolve(projectDirectory, "project.lock.guard");
  const helper = spawn(process.env.AVE_PYTHON || (process.platform === "win32" ? "python" : "python3"), ["-u", "-c", PROJECT_LOCK_HELPER, guardPath], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  let errorText = ""; helper.stderr.setEncoding("utf8"); helper.stderr.on("data", part => { errorText += part; });
  const ready = await new Promise((accept, reject) => {
    let data = "", settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : accept(value); };
    const timer = setTimeout(() => finish(new Error("PROJECT_LOCK_HELPER_TIMEOUT")), 10000);
    helper.once("error", error => finish(error));
    helper.stdout.setEncoding("utf8"); helper.stdout.on("data", part => { data += part; if (data.includes("\n")) finish(null, data.trim()); });
    helper.once("exit", code => finish(new Error(`PROJECT_LOCK_HELPER_FAILED: ${code} ${errorText}`)));
  }).catch(error => { helper.kill(); throw error; });
  if (ready !== "LOCKED") { helper.stdin.end(); throw new Error("project is already locked"); }
  const owner = { pid: process.pid, token: randomUUID(), created_at: new Date().toISOString(), kernel_lock: true };
  try {
    // Existing pre-kernel locks still require their former PID liveness check.
    // Kernel-locked records are safe to recover once the guard is held.
    if (existsSync(path)) {
      let existing; try { const text = readFileSync(path, "utf8").trim(); existing = text.startsWith("{") ? JSON.parse(text) : { pid: Number(text) }; } catch { existing = {}; }
      if (!existing.kernel_lock && Number.isInteger(existing.pid) && existing.pid > 0) {
        try { process.kill(existing.pid, 0); throw new Error("project is already locked"); }
        catch (error) { if (error.message === "project is already locked" || error.code === "EPERM") throw error; if (error.code !== "ESRCH") throw error; }
      }
      rmSync(path, { force: true });
    }
    const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
    try { writeFileSync(fd, JSON.stringify(owner), "utf8"); fsyncSync(fd); } finally { closeSync(fd); }
    const lock = { path, token: owner.token, helper, guard: { releasing: false } };
    helper.once("exit", () => { if (!lock.guard.releasing) queueMicrotask(() => { throw new Error("PROJECT_LOCK_LOST: kernel lock helper exited unexpectedly"); }); });
    return lock;
  } catch (error) { helper.stdin.end(); throw error; }
}

export async function releaseProjectLock(lock) {
  let text;
  try { text = await readFile(lock.path, "utf8"); }
  catch (error) { if (error.code === "ENOENT") { if (lock.helper) { lock.guard.releasing = true; lock.helper.stdin.end(); } return; } throw error; }
  const current = JSON.parse(text);
  if (current.token !== lock.token) throw new Error("project lock ownership changed");
  await rm(lock.path, { force: true });
  if (lock.helper) { lock.guard.releasing = true; const done = lock.helper.exitCode !== null ? Promise.resolve() : new Promise(resolve => lock.helper.once("exit", resolve)); lock.helper.stdin.end(); await done; }
}
