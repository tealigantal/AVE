import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
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
} finally { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("project recovery check passed");
