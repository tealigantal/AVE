import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createSplitModelProvider, runModel, type ModelInput, type ModelMedia, type ModelRequest, type PreparedModelTransport, type SplitModelConfiguration } from "../../packages/platform/model-gateway/src/public.js";
import { configuredSplitModelProvider, loadModelServices, modelServicesTemplate } from "../../apps/desktop/src/main/model-configuration.js";
import { ProjectHostSession, type ProjectHostOptions } from "../../packages/platform/project-host/src/public.js";
import { validateCreationState } from "../../packages/platform/contract-runtime/src/public.js";
import { confirmCreationRequest } from "../../apps/desktop/src/main/ipc/creation-confirmation.js";

// Controlled HTTP responses exercise real serialized bytes, Host/SQLite and reopen.
// These fixtures are NOT real model quality or the requested real-media checkpoint.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-split-")), exec = promisify(execFile);
const digest = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const time = (value: number, timescale = 10) => ({ schema_version: 1 as const, value, timescale });
const reasons = (e: any): string => [e?.code, e?.message, e?.cause ? reasons(e.cause) : "", ...(e instanceof AggregateError ? e.errors.map(reasons) : [])].join(" ");
const rejects = (value: string) => (e: unknown) => reasons(e).includes(value);
let host: ProjectHostSession | undefined;
try {
  const wav = resolve(root, "input.wav"), png = resolve(root, "input.png"), mov = resolve(root, "input.mov");
  await exec("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=16000:duration=2", "-c:a", "pcm_s16le", wav]);
  await exec("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=black:s=32x32:r=10:d=2", "-frames:v", "1", png]);
  await exec("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=black:s=32x32:r=10:d=2", "-i", wav, "-vf", "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", mov]);
  const media = async (path: string, sample_id: string, mime_type: ModelMedia["mime_type"]): Promise<ModelMedia> => { const bytes = await readFile(path); return { sample_id, mime_type, data_base64: bytes.toString("base64"), content_digest: digest(bytes) }; };
  const image = await media(png, "frame", "image/png"), audio = await media(wav, "audio", "audio/wav");
  const input: ModelInput = { context: { operation: "observe", request: "private-original-request", samples: [
    { sample_id: "frame", kind: "frame", actual_start: time(100), actual_end: time(101) },
    { sample_id: "audio", kind: "audio", actual_start: time(100), actual_end: time(120) },
  ] }, media: [image, audio] };
  let soundCancelled = 0, cancelSound: (() => void) | undefined;
  let fault = "", afterRole: ((role: string) => void) | undefined;
  let reserved: PreparedModelTransport | undefined;
  const sent: string[] = [], audits: any[] = [], wires: any[] = [];
  const response = (value: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } }));
  const fetchFor = (role: string): typeof fetch => async (url, init) => {
    sent.push(role);
    assert.equal(init!.redirect, "error");
    assert.equal(new Headers(init!.headers).get("authorization"), `Bearer fixture-${role}`);
    const bytes = typeof init!.body === "string" ? Buffer.from(init!.body) : Buffer.from(init!.body as ArrayBuffer);
    if (reserved) { assert.equal(reserved.target?.role, role); assert.equal(reserved.wire_digest, digest(bytes)); assert.equal(reserved.input_bytes, bytes.length); }
    if (role === "transcription") {
      assert.ok(String(url).endsWith("/audio/transcriptions"));
      const form = await new Response(bytes, { headers: init!.headers }).formData();
      assert.equal(form.get("model"), "whisper-fixture"); assert.equal(form.get("response_format"), "verbose_json"); assert.deepEqual(form.getAll("timestamp_granularities[]"), ["segment"]);
      const file = form.get("file") as File; assert.equal(file.type, "audio/wav"); assert.match(file.name, /^[A-Za-z0-9_-]+\.wav$/); assert.equal(Buffer.from(await file.arrayBuffer()).toString("ascii", 0, 4), "RIFF");
      assert.equal(form.get("prompt"), null); afterRole?.(role);
      if (fault === "whisper-http") return new Response("fixture failed", { status: 503 });
      if (fault === "whisper-missing") return new Response('{"text":"hello","language":"en","duration":2,"segments":[]}');
      if (fault === "whisper-empty") return new Response('{"text":"","language":"en","duration":2,"segments":[]}');
      return new Response(`{"text":"hello","language":"en","duration":2,"segments":[{"id":0,"start":1e-1,"end":${fault === "whisper-bounds" ? "3" : "0.3"},"text":"hello"}]}`);
    }
    assert.ok(String(url).endsWith("/chat/completions"));
    const wire = JSON.parse(bytes.toString()); wires.push({ role, wire });
    assert.equal("max_tokens" in wire, false); assert.equal(bytes.includes(Buffer.from("fixture-" + role)), false);
    if (role !== "planner") { assert.equal(bytes.includes(Buffer.from("private-original-request")), false); assert.equal(wire.messages[0].content.length, 3); }
    if (role === "vision") assert.equal(wire.messages[0].content[2].type, "image_url");
    if (role === "sound") { assert.equal(wire.messages[0].content[2].type, "input_audio"); assert.ok(wire.messages[0].content[2].input_audio.data.startsWith("data:audio/wav;base64,")); assert.deepEqual(wire.modalities, ["text"]); }
    afterRole?.(role);
    if (role === "sound" && fault === "sound-http") return new Response("fixture failed", { status: 401 });
    if (role === "sound" && fault === "sound-stream-cancel") return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[],"usage":{"prompt_tokens":8,"completion_tokens":9,"total_tokens":17}}\n\n')); },
      pull() { setImmediate(() => cancelSound?.()); },
      cancel() { soundCancelled++; }
    }));
    if (role === "planner" && fault === "generate") {
      const context = JSON.parse(wire.messages[0].content), span = context.source_spans[0];
      assert.ok(span.observations.some((o: any) => o.text?.includes("steady tone") || o.description?.includes("steady tone")) || JSON.stringify(span.observations).includes("steady tone"));
      return response({ thesis: "Controlled single-source protocol draft", shots: [{ shot_id: "black", source: { span_id: span.span_id, asset_id: span.asset_id, start: time(0), end: time(20) }, purpose: "protocol verification", embedded_gain_db: 0, reframe: null, color: null }], audio: [], captions: [], preserve_refs: context.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: context.request.revisions.at(-1).raw_text, change_summary: "Controlled protocol draft" });
    }
    const content = role === "planner" ? { planned: true } : role === "vision" && fault === "vision-transcript" ? { description: "frame", uncertain: true, transcript: "invented" } : { description: role === "vision" ? "black frame" : "steady tone, no words inferred", uncertain: true };
    return role === "sound" ? new Response(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: JSON.stringify(content) }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } })}\n\ndata: [DONE]\n\n`) : response(content);
  };
  const chat = (role: string) => ({ provider: role, model: `${role}-fixture`, base_url: `http://127.0.0.1:1234/${role}/v1`, api_key: `fixture-${role}`, response_mode: "json" as const, structured_output: "validated_json" as const, fetch_impl: fetchFor(role) });
  const configuration: SplitModelConfiguration = { vision: chat("vision"), transcription: { ...chat("transcription"), model: "whisper-fixture" }, sound: { ...chat("sound"), response_mode: "sse", audio_input: "data-url", text_output_only: true }, planner: chat("planner") };
  const provider = createSplitModelProvider(configuration);
  const request: ModelRequest = { request_id: "split", provider: "ave-split", model: "creation-v1", prompt_version: "test", privacy_class: "internal", structured_output: true, input,
    dispatch: (send, transport) => { reserved = transport; return send().response; }, on_call_audit: value => { audits.push(value); } };
  const result = await runModel(request, provider);
  assert.deepEqual(sent, ["vision", "transcription", "sound"]); assert.equal(audits.length, 3);
  assert.deepEqual((result.output as any).samples[1].transcript, [{ start: time(101), end: time(103), text: "hello" }]);
  assert.equal(result.token_usage, undefined, "do not misattribute final child usage to the whole run");
  assert.equal(audits[1].token_usage, undefined, "Whisper's missing token count remains unknown");
  for (const [mode, expected, count] of [["whisper-bounds", "outside the actual", 2], ["whisper-missing", "no segment timestamps", 2], ["whisper-http", "Whisper HTTP 503", 2], ["sound-http", "HTTP 401", 3], ["vision-transcript", "no invented transcript", 1]] as const) {
    fault = mode; sent.length = audits.length = 0;
    await assert.rejects(runModel(request, provider), rejects(expected)); assert.equal(sent.length, count); assert.equal(audits.length, count); assert.ok("code" in audits.at(-1));
  }
  fault = "whisper-empty"; sent.length = 0;
  const empty = await runModel(request, provider); assert.deepEqual((empty.output as any).samples[1].transcript, []); assert.equal(sent.at(-1), "sound");
  fault = ""; sent.length = 0;
  const abort = new AbortController(); afterRole = role => { if (role === "vision") abort.abort(new Error("revised intent")); };
  await assert.rejects(runModel({ ...request, signal: abort.signal }, provider), rejects("MODEL_CANCELLED")); await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(sent, ["vision"]); afterRole = undefined;
  sent.length = 0;
  const planned = await runModel({ ...request, input: { context: { observations: result.output }, media: [] } }, provider);
  assert.deepEqual(planned.output, { planned: true }); assert.deepEqual(sent, ["planner"]); assert.ok(JSON.stringify(wires.at(-1)).includes("steady tone"));
  assert.notEqual(provider.deployment.digest, createSplitModelProvider({ ...configuration, sound: { ...configuration.sound, model: "another-model" } }).deployment.digest);
  assert.equal(JSON.stringify(provider.deployment).includes("fixture-sound"), false);

  // User configuration is local and disabled by default. Invalid enabled files do
  // not silently select the legacy environment provider or print secret content.
  const configPath = resolve(root, "settings", "model-services.json");
  assert.deepEqual(await loadModelServices(configPath, {}), {}); const template = JSON.parse(await readFile(configPath, "utf8")); assert.deepEqual(template, modelServicesTemplate);
  const local = { ...structuredClone(template), enabled: true } as any;
  for (const role of ["vision", "transcription", "sound"]) { local[role].base_url = "http://127.0.0.1:9000/v1"; local[role].api_key = ""; }
  assert.equal(configuredSplitModelProvider(local).name, "ave-split");
  assert.throws(() => configuredSplitModelProvider({ ...local, planner: null }), rejects("planner"));
  const missing = structuredClone(local); missing.sound.base_url = "https://remote.invalid/v1";
  assert.throws(() => configuredSplitModelProvider(missing), rejects("sound.api_key"));
  await writeFile(configPath, '{"api_key":"never-print-this-secret"');
  await assert.rejects(loadModelServices(configPath, {}), e => rejects("not valid JSON")(e) && !reasons(e).includes("never-print-this-secret"));
  await assert.rejects(loadModelServices(configPath, { AVE_MODEL_CONFIG: resolve(root, "missing.json") }), rejects("does not exist"));
  await writeFile(configPath, JSON.stringify(template));
  assert.deepEqual(await loadModelServices(configPath, { AVE_MODEL_PROVIDER: "legacy" }), {});

  // Real Host pipeline: each sample's physical calls settle before the next send.
  reserved = undefined; sent.length = 0; const credential = {};
  const options: ProjectHostOptions = { now: () => Date.parse("2026-09-24T01:00:00Z"), provider: "ave-split", model: "creation-v1", modelProvider: provider, creationRequestChannels: [{ credential, actor_id: "owner" }], creationModelPolicy: { max_attempts: 1, timeout_ms: 30000 }, creationObservationPolicy: { scene_threshold: 12, max_frame_edge: 64, max_samples: 20, timeout_seconds: 30 } };
  host = new ProjectHostSession(options); const project = resolve(root, "project"); await host.create(project); host.initializeCreationTimeline();
  const imported = (await host.importMedia([mov]))[0] as any;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { provider: "ave-split", model: "creation-v1", asset_ids: [imported.asset_id], allowed_data: ["request", "evidence", "frames", "audio", "timeline", "transcript"] });
  const begin = async (id: string) => {
    await confirmCreationRequest(host!, credential, { ...authorization, request_id: id }, async dialog => { for (const route of provider.deployment.routes) { assert.ok(dialog.detail.includes(route.role)); assert.ok(dialog.detail.includes(route.endpoint)); } assert.equal(dialog.detail.includes("fixture-sound"), false); return { response: 1 }; }, () => {});
    await host!.prepareCreationMaterial(credential, { operation_id: `material-${id}`, request_id: id, asset_id: imported.asset_id, asset_location_id: imported.asset_location_id });
  };
  const observe = (id: string) => host!.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: [`material-${id}`], include_audio: true });
  await begin("success"); const observed = await observe("success"), success = host.readCreationRequest("success");
  assert.ok(success.model_calls.length > 3); assert.equal(success.model_calls.length, sent.length);
  assert.deepEqual(success.model_calls.map(c => c.attempt), success.model_calls.map((_, i) => i + 1));
  assert.ok(success.model_calls.every(c => c.settlement?.status === "response" && c.target?.sample_id));
  assert.equal(success.model_calls.find(c => c.target?.role === "transcription")!.settlement!.usage, null);
  assert.ok(success.model_calls.filter(c => c.target?.role === "vision").every(c => c.settlement!.usage?.total === 7));
  const wrong = structuredClone(success); wrong.authorization.deployment!.routes![1]!.role = "vision";
  assert.throws(() => validateCreationState(wrong), rejects("REQUEST_CALL_TARGET_DENIED"));
  assert.equal((host.readTimelineSnapshot() as any).version, 0);
  await host.close(); host = new ProjectHostSession(options); await host.open(project);
  assert.deepEqual(host.readCreationRequest("success").model_calls, success.model_calls); assert.equal(host.readCreationObservation(observed.ref.run_id).object_hash, observed.object_hash);
  const session = () => (host as any).session;
  const count = () => session().db.prepare("SELECT COUNT(*) n FROM object_refs WHERE object_type='creation_observation'").get().n;
  for (const mode of ["whisper-http", "sound-http", "whisper-bounds"]) {
    await begin(mode); fault = mode; const before = count(); sent.length = 0;
    await assert.rejects(observe(mode), rejects(mode === "whisper-http" ? "Whisper HTTP 503" : mode === "sound-http" ? "HTTP 401" : "outside the actual")); fault = "";
    const failed = host.readCreationRequest(mode); assert.equal(failed.status, "failed"); assert.equal(failed.drafts.length, 0); assert.equal(failed.active_run, null); assert.equal(failed.model_calls.length, sent.length); assert.equal(failed.model_calls.at(-1)!.settlement!.status, "failed"); assert.ok(failed.model_calls.slice(0, -1).every(c => c.settlement?.status === "response")); assert.equal(count(), before); assert.equal((host.readTimelineSnapshot() as any).version, 0);
  }
  await begin("cancel"); sent.length = 0; const before = count(); afterRole = () => host!.cancelCreationRequest(credential, "cancel");
  await assert.rejects(observe("cancel"), rejects("cancel")); afterRole = undefined; await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 1); assert.equal(count(), before); assert.equal(host.readCreationRequest("cancel").status, "cancelled");
  await begin("known-usage-cancel"); fault = "sound-stream-cancel"; sent.length = 0;
  cancelSound = () => host!.cancelCreationRequest(credential, "known-usage-cancel");
  await assert.rejects(observe("known-usage-cancel"), rejects("MODEL_CANCELLED")); fault = ""; cancelSound = undefined;
  const cancelledCalls = host.readCreationRequest("known-usage-cancel").model_calls;
  assert.equal(cancelledCalls.at(-1)!.target!.role, "sound"); assert.equal(cancelledCalls.at(-1)!.settlement!.status, "cancelled");
  assert.deepEqual(cancelledCalls.at(-1)!.settlement!.usage, { input: 8, output: 9, total: 17 }); assert.equal(soundCancelled, 1);
  assert.equal(cancelledCalls.length, sent.length); assert.equal(count(), before);
  // Corrupted fusion proof cannot pass merely because the final output exists.
  session().db.exec("BEGIN IMMEDIATE");
  try {
    const row = session().db.prepare("SELECT metadata_json FROM model_runs WHERE model_run_id=?").get(observed.ref.run_id), metadata = JSON.parse(row.metadata_json);
    metadata.audit.composition.parts[0].output.description = "invented replacement";
    session().db.prepare("UPDATE model_runs SET metadata_json=? WHERE model_run_id=?").run(JSON.stringify(metadata), observed.ref.run_id);
    assert.throws(() => host!.readCreationObservation(observed.ref.run_id), rejects("CREATION_SPLIT_PROOF_INVALID"));
  } finally { session().db.exec("ROLLBACK"); }
  fault = "generate";
  const draft = await host.generateCreationDraft(credential, { request_id: "success", expected_revision: 1, observation_refs: [observed.ref], profile_query: null }); fault = "";
  assert.equal(draft.state.model_calls.at(-1)!.target!.role, "planner");
  assert.equal((host.readTimelineSnapshot() as any).version, 1);
  const savedTimeline = host.readTimelineSnapshot();
  await host.close(); host = new ProjectHostSession(options); await host.open(project);
  assert.deepEqual(host.readTimelineSnapshot(), savedTimeline); assert.equal(host.readCreationRequest("success").latest_draft_id, draft.draft_id);
  console.log("Stage3 split services: exact multipart bytes, image/audio isolation, RationalTime alignment, separate call settlements, cancellation, failures without publication, configuration and Host reopen passed (controlled responses only)");
} finally { await host?.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
