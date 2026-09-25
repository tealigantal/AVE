import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { registerMediaAsset } from "../../packages/platform/project-storage/src/public.js";
import { confirmCreationRequest, confirmProfileConsent, confirmProfileDeletion, type CreationConfirmationOptions } from "../../apps/desktop/src/main/ipc/creation-confirmation.js";
import { DesktopLifecycleError } from "../../apps/desktop/src/main/project-session-manager.js";

// Native responses are controlled here; Host/Profile writes use real SQLite.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-authorization-")), credential = {};
let clock = Date.parse("2026-09-24T01:00:00Z"), current = true;
const guard = () => { if (!current) throw new DesktopLifecycleError("DESKTOP_SESSION_STALE", "session changed"); };
const code = (expected: string) => (error: any) => error.code === expected;
const profile = new ProfileRepository(resolve(root, "profile"), "owner", credential, () => clock);
const host = new ProjectHostSession({ now: () => clock, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "owner" }] });
const asset = `asset:sha256:${"a".repeat(64)}`;
const { actor_id: _actor, project_id: _project, deployment: _deployment, ...input } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
input.asset_ids = [asset]; input.original_text = "  保留原话与空格。  "; input.expires_at = "2027-01-01T00:00:00Z";
const dialogs: CreationConfirmationOptions[] = [];
const approve = async (options: CreationConfirmationOptions) => {
  assert.equal(options.defaultId, 0); assert.equal(options.cancelId, 0); assert.equal(options.noLink, true); assert.equal(options.buttons[0], "取消");
  dialogs.push(options); return { response: 1 };
};
const consent = { source_project_ids: ["history"], data_types: ["feedback" as const], retention_until: "2027-01-01T00:00:00Z", external_provider: "fixture", enabled: true };
try {
  await host.create(resolve(root,"project")); host.initializeCreationTimeline();
  const session = (host as any).session, project = host.status().project;
  registerMediaAsset(session, project, { asset_id: asset, algorithm: "sha256", digest: "a".repeat(64), byte_length: 1, stream_facts: {} });
  const states = () => JSON.stringify(session.db.prepare("SELECT * FROM object_refs WHERE object_type='creation_session' ORDER BY object_ref_id").all());
  const initial = states(), preview = host.prepareCreationRequestAuthorization(credential, input);
  clock += 1000; assert.deepEqual(host.prepareCreationRequestAuthorization(credential, input), preview, "stable review excludes incidental current time");
  assert.equal(states(), initial, "preparing review is read-only");
  await assert.rejects(confirmCreationRequest(host, credential, input, async () => ({ response: 0 }), guard), code("DESKTOP_AUTHORIZATION_CANCELLED"));
  assert.equal(states(), initial);
  await assert.rejects(confirmCreationRequest(host, {}, input, approve, guard), code("REQUEST_CHANNEL_DENIED"));
  assert.equal(dialogs.length, 0);
  await assert.rejects(confirmCreationRequest(host, credential, input, async options => {
    await approve(options); host.applyTimelineCommand({ type: "add_track", track: { track_id: "new-track", kind: "video", clips: [] } }, 0); return { response: 1 };
  }, guard), code("REQUEST_AUTHORIZATION_REVIEW_STALE"));
  assert.equal(states(), initial);
  await assert.rejects(confirmCreationRequest(host, credential, input, async () => {
    session.db.prepare("UPDATE media_assets SET byte_length=2 WHERE asset_id=?").run(asset); return { response: 1 };
  }, guard), code("REQUEST_AUTHORIZATION_REVIEW_STALE"));
  assert.equal(states(), initial);
  await assert.rejects(confirmCreationRequest(host, credential, input, async () => { current = false; return { response: 1 }; }, guard), code("DESKTOP_SESSION_STALE"));
  assert.equal(states(), initial); current = true;
  await assert.rejects(confirmCreationRequest(host, credential, input, async () => {
    queueMicrotask(() => queueMicrotask(() => { current = false; })); return { response: 1 };
  }, guard), code("DESKTOP_SESSION_STALE"));
  assert.equal(states(), initial, "closing between native helper completion and outer continuation cannot authorize"); current = true;
  const expectedWords = input.original_text;
  const accepted = await confirmCreationRequest(host, credential, input, async options => {
    await approve(options); assert.ok(options.detail.includes(expectedWords)); assert.ok(options.detail.includes(input.provider)); assert.ok(!options.detail.includes("上限"));
    input.original_text = "changed after dialog opened"; return { response: 1 };
  }, guard);
  assert.equal(host.readCreationRequest(accepted.request_id).authorization.original_text, expectedWords);
  input.original_text = expectedWords;
  const dialogCount = dialogs.length, authorized = states();
  assert.deepEqual(await confirmCreationRequest(host, credential, input, async () => { throw new Error("duplicate native authorization"); }, guard), accepted);
  assert.equal(states(), authorized); assert.equal(dialogs.length, dialogCount);

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
