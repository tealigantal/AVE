import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { readCreationRender } from "../../packages/platform/project-storage/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";

// Actual encoded audio/video, Worker, Host and QC; model responses are local fixtures.
const root = await mkdtemp(resolve(tmpdir(), "ave-qc-graph-sources-")), credential = {};
const ffmpeg = promisify(execFile), now = () => Date.parse("2026-09-24T01:00:00Z");
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
let selectedVideo = "";
const provider = createQwenProvider({ api_key: "fixture", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const input = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: input.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Synthetic fixture observation", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  const input = JSON.parse(content), control = input.planning_exchange, span = input.source_spans.find((item: any) => item.asset_id === selectedVideo);
  assert.ok(span);
  const shot = { shot_id: "shot", timing: { kind: "exact" }, source_window: { span_id: span.span_id, asset_id: span.asset_id, start: time(0), end: time(60) }, purpose: "Observed motion", embedded_gain_db: 0, reframe: null, color: null };
  const decision = { decision_version: 1, target_duration_ticks: 60, thesis: "Synthetic moving picture", shots: [shot], audio: [], captions: [], preserve_refs: [], applied_principle_ids: [], feedback_interpretation: input.request.original_text, change_summary: "Selected picture only" };
  const { decision_version: _version, target_duration_ticks: _target, shots, ...creative } = decision;
  const exchange = control.round === 1
    ? { exchange_version: 3, kind: "measure_selection", query_id: control.assigned_query_id, target_duration_ticks: 60, duration_constraint: { kind: "none", minimum_ticks: null, maximum_ticks: null, reason: "The fixture request does not set a whole-work duration." }, selection: [{ selection_id: shot.shot_id, source_choice: { kind: "custom_window", source_window: shot.source_window }, timing: shot.timing }] }
    : { exchange_version: 3, kind: "final", measured_query_id: control.feasible_receipts.at(-1).query_id, measurement_receipt_digest: control.feasible_receipts.at(-1).measurement_receipt_digest, creative: { ...creative, shots: shots.map(({ source_window: _source, timing: _timing, ...item }) => item) } };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(fixtureSkillExchange(input, exchange, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const options = { now, creationRequestChannels: [{ credential, actor_id: "fixture-user" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 30000 } };
const paths = { silent: resolve(root, "silent.mp4"), audible: resolve(root, "audible.mp4"), extra: resolve(root, "unused.wav") };
let host: ProjectHostSession | undefined;
try {
  for (const [i, path] of [paths.silent, paths.audible].entries()) await ffmpeg("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", "-f", "lavfi", "-i", i ? "sine=frequency=660:sample_rate=48000:duration=3" : "anullsrc=channel_layout=stereo:sample_rate=48000", "-vf", `hue=h=${i * 40}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "3", path]);
  await ffmpeg("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3", "-c:a", "pcm_s16le", paths.extra]);
  const fixture = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = fixture;
  async function prepare(name: string, inputs: string[]) {
    host = new ProjectHostSession(options); await host.create(resolve(root, name)); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
    const imported = await host.importMedia(inputs) as any[]; selectedVideo = imported[0].asset_id;
    host.beginCreationRequest(credential, { ...authorization, request_id: name, asset_ids: imported.map(item => item.asset_id), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
    return imported;
  }
  const silentInputs = await prepare("unused-audio", [paths.silent, paths.extra, paths.audible]);
  const qcInputs: any[] = [], worker = (host as any).workerPort, submit = worker.submit.bind(worker);
  worker.submit = (task: string, input: any, control: any) => { if (task === "qc.master.v1") qcInputs.push(structuredClone(input)); return submit(task, input, control); };
  const completed = await host!.produceCreation(credential, { request_id: "unused-audio", expected_revision: 1, profile_query: null });
  assert.ok(completed.render_id); assert.equal(qcInputs.length, 2);
  for (const input of qcInputs) {
    assert.deepEqual(input.render_graph_sources.map((item: any) => item.asset_id), [silentInputs[0].asset_id]);
    assert.deepEqual(input.source_audio_evidence.map((item: any) => item.asset_id), [silentInputs[0].asset_id]);
    assert.equal(input.source_identity.asset_id, silentInputs[0].asset_id);
    assert.equal(input.require_audio, true, "the selected video's existing audio track remains subject to QC");
  }
  assert.deepEqual(qcInputs[0].render_graph_sources, qcInputs[1].render_graph_sources, "Preview and Master use the same selected Original identities");
  const request = (await host!.readCreationWorkspace(credential, { profile_query: null })).requests.find((item: any) => item.authorization.request_id === "unused-audio")!;
  const session = (host as any).session, receipt = readCreationRender(session, session.manifest.project_id, request.drafts[0].renders[0].operation_id).value;
  assert.equal(receipt.preview.qc_report.status, "passed"); assert.equal(receipt.master.qc_report.status, "passed");
  for (const report of [receipt.preview.qc_report, receipt.master.qc_report]) assert.ok(report.issues.some((issue: any) => issue.code === "SILENCE" && issue.blocker === false));

  const probe = JSON.parse((await ffmpeg("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=time_base", "-of", "json", paths.audible])).stdout);
  const [numerator, denominator] = probe.streams[0].time_base.split("/").map(Number);
  assert.equal(numerator, 1);
  const otherSource = sourceRange(silentInputs[2].asset_id, 0n, BigInt(2 * denominator), BigInt(denominator));
  const muted = await host!.editCreationDraft(credential, { operation_id: "muted-picture", request_id: "unused-audio", expected_revision: 1, expected_timeline_version: 1, parent_draft_id: completed.draft_id, raw_text: "Add muted picture", preserve_refs: [], commands: [{ type: "add_track", track: { track_id: "muted-picture", kind: "video", muted: true, clips: [{ clip_id: "muted-clip", source: otherSource, timeline_start: 0n, timeline_duration: 60n }] } }] });
  const mutedReceipt = await host!.renderCreationDraft(credential, { operation_id: "render-muted-picture", request_id: "unused-audio", draft_id: muted.draft_id });
  assert.equal((mutedReceipt.receipt.preview.qc_report as { status: string }).status, "passed"); assert.equal((mutedReceipt.receipt.master.qc_report as { status: string }).status, "passed");
  for (const input of qcInputs.slice(-2)) {
    assert.deepEqual(new Set(input.render_graph_sources.map((item: any) => item.asset_id)), new Set([silentInputs[0].asset_id, silentInputs[2].asset_id]));
    assert.deepEqual(new Set(input.source_audio_evidence.map((item: any) => item.asset_id)), new Set([silentInputs[0].asset_id, silentInputs[2].asset_id]));
    assert.ok(input.qc_audio_context.graph.nodes.some((node: any) => node.kind === "audio" && node.parameters.clip_id === "muted-clip" && node.parameters.muted === true));
  }
  const mixed = await host!.editCreationDraft(credential, { operation_id: "same-asset-active", request_id: "unused-audio", expected_revision: 1, expected_timeline_version: 2, parent_draft_id: muted.draft_id, raw_text: "Add the sound of the second picture", preserve_refs: [], commands: [{ type: "add_track", track: { track_id: "active-audio", kind: "audio", clips: [{ clip_id: "active-clip", media_kind: "audio", source: otherSource, timeline_start: 0n, timeline_duration: 60n }] } }] });
  worker.submit = async (task: string, input: any, control: any) => {
    const result = await submit(task, input, control);
    if (task === "render.timeline.v1") {
      const output = result.outputs.find((item: any) => item.kind === "render"), silenced = `${output.path}.muted.mp4`;
      await ffmpeg("ffmpeg", ["-v", "error", "-i", output.path, "-af", "volume=0", "-c:v", "copy", "-c:a", "aac", "-y", silenced]);
      await copyFile(silenced, output.path); const hash = createHash("sha256").update(await readFile(output.path)).digest("hex");
      output.hash = hash; result.metrics.output_hash = hash;
    }
    return result;
  };
  await assert.rejects(host!.renderCreationDraft(credential, { operation_id: "render-active-dropped", request_id: "unused-audio", draft_id: mixed.draft_id }), (error: any) => error?.code === "CREATION_RENDER_QC_BLOCKED" && JSON.parse(error.message).preview.issues.some((item: any) => item.code === "SILENCE" && item.blocker) && JSON.parse(error.message).master.issues.some((item: any) => item.code === "SILENCE" && item.blocker));
  await host!.close(); host = undefined;

  const audibleInputs = await prepare("dropped-audio", [paths.audible]);
  const badWorker = (host as any).workerPort, realSubmit = badWorker.submit.bind(badWorker), badQc: any[] = [];
  badWorker.submit = async (task: string, input: any, control: any) => {
    const result = await realSubmit(task, input, control);
    if (task === "qc.master.v1") badQc.push(structuredClone(input));
    if (task === "render.timeline.v1") {
      const output = result.outputs.find((item: any) => item.kind === "render"), muted = `${output.path}.muted.mp4`;
      await ffmpeg("ffmpeg", ["-v", "error", "-i", output.path, "-af", "volume=0", "-c:v", "copy", "-c:a", "aac", "-y", muted]);
      await copyFile(muted, output.path); const hash = createHash("sha256").update(await readFile(output.path)).digest("hex");
      output.hash = hash; result.metrics.output_hash = hash;
    }
    return result;
  };
  const partial = await host!.produceCreation(credential, { request_id: "dropped-audio", expected_revision: 1, profile_query: null });
  assert.equal(partial.render_id, null); assert.equal(partial.warning?.phase, "preview-master-render");
  const localSession=(host as any).session;
  const saved=localSession.db.prepare("SELECT object_hash FROM object_refs WHERE object_ref_id=?").get(`${localSession.manifest.project_id}:creation-production-failure:${partial.warning!.failure_id}`);
  assert.ok(saved); const failure=JSON.parse(await readFile(resolve(localSession.projectDirectory,"objects","sha256",saved.object_hash.slice(0,2),saved.object_hash),"utf8"));
  assert.equal(failure.error.code,"CREATION_RENDER_QC_BLOCKED"); const reports=JSON.parse(failure.error.message);
  assert.ok(reports.preview.issues.some((item:any)=>item.code==="SILENCE"&&item.blocker));
  assert.ok(reports.master.issues.some((item:any)=>item.code==="SILENCE"&&item.blocker));
  assert.equal(host!.readCreationDraftTimeline(credential,{request_id:"dropped-audio",draft_id:partial.draft_id}).version,partial.timeline_version);
  assert.equal(badQc.length, 2);
  for (const input of badQc) assert.deepEqual(input.source_audio_evidence.map((item: any) => item.asset_id), [audibleInputs[0].asset_id]);
  console.log("QC uses actual graph Originals: unused audible media is excluded, real dropped selected audio remains blocking (Preview and Master)");
} finally { await host?.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
