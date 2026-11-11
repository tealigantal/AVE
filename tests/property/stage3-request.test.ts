import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { assertCreationCommit, beginCreation, cancelCreation, creationDigest, creationModelRevisions, CreationError, resolveCreationAmbientRequirement, reviseCreation, revokeCreation, saveCreationDraft, selectCreationDraft, startCreationRun, startCreationLearningRun, validateCreationState, type CreationState, type DraftVersion } from "../../packages/platform/project-host/src/stage3-request.js";
import { validateCreationTransition } from "../../packages/platform/contract-runtime/src/creation-session.mjs";

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

// Old data must remain byte-for-byte unchanged when read or resolved.
const fixtureBefore = JSON.stringify(fixture);
assert.equal(creationDigest(fixture), "6b8ee723af3abf5ab04dc8d7daedbdbcfc32c397d8f14750f351e7764d79e469");
assert.equal(JSON.stringify(creationModelRevisions(fixture)), JSON.stringify(fixture.revisions), "legacy model projection must retain its exact JSON bytes");
assert.equal(creationDigest(creationModelRevisions(fixture)), creationDigest(fixture.revisions));
assert.deepEqual(resolveCreationAmbientRequirement(fixture), { status: "unspecified", action_revision: null });
assert.equal(JSON.stringify(fixture), fixtureBefore);
assert.equal(creationDigest(fixture), "6b8ee723af3abf5ab04dc8d7daedbdbcfc32c397d8f14750f351e7764d79e469");
assert.equal(Object.hasOwn(initial.revisions[0], "ambient_requirement_update"), false);

const ambientInitial = beginCreation(fixture.authorization, 0, now, { version: 1, value: "require" });
assert.deepEqual(resolveCreationAmbientRequirement(ambientInitial), { status: "required", action_revision: 1 });
assert.equal(ambientInitial.revisions[0].raw_text, fixture.authorization.original_text);
const inherited = reviseCreation(ambientInitial, 1, revisionInput);
assert.deepEqual(resolveCreationAmbientRequirement(inherited), { status: "required", action_revision: 1 });
assert.equal(Object.hasOwn(inherited.revisions[1], "ambient_requirement_update"), false);
const cleared = reviseCreation(inherited, 2, { ...revisionInput, ambient_requirement_update: { version: 1, value: "clear" } });
assert.deepEqual(resolveCreationAmbientRequirement(cleared), { status: "cleared", action_revision: 3 });
const clearInherited = reviseCreation(cleared, 3, revisionInput);
assert.deepEqual(resolveCreationAmbientRequirement(clearInherited), { status: "cleared", action_revision: 3 });
const requiredAgain = reviseCreation(clearInherited, 4, { ...revisionInput, ambient_requirement_update: { version: 1, value: "require" } });
const beforeProjection = JSON.stringify(requiredAgain);
const visibleRevisions = creationModelRevisions(requiredAgain);
assert.equal(JSON.stringify(visibleRevisions).includes("ambient_requirement_update"), false);
assert.deepEqual(visibleRevisions.map(item => item.raw_text), requiredAgain.revisions.map(item => item.raw_text));
assert.equal(JSON.stringify(requiredAgain), beforeProjection, "projection never mutates the persisted user actions");
assert.deepEqual(resolveCreationAmbientRequirement(requiredAgain), { status: "required", action_revision: 5 });
assert.deepEqual(resolveCreationAmbientRequirement(cancelCreation(requiredAgain)), { status: "required", action_revision: 5 });
assert.deepEqual(resolveCreationAmbientRequirement(JSON.parse(JSON.stringify(requiredAgain))), { status: "required", action_revision: 5 });
assert.equal(requiredAgain.revisions[4].raw_text, revisionInput.raw_text, "a typed action must not replace or fabricate the user's text");
assert.equal(JSON.stringify(ambientInitial.revisions[0]), JSON.stringify(inherited.revisions[0]), "later revisions do not mutate the original action");
assert.throws(() => reviseCreation(requiredAgain, 4, revisionInput), expectCode("REQUEST_REVISION_STALE"));
for (const invalid of [null, { version: 2, value: "require" }, { version: 1, value: "unknown" }, { version: 1, value: "require", extra: true }]) {
  assert.throws(() => reviseCreation(initial, 1, { ...revisionInput, ambient_requirement_update: invalid } as any), expectCode("CONTRACT_CREATION_SESSION_INVALID"));
}
const tampered = structuredClone(inherited);
tampered.revisions[0].ambient_requirement_update = { version: 1, value: "clear" };
assert.throws(() => validateCreationTransition(ambientInitial, tampered, "metadata"), expectCode("REQUEST_HISTORY_IMMUTABLE"));

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

const learning = startCreationLearningRun(saved, "learn-committed", 1, "a".repeat(64), now);
assert.equal(learning.active_run!.base_timeline_version, 1);
assertCreationCommit(learning, learning.active_run!, 1, null, now);
assert.throws(() => startCreationRun(saved, "generate-stale", 1, "a".repeat(64), null, now), expectCode("REQUEST_BASE_STALE"));
assert.throws(() => startCreationLearningRun(saved, "learn-stale", 2, "a".repeat(64), now), expectCode("REQUEST_BASE_STALE"));
assert.throws(() => assertCreationCommit(learning, learning.active_run!, 2, null, now), expectCode("REQUEST_BASE_STALE"));
