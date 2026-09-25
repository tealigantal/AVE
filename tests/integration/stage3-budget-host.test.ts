import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { ProjectHostSession, type ProjectHostOptions } from "../../packages/platform/project-host/src/public.js";
import { registerMediaAsset } from "../../packages/platform/project-storage/src/public.js";
import { createDeepSeekProvider } from "../../packages/platform/model-gateway/src/public.js";
import { creationDigest } from "../../packages/platform/contract-runtime/src/public.js";
import { CreationError, type CreationState } from "../../packages/platform/project-host/src/stage3-request.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-budget-")), credential = {}, now = () => Date.parse("2026-09-20T01:00:00Z");
const profileDirectory = await mkdtemp(resolve(tmpdir(), "ave-stage3-budget-profile-"));
const profile = new ProfileRepository(profileDirectory, "budget-profile", credential, now);
let host: ProjectHostSession | undefined;
let sends = 0, firstFails = true, deferred: ((response: Response) => void) | undefined;
const wireInputs: unknown[] = [];
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("HOST_OPERATION_DID_NOT_FINISH")), 3000); })]); }
  finally { clearTimeout(timer); }
}
const response = (input = 5, output = 3) => new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage: { prompt_tokens: input, completion_tokens: output, total_tokens: input + output } }));
const provider = createDeepSeekProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: [] }], fetch_impl: async (_url, init) => {
  sends += 1;
  wireInputs.push(JSON.parse(JSON.parse(init!.body as string).messages[0].content));
  if (firstFails) { firstFails = false; return new Response("fixture unavailable", { status: 503 }); }
  if (deferred) return new Promise<Response>(resolveResponse => { deferred = resolveResponse; });
  return response();
} });
const options: ProjectHostOptions = { now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "deepseek", model: "fixture-model", modelProvider: provider,
  creationModelPolicy: {   max_attempts: 2, timeout_ms: 30000 } };
