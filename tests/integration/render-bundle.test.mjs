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
  const semanticPayload = JSON.stringify({ render_id: renderId, timeline_version: 1 });
  const semanticHash = digest(semanticPayload);
  const result = (target, path, bytes) => ({ render_result_id: `${renderId}-${target}`, render_id: renderId, target, timeline_version: 1, graph_hash: semanticHash, render_graph: { target }, original_refs: [], proxy_refs: [], profile: { name: target }, worker_version: "ave-worker-host-r14", ffmpeg_version: "ffmpeg-test", output_path: path, output_hash: digest(bytes) });
  const plan = (target) => { const cachePayload = JSON.stringify({ render_id: renderId, target }); const cacheKey = digest(cachePayload); return { schema_version: 2, plan_id: `plan-${target}-${cacheKey.slice(0, 24)}`, target, semantic_graph_payload: semanticPayload, semantic_graph_hash: semanticHash, adapter_id: "worker-media", adapter_version: "v4", capability_snapshot: { schema_version: 1, adapter_id: "worker-media", adapter_version: "v4", capabilities: [] }, decisions: [], cache_key_payload: cachePayload, cache_key: cacheKey, diagnostics: [] }; };
  const plans = { preview: plan("preview"), master: plan("master") };
  const output = (target, hash) => ({ schema_version: 2, render_id: renderId, target, semantic_graph_hash: semanticHash, execution_plan_id: plans[target].plan_id, cache_key: plans[target].cache_key, output_hash: hash, worker_version: "ave-worker-host-r14", backend_version: "ffmpeg-test", diagnostics: [] });
  return { schema_version: 1, bundle_id: `bundle-${suffix}`, idempotency_key: `render:${suffix}`, state: "completed", render: { render_id: renderId, original_path: "original", proxy_path: "proxy", preview_path: preview, master_path: master, qc_report: { status: "passed" } }, results: [result("preview", preview, "preview-render-bytes"), result("master", master, "master-render-bytes")], manifests: [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: plans.preview }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: plans.master }, { manifest_id: `${renderId}-output-preview`, manifest_type: "output_manifest", value: output("preview", digest("preview-render-bytes")) }, { manifest_id: `${renderId}-output-master`, manifest_type: "output_manifest", value: output("master", digest("master-render-bytes")) }] };
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
  invalidSecond.manifests.find((item) => item.manifest_type === "output_manifest" && item.value.target === "master").value.output_hash = "0".repeat(64);
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, invalidSecond), /render bundle output hash mismatch/);
  assert.deepEqual(await listOrphanObjects(session, root), [], "pre-transaction validation failure must clean earlier staged outputs");
  const oldIdentity = bundle("old-identity"); oldIdentity.manifests[0].value.adapter_version = "v3";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, oldIdentity), /schema-exact content-addressed current worker-media@v4/);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_bundles WHERE bundle_id = ?").get(oldIdentity.bundle_id).count, 0);
  const reboundOutput = bundle("rebound-output"); reboundOutput.manifests.find((item) => item.manifest_type === "output_manifest").value.worker_version = "ave-worker-host-r13";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundOutput), /not schema-exact or bound to the current ExecutionPlan/);
  const partialPlan = bundle("partial-plan"); delete partialPlan.manifests[0].value.semantic_graph_payload;
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, partialPlan), /schema-exact content-addressed current worker-media@v4/);
  const partialOutput = bundle("partial-output"); delete partialOutput.manifests.find((item) => item.manifest_type === "output_manifest").value.backend_version;
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, partialOutput), /schema-exact or bound to the current ExecutionPlan/);
  const malformedPlan = bundle("malformed-plan"); malformedPlan.manifests[0].value.plan_id = "preview-current-looking";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, malformedPlan), /schema-exact content-addressed current worker-media@v4/);
  const extraPlanField = bundle("extra-plan-field"); extraPlanField.manifests[0].value.compatibility_version = "v3";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, extraPlanField), /schema-exact content-addressed current worker-media@v4/);
  const reboundPlanPayload = bundle("rebound-plan-payload"); reboundPlanPayload.manifests[0].value.semantic_graph_payload = JSON.stringify({ foreign: true });
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundPlanPayload), /content-addressed current worker-media@v4/);
  const reboundPlanId = bundle("rebound-plan-id"); reboundPlanId.manifests[0].value.plan_id = `plan-preview-${digest("foreign-plan-id").slice(0, 24)}`;
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundPlanId), /content-addressed current worker-media@v4/);
  const malformedOutput = bundle("malformed-output"); malformedOutput.manifests.find((item) => item.manifest_type === "output_manifest").value.diagnostics = [{ schema_version: 1, code: "", message: "", severity: "info" }];
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, malformedOutput), /schema-exact or bound to the current ExecutionPlan/);
  const reboundBackend = bundle("rebound-backend"); reboundBackend.manifests.find((item) => item.manifest_type === "output_manifest").value.backend_version = "different-valid-backend";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundBackend), /current ExecutionPlan and result/);
  const reboundDiagnostics = bundle("rebound-diagnostics"); reboundDiagnostics.manifests.find((item) => item.manifest_type === "output_manifest").value.diagnostics = [{ schema_version: 1, code: "REBOUND", message: "schema valid but foreign", severity: "warning" }];
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundDiagnostics), /current ExecutionPlan and result/);
  const reboundPreset = bundle("rebound-preset");
  const reboundPresetPlans = Object.fromEntries(reboundPreset.manifests.filter((item) => item.manifest_type === "execution_plan").map((item) => [item.value.target, item.value]));
  const presetLink = { schema_version: 1, application_id: "preset-application", timeline_version: 1, semantic_graph_hash: reboundPresetPlans.preview.semantic_graph_hash, candidate_source_identity_hash: digest("candidate-sources"), actual_source_identity_hash: digest("actual-sources"), candidate_preview_plan_id: `plan-preview-${digest("candidate-preview").slice(0, 24)}`, candidate_master_plan_id: `plan-master-${digest("candidate-master").slice(0, 24)}`, actual_preview_plan_id: reboundPresetPlans.preview.plan_id, actual_master_plan_id: reboundPresetPlans.master.plan_id, actual_preview_cache_key: reboundPresetPlans.preview.cache_key, actual_master_cache_key: reboundPresetPlans.master.cache_key, verified_semantic_links: 1 };
  for (const item of reboundPreset.manifests.filter((candidate) => candidate.manifest_type === "output_manifest")) item.value.preset_application_link = structuredClone(presetLink);
  reboundPreset.manifests.find((item) => item.manifest_type === "output_manifest" && item.value.target === "master").value.preset_application_link.actual_preview_cache_key = digest("foreign-preview-cache");
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundPreset), /Preset provenance is not bound/);
  const reboundResult = bundle("rebound-result"); reboundResult.results[0].render_result_id = "foreign-preview";
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, reboundResult), /complete current ave-worker-host-r14/);
  const divergentTimeline = bundle("divergent-timeline"); divergentTimeline.results[1].timeline_version = 2;
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, divergentTimeline), /Timeline versions diverge/);
  for (const rejected of [oldIdentity, reboundOutput, partialPlan, partialOutput, malformedPlan, extraPlanField, reboundPlanPayload, reboundPlanId, malformedOutput, reboundBackend, reboundDiagnostics, reboundPreset, reboundResult, divergentTimeline]) assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_bundles WHERE bundle_id = ?").get(rejected.bundle_id).count, 0, "invalid current identity must cause zero bundle persistence");
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
  conflicting.manifests[0].value.cache_key_payload = JSON.stringify({ conflicting: true, target: "preview" });
  conflicting.manifests[0].value.cache_key = digest(conflicting.manifests[0].value.cache_key_payload);
  conflicting.manifests[0].value.plan_id = `plan-preview-${conflicting.manifests[0].value.cache_key.slice(0, 24)}`;
  const conflictingOutput = conflicting.manifests.find((item) => item.manifest_type === "output_manifest" && item.value.target === "preview").value;
  conflictingOutput.execution_plan_id = conflicting.manifests[0].value.plan_id;
  conflictingOutput.cache_key = conflicting.manifests[0].value.cache_key;
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, conflicting), /RENDER_BUNDLE_IDEMPOTENCY_CONFLICT/);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type = 'render.bundle.completed'").get().count, 1);
  const blockedPlans = bundle("blocked-plans").manifests.filter((item) => item.manifest_type === "execution_plan");
  const blocked = { schema_version: 1, bundle_id: "bundle-blocked", idempotency_key: "blocked:key", state: "blocked", results: [], manifests: [...blockedPlans, { manifest_id: "blocked-diagnostics", manifest_type: "blocker_manifest", value: { diagnostics: [{ code: "AUTOMATION_RENDER_UNSUPPORTED" }] } }] };
  const blockedWithOutput = structuredClone(blocked); blockedWithOutput.bundle_id = "bundle-blocked-output"; blockedWithOutput.idempotency_key = "blocked:output"; blockedWithOutput.manifests.push(bundle("blocked-output-source").manifests.find((item) => item.manifest_type === "output_manifest"));
  assert.throws(() => registerRenderBundle(session, session.manifest.project_id, blockedWithOutput), /exactly two plans and one blocker manifest, with no outputs/);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_bundles WHERE bundle_id = ?").get(blockedWithOutput.bundle_id).count, 0);
  registerRenderBundle(session, session.manifest.project_id, blocked);
  assert.equal(session.db.prepare("SELECT state FROM render_bundles WHERE bundle_id = ?").get(blocked.bundle_id).state, "blocked");
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM render_runs WHERE project_id = ?").get(session.manifest.project_id).count, 1, "blocked bundles must not create a render run");
  assert.deepEqual(await listOrphanObjects(session, root), []);
} finally {
  await session.close();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("atomic render bundle acceptance passed");
