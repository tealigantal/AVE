import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createProject, openProject } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-recovery-"));
try {
  const first = await createProject(root); await first.close();
  await writeFile(resolve(root, "project.lock"), "not-a-pid\n");
  const recovered = await openProject(root);
  assert.equal((await readFile(resolve(root, "project.json"), "utf8")).includes(recovered.manifest.project_id), true);
  await recovered.close();
  await writeFile(resolve(root, "project.lock"), "999999999\n");
  const stale = await openProject(root); await stale.close();
  // Simulate a container restart reusing the current PID. The old kernel lock
  // is gone even though the metadata points at an existing process.
  await writeFile(resolve(root, "project.lock"), JSON.stringify({pid: process.pid, token: "old-instance", kernel_lock: true}));
  const reusedPid = await openProject(root); await reusedPid.close();
  const modulePath = new URL("../../packages/platform/project-storage/src/project-storage.mjs", import.meta.url).href;
  const child = spawn(process.execPath, ["--input-type=module", "-e", `import {openProject} from ${JSON.stringify(modulePath)}; await openProject(${JSON.stringify(root)}); console.log("READY"); setInterval(()=>{},1000);`], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((resolve, reject) => { child.stdout.once("data", resolve); child.once("error", reject); child.once("exit", code => reject(new Error(`owner exited early: ${code}`))); });
  await assert.rejects(() => openProject(root), /already locked/);
  const exited = new Promise(resolve => child.once("exit", resolve)); child.kill("SIGKILL"); await exited;
  // The child no longer owns the kernel lock even though its metadata remains.
  let recoveredAfterCrash;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { recoveredAfterCrash = await openProject(root); break; }
    catch (error) { if (!/already locked/.test(error.message) || attempt === 99) throw error; await new Promise(resolve => setTimeout(resolve, 20)); }
  }
  assert.ok(recoveredAfterCrash); await recoveredAfterCrash.close();
} finally { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("project recovery check passed");
