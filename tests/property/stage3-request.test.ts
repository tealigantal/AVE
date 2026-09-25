import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { assertCreationCommit, beginCreation, cancelCreation, creationDigest, CreationError, reviseCreation, revokeCreation, saveCreationDraft, selectCreationDraft, startCreationRun, validateCreationState, type CreationState, type DraftVersion } from "../../packages/platform/project-host/src/stage3-request.js";

const fixture = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")) as CreationState;
const now = "2026-09-18T01:00:00Z";
const initial = beginCreation(fixture.authorization, 0, now);
const running = startCreationRun(initial, "run-1", 0, "1".repeat(64), null, now);
const ticket = running.active_run!;
const expectCode = (code: string) => (error: unknown) => error instanceof CreationError && error.code === code;
for (const status of ["failed", "paused", "superseded"] as const) {
  assert.throws(() => validateCreationState({ ...running, status }), expectCode("REQUEST_RUN_INVALID"));
  assert.throws(() => assertCreationCommit({ ...running, status, active_run: null }, ticket, 0, null, now), expectCode("REQUEST_RUN_STALE"));
}
const revisionInput = { raw_text: "Keep the ending; make the opening tighter.", base_timeline_version: 0, viewed_timeline_version: null, preserve_refs: ["ending"], created_at: now };
const faster = reviseCreation(running, 1, revisionInput);
const slower = reviseCreation(faster, 2, { ...revisionInput, raw_text: "Actually slower; still keep the ending." });
assert.deepEqual(slower.revisions.map(item => item.raw_text), [fixture.authorization.original_text, revisionInput.raw_text, "Actually slower; still keep the ending."]);
assert.throws(() => assertCreationCommit(slower, ticket, 0, null, now), expectCode("REQUEST_REVISION_STALE"));
assert.throws(() => assertCreationCommit(cancelCreation(running), ticket, 0, null, now), expectCode("REQUEST_CANCELLED"));
assert.throws(() => assertCreationCommit(revokeCreation(running), ticket, 0, null, now), expectCode("REQUEST_REVOKED"));
assert.throws(() => assertCreationCommit(running, ticket, 1, null, now), expectCode("REQUEST_BASE_STALE"));
assert.throws(() => assertCreationCommit(running, ticket, 0, null, fixture.authorization.expires_at), expectCode("REQUEST_EXPIRED"));
assert.throws(() => reviseCreation(faster, 2, { ...revisionInput, preserve_refs: [] }), expectCode("REQUEST_PROTECTION_EXPANSION"));
assert.throws(() => reviseCreation(faster, 1, revisionInput), expectCode("REQUEST_REVISION_STALE"));
assert.throws(() => startCreationRun(cancelCreation(running), "late", 0, "1".repeat(64), null, now), expectCode("REQUEST_CANCELLED"));

const profile = { profile_id: "local", version: 1, consent_generation: 1, deletion_generation: 0, digest: "a".repeat(64) };
const personalized = startCreationRun(initial, "personal", 0, "2".repeat(64), profile, now);
assert.throws(() => assertCreationCommit(personalized, personalized.active_run!, 0, { ...profile, deletion_generation: 1 }, now), expectCode("REQUEST_PROFILE_STALE"));
const draft: DraftVersion = { draft_id: "draft-1", parent_draft_id: null, timeline_version: 1, base_timeline_version: 0, request_id: ticket.request_id, revision: 1, source: { kind: "model", run_id: ticket.run_id, profile: null }, effect_digest: "e".repeat(64), input_digest: ticket.input_digest, edit_ir_id: "ir-1" };
const saved = saveCreationDraft(running, ticket, draft, 0, null, now);
assert.equal(saved.status, "rendering");
assert.equal(saved.latest_draft_id, "draft-1");
assert.equal(saved.viewed_draft_id, null, "new draft must not interrupt playback");
assert.equal(saved.adopted_draft_id, null, "validation is not user adoption");
assert.deepEqual(saveCreationDraft(saved, ticket, draft, 1, null, now), saved, "exact completed replay is idempotent");
assert.throws(() => saveCreationDraft(saved, ticket, { ...draft, effect_digest: "f".repeat(64) }, 1, null, now), expectCode("DRAFT_IDEMPOTENCY_CONFLICT"));
const viewed = selectCreationDraft(saved, "draft-1", "viewed");
assert.equal(viewed.adopted_draft_id, null);
const adopted = selectCreationDraft(viewed, "draft-1", "adopted");
assert.equal(adopted.adopted_draft_id, "draft-1");
assert.equal(creationDigest(saved.drafts), creationDigest(adopted.drafts), "pointers never rewrite a draft");
assert.throws(() => validateCreationState({ ...saved, viewed_draft_id: "absent" }), expectCode("DRAFT_POINTER_INVALID"));
assert.throws(() => validateCreationState({ ...saved, schema_version: 2 }), expectCode("CONTRACT_CREATION_SESSION_INVALID"));
assert.equal(running.drafts.length, 0, "transitions do not mutate their input snapshots");
console.log("Stage3 request revisions, cancellation, protection, profile generations and independent pointers passed (fixtures only)");
