import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-model-candidate-"));
const proposal = { schema_version: 1, proposal_id: "proposal-model-1", evidence_ids: ["evidence-1"], coverage_matrix_id: "coverage-1", beats: [{ beat_id: "beat-1", evidence_ids: ["evidence-1"], purpose: "开场" }], status: "candidate" };
const provider = { complete: async () => ({ output: JSON.stringify(proposal), model_snapshot: "test-snapshot", token_usage: { input: 10, output: 20, total: 30 } }) };
try {
  const host = new ProjectHostSession({ modelProvider: provider, provider: "test", model: "test-model" });
  await host.create(root);
  const result = await host.proposeStory({ evidence_ids: ["evidence-1"], brief: "测试候选" }) as any;
  assert.deepEqual(result.proposal, proposal);
  assert.equal(host.listModelRuns().length, 1);
  assert.equal((host.listModelRuns()[0] as any).metadata.provider, "test");
  await host.close();
  const reopened = new ProjectHostSession();
  await reopened.open(root);
  assert.equal(reopened.listModelRuns().length, 1);
  await reopened.close();
  console.log("model candidate host check passed");
} finally {
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
