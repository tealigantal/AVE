import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import type { Timeline, TimelineCommand } from "../../packages/core/timeline-core/src/public.js";
import { buildCreationLearningEvent } from "../../packages/platform/project-host/src/stage3-learning.js";
import { readCreationDraftExecution } from "../../packages/platform/project-storage/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { readCreationState, readObjectSync } from "../../packages/platform/project-storage/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";

// Actual encoded motion/audio -> actual dual render/QC. Model responses are local fixtures.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-manual-")), projectRoot = resolve(root, "project"), credential = {}, now = () => Date.parse("2026-09-24T01:00:00Z");
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
let decisions = 0, modelCalls = 0, blockGeneration = false;
let reached!: () => void, release!: () => void;
const atProvider = new Promise<void>(resolve => { reached = resolve; }), releaseProvider = new Promise<void>(resolve => { release = resolve; });
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  modelCalls += 1;
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const observation = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Controlled synthetic sample", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  const body = JSON.parse(content), observations = body.source_spans;
  if (blockGeneration) { reached(); await releaseProvider; }
  const firstLength = 45; decisions += 1;
  const decision = { thesis: "Two moving test patterns", shots: observations.map((item: any, index: number) => ({ shot_id: `shot-${index}`, source: { span_id: item.span_id, asset_id: item.asset_id, start: time(0), end: time(index ? 30 : firstLength) }, purpose: "Observed moving pattern", embedded_gain_db: -6, reframe: null, color: null })), audio: [], captions: [], preserve_refs: body.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: body.request.original_text, change_summary: "Unequal observed pattern cuts" };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(decision) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const host = new ProjectHostSession({ now, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: {   max_attempts: 1, timeout_ms: 30000 } });
