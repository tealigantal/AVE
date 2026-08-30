import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-model-candidate-"));
try {
  const host = new ProjectHostSession();
  await host.create(root);
  assert.equal("proposeStory" in host, false, "the v1 model candidate route must be absent");
  assert.equal(typeof host.proposeStoryV2, "function");
  assert.deepEqual(host.listModelRuns(), []);
  await host.close();
  const reopened = new ProjectHostSession();
  await reopened.open(root);
  assert.equal(reopened.listModelRuns().length, 0);
  await reopened.close();
  console.log("model candidate host check passed");
} finally {
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
