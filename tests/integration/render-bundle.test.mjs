import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, listOrphanObjects, readRenderBundle, registerRenderBundle } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ave-render-bundle-"));
const preview = resolve(root, "preview.mp4");
const master = resolve(root, "master.mp4");
const digest = (value) => createHash("sha256").update(value).digest("hex");
await writeFile(preview, "preview-render-bytes");
await writeFile(master, "master-render-bytes");

function bundle(suffix = "ok") {
  const renderId = `render-${suffix}`;
  const result = (target, path, bytes) => ({ render_result_id: `${renderId}-${target}`, render_id: renderId, target, timeline_version: 1, graph_hash: digest(`${target}-graph`), render_graph: { target }, original_refs: [], proxy_refs: [], profile: { name: target }, worker_version: "worker-test", ffmpeg_version: "ffmpeg-test", output_path: path, output_hash: digest(bytes) });
  const plan = (target) => ({ schema_version: 2, plan_id: `plan-${target}-${"a".repeat(24)}`, target });
  const output = (target, hash) => ({ schema_version: 2, render_id: renderId, target, output_hash: hash });
  return { schema_version: 1, bundle_id: `bundle-${suffix}`, idempotency_key: `render:${suffix}`, state: "completed", render: { render_id: renderId, original_path: "original", proxy_path: "proxy", preview_path: preview, master_path: master, qc_report: { status: "passed" } }, results: [result("preview", preview, "preview-render-bytes"), result("master", master, "master-render-bytes")], manifests: [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: plan("preview") }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: plan("master") }, { manifest_id: `${renderId}-output-preview`, manifest_type: "output_manifest", value: output("preview", digest("preview-render-bytes")) }, { manifest_id: `${renderId}-output-master`, manifest_type: "output_manifest", value: output("master", digest("master-render-bytes")) }] };
}

const session = await createProject(root);
try {
  for (const point of ["render", "results", "manifests"]) {
    const candidate = bundle(`fault-${point}`);
    assert.throws(() => registerRenderBundle(session, session.manifest.project_id, candidate, { fail_at: point }), new RegExp(`RENDER_BUNDLE_FAULT_${point.toUpperCase()}`));
    assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_bundles WHERE bundle_id = ?").get(candidate.bundle_id).count, 0);
    assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_runs WHERE render_id = ?").get(candidate.render.render_id).count, 0);
    assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_results WHERE render_id = ?").get(candidate.render.render_id).count, 0);
    assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE relation_key LIKE ?").get(`%${candidate.render.render_id}%`).count, 0);
  }
  assert.deepEqual(await listOrphanObjects(session, root), [], "failed transactions must clean newly staged objects");
  const invalidSecond = bundle("invalid-second");
  invalidSecond.results[1].output_hash = "0".repeat(64);
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, invalidSecond), /render bundle output hash mismatch/);
  assert.deepEqual(await listOrphanObjects(session, root), [], "pre-transaction validation failure must clean earlier staged outputs");
  const candidate = bundle();
  const registered = registerRenderBundle(session, session.manifest.project_id, candidate);
  assert.equal(registered.idempotent, false);
  assert.match(registered.bundle_object_hash, /^[0-9a-f]{64}$/);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_results WHERE render_id = ?").get(candidate.render.render_id).count, 2);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE relation_key LIKE ?").get(`${candidate.render.render_id}-%`).count, 8);
  const persisted = readRenderBundle(session, candidate.bundle_id);
  assert.equal(persisted.results.length, 2);
  assert.equal(persisted.results.every((result) => result.output_path.includes(resolve(root, "objects", "sha256"))), true);
  const retried = registerRenderBundle(session, session.manifest.project_id, candidate);
  assert.equal(retried.idempotent, true);
  const conflicting = bundle();
  conflicting.manifests[0].value.plan_id = "plan-preview-conflict";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, conflicting), /RENDER_BUNDLE_IDEMPOTENCY_CONFLICT/);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type = 'render.bundle.completed'").get().count, 1);
  const blocked = { schema_version: 1, bundle_id: "bundle-blocked", idempotency_key: "blocked:key", state: "blocked", results: [], manifests: [{ manifest_id: "blocked-preview", manifest_type: "execution_plan", value: { target: "preview" } }, { manifest_id: "blocked-master", manifest_type: "execution_plan", value: { target: "master" } }, { manifest_id: "blocked-diagnostics", manifest_type: "blocker_manifest", value: { diagnostics: [{ code: "AUTOMATION_RENDER_UNSUPPORTED" }] } }] };
  registerRenderBundle(session, session.manifest.project_id, blocked);
  assert.equal(session.db.prepare("SELECT state FROM render_bundles WHERE bundle_id = ?").get(blocked.bundle_id).state, "blocked");
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_runs WHERE project_id = ?").get(session.manifest.project_id).count, 1, "blocked bundles must not create a render run");
  assert.deepEqual(await listOrphanObjects(session, root), []);
} finally {
  await session.close();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("atomic render bundle acceptance passed");