const contains = (error: any, code: string): boolean => Boolean(error?.code === code || error?.message?.includes(code) || error?.cause && contains(error.cause, code) || error?.errors?.some((item: unknown) => contains(item, code)));
const rejects = (code: string) => (error: unknown) => contains(error, code);
try {
  const files = [resolve(root, "moving-a.mp4"), resolve(root, "moving-b.mp4"), resolve(root, "manual.wav"), resolve(root, "denied.wav")];
  for (const [index, path] of files.entries()) {
    const audio = ["-f", "lavfi", "-i", `sine=frequency=${330 + index * 150}:sample_rate=48000:duration=3`];
    const args = index < 2 ? ["-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", ...audio, "-vf", `hue=h=${index * 50},setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"] : [...audio, "-c:a", "pcm_s16le"];
    await promisify(execFile)("ffmpeg", ["-v", "error", ...args, "-t", "3", path]);
  }
  await host.create(projectRoot); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(files) as any[];
  let session = (host as any).session;
  const projectId = session.manifest.project_id;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { request_id: "manual-request", asset_ids: imported.slice(0, 3).map(item => item.asset_id), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  host.beginCreationRequest(credential, authorization);
  for (const source of imported.slice(0, 3)) await host.prepareCreationMaterial(credential, { operation_id: source.asset_id, request_id: authorization.request_id, asset_id: source.asset_id, asset_location_id: source.asset_location_id });
  const observation = await host.observeCreationMaterial(credential, { request_id: authorization.request_id, expected_revision: 1, material_operation_ids: imported.slice(0, 2).map(source => source.asset_id), include_audio: true });
  const first = await host.generateCreationDraft(credential, { request_id: authorization.request_id, expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  const firstTimeline = host.readTimelineSnapshot() as Timeline, video = firstTimeline.tracks.find(track => track.kind === "video")!;
  host.reviseCreationRequest(credential, authorization.request_id, 1, { raw_text: "保留两段画面，改字幕并加独立声音。", viewed_timeline_version: 1, preserve_refs: video.clips.map(clip => clip.clip_id) });
  const revision = host.readCreationRequest(authorization.request_id).revisions.at(-1);
  blockGeneration = true;
  const late = host.generateCreationDraft(credential, { request_id: authorization.request_id, expected_revision: 2, observation_refs: [observation.ref], profile_query: null }).then(value => ({ value }), error => ({ error }));
  await atProvider;
  const callsBeforeManual = modelCalls;
  const ledgerIds = host.readCreationRequest(authorization.request_id).model_calls.map(call => call.call_id);
  const caption = (text: string): TimelineCommand => ({ type: "set_track_properties", track_id: video.track_id, properties: { captions: [{ caption_id: "manual-caption", text, timeline_start: 0n, timeline_duration: 45n }] } });
  const inputA = { operation_id: "caption-a", request_id: authorization.request_id, expected_revision: 2, expected_timeline_version: 1, parent_draft_id: first.draft_id, raw_text: "只把第一段字幕改为 1n；画面不动。", commands: [caption("1n")], preserve_refs: [] };
  const a = await host.editCreationDraft(credential, inputA);
  assert.equal(a.state.drafts.at(-1)!.source.kind, "manual");
  assert.equal(a.state.drafts.at(-1)!.base_timeline_version, 1);
  assert.equal(a.edit_ref.timeline_version, 2);
  assert.equal(a.state.adopted_draft_id, null); assert.equal(a.state.viewed_draft_id, null);
  const addAudio = (asset: string): TimelineCommand => ({ type: "add_track", track: { track_id: "manual-music", kind: "audio", clips: [{ clip_id: "manual-audio", media_kind: "audio", source: sourceRange(asset as any, 0n, 120000n, 48000n), timeline_start: 0n, timeline_duration: 75n, gain_db: -18 }], audio_routing: [{ routing_id: "manual-routing", source_clip_id: "manual-audio", bus: "music" }] } });
  const inputB = { ...inputA, operation_id: "audio-b", expected_timeline_version: 2, parent_draft_id: a.draft_id, raw_text: "加指定独立声音，保留画面和刚改的字幕。", commands: [addAudio(imported[2].asset_id)] };
  const b = await host.editCreationDraft(credential, inputB);
  assert.equal(b.edit_ref.timeline_version, 3);
  assert.deepEqual(b.state.revisions.at(-1), revision, "same intent revision was not rewritten to permit manual successors");
  assert.equal(b.state.drafts.at(-1)!.parent_draft_id, a.draft_id);
  const manualTimeline = host.readTimelineSnapshot() as Timeline;
  assert.deepEqual(manualTimeline.tracks.find(track => track.kind === "video")!.clips, video.clips);
  assert.equal(manualTimeline.tracks.find(track => track.kind === "video")!.captions![0]!.text, "1n");
  assert.equal(manualTimeline.tracks.find(track => track.track_id === "manual-music")!.clips[0]!.source.asset_id, imported[2].asset_id);
  assert.equal(modelCalls, callsBeforeManual, "manual work must not send a model request");
  release();
  const lateResult = await late;
  assert.ok("error" in lateResult && contains(lateResult.error, "REQUEST_MANUAL_SUPERSEDED"));
  assert.deepEqual(host.readTimelineSnapshot(), manualTimeline, "late model cannot overwrite manual work");
  assert.equal(host.readCreationRequest(authorization.request_id).drafts.length, 3);
  const receiptA = await host.renderCreationDraft(credential, { operation_id: "render-a", request_id: authorization.request_id, draft_id: a.draft_id });
  const receiptB = await host.renderCreationDraft(credential, { operation_id: "render-b", request_id: authorization.request_id, draft_id: b.draft_id });
  for (const item of [receiptA, receiptB]) {
    assert.equal((item.receipt.preview.qc_report as { status: string }).status, "passed"); assert.equal((item.receipt.master.qc_report as { status: string }).status, "passed");
    assert.ok(item.receipt.execution_ref.digest.length === 64);
  }
  assert.notEqual(receiptA.receipt.master.output_hash, receiptB.receipt.master.output_hash, "adding the actual audio changes the encoded work");
  const magnitude = async (hash: string, name: string) => {
    const path = resolve(root, `${name}.mp4`);
    await writeFile(path, readObjectSync(projectRoot, hash));
    const { stdout } = await promisify(execFile)("ffmpeg", ["-v", "error", "-ss", "0.3", "-i", path, "-t", "0.5", "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1"], { encoding: "buffer", maxBuffer: 1024 * 1024 });
    const samples = stdout.length / 4; let re = 0, im = 0;
    for (let index = 0; index < samples; index++) { const sample = stdout.readFloatLE(index * 4), phase = 2 * Math.PI * 630 * index / 48000; re += sample * Math.cos(phase); im += sample * Math.sin(phase); }
    return 2 * Math.hypot(re, im) / samples;
  };
  const baselineTone = await magnitude(receiptA.receipt.master.output_hash, "without-manual-audio"), addedTone = await magnitude(receiptB.receipt.master.output_hash, "with-manual-audio");
  assert.ok(addedTone > 0.005 && addedTone > baselineTone * 20, `decoded output must contain the independent 630 Hz source: ${baselineTone} -> ${addedTone}`);
  const playInput = { request_id: authorization.request_id, draft_id: a.draft_id, render_id: receiptA.receipt.bundle.render_id };
  const bytesA = await host.readCreationDraftPreview(credential, playInput);
  const counts = () => ({ timeline: (host.readTimelineSnapshot() as Timeline).version, drafts: host.readCreationRequest(authorization.request_id).drafts.length, ir: session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='edit_ir'").get().n, execution: session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='creation_draft_execution'").get().n });
  const beforeDenied = counts();
  const protectedState = host.readCreationRequest(authorization.request_id);
  await assert.rejects(host.editCreationDraft(credential, { ...inputA, operation_id: "protected-removal", expected_timeline_version: 3, parent_draft_id: b.draft_id, commands: [{ type: "remove_clip", track_id: video.track_id, clip_id: video.clips[0]!.clip_id }] }), rejects("CREATION_PRESERVATION_REFERENCE_INVALID"));
  assert.deepEqual(counts(), beforeDenied); assert.deepEqual(host.readCreationRequest(authorization.request_id), protectedState);
  const replaceAudio: TimelineCommand = { type: "set_track_properties", track_id: "manual-music", properties: { muted: true } };
  const deniedCommands: TimelineCommand[] = [{ type: "remove_track", track_id: "manual-music" }, addAudio(imported[3].asset_id)];
  const inputC = { ...inputB, operation_id: "audio-c", expected_timeline_version: 3, parent_draft_id: b.draft_id, commands: [replaceAudio], raw_text: "将新增声音静音，保留其引用与画面字幕。" };
  await assert.rejects(host.editCreationDraft(credential, { ...inputC, operation_id: "denied", commands: deniedCommands }), rejects("CREATION_SOURCE_DENIED"));
  assert.deepEqual(counts(), beforeDenied); assert.deepEqual(host.readTimelineSnapshot(), manualTimeline);
  session.db.exec("CREATE TEMP TRIGGER fail_manual BEFORE INSERT ON timeline_versions WHEN NEW.timeline_version=4 BEGIN SELECT RAISE(ABORT, 'MANUAL_DISK_FAILURE'); END");
  try { await assert.rejects(host.editCreationDraft(credential, inputC), rejects("MANUAL_DISK_FAILURE")); }
  finally { session.db.exec("DROP TRIGGER fail_manual"); }
  assert.deepEqual(counts(), beforeDenied, "atomic failure leaves no Timeline/draft/IR/execution split");
  const execute = session.db.exec.bind(session.db); let ackFault = false;
  session.db.exec = (sql: string) => {
    const result = execute(sql);
    if (sql === "COMMIT" && !ackFault && (host.readTimelineSnapshot() as Timeline).version === 4) { ackFault = true; throw new Error("MANUAL_COMMIT_ACK_FAILURE"); }
    return result;
  };
  try { await assert.rejects(host.editCreationDraft(credential, inputC), rejects("MANUAL_COMMIT_ACK_FAILURE")); }
  finally { session.db.exec = execute; }
  assert.equal(ackFault, true); const afterAck = counts();
  await host.close(); await host.open(projectRoot, { requireCreationTimeline: true }); session = (host as any).session;
  const c = await host.editCreationDraft(credential, inputC);
  assert.equal(c.edit_ref.timeline_version, 4); assert.deepEqual(counts(), afterAck);
  assert.deepEqual((await host.readCreationDraftPreview(credential, playInput)).bytes, bytesA.bytes);
  const inputD = { ...inputC, operation_id: "move-preserved", expected_timeline_version: 4, parent_draft_id: c.draft_id, raw_text: "保留镜头内容，只将第二段移到第一段前；字幕文字不改。", preserve_refs: ["manual-caption"], commands: [{ type: "move_clip", track_id: video.track_id, clip_id: video.clips[1]!.clip_id, timeline_start: 0n }, { type: "move_clip", track_id: video.track_id, clip_id: video.clips[0]!.clip_id, timeline_start: 30n }] as TimelineCommand[] };
  const d = await host.editCreationDraft(credential, inputD);
  assert.equal(d.edit_ref.timeline_version, 5);
  const moved = (host.readTimelineSnapshot() as Timeline).tracks.find(track => track.kind === "video")!;
  assert.deepEqual(moved.clips.map(clip => ({ ...clip, timeline_start: 0n })), video.clips.map(clip => ({ ...clip, timeline_start: 0n })));
  assert.deepEqual(moved.clips.map(clip => clip.timeline_start), [30n, 0n]);
  const afterMove = counts(), movedState = host.readCreationRequest(authorization.request_id);
  const sourceChange: TimelineCommand = { type: "trim_source", track_id: video.track_id, clip_id: video.clips[0]!.clip_id, source: { ...video.clips[0]!.source, end_pts: video.clips[0]!.source.end_pts - video.clips[0]!.source.timescale / 30n } };
  for (const commands of [[sourceChange], [caption("Forbidden caption replacement")]]) {
    await assert.rejects(host.editCreationDraft(credential, { ...inputD, operation_id: `protected-content-${commands[0]!.type}`, expected_timeline_version: 5, parent_draft_id: d.draft_id, commands }), rejects("CREATION_PROTECTED_CONTENT_CHANGED"));
    assert.deepEqual(counts(), afterMove); assert.deepEqual(host.readCreationRequest(authorization.request_id), movedState);
  }
  const movedRender = await host.renderCreationDraft(credential, { operation_id: "render-moved", request_id: authorization.request_id, draft_id: d.draft_id });
  assert.equal((movedRender.receipt.master.qc_report as { status: string }).status, "passed");
  const latestBeforeReplay = host.readCreationRequest(authorization.request_id).latest_draft_id;
  assert.deepEqual((await host.editCreationDraft(credential, inputA)).edit_ref, a.edit_ref);
  assert.equal(host.readCreationRequest(authorization.request_id).latest_draft_id, latestBeforeReplay);
  await assert.rejects(host.editCreationDraft(credential, { ...inputA, raw_text: "different statement" }), rejects("CREATION_MANUAL_IDEMPOTENCY_CONFLICT"));
  host.selectCreationVersion(credential, authorization.request_id, b.draft_id, "adopted");
  const selected = readCreationState(session, projectId, authorization.request_id);
  const selection = { data_type: "selection" as const, state_ref: { request_id: authorization.request_id, sequence: selected.value.sequence, digest: selected.object_hash } };
  const event = buildCreationLearningEvent(session, selected.value, "user-1", { operation_id: "selection-learning", request_id: authorization.request_id, expected_revision: 2, correction: null, selection }, new Date(now()).toISOString());
  assert.ok(JSON.stringify(event).includes(b.draft_id), "adoption learning reads a real manual draft execution");
  const manualEvent = buildCreationLearningEvent(session, selected.value, "user-1", { operation_id: "manual-learning", request_id: authorization.request_id, expected_revision: 2, correction: null, selection: { data_type: "manual_diff", edit_ref: a.edit_ref, raw_text: "认可这次实际字幕修改。" } }, new Date(now()).toISOString());
  assert.ok(JSON.stringify(manualEvent).includes("1n"));
  assert.equal(readCreationDraftExecution(session, projectId, b.draft_id).value.source.kind, "manual");
  assert.equal(modelCalls, callsBeforeManual);
  assert.deepEqual(host.readCreationRequest(authorization.request_id).model_calls.map(call => call.call_id), ledgerIds, "manual edits and replay cannot invent model reservations");
  assert.equal(host.readCreationRequest(authorization.request_id).viewed_draft_id, null);
  host.selectCreationVersion(credential, authorization.request_id, a.draft_id, "viewed");
  const workspace = await host.readCreationWorkspace(credential, { profile_query: null }), projected = workspace.requests[0]!;
  assert.deepEqual(projected.adoptions[0]!.state_ref, selection.state_ref, "adoption uses its actual earlier transition, not the later playback state");
  assert.notEqual(projected.state_ref.sequence, projected.adoptions[0]!.state_ref.sequence);
  assert.equal(projected.adopted_draft_id, b.draft_id); assert.equal(projected.viewed_draft_id, a.draft_id); assert.equal(projected.latest_draft_id, d.draft_id);
  const projectedA = projected.drafts.find(draft => draft.draft_id === a.draft_id)!;
  assert.deepEqual(projectedA.edit_ref, a.edit_ref); assert.deepEqual(projectedA.execution_ref, receiptA.receipt.execution_ref);
  assert.equal(projectedA.renders[0]!.preview.output_hash, receiptA.receipt.preview.output_hash);
  assert.equal(projectedA.renders[0]!.master.qc.status, "passed");
  assert.equal(projectedA.source.kind === "manual" && projectedA.source.raw_text, inputA.raw_text);
  const workspaceText = JSON.stringify(workspace);
  for (const privateField of [root, "original_object_ref", "input_json", "source_refs", "wire_digest", "qc_report"]) assert.equal(workspaceText.includes(privateField), false, privateField);
  const projectedSelection = buildCreationLearningEvent(session, host.readCreationRequest(authorization.request_id), "user-1", { operation_id: "workspace-selection", request_id: authorization.request_id, expected_revision: 2, correction: null, selection: { data_type: "selection", state_ref: projected.adoptions[0]!.state_ref } }, new Date(now()).toISOString());
  assert.ok(JSON.stringify(projectedSelection).includes(b.draft_id));
  await host.close(); await host.open(projectRoot, { requireCreationTimeline: true }); session = (host as any).session;
  assert.deepEqual(await host.readCreationWorkspace(credential, { profile_query: null }), workspace, "workspace is derived from the same saved history and artifacts after reopen");
  console.log("Stage3 manual draft: consecutive same-revision user edits, actual independent audio/caption outputs/QC/reopen, exact learning refs, late model denial, unauthorized-source zero commit, atomic failure and acknowledgement recovery passed (synthetic media; local model fixtures)");
} finally { release(); await host.close(); await rm(root, { recursive: true, force: true }); }
