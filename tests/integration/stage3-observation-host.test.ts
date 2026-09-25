import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession, type ProjectHostOptions } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider, type ModelInput } from "../../packages/platform/model-gateway/src/public.js";
import { creationDigest } from "../../packages/platform/contract-runtime/src/public.js";
import { listOrphanObjects, readObjectSync, putObjectSync } from "../../packages/platform/project-storage/src/public.js";

// Actual source bytes, scene detection, sampling, Host transactions and reopen.
// The HTTP response below is a fixture, never evidence of model understanding.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-observation-")), run = promisify(execFile), credential = {};
const now = () => Date.parse("2026-09-24T01:00:00Z");
let host: ProjectHostSession | undefined, sends = 0, capturedInput: ModelInput, mutate: ((output: any) => void) | undefined, afterSend: (() => void) | undefined;
let capturedContext: any;
const adapter = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  sends += 1;
  const wire = JSON.parse(init!.body as string), content = wire.messages[0].content; capturedContext = JSON.parse(content[0].text);
  assert.ok(content.some((item: any) => item.type === "image_url" && item.image_url.url.startsWith("data:image/png;base64,")));
  assert.ok(content.some((item: any) => item.type === "input_audio" && item.input_audio.data.startsWith("data:audio/wav;base64,")));
  const output = { samples: capturedContext.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: sample.kind === "frame" ? "Controlled synthetic frame" : "Controlled synthetic tone", uncertain: true, transcript: [] })) };
  mutate?.(output); afterSend?.();
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const options: ProjectHostOptions = { now, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "qwen", model: "fixture-model", modelProvider: { ...adapter, complete: request => { capturedInput = structuredClone(request.input); return adapter.complete(request); } },
  creationModelPolicy: {   max_attempts: 1, timeout_ms: 30000 },
  creationObservationPolicy: { scene_threshold: 10, max_frame_edge: 64, max_samples: 20, timeout_seconds: 30 } };