const payload = { context: { request: "fixture exact serialized request" }, media: [] }, inputHash = creationDigest(payload);
const code = (expected: string) => (error: unknown) => error instanceof CreationError && error.code === expected;
try {
  host = new ProjectHostSession(options); await host.create(root); host.initializeTimeline([]);
  const session = (host as any).session, asset = `asset:sha256:${"a".repeat(64)}`;
  registerMediaAsset(session, session.manifest.project_id, { asset_id: asset, algorithm: "sha256", digest: "a".repeat(64), byte_length: 100, stream_facts: {} });
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = (JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")) as CreationState).authorization;
  Object.assign(authorization, { provider: "deepseek", model: "fixture-model", asset_ids: [asset] });
  const begin = (id: string) => host!.beginCreationRequest(credential, { ...authorization, request_id: id });
  const prepare = (id: string) => (host as any).prepareCreationRun(id, inputHash, null);
  const invoke = (ticket: any) => (host as any).runCreationModel(ticket, payload, ["request"], null, () => {});
  begin("retry"); await invoke(prepare("retry"));
  const retry = host.readCreationRequest("retry");
  assert.equal(sends, 2); assert.equal(retry.model_calls.length, 2);
  assert.equal(retry.model_calls[0].settlement!.usage, null);
  assert.equal(retry.model_calls[0].settlement!.cost, null);
  assert.equal(retry.model_calls[1].settlement!.cost, null);
  host.reviseCreationRequest(credential, "retry", 1, { raw_text: "revision preserves prior calls", viewed_timeline_version: null, preserve_refs: [] });
  await invoke(prepare("retry")); assert.equal(sends, 3); assert.equal(host.readCreationRequest("retry").model_calls.length, 3);
  await host.close(); host = new ProjectHostSession(options); await host.open(root);
  host.reviseCreationRequest(credential, "retry", 2, { raw_text: "reopen preserves prior calls", viewed_timeline_version: null, preserve_refs: [] });
  await invoke(prepare("retry")); assert.equal(sends, 4); assert.equal(host.readCreationRequest("retry").model_calls.length, 4);

  begin("late"); deferred = () => {};
  const late = invoke(prepare("late"));
  while (sends < 5) await new Promise(resolveTurn => setImmediate(resolveTurn));
  host.reviseCreationRequest(credential, "late", 1, { raw_text: "new intent must survive late accounting", viewed_timeline_version: null, preserve_refs: [] });
  const lateRejected = assert.rejects(late, (error: any) => error.code === "MODEL_CANCELLED");
  await bounded(lateRejected);
  const afterLate = host.readCreationRequest("late");
  assert.equal(afterLate.status, "received"); assert.equal(afterLate.revisions.at(-1)!.raw_text, "new intent must survive late accounting");
  assert.equal(afterLate.model_calls[0].settlement!.usage, null); assert.equal(afterLate.model_calls[0].settlement!.reason_code, "REQUEST_REVISION_STALE");
  assert.equal(afterLate.model_calls[0].settlement!.cost, null); assert.equal(afterLate.drafts.length, 0);
  const complete = deferred!; deferred = undefined; complete(response()); await new Promise(resolveTurn => setImmediate(resolveTurn));
  assert.deepEqual(host.readCreationRequest("late"), afterLate, "detached late response cannot write into a superseding request");

  begin("fixed-input"); const mutable = structuredClone(payload), fields = ["request"], fixedTicket = prepare("fixed-input");
  const fixed = (host as any).runCreationModel(fixedTicket, mutable, fields, null, () => {});
  mutable.context.request = "not authorized"; fields[0] = "profile"; fixedTicket.input_digest = "b".repeat(64);
  await fixed;
  assert.deepEqual(wireInputs.at(-1), payload.context); assert.equal(host.readCreationRequest("fixed-input").model_calls[0].input_digest, inputHash);

  begin("disk"); const diskTicket = prepare("disk"), activeSession = (host as any).session, before = sends;
  activeSession.db.exec("CREATE TEMP TRIGGER fail_dispatch BEFORE INSERT ON project_events WHEN NEW.event_type='creation.state.saved' BEGIN SELECT RAISE(ABORT, 'INJECTED_DISPATCH_STORAGE_FAILURE'); END");
  await assert.rejects(invoke(diskTicket), (error: any) => error instanceof AggregateError && error.errors.some((cause: Error) => cause.message.includes("INJECTED_DISPATCH_STORAGE_FAILURE")));
  assert.equal(sends, before); assert.equal(host.readCreationRequest("disk").model_calls.length, 0); assert.equal((host.readTimelineSnapshot() as any).version, 0);
  activeSession.db.exec("DROP TRIGGER fail_dispatch");

  const snapshot = await profile.snapshot({ project_id: session.manifest.project_id, contexts: ["fixture"], except_principle_ids: [] });
  const identity = { profile_id: snapshot.profile_id, version: snapshot.version, consent_generation: snapshot.consent_generation, deletion_generation: snapshot.deletion_generation, digest: snapshot.digest };
  const originalVerify = profile.withSnapshot.bind(profile);
  begin("revise-after-verify");
  (profile as any).withSnapshot = async (value: any, action: any) => {
    const result = await originalVerify(value, action);
    host!.reviseCreationRequest(credential, "revise-after-verify", 1, { raw_text: "new intent after final gate", viewed_timeline_version: null, preserve_refs: [] });
    return result;
  };
  await assert.rejects((host as any).runCreationModel((host as any).prepareCreationRun("revise-after-verify", inputHash, identity), payload, ["request"], snapshot, () => {}), code("REQUEST_REVISION_STALE"));
  assert.equal(host.readCreationRequest("revise-after-verify").status, "received");
  assert.equal(host.readCreationRequest("revise-after-verify").revisions.at(-1)!.raw_text, "new intent after final gate");
  (profile as any).withSnapshot = originalVerify;

  begin("close-during-verify");
  let releaseVerify!: () => void, enteredVerify!: () => void;
  const verifyGate = new Promise<void>(resolve => { releaseVerify = resolve; }), entered = new Promise<void>(resolve => { enteredVerify = resolve; });
  (profile as any).withSnapshot = async (value: any, action: any) => { enteredVerify(); await verifyGate; return originalVerify(value, action); };
  const verifying = (host as any).runCreationModel((host as any).prepareCreationRun("close-during-verify", inputHash, identity), payload, ["request"], snapshot, () => {});
  const verifyRejected = assert.rejects(verifying, code("REQUEST_PROJECT_CLOSED"));
  await bounded(entered);
  let closed = false; const closing = host.close().then(() => { closed = true; });
  await new Promise(resolveTurn => setImmediate(resolveTurn)); assert.equal(closed, false, "close must wait for final Host validation and failure persistence");
  releaseVerify(); await bounded(Promise.all([closing, verifyRejected]));
  (profile as any).withSnapshot = originalVerify;
  await host.open(root); assert.equal(host.readCreationRequest("close-during-verify").status, "failed");
  assert.equal(host.readCreationRequest("late").model_calls[0].settlement!.reason_code, "REQUEST_REVISION_STALE");

  begin("close-uncooperative"); deferred = () => {}; const beforeCloseSend = sends;
  const hanging = invoke(prepare("close-uncooperative"));
  const hangingRejected = assert.rejects(hanging, (error: any) => error.code === "MODEL_CANCELLED" && error.cause?.code === "REQUEST_PROJECT_CLOSED");
  while (sends === beforeCloseSend) await new Promise(resolveTurn => setImmediate(resolveTurn));
  await bounded(Promise.all([host.close(), hangingRejected]));
  await host.open(root);
  const afterClose = host.readCreationRequest("close-uncooperative");
  assert.equal(afterClose.model_calls[0].settlement!.reason_code, "REQUEST_PROJECT_CLOSED"); assert.equal(afterClose.model_calls[0].settlement!.usage, null);
  assert.equal(afterClose.model_calls[0].settlement!.cost, null);
  const oldResponse = deferred!; deferred = undefined; oldResponse(response()); await new Promise(resolveTurn => setImmediate(resolveTurn));
  assert.deepEqual(host.readCreationRequest("close-uncooperative"), afterClose, "old provider cannot update reopened project");

  begin("deployment-bound");
  await host.close();
  const changedProvider = createDeepSeekProvider({ api_key: "fixture-only", base_url: "https://other.fixture.invalid", models: [{ model: "fixture-model", media_types: [] }], fetch_impl: async () => { sends++; return response(); } });
  host = new ProjectHostSession({ ...options, modelProvider: changedProvider }); await host.open(root);
  const beforeDeploymentSend = sends;
  await assert.rejects(invoke(prepare("deployment-bound")), code("REQUEST_DEPLOYMENT_CHANGED"));
  assert.equal(sends, beforeDeploymentSend); assert.equal(host.readCreationRequest("deployment-bound").model_calls.length, 0); assert.equal((host.readTimelineSnapshot() as any).version, 0);
  await host.close(); host = new ProjectHostSession({ ...options, creationModelPolicy: { ...options.creationModelPolicy!, timeout_ms: 30 } }); await host.open(root);
  begin("timeout"); deferred = () => {};
  await bounded(assert.rejects(invoke(prepare("timeout")), (error: any) => error.code === "MODEL_CANCELLED" && error.cause?.code === "MODEL_TIMEOUT"));
  await host.close(); await host.open(root);
  const timedOut = host.readCreationRequest("timeout");
  assert.equal(timedOut.model_calls[0].settlement!.status, "failed"); assert.equal(timedOut.model_calls[0].settlement!.reason_code, "MODEL_TIMEOUT");
  assert.equal(timedOut.model_calls[0].settlement!.usage, null); assert.equal(timedOut.model_calls[0].settlement!.cost, null);
  const timedOutResponse = deferred!; deferred = undefined; timedOutResponse(response()); await new Promise(resolveTurn => setImmediate(resolveTurn));
  assert.deepEqual(host.readCreationRequest("timeout"), timedOut); assert.equal((host.readTimelineSnapshot() as any).version, 0);
  console.log("Stage3 actual adapter → Host reservation/settlement: retry/revision/reopen audit, late accounting and zero-send storage faults passed (local HTTP fixtures, no network)");
} finally { await host?.close(); await profile.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
