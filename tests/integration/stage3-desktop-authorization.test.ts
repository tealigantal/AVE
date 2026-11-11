import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { registerMediaAsset, registerAssetLocation } from "../../packages/platform/project-storage/src/public.js";
import { confirmCreationRequest, confirmProfileConsent, confirmProfileDeletion, type CreationConfirmationOptions } from "../../apps/desktop/src/main/ipc/creation-confirmation.js";
import { registerCreationHandlers } from "../../apps/desktop/src/main/ipc/creation.handlers.js";
import { DesktopLifecycleError } from "../../apps/desktop/src/main/project-session-manager.js";
import { creationErrorResult } from "../../apps/desktop/src/main/ipc/creation-errors.js";
import { ModelGatewayError } from "../../packages/platform/model-gateway/src/public.js";
import { CreationError } from "../../packages/platform/contract-runtime/src/public.js";

const cancelled = creationErrorResult("COMMAND_FAILED", new ModelGatewayError("MODEL_CANCELLED", "private transport details", { cause: new CreationError("REQUEST_REVISION_STALE", "private original request") }));
assert.equal(cancelled.error.code, "MODEL_CANCELLED");
assert.match(cancelled.error.message, /已有新的创作要求/);
assert.doesNotMatch(cancelled.error.message, /private/);
assert.equal(creationErrorResult("COMMAND_FAILED", new Error("private transport details")).error.code, "COMMAND_FAILED");
const invalidPlanning = creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_PLANNING_EXCHANGE_INVALID", "private provider response"));
assert.equal(invalidPlanning.error.code, "CREATION_PLANNING_EXCHANGE_INVALID");
assert.match(invalidPlanning.error.message, /没有按当前规划步骤返回有效方案/);
assert.doesNotMatch(invalidPlanning.error.message, /原始返回已保留|private/);
const invalidDecision = creationErrorResult("COMMAND_FAILED", new CreationError("CONTRACT_CREATION_DECISION_INVALID", "private provider response"));
assert.equal(invalidDecision.error.code, "CONTRACT_CREATION_DECISION_INVALID");
assert.match(invalidDecision.error.message, /创作方案不符合当前格式/);
assert.doesNotMatch(invalidDecision.error.message, /原始结果已保留|private/);
for (const [code, expected] of [
  ["PRECISION_FRAME_BOUNDARY_INVALID", /画面帧边界/],
  ["PRECISION_SAMPLE_BOUNDARY_INVALID", /音频采样边界/],
  ["PRECISION_TIME_INEXACT", /时间线与素材边界/],
  ["PRECISION_NO_CHANGE", /没有选择实际修改/],
] as const) {
  const result = creationErrorResult("COMMAND_FAILED", new Error(`${code}: private path or details`));
  assert.equal(result.error.code, code);
  assert.match(result.error.message, expected);
  assert.doesNotMatch(result.error.message, /private/);
}
const nestedPrecision = creationErrorResult("COMMAND_FAILED", new Error("outer", { cause: new Error("PRECISION_FRAME_BOUNDARY_INVALID: private path") }));
assert.equal(nestedPrecision.error.code, "PRECISION_FRAME_BOUNDARY_INVALID");
assert.doesNotMatch(nestedPrecision.error.message, /private/);
const previewTimeout = creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_PREVIEW_TIMEOUT", "private path"));
assert.equal(previewTimeout.error.code, "CREATION_PREVIEW_TIMEOUT");
assert.match(previewTimeout.error.message, /预览.*超时/);
assert.doesNotMatch(previewTimeout.error.message, /private path/);
const masterTimeout = creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_MASTER_TIMEOUT", "private path"));
assert.match(masterTimeout.error.message, /成片.*超时/);
for (const blocker of [new CreationError("CREATION_RENDER_PREFLIGHT_BLOCKED", "BOUNDED_LINEAR_UNVERIFIED"), new Error("RENDER_RESOLVER_BLOCKED:OTHER_BLOCKER,BOUNDED_LINEAR_UNSUPPORTED")]) {
  const result = creationErrorResult("COMMAND_FAILED", blocker);
  assert.match(result.error.message, /低资源模式.*不支持.*剪辑效果/);
  assert.doesNotMatch(result.error.message, /内存不足|耗尽/);
}
assert.doesNotMatch(creationErrorResult("COMMAND_FAILED", new Error("RENDER_RESOLVER_BLOCKED:OTHER_BLOCKER")).error.message, /低资源模式/);
assert.match(creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_PREVIEW_ADAPTATION_UNSUPPORTED", "private detail")).error.message, /低资源预览.*不支持/);
assert.match(creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_PROXY_CACHE_CORRUPT", "private detail")).error.message, /缓存.*完整性/);
assert.match(creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_OBSERVATION_MEMORY_BUDGET_EXCEEDED", "private detail")).error.message, /超过.*预算.*未发送模型请求/);
for (const code of ["MEDIA_IMAGE_RESOURCE_EXHAUSTED", "STILL_PROXY_RESOURCE_EXHAUSTED"]) {
  const result = creationErrorResult("COMMAND_FAILED", new CreationError(code, "private path"));
  assert.equal(result.error.code, code);
  assert.match(result.error.message, /图片.*超过处理预算/);
  assert.doesNotMatch(result.error.message, /private/);
}
assert.match(creationErrorResult("COMMAND_FAILED", new CreationError("MEDIA_IMAGE_PNG_INVALID", "private path")).error.message, /PNG.*完整性/);
assert.match(creationErrorResult("COMMAND_FAILED", new CreationError("MEDIA_IMAGE_PNG_UNSUPPORTED", "private path")).error.message, /PNG.*无法安全保留/);
const noEdit = creationErrorResult("COMMAND_FAILED", new CreationError("CREATION_NO_EDIT", "private model detail"));
assert.equal(noEdit.error.code, "CREATION_NO_EDIT");
assert.match(noEdit.error.message, /未生成新版本/);
assert.match(noEdit.error.message, /补充希望如何调整/);
assert.doesNotMatch(noEdit.error.message, /private/);
const profileDenied = creationErrorResult("COMMAND_FAILED", new CreationError("REQUEST_PROFILE_DATA_DENIED", "private profile detail"));
assert.match(profileDenied.error.message, /仅查看项目/);
assert.match(profileDenied.error.message, /继续制作可播放版本/);
assert.match(profileDenied.error.message, /明确授权档案范围/);
assert.doesNotMatch(profileDenied.error.message, /private/);

// The real desktop path accepts the service terms once, then preserves the
// Host review for every request without repeating a per-request dialog.
const termsRoot = await mkdtemp(resolve(tmpdir(), "ave-creation-terms-"));
try {
  let begun = 0, dialogsShown = 0, active = true;
  const deployment = { endpoint: "https://fixture.invalid", digest: "a".repeat(64) };
  const fakeHost = { prepareCreationRequestAuthorization: () => ({ previous_request_digest: null, deployment }), beginCreationRequest: () => { begun++; return { authorization: { request_id: `request-${begun}` }, sequence: begun }; } } as any;
  const assertActive = () => { if (!active) throw new DesktopLifecycleError("DESKTOP_SESSION_STALE", "session changed"); };
  const input = {} as any;
  await assert.rejects(confirmCreationRequest(fakeHost, {}, input, async () => ({ response: 0 }), assertActive, termsRoot), (error: any) => error.code === "DESKTOP_AUTHORIZATION_CANCELLED");
  assert.equal(begun, 0);
  await confirmCreationRequest(fakeHost, {}, input, async options => { dialogsShown++; assert.equal(options.title, "AVE 使用说明"); return { response: 1 }; }, assertActive, termsRoot);
  await confirmCreationRequest(fakeHost, {}, input, async () => { throw new Error("unexpected repeated dialog"); }, assertActive, termsRoot);
  assert.equal(dialogsShown, 1); assert.equal(begun, 2);
  fakeHost.prepareCreationRequestAuthorization = () => ({ previous_request_digest: null, deployment: { ...deployment, endpoint: "https://different.invalid" } });
  await confirmCreationRequest(fakeHost, {}, input, async () => { dialogsShown++; return { response: 1 }; }, assertActive, termsRoot);
  assert.equal(dialogsShown, 2, "a different receiving service requires a fresh notice");
  const routes = ["vision", "planner", "transcription", "sound"].map(role => ({ role, provider: "fixture", model: `model-${role}`, endpoint: `https://${role}.example.com/v1`, digest: "b".repeat(64) }));
  fakeHost.prepareCreationRequestAuthorization = () => ({ previous_request_digest: null, deployment: { ...deployment, routes } });
  const explicit = { model_deployment_digest: deployment.digest, provider: "ave-split", model: "creation-v1" } as any;
  let explicitDialogs = 0;
  for (let i = 0; i < 2; i++) await confirmCreationRequest(fakeHost, {}, explicit, async options => {
    explicitDialogs++;
    for (const route of routes) { assert.ok(options.detail.includes(route.model)); assert.ok(options.detail.includes(route.endpoint)); }
    assert.doesNotMatch(options.detail, /api_key|secret/);
    return { response: 1 };
  }, assertActive, termsRoot);
  assert.equal(explicitDialogs, 2, "each explicit model selection is confirmed against its immutable routes");
  await assert.rejects(confirmCreationRequest(fakeHost, {}, explicit, async () => ({ response: 0 }), assertActive, termsRoot), (error: any) => error.code === "DESKTOP_AUTHORIZATION_CANCELLED");
  assert.equal(begun, 5, "a declined profile cannot begin a request");
  active = false;
  await assert.rejects(confirmCreationRequest(fakeHost, {}, input, async () => ({ response: 1 }), assertActive, termsRoot), (error: any) => error.code === "DESKTOP_SESSION_STALE");
  assert.equal(begun, 5);
} finally { await rm(termsRoot, { recursive: true, force: true }); }
const audioCause = new CreationError("CREATION_AUDIO_EVIDENCE_INSUFFICIENT", "private source detail");
const ambiguousSound = creationErrorResult("COMMAND_FAILED", new ModelGatewayError("MODEL_OUTPUT_INVALID", "private provider", { cause: new CreationError("CREATION_AUDIO_INTENT_AMBIGUOUS", "private text") }));
assert.match(ambiguousSound.error.message, /分别说明需要保留的声音及其素材/);
assert.doesNotMatch(ambiguousSound.error.message, /private/);
const audioEvidence = creationErrorResult("COMMAND_FAILED", audioCause);
const nestedAudioEvidence = creationErrorResult("COMMAND_FAILED", new ModelGatewayError("MODEL_OUTPUT_INVALID", "private model response", { cause: audioCause }));
assert.equal(audioEvidence.error.code, "CREATION_AUDIO_EVIDENCE_INSUFFICIENT");
assert.equal(nestedAudioEvidence.error.code, "MODEL_OUTPUT_INVALID");
for (const result of [audioEvidence, nestedAudioEvidence]) {
  assert.match(result.error.message, /无法可靠核验.*原素材声音/);
  assert.match(result.error.message, /未生成新版本/);
  assert.match(result.error.message, /已获准素材/);
  assert.match(result.error.message, /调整声音要求/);
  assert.doesNotMatch(result.error.message, /环境声硬性要求|明确取消|private/);
}
const otherDenied = creationErrorResult("COMMAND_FAILED", new CreationError("REQUEST_DATA_DENIED", "private detail"));
assert.equal(otherDenied.error.code, "REQUEST_DATA_DENIED");
assert.doesNotMatch(otherDenied.error.message, /档案|private/);

// Native responses are controlled here; Host/Profile writes use real SQLite.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-authorization-")), credential = {};
let clock = Date.parse("2026-09-24T01:00:00Z"), current = true;
const guard = () => { if (!current) throw new DesktopLifecycleError("DESKTOP_SESSION_STALE", "session changed"); };
const code = (expected: string) => (error: any) => error.code === expected;
const profile = new ProfileRepository(resolve(root, "profile"), "owner", credential, () => clock);
const deployment = { endpoint:"https://planner.example.test/v1",digest:"a".repeat(64),routes:[{role:"planner" as const,provider:"fixture",model:"planner",endpoint:"https://planner.example.test/v1",digest:"b".repeat(64)},{role:"vision" as const,provider:"fixture-vision",model:"vision",endpoint:"https://vision.example.test/v1",digest:"c".repeat(64)},{role:"transcription" as const,provider:"fixture-transcription",model:"transcriber",endpoint:"https://transcription.example.test/v1",digest:"d".repeat(64)},{role:"sound" as const,provider:"fixture-sound",model:"sound",endpoint:"https://sound.example.test/v1",digest:"e".repeat(64)}] };
const host = new ProjectHostSession({ now: () => clock, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "owner" }], modelProvider:{deployment,async complete(){throw new Error("unexpected model call");}} });
const digest = createHash("sha256").update("x").digest("hex"), asset = `asset:sha256:${digest}`;
const { actor_id: _actor, project_id: _project, deployment: _deployment, ...input } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
input.asset_ids = [asset]; input.original_locations = [{ asset_id: asset, asset_location_id: "original-authorized" }]; input.original_text = "  保留原话与空格。  "; input.expires_at = "2027-01-01T00:00:00Z";
const dialogs: CreationConfirmationOptions[] = [];
const approve = async (options: CreationConfirmationOptions) => {
  assert.equal(options.defaultId, 0); assert.equal(options.cancelId, 0); assert.equal(options.noLink, true); assert.equal(options.buttons[0], "取消");
  dialogs.push(options); return { response: 1 };
};
const consent = { source_project_ids: ["history"], data_types: ["feedback" as const], retention_until: "2027-01-01T00:00:00Z", external_provider: "fixture", enabled: true };
try {
  await host.create(resolve(root,"project")); host.initializeCreationTimeline();
  const session = (host as any).session, project = host.status().project;
  const sourcePath = resolve(root, "authorized-source.txt"); await writeFile(sourcePath, "x"); const sourceStat = await stat(sourcePath);
  registerMediaAsset(session, project, { asset_id: asset, algorithm: "sha256", digest, byte_length: 1, stream_facts: {} });
  registerAssetLocation(session, project, { asset_id: asset, asset_location_id: "original-authorized", location_type: "original", location_ref: sourcePath, verified_at: "2026-09-24T01:00:00Z", metadata: { verification_status: "verified", fingerprint: { algorithm: "sha256", digest, byte_length: 1 }, file_stat: { size: sourceStat.size, mtime_ms: sourceStat.mtimeMs } } });
  const states = () => JSON.stringify(session.db.prepare("SELECT * FROM object_refs WHERE object_type='creation_session' ORDER BY object_ref_id").all());
  const initial = states(), preview = host.prepareCreationRequestAuthorization(credential, input);
  clock += 1000; assert.deepEqual(host.prepareCreationRequestAuthorization(credential, input), preview, "stable review excludes incidental current time");
  assert.equal(states(), initial, "preparing review is read-only");
  const terms = resolve(root, "creation-terms");
  await assert.rejects(confirmCreationRequest(host, credential, input, async () => ({ response: 0 }), guard, terms), code("DESKTOP_AUTHORIZATION_CANCELLED"));
  assert.equal(states(), initial);
  await assert.rejects(confirmCreationRequest(host, {}, input, approve, guard, terms), code("REQUEST_CHANNEL_DENIED"));
  await assert.rejects(confirmCreationRequest(host, credential, input, async () => {
    host.applyTimelineCommand({ type: "add_track", track: { track_id: "new-track", kind: "video", clips: [] } }, 0); return { response: 1 };
  }, guard, terms), code("REQUEST_AUTHORIZATION_REVIEW_STALE"));
  assert.equal(states(), initial);
  try {
    await assert.rejects(confirmCreationRequest(host, credential, input, async () => {
      session.db.prepare("UPDATE asset_locations SET location_ref=? WHERE asset_location_id=?").run(resolve(root, "missing-source.txt"), "original-authorized"); return { response: 1 };
    }, guard, resolve(root, "other-terms")), code("CREATION_MATERIAL_LOCATION_STALE"));
    assert.equal(states(), initial);
  } finally { session.db.prepare("UPDATE asset_locations SET location_ref=? WHERE asset_location_id=?").run(sourcePath, "original-authorized"); }
  const expectedWords = input.original_text;
  const accepted = await confirmCreationRequest(host, credential, input, async () => { throw new Error("terms should have been accepted"); }, guard, terms);
  assert.equal(host.readCreationRequest(accepted.request_id).authorization.original_text, expectedWords);
  const authorized = states();
  assert.deepEqual(await confirmCreationRequest(host, credential, input, async () => { throw new Error("duplicate notice"); }, guard, terms), accepted);
  assert.equal(states(), authorized);

  const beforeRenewClock=clock;clock=Date.parse(input.expires_at)+1000;
  const beforeRenew=host.readCreationRequest(accepted.request_id);
  const commands=new Map<string,any>();
  registerCreationHandlers(new Map(),commands,{host,creationCredential:credential,creationTermsDirectory:terms,sessions:{assertCurrent:guard},profile} as any,async () => {throw new Error("unexpected notice");},null as any);
  const renew=commands.get("project.creation.reauthorize"), request={payload:{request_id:accepted.request_id}};
  assert.throws(()=>renew({payload:{...request.payload,expires_at:'2999-01-01T00:00:00Z'}},{},{}),code("DESKTOP_CREATION_INPUT_INVALID"));
  const renewalReceipt=await renew(request,{},{}),afterRenew=host.readCreationRequest(accepted.request_id);
  const {expires_at:oldExpiry,...oldScope}=beforeRenew.authorization,{expires_at:newExpiry,...newScope}=afterRenew.authorization;
  assert.equal(oldExpiry,input.expires_at);assert.equal(newExpiry,new Date(clock+86400000).toISOString());assert.deepEqual(newScope,oldScope,"renewal must preserve the complete original authorization scope");
  assert.equal(renewalReceipt.request_id,accepted.request_id);assert.equal(afterRenew.sequence,beforeRenew.sequence+1);
  assert.deepEqual(afterRenew.drafts,beforeRenew.drafts);assert.deepEqual(afterRenew.model_calls,beforeRenew.model_calls);assert.deepEqual(afterRenew.revisions,beforeRenew.revisions);
  clock=beforeRenewClock;

  const profileInitial = await profile.control();
  for (const invalid of [null, { ...consent, source_project_ids: ["history", "history"] }, { ...consent, invented: true }]) {
    await assert.rejects(confirmProfileConsent(profile, credential, invalid as any, async () => { throw new Error("invalid consent reached native dialog"); }, guard), /PROFILE_CONSENT_INVALID|CONTRACT_CREATOR_PROFILE_INVALID|explicit consent/);
    assert.deepEqual(await profile.control(), profileInitial);
  }
  await assert.rejects(confirmProfileConsent(profile, credential, consent, async () => ({ response: 0 }), guard), code("DESKTOP_AUTHORIZATION_CANCELLED"));
  assert.deepEqual(await profile.control(), profileInitial);
  const consentReview = await profile.prepareConsent(credential, consent);
  const queued = profile.configure(credential, consent, guard, consentReview); current = false;
  await assert.rejects(queued, code("DESKTOP_SESSION_STALE")); current = true;
  assert.deepEqual(await profile.control(), profileInitial, "lifecycle guard executes inside the mutation queue");
  await assert.rejects(confirmProfileConsent(profile, credential, consent, async () => {
    await profile.configure(credential, { ...consent, enabled: false }); return { response: 1 };
  }, guard), code("PROFILE_CONTROL_REVIEW_STALE"));
  const afterStale = await profile.control(); assert.equal(afterStale.version, 1);
  await confirmProfileConsent(profile, credential, consent, approve, guard);
  const beforeDeletion = await profile.control();
  await assert.rejects(confirmProfileDeletion(profile, credential, ["history"], async () => ({ response: 0 }), guard), code("DESKTOP_AUTHORIZATION_CANCELLED"));
  assert.deepEqual(await profile.control(), beforeDeletion);
  const deletionReview = await profile.prepareDeletion(credential, ["history"]);
  const staleDelete = profile.forgetSources(credential, ["history"], guard, deletionReview); current = false;
  await assert.rejects(staleDelete, code("DESKTOP_SESSION_STALE")); current = true;
  assert.deepEqual(await profile.control(), beforeDeletion);
  await assert.rejects(confirmProfileDeletion(profile, credential, ["history"], async () => {
    await profile.configure(credential, { ...consent, enabled: false }); return { response: 1 };
  }, guard), code("PROFILE_CONTROL_REVIEW_STALE"));
  assert.equal((await profile.control()).deletion_generation, beforeDeletion.deletion_generation);
  const deleted = await confirmProfileDeletion(profile, credential, ["history"], approve, guard);
  assert.deepEqual(deleted.excluded_sources, ["history"]); assert.equal(deleted.deletion_generation, beforeDeletion.deletion_generation + 1);
  await assert.rejects(profile.prepareDeletion(credential, ["history", "history"]), code("PROFILE_DELETE_SCOPE_INVALID"));
  await assert.rejects(profile.prepareDeletion(credential, null as any), code("PROFILE_DELETE_SCOPE_INVALID"));
  console.log("Stage3 native authorization: exact input, stale Timeline/source/Profile denials, in-queue lifecycle guard, no duplicate request confirmation and zero unauthorized writes passed");
} finally { await host.close(); await profile.close(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