const causes = (error: any): string => [error?.code, error?.message, error?.cause ? causes(error.cause) : "", ...(error instanceof AggregateError ? error.errors.map(causes) : [])].join(" ");
const rejects = (code: string) => (error: unknown) => causes(error).includes(code);
const rename = fs.renameSync;
try {
  const source = resolve(root, "black-white.mov");
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:r=10:d=3", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3", "-vf", "drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='gte(t,1)',setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", source]);
  host = new ProjectHostSession(options); await host.create(resolve(root, "project")); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = (await host.importMedia([source]))[0] as any;
  const session = () => (host as any).session;
  const fixture = JSON.parse(fs.readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8"));
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = fixture.authorization;
  Object.assign(authorization, { provider: "qwen", model: "fixture-model", asset_ids: [imported.asset_id], allowed_data: ["request", "evidence", "frames", "audio"] });
  const begin = async (id: string, allowed = authorization.allowed_data) => {
    host!.beginCreationRequest(credential, { ...authorization, request_id: id, allowed_data: allowed });
    await host!.prepareCreationMaterial(credential, { operation_id: `material-${id}`, request_id: id, asset_id: imported.asset_id, asset_location_id: imported.asset_location_id });
  };
  const observe = (id: string) => host!.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: [`material-${id}`], include_audio: true });
  const publicationCounts = () => ["model_runs", "evidence_records"].map(table => session().db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n).concat(session().db.prepare("SELECT COUNT(*) n FROM object_refs WHERE object_type IN ('creation_observation','creation_sample')").get().n);
  const noOrphans = async () => assert.deepEqual(await listOrphanObjects(session(), session().projectDirectory), [], "failed publication cannot leave unreferenced private model or sample files");

  await begin("success"); const receipt = await observe("success");
  assert.equal(sends, 1); assert.equal(receipt.value.materials[0]!.scan.spans.length, 2);
  assert.deepEqual(receipt.value.spans.map(span => [span.start.value / span.start.timescale, span.end.value / span.end.timescale]), [[0, 1], [1, 3]], "actual pixel changes give unequal candidate spans");
  assert.equal(receipt.value.samples.length, 8); assert.equal(receipt.value.evidence_refs.length, 6, "tone has no invented transcript");
  const state = host.readCreationRequest("success");
  assert.equal(state.status, "received"); assert.equal(state.active_run, null); assert.equal(state.drafts.length, 0); assert.equal(state.model_calls[0]!.settlement!.status, "response");
  assert.equal((host.readTimelineSnapshot() as any).version, 0);
  for (const sample of receipt.value.samples) {
    assert.deepEqual(fs.readFileSync(sample.sample.path), readObjectSync(session().projectDirectory, sample.sample.content_digest));
    if (sample.sample.detail.kind === "frame") assert.equal(sample.sample.actual_end.value / sample.sample.actual_end.timescale - sample.sample.actual_start.value / sample.sample.actual_start.timescale < 0.101, true);
  }
  assert.deepEqual(await readdir(resolve(root, "project", "temp")), []);
  assert.equal(JSON.stringify(capturedContext).includes(root.replaceAll("\\", "\\\\")), false);
  await noOrphans();
  host.reviseCreationRequest(credential, "success", 1, { raw_text: "A new intent must keep prior observation readable", viewed_timeline_version: null, preserve_refs: [] });
  host.cancelCreationRequest(credential, "success", true);
  assert.equal(host.readCreationObservation(receipt.ref.run_id).object_hash, receipt.object_hash);
  await host.close(); host = new ProjectHostSession(options); await host.open(resolve(root, "project"));
  assert.equal(host.readCreationObservation(receipt.ref.run_id).object_hash, receipt.object_hash);

  await begin("denied", ["request", "evidence", "frames"]); const beforeDenied = sends;
  await assert.rejects(observe("denied"), rejects("REQUEST_DATA_DENIED")); assert.equal(sends, beforeDenied);
  await begin("visual-transcript"); const beforeInvalid = publicationCounts();
  mutate = output => { output.samples[0].transcript = [{ start: { schema_version: 1, value: 0, timescale: 10 }, end: { schema_version: 1, value: 1, timescale: 10 }, text: "Invented words from a frame" }]; };
  await assert.rejects(observe("visual-transcript"), rejects("CREATION_OBSERVATION_VISUAL_TRANSCRIPT_FORBIDDEN")); mutate = undefined;
  assert.deepEqual(publicationCounts(), beforeInvalid); assert.equal(host.readCreationRequest("visual-transcript").drafts.length, 0); await noOrphans();

  await begin("atomic-failure"); const beforeFailure = publicationCounts(), evidenceCount = beforeFailure[1];
  session().db.exec(`CREATE TEMP TRIGGER fail_observation BEFORE INSERT ON evidence_records WHEN (SELECT COUNT(*) FROM evidence_records)=${evidenceCount + 1} BEGIN SELECT RAISE(ABORT, 'INJECTED_SECOND_EVIDENCE_FAILURE'); END`);
  await assert.rejects(observe("atomic-failure"), rejects("INJECTED_SECOND_EVIDENCE_FAILURE"));
  assert.deepEqual(publicationCounts(), beforeFailure); assert.equal(host.readCreationRequest("atomic-failure").model_calls[0]!.settlement!.status, "response", "sent response accounting survives publication rollback");
  assert.equal(host.readCreationRequest("atomic-failure").status, "failed"); await noOrphans(); session().db.exec("DROP TRIGGER fail_observation");

  await begin("rename-failure"); const beforeRename = publicationCounts(); let faultHit = false;
  afterSend = () => {
    const digest = creationDigest(capturedInput);
    fs.renameSync = ((from: fs.PathLike, to: fs.PathLike) => { rename(from, to); if (String(to).endsWith(digest)) { faultHit = true; throw new Error("INJECTED_AFTER_OBJECT_RENAME"); } }) as typeof fs.renameSync;
    syncBuiltinESMExports();
  };
  try { await assert.rejects(observe("rename-failure"), rejects("INJECTED_AFTER_OBJECT_RENAME")); }
  finally { fs.renameSync = rename; syncBuiltinESMExports(); afterSend = undefined; }
  assert.equal(faultHit, true); assert.deepEqual(publicationCounts(), beforeRename); await noOrphans();
  const allFiles = await readdir(resolve(root, "project", "objects", "sha256"), { recursive: true });
  assert.equal(allFiles.some(path => path.includes(".tmp-")), false, "failed object write releases its temporary file");

  await begin("cancel-response"); const beforeCancel = publicationCounts(); afterSend = () => host!.cancelCreationRequest(credential, "cancel-response");
  await assert.rejects(observe("cancel-response"), rejects("cancel")); afterSend = undefined;
  assert.deepEqual(publicationCounts(), beforeCancel); assert.equal(host.readCreationRequest("cancel-response").status, "cancelled"); await noOrphans();

  const sampleRef = receipt.value.samples[0]!.object_ref_id;
  session().db.exec("BEGIN IMMEDIATE");
  try { session().db.prepare("DELETE FROM object_refs WHERE object_ref_id=?").run(sampleRef); assert.throws(() => host!.readCreationObservation(receipt.ref.run_id), /CREATION_OBSERVATION_REFERENCE_INVALID/); }
  finally { session().db.exec("ROLLBACK"); }
  assert.equal(host.readCreationObservation(receipt.ref.run_id).object_hash, receipt.object_hash);
  // Real bytes remain intact: metadata corruption must fail before any paid send.
  const port = (host as any).workerPort, submit = port.submit.bind(port);
  for (const fault of ["audio-time", "frame-index", "frame-width", "scan-threshold"] as const) {
    await begin(fault); const beforeFault: number = sends, beforeRows = publicationCounts(); let injected = false;
    port.submit = async (task: string, payload: any, control: any) => {
      const result = await submit(task, payload, control);
      if (injected || result.status !== "succeeded") return result;
      if (fault === "scan-threshold" && task === "media.scene_scan.v1") { result.outputs[0].threshold += 1; injected = true; }
      if (task === "media.sample.v1") {
        const sample = result.outputs.find((item: any) => item.detail.kind === (fault === "audio-time" ? "audio" : "frame"));
        if (sample && fault !== "scan-threshold") {
          if (fault === "audio-time") sample.actual_start = { schema_version: 1, value: sample.actual_start.value * sample.detail.sample_rate / sample.actual_start.timescale + 1, timescale: sample.detail.sample_rate };
          else if (fault === "frame-index") sample.detail.frame_index += 1;
          else sample.detail.width += 1;
          injected = true;
        }
      }
      return result;
    };
    try { await assert.rejects(observe(fault), rejects(fault === "scan-threshold" ? "CREATION_OBSERVATION_SCAN_REBOUND" : fault === "audio-time" ? "CREATION_OBSERVATION_AUDIO_REBOUND" : "CREATION_OBSERVATION_FRAME_REBOUND")); }
    finally { port.submit = submit; }
    assert.equal(injected, true); assert.equal(sends, beforeFault); assert.deepEqual(publicationCounts(), beforeRows); assert.equal(host.readCreationRequest(fault).model_calls.length, 0); await noOrphans();
  }
  await begin("cancel-cleanup"); const beforeCleanup = sends;
  port.submit = async (task: string, payload: any, control: any) => {
    const result = await submit(task, payload, control);
    if (task !== "media.sample.v1") return result;
    host!.cancelCreationRequest(credential, "cancel-cleanup");
    return { status: "failed", outputs: [], diagnostics: [{ code: "CANCELLED", message: "fixture cancellation" }, { code: "EIO", message: "INJECTED_WORKER_CLEANUP_FAILURE" }] };
  };
  try { await assert.rejects(observe("cancel-cleanup"), error => causes(error).includes("REQUEST_CANCELLED") && causes(error).includes("INJECTED_WORKER_CLEANUP_FAILURE")); }
  finally { port.submit = submit; }
  assert.equal(sends, beforeCleanup); await noOrphans();

  // Change only the published timestamp with recomputed object hash. The original
  // model input and accounting remain intact; exact descriptor binding rejects it.
  const moved = structuredClone(receipt.value), firstFrame = moved.samples.find(item => item.sample.detail.kind === "frame")!.sample;
  firstFrame.actual_start.value += 1; firstFrame.actual_end.value += 1;
  const tamperedBytes = Buffer.from(JSON.stringify(moved)), tampered = putObjectSync(session().projectDirectory, tamperedBytes);
  session().db.exec("BEGIN IMMEDIATE");
  try {
    session().db.prepare("INSERT INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?,?,?,?)").run(tampered.hash, tampered.path, tamperedBytes.length, new Date(now()).toISOString());
    session().db.prepare("UPDATE object_refs SET object_hash=? WHERE object_type='creation_observation' AND relation_key=?").run(tampered.hash, receipt.ref.run_id);
    assert.throws(() => host!.readCreationObservation(receipt.ref.run_id), /CREATION_OBSERVATION_INPUT_REBOUND/);
  } finally { session().db.exec("ROLLBACK"); fs.rmSync(tampered.path); }
  session().db.exec("BEGIN IMMEDIATE");
  try {
    const row = session().db.prepare("SELECT metadata_json FROM model_runs WHERE model_run_id=?").get(receipt.ref.run_id), metadata = JSON.parse(row.metadata_json);
    metadata.audit.token_usage.input += 1;
    session().db.prepare("UPDATE model_runs SET metadata_json=? WHERE model_run_id=?").run(JSON.stringify(metadata), receipt.ref.run_id);
    assert.throws(() => host!.readCreationObservation(receipt.ref.run_id), /CREATION_OBSERVATION_AUDIT_REBOUND/);
  } finally { session().db.exec("ROLLBACK"); }
  assert.equal(host.readCreationObservation(receipt.ref.run_id).object_hash, receipt.object_hash);
  const active = host.readCreationRequest("rename-failure");
  assert.equal(active.active_run, null);
  console.log("Stage3 observation: actual unequal scene spans, real PNG/WAV wire, exact sampled coverage, atomic publication failures, rename cleanup, permissions, cancellation and historical reopen passed (HTTP fixture only)");
} finally { fs.renameSync = rename; syncBuiltinESMExports(); await host?.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
