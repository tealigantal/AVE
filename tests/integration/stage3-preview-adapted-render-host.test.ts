import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { ProjectHostSession, ResourceGate } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { listAssetLocationsForAssets, putObjectAndRegister, readCreationDraftExecution, readCreationRender, readTimelineAtVersion, setAssetLocationPermission } from "../../packages/platform/project-storage/src/public.js";
import { creationDigest } from "../../packages/platform/contract-runtime/src/public.js";
import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";

// Real local Worker + Host + dual QC, synthetic A/V and local model fixture.
// ResourceGate is explicitly enabled while the execution strategy is standard;
// bounded execution is covered by its separate actual Host integration test.
const previousLow = process.env.AVE_LOW_RESOURCE;
delete process.env.AVE_LOW_RESOURCE;
const root = await mkdtemp(resolve(tmpdir(), "ave-adapted-host-")), credential = {}, exec = promisify(execFile);
const now = () => Date.parse("2026-11-11T00:00:00Z"), time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const provider = createQwenProvider({ api_key: "fixture", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const input = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: input.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Synthetic fixture", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
  }
  const input = JSON.parse(content), span = input.source_spans[0];
  const shot = { shot_id: "shot", timing: { kind: "exact" }, source_window: { span_id: span.span_id, asset_id: span.asset_id, start: time(0), end: time(30) }, purpose: "synthetic motion", embedded_gain_db: 0, reframe: null, color: null };
  const decision = { decision_version: 1, target_duration_ticks: 30, thesis: "Synthetic motion", shots: [shot], audio: [], captions: [], preserve_refs: [], applied_principle_ids: [], feedback_interpretation: input.request.original_text, change_summary: "Single cut" };
  const control = input.planning_exchange;
  const { decision_version: _version, target_duration_ticks: _duration, shots, ...creative } = decision;
  const exchange = control.round === 1
    ? { exchange_version: 3, kind: "measure_selection", query_id: control.assigned_query_id, target_duration_ticks: 30, selection: [{ selection_id: shot.shot_id, source_choice: { kind: "custom_window", source_window: shot.source_window }, timing: shot.timing }] }
    : { exchange_version: 3, kind: "final", measured_query_id: control.feasible_receipts.at(-1).query_id, measurement_receipt_digest: control.feasible_receipts.at(-1).measurement_receipt_digest, creative: { ...creative, shots: shots.map(({ source_window: _source, timing: _timing, ...item }) => item) } };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(fixtureSkillExchange(input, exchange, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
} });
const options = { now, creationRequestChannels: [{ credential, actor_id: "fixture-user" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 30000 } };
let host: ProjectHostSession | undefined;
const contains = (error: any, code: string): boolean => Boolean(error?.code === code || error?.message?.includes(code) || error?.cause && contains(error.cause, code) || error?.errors?.some((item: unknown) => contains(item, code)));
try {
  const media = resolve(root, "source.mp4"), projectRoot = resolve(root, "project");
  await exec("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=1200x800:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-c:v", "libx264", "-threads:v", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "2", media]);
  host = new ProjectHostSession(options);
  await host.create(projectRoot); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const [original] = await host.importMedia([media]) as any[];
  const { actor_id: _actor, project_id: _project, deployment: _deployment, original_locations: _bindings, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  host.beginCreationRequest(credential, { ...authorization, request_id: "fixture", asset_ids: [original.asset_id], provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio"], expires_at: "2027-01-01T00:00:00Z" });
  await host.prepareCreationMaterial(credential, { request_id: "fixture", operation_id: "material", asset_id: original.asset_id, asset_location_id: original.asset_location_id });
  const observation = await host.observeCreationMaterial(credential, { request_id: "fixture", expected_revision: 1, material_operation_ids: ["material"], include_audio: true });
  const draft = await host.generateCreationDraft(credential, { request_id: "fixture", expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  const originalInput = { request_id: "fixture", draft_id: draft.draft_id, operation_id: "original-v1" };
  const originalResult = await host.renderCreationDraft(credential, originalInput);
  assert.equal(originalResult.receipt.schema_version, 2);
  assert.equal((originalResult.receipt as any).adaptation_ref, null);
  const oldSession = (host as any).session, oldProject = oldSession.manifest.project_id;
  const originalHash = readCreationRender(oldSession, oldProject, originalInput.operation_id).object_hash;
  assert.equal((await host.renderCreationDraft(credential, originalInput)).receipt.schema_version, 2);
  assert.equal(readCreationRender(oldSession, oldProject, originalInput.operation_id).object_hash, originalHash, "Original v2 reuse preserves receipt bytes");
  // Create a synthetic historical v1 record from the same completed Original
  // bundle. This fixture installs bytes directly; the production write path
  // must refuse v1 while the historical reader preserves the original bytes.
  const { adaptation_ref: _adaptation, ...originalReceipt } = originalResult.receipt as any;
  const generation = readCreationDraftExecution(oldSession, oldProject, draft.draft_id) as any;
  const legacy = { ...originalReceipt, schema_version: 1, input_digest: creationDigest({ ...originalInput, execution_digest: generation.object_hash, timeline_digest: originalReceipt.timeline_digest, qc_policy: "creation-render-v1" }) };
  const legacyBytes = Buffer.from(JSON.stringify(legacy));
  const legacyObject = await putObjectAndRegister(oldSession, oldProject, legacyBytes, { object_ref_id: `${oldProject}:synthetic-legacy-fixture`, object_type: "test_fixture", version: 1, relation_key: "legacy" });
  oldSession.db.prepare("UPDATE object_refs SET object_hash=? WHERE project_id=? AND object_type='creation_render' AND relation_key=?").run(legacyObject.hash, oldProject, originalInput.operation_id);
  const oldHash = readCreationRender(oldSession, oldProject, originalInput.operation_id).object_hash;
  await host.close();
  host = new ProjectHostSession({ ...options, resourceGate: new ResourceGate(true) }); await host.open(projectRoot);
  const session = (host as any).session, project = session.manifest.project_id;
  const actualSubmit = (host as any).workerPort.submit.bind((host as any).workerPort);
  const location = (listAssetLocationsForAssets(session, project, [original.asset_id]) as any[]).find(item => item.asset_location_id === original.asset_location_id), permission = location.metadata.permission_decision;
  const count = () => session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='creation_render'").get().n;
  let renderAfterProxyFailure = 0;
  (host as any).workerPort.submit = (task: string, payload: any, control: any) => { if (task === "media.preview-proxy.v1") throw new Error("PREVIEW_PROXY_FIXTURE_FAILURE"); if (task === "render.timeline.v1") renderAfterProxyFailure++; return actualSubmit(task, payload, control); };
  await assert.rejects(host.renderCreationDraft(credential, { ...originalInput, operation_id: "proxy-failure" }), (error: any) => contains(error, "PREVIEW_PROXY_FIXTURE_FAILURE"));
  assert.equal(renderAfterProxyFailure, 0, "failed preview proxy must never fall back to Original rendering");
  assert.equal(readCreationRender(session, project, "proxy-failure"), null); assert.equal(count(), 1);
  let revoke = true;
  (host as any).workerPort.submit = async (task: string, payload: any, control: any) => {
    const result = await actualSubmit(task, payload, control);
    if (task === "qc.master.v1" && revoke) { revoke = false; setAssetLocationPermission(session, project, original.asset_id, original.asset_location_id, { ...permission, permission_state: "denied" }); }
    return result;
  };
  try { await assert.rejects(host.renderCreationDraft(credential, { ...originalInput, operation_id: "adapt-revoked" }), (error: any) => contains(error, "AUTHORITY_STALE") || contains(error, "authorization") || contains(error, "permission")); }
  finally { setAssetLocationPermission(session, project, original.asset_id, original.asset_location_id, permission); }
  assert.equal(count(), 1, "revocation before dual-QC publication cannot create a v2 receipt");
  assert.equal(readCreationRender(session, project, "adapt-revoked"), null);
  const qcInputs: any[] = [];
  (host as any).workerPort.submit = (task: string, payload: any, control: any) => { if (task === "qc.master.v1") qcInputs.push(structuredClone(payload)); return actualSubmit(task, payload, control); };
  const adaptedInput = { ...originalInput, operation_id: "adapt-v2" };
  const result = await host.renderCreationDraft(credential, adaptedInput);
  assert.equal(result.receipt.schema_version, 2);
  assert.equal((result.receipt.preview.qc_report as { status: string }).status, "passed"); assert.equal((result.receipt.master.qc_report as { status: string }).status, "passed");
  assert.deepEqual(qcInputs.map(item => item.source_identity.render_graph_source_kind), ["original", "proxy"]);
  assert.equal(qcInputs[0].qc_audio_context.graph.profile.width, 1200); assert.equal(qcInputs[1].qc_audio_context.graph.profile.width, 960);
  const saved = readCreationRender(session, project, adaptedInput.operation_id);
  assert.equal(saved.value.schema_version, 2); assert.equal(readCreationRender(session, project, originalInput.operation_id).object_hash, oldHash);
  const selection = { request_id: "fixture", draft_id: draft.draft_id, render_id: result.receipt.bundle.render_id };
  const preview = await host.readCreationDraftPreview(credential, selection), master = host.readCreationDraftMasterSource(credential, selection);
  assert.equal(createHash("sha256").update(preview.bytes).digest("hex"), result.receipt.preview.output_hash);
  assert.equal(createHash("sha256").update(await readFile(master.path)).digest("hex"), result.receipt.master.output_hash);
  (host as any).workerPort.submit = (task: string, payload: any, control: any) => { if (["render.timeline.v1", "qc.master.v1", "media.preview-proxy.v1", "media.still-proxy.v1"].includes(task)) throw new Error("historical receipt attempted new production"); return actualSubmit(task, payload, control); };
  assert.equal((await host.renderCreationDraft(credential, originalInput)).receipt.schema_version, 1, "v1 historical receipt stays read-only");
  const adaptation = JSON.parse(await readFile(resolve(projectRoot, "objects", "sha256", saved.value.adaptation_ref.digest.slice(0, 2), saved.value.adaptation_ref.digest), "utf8"));
  const proxyDigest = adaptation.proxies[0].proxy_digest, proxyPath = resolve(projectRoot, "objects", "sha256", proxyDigest.slice(0, 2), proxyDigest), proxyBytes = await readFile(proxyPath);
  try {
    await writeFile(proxyPath, Buffer.alloc(proxyBytes.length));
    await assert.rejects(host.renderCreationDraft(credential, adaptedInput), (error: any) => contains(error, "CREATION_PROXY_CACHE_CORRUPT"));
  } finally { await writeFile(proxyPath, proxyBytes); }
  assert.equal((await host.renderCreationDraft(credential, adaptedInput)).receipt.schema_version, 2, "v2 historical receipt stays read-only");
  assert.equal(readCreationRender(session, project, adaptedInput.operation_id).object_hash, saved.object_hash, "proxy v2 reuse preserves receipt bytes");
  const storedTimeline = JSON.parse(readTimelineAtVersion(session, project, result.receipt.timeline_version)!);
  const videoTrack = storedTimeline.tracks.find((track: any) => track.kind === "video" && track.clips.length);
  const edited = await host.editCreationDraft(credential, { operation_id: "complex-edit", request_id: "fixture", expected_revision: 1, expected_timeline_version: result.receipt.timeline_version, parent_draft_id: draft.draft_id, raw_text: "Move the picture", preserve_refs: [], commands: [{ type: "set_transform", track_id: videoTrack.track_id, clip_id: videoTrack.clips[0].clip_id, transform: { x: 20, y: 10 } }] });
  await assert.rejects(host.renderCreationDraft(credential, { request_id: "fixture", draft_id: edited.draft_id, operation_id: "complex-unsupported" }), (error: any) => contains(error, "CREATION_PREVIEW_ADAPTATION_UNSUPPORTED"));
  assert.equal(readCreationRender(session, project, "complex-unsupported"), null, "unverified pixel-coordinate transforms cannot publish adapted renders");
  await host.close(); host = new ProjectHostSession({ ...options, resourceGate: new ResourceGate(true) }); await host.open(projectRoot);
  const reopened = await host.readCreationDraftPreview(credential, selection), reopenedMaster = host.readCreationDraftMasterSource(credential, selection);
  assert.equal(reopened.output_hash, result.receipt.preview.output_hash); assert.equal(reopenedMaster.output_hash, result.receipt.master.output_hash);
  console.log("Actual Host v2 proxy dual QC, revoked publication and v1/v2 read-only reuse passed.");
} finally {
  if (host) await host.close();
  if (previousLow === undefined) delete process.env.AVE_LOW_RESOURCE; else process.env.AVE_LOW_RESOURCE = previousLow;
  await rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
