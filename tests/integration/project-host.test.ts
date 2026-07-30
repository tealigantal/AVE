import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../apps/desktop/src/project-host.js";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-host-"));
try {
  const host = new ProjectHostSession();
  assert.equal(host.status().project, "not-open");
  const created = await host.create(root);
  assert.notEqual(created.project, "not-open");
  assert.equal(created.timeline, "no-version");
  await host.close();
  assert.equal(host.status().project, "not-open");
  const reopened = await host.open(root);
  assert.equal(reopened.project, created.project);
  await host.close();
} finally {
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
console.log("project host session check passed");
