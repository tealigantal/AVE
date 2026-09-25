import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession, type ProjectHostOptions } from "../../packages/platform/project-host/src/public.js";
import { registerMediaAsset, readCreationLearningAttempt, readCreationLearningResult, readCreationLearningModelResult } from "../../packages/platform/project-storage/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import { createDeepSeekProvider } from "../../packages/platform/model-gateway/src/public.js";
import type { CreationLearningInput } from "../../packages/platform/project-host/src/stage3-learning.js";

// Actual Host, counted adapter and two SQLite owners; response semantics are fixtures.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-learning-host-")), credential = {};
const now = () => Date.parse("2026-09-24T00:00:00Z"), profile = new ProfileRepository(resolve(root, "profile"), "profile", credential, now);
let sends = 0, mode = "principle", afterSend: (() => void) | undefined;
const wires: any[] = [];
const provider = createDeepSeekProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: [] }], fetch_impl: async (_url, init) => {
  sends++; const context = JSON.parse(JSON.parse(init!.body as string).messages[0].content); wires.push(context);
  const output = mode === "no-inference" ? { principles: [], no_inference_reason: "Insufficient preference evidence." } : { principles: [{ dimension: "caption", statement: "Keep literal captions for this daily context.", contexts: ["daily"], exceptions: ["explicit poetic request"], evidence_refs: [mode === "invalid" ? "invented" : context.learning_event.facts[0].fact_id] }], no_inference_reason: null };
  afterSend?.();
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) }, finish_reason: "stop" }], usage: { prompt_tokens: 70, completion_tokens: 40, total_tokens: 110 } }));
} });
const options: ProjectHostOptions = { now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "user" }], provider: "deepseek", model: "fixture-model", modelProvider: provider, creationModelPolicy: {   max_attempts: 1, timeout_ms: 10000 } };
let host = new ProjectHostSession(options);
const session = () => (host as any).session;
const input = (id: string): CreationLearningInput => ({ operation_id: id, request_id: id, expected_revision: 1, correction: null, selection: { data_type: "history_reference", timeline_version: 0, observation_refs: [], raw_text: "学习我认可的这个历史版本。" } });
const code = (expected: string) => (error: any) => error.code === expected;
try {
  await host.create(resolve(root, "project"));
  const projectId = session().manifest.project_id, asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "a".repeat(64), byte_length: 1n });
  registerMediaAsset(session(), projectId, { asset_id: asset, algorithm: "sha256", digest: "a".repeat(64), byte_length: 1, stream_facts: {} });
  host.initializeTimeline([{ track_id: "main", kind: "video", clips: [{ clip_id: "shot", source: { asset_id: asset, start_pts: 0n, end_pts: 60n, timescale: 30n }, timeline_start: 0n, timeline_duration: 60n }] }], { sequence_id: "sequence", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { provider: "deepseek", model: "fixture-model", asset_ids: [asset], allowed_data: ["request", "timeline", "evidence", "transcript"], expires_at: "2027-01-01T00:00:00Z" });
  const begin = (id: string) => host.beginCreationRequest(credential, { ...authorization, request_id: id });
  const consent = { source_project_ids: [projectId], data_types: ["history_reference" as const], retention_until: "2027-01-01T00:00:00Z", external_provider: "deepseek", enabled: true };
  const source = (id: string) => readCreationLearningAttempt(session(), projectId, id).value.permit.source;
  const workspace = () => host.readCreationWorkspace(credential, { profile_query: { contexts: ["daily"], except_principle_ids: [] } });
  const projectedLearning = async (id: string) => (await workspace()).requests.find(item => item.state_ref.request_id === id)!.learning[0]!;
  begin("unconfigured"); await assert.rejects(host.learnCreationExperience(credential, input("unconfigured")), code("PROFILE_LEARNING_DENIED")); assert.equal(sends, 0);
  assert.equal(readCreationLearningAttempt(session(), projectId, "unconfigured"), null);
  await profile.configure(credential, consent);
  const before = host.readTimelineSnapshot();
  begin("normal"); const learned = await host.learnCreationExperience(credential, input("normal"));
  assert.equal(sends, 1); assert.equal(learned.registration.principle_ids.length, 1); assert.equal(host.readCreationRequest("normal").status, "received");
  assert.deepEqual(host.readTimelineSnapshot(), before); assert.equal(host.readCreationRequest("normal").latest_draft_id, null);
  assert.deepEqual(await host.learnCreationExperience(credential, input("normal")), learned); assert.equal(sends, 1);
  await assert.rejects(host.learnCreationExperience(credential, { ...input("normal"), selection: { ...input("normal").selection as any, raw_text: "changed selection" } }), code("CREATION_LEARNING_SOURCE_REBOUND")); assert.equal(sends, 1);

  mode = "no-inference"; begin("no-inference"); const noInference = await host.learnCreationExperience(credential, input("no-inference"));
  assert.deepEqual(noInference.registration.principle_ids, []); assert.equal(noInference.registration.no_inference_reason, "Insufficient preference evidence.");
  mode = "invalid"; begin("invalid"); await assert.rejects(host.learnCreationExperience(credential, input("invalid")), (error: any) => error.code === "MODEL_OUTPUT_INVALID");
  assert.equal(await profile.readLearningRegistration(source("invalid")), null); assert.equal(readCreationLearningResult(session(), projectId, "invalid"), null);
  const invalidSends = sends; await assert.rejects(host.learnCreationExperience(credential, input("invalid")), code("CREATION_LEARNING_RESPONSE_UNAVAILABLE")); assert.equal(sends, invalidSends);
  mode = "principle";

  begin("double-disk-failure");
  const failedDb = session().db, failedExec = failedDb.exec.bind(failedDb);
  failedExec("CREATE TEMP TRIGGER fail_model_response BEFORE INSERT ON model_runs BEGIN SELECT RAISE(ABORT, 'INJECTED_MODEL_RESPONSE_FAILURE'); END");
  failedDb.exec = (sql: string) => {
    if (sql === "COMMIT" && host.readCreationRequest("double-disk-failure").status === "failed") throw new Error("INJECTED_FAILED_STATE_FAILURE");
    return failedExec(sql);
  };
  await assert.rejects(host.learnCreationExperience(credential, input("double-disk-failure")), (error: any) => error instanceof AggregateError && error.errors.some((cause: Error) => cause.message.includes("INJECTED_MODEL_RESPONSE_FAILURE")) && error.errors.some((cause: Error) => cause.message.includes("INJECTED_FAILED_STATE_FAILURE")));
  failedDb.exec = failedExec; failedExec("DROP TRIGGER fail_model_response");
  assert.equal(host.readCreationRequest("double-disk-failure").status, "adjusting", "failed cleanup leaves the original run visible");
  const beforeDoubleFailureRetry = sends;
  await assert.rejects(host.learnCreationExperience(credential, input("double-disk-failure")), code("CREATION_LEARNING_RESPONSE_UNAVAILABLE"));
  assert.equal(sends, beforeDoubleFailureRetry); assert.equal(await profile.readLearningRegistration(source("double-disk-failure")), null);

  // The response is durable before extraction publication: rollback can recover
  // from the exact saved bytes, without starting another external invocation.
  begin("project-write-fail");
  session().db.exec("CREATE TEMP TRIGGER fail_learning BEFORE INSERT ON project_events WHEN NEW.event_type='creation.learning.extracted' BEGIN SELECT RAISE(ABORT, 'INJECTED_LEARNING_PUBLICATION_FAILURE'); END");
  await assert.rejects(host.learnCreationExperience(credential, input("project-write-fail")), /INJECTED_LEARNING_PUBLICATION_FAILURE/);
  assert.equal(readCreationLearningResult(session(), projectId, "project-write-fail"), null); assert.ok(readCreationLearningModelResult(session(), projectId, "project-write-fail"));
  assert.equal(await profile.readLearningRegistration(source("project-write-fail")), null);
  session().db.exec("DROP TRIGGER fail_learning"); const sendsBeforeRecovery = sends;
  await host.learnCreationExperience(credential, input("project-write-fail")); assert.equal(sends, sendsBeforeRecovery);

  const database = (profile as any).database, write = database.write.bind(database);
  begin("profile-write-fail"); database.write = () => { throw new Error("INJECTED_PROFILE_WRITE_FAILURE"); };
  await assert.rejects(host.learnCreationExperience(credential, input("profile-write-fail")), /INJECTED_PROFILE_WRITE_FAILURE/);
  const pending = readCreationLearningResult(session(), projectId, "profile-write-fail"); assert.ok(pending); assert.equal(await profile.readLearningRegistration(source("profile-write-fail")), null);
  const pendingView = await projectedLearning("profile-write-fail");
  assert.equal(pendingView.response_saved, true); assert.equal(pendingView.extraction!.digest, pending.object_hash); assert.equal(pendingView.registration!.state, "unregistered");
  database.write = write; await host.close(); host = new ProjectHostSession(options); await host.open(resolve(root, "project"));
  const beforeProfileRetry = sends; const recovered = await host.learnCreationExperience(credential, input("profile-write-fail"));
  assert.deepEqual(recovered.result, pending.value); assert.equal(sends, beforeProfileRetry);
  assert.equal((await projectedLearning("profile-write-fail")).registration!.state, "registered");

  begin("profile-ack"); database.write = (...args: any[]) => { write(...args); throw new Error("INJECTED_PROFILE_ACK_FAILURE"); };
  await assert.rejects(host.learnCreationExperience(credential, input("profile-ack")), /INJECTED_PROFILE_ACK_FAILURE/);
  database.write = write; const ackRegistration = await profile.readLearningRegistration(source("profile-ack")); assert.ok(ackRegistration);
  assert.equal((await projectedLearning("profile-ack")).registration!.state, "registered", "actual committed registration is visible despite failed acknowledgement");
  const beforeProfileAckRetry = sends; assert.deepEqual((await host.learnCreationExperience(credential, input("profile-ack"))).registration, ackRegistration); assert.equal(sends, beforeProfileAckRetry);

  begin("project-ack"); const db = session().db, exec = db.exec.bind(db); let injected = false;
  db.exec = (sql: string) => {
    const result = exec(sql);
    if (sql === "COMMIT" && !injected && db.prepare("SELECT 1 FROM object_refs WHERE object_type='creation_learning_result' AND relation_key='project-ack'").get()) { injected = true; throw new Error("INJECTED_PROJECT_ACK_FAILURE"); }
    return result;
  };
  await assert.rejects(host.learnCreationExperience(credential, input("project-ack")), /INJECTED_PROJECT_ACK_FAILURE/); db.exec = exec;
  assert.equal(injected, true); assert.ok(readCreationLearningResult(session(), projectId, "project-ack")); assert.equal(await profile.readLearningRegistration(source("project-ack")), null);
  const beforeProjectAckRetry = sends; await host.learnCreationExperience(credential, input("project-ack")); assert.equal(sends, beforeProjectAckRetry);

  // A queued profile write must check Host state at execution, not enqueue time.
  const learn = profile.learn.bind(profile);
  for (const action of ["cancel", "revise", "close"] as const) {
    const id = `queued-${action}`; begin(id);
    let entered!: () => void, release!: () => void;
    const admission = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    (profile as any).learn = async (...args: any[]) => { entered(); await gate; return (learn as any)(...args); };
    const work = host.learnCreationExperience(credential, input(id));
    const rejected = assert.rejects(work, code(action === "cancel" ? "REQUEST_CANCELLED" : action === "revise" ? "REQUEST_REVISION_STALE" : "REQUEST_PROJECT_CLOSED"));
    await admission;
    let closing: Promise<void> | undefined, closed = false;
    if (action === "cancel") host.cancelCreationRequest(credential, id);
    else if (action === "revise") host.reviseCreationRequest(credential, id, 1, { raw_text: "new intent", viewed_timeline_version: 0, preserve_refs: [] });
    else { closing = host.close().then(() => { closed = true; }); await new Promise(resolve => setImmediate(resolve)); assert.equal(closed, false); }
    const fixedSource = source(id); release(); await rejected; await closing;
    (profile as any).learn = learn;
    assert.equal(await profile.readLearningRegistration(fixedSource), null);
    if (action === "close") await host.open(resolve(root, "project"));
    assert.ok(readCreationLearningResult(session(), projectId, id), "completed project extraction remains historical");
  }

  begin("concurrent"); let releasePrepare!: () => void, prepared!: () => void;
  const prepare = profile.prepareLearning.bind(profile), enteredPrepare = new Promise<void>(resolve => { prepared = resolve; }), prepareGate = new Promise<void>(resolve => { releasePrepare = resolve; });
  profile.prepareLearning = async (...args) => { prepared(); await prepareGate; return prepare(...args); };
  const concurrent = host.learnCreationExperience(credential, input("concurrent")); await enteredPrepare;
  await assert.rejects(host.learnCreationExperience(credential, input("concurrent")), code("REQUEST_RUN_ACTIVE"));
  releasePrepare(); await concurrent; profile.prepareLearning = prepare;

  begin("delete-after-extraction"); (profile as any).learn = async (...args: any[]) => { await profile.forgetSources(credential, [projectId]); return (learn as any)(...args); };
  await assert.rejects(host.learnCreationExperience(credential, input("delete-after-extraction")), code("PROFILE_GENERATION_STALE")); (profile as any).learn = learn;
  const beforeDeletionRetry = sends; await assert.rejects(host.learnCreationExperience(credential, input("delete-after-extraction")), code("PROFILE_GENERATION_STALE")); assert.equal(sends, beforeDeletionRetry);
  assert.equal((await profile.snapshot({ project_id: "held-out", contexts: ["daily"], except_principle_ids: [] })).principles.length, 0);
  const forgottenWorkspace = await workspace();
  assert.equal(forgottenWorkspace.profile!.snapshot.principles.length, 0);
  assert.ok(forgottenWorkspace.requests.flatMap(item => item.learning).every(item => item.registration!.state === "excluded"));
  assert.equal(JSON.stringify(forgottenWorkspace).includes("Keep literal captions for this daily context."), false, "project extraction cannot refill the forgotten profile body");
  assert.equal((await projectedLearning("normal")).extraction !== null, true, "historical project extraction remains truthful without reusable profile content");
  assert.equal(sends, beforeDeletionRetry, "workspace reads do not resend or register anything");
  assert.deepEqual(host.readTimelineSnapshot(), before); assert.ok(wires.every(wire => wire.learning_event && !wire.profile));
  console.log("Stage3 learning Host: scoped extraction, durable response/result, no-inference, both commit acknowledgements, reopen, cancel/revise/close, deletion and zero-resend recovery passed (model fixtures only)");
} finally { await host.close(); await profile.close(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
