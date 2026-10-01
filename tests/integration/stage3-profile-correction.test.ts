import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { creationDigest } from "../../packages/platform/contract-runtime/src/public.js";
import { ProfileError, ProfileRepository, type ProfileCorrection, type ProfileLearningSource, type ProfileLearningOutcome, type ProfileLearningRegistration } from "../../packages/platform/user-profile-store/src/public.js";

// Actual single-owner SQLite transactions; no external/model semantics claimed.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-correction-")), credential = {};
const now = () => Date.parse("2026-09-24T00:00:00Z"), query = { project_id: "new-project", contexts: ["daily"], except_principle_ids: [] };
const consent = { source_project_ids: ["A", "B", "C"], data_types: ["feedback" as const], retention_until: "2027-01-01T00:00:00Z", external_provider: "fixture", enabled: true };
const code = (expected: string) => (error: unknown) => error instanceof ProfileError && error.code === expected;
const source = (project: string, id: string, correction: ProfileCorrection | null = null): ProfileLearningSource => ({ source_project_id: project, source_event_id: id, content_digest: creationDigest({ project, id, correction }), data_type: "feedback", evidence_refs: [`fact:${id}`], correction_digest: correction === null ? null : creationDigest(correction) });
const outcome = (event: ProfileLearningSource): ProfileLearningOutcome => ({ principles: [{ principle_id: `principle:${event.source_event_id}`, source_project_id: event.source_project_id, source_event_id: event.source_event_id, source_digest: event.content_digest, data_type: event.data_type, dimension: "caption", statement: `PRIVATE_CORRECTION_BODY_${event.source_event_id}`, contexts: ["daily"], exceptions: [], status: "hypothesis", evidence_refs: [...event.evidence_refs], created_at: new Date(now()).toISOString() }], no_inference_reason: null });
const correctionOf = (registration: ProfileLearningRegistration): ProfileCorrection => ({ profile_id: registration.profile_id, predecessors: [{ source_project_id: registration.source_project_id, source_event_id: registration.source_event_id, principle_id: registration.principle_ids[0]!, result_digest: registration.result_digest }] });
const register = async (repository: ProfileRepository, project: string, id: string, correction: ProfileCorrection | null = null) => {
  const event = source(project, id, correction), permit = await repository.prepareLearning(event, "fixture", correction), result = outcome(event);
  return { event, permit, outcome: result, registration: await repository.learn(permit, result) };
};
let repository: ProfileRepository | undefined;
try {
  const directory = resolve(root, "competition"); repository = new ProfileRepository(directory, "user", credential, now);
  await repository.configure(credential, consent);
  const initial = await register(repository, "A", "original"), initialBodies = structuredClone((repository as any).database.read().principles);
  const selected = correctionOf(initial.registration), event = source("B", "replacement", selected), result = outcome(event);
  for (const invalid of [{ ...selected, profile_id: "foreign" }, { ...selected, predecessors: [{ ...selected.predecessors[0]!, result_digest: "0".repeat(64) }] }]) {
    await assert.rejects(repository.prepareLearning(source("B", "invalid", invalid), "fixture", invalid), code(invalid.profile_id === "foreign" ? "PROFILE_CORRECTION_INVALID" : "PROFILE_CORRECTION_REFERENCE_INVALID"));
  }
  const permit = await repository.prepareLearning(event, "fixture", selected);
  const competingEvent = source("C", "competing", selected), competingPermit = await repository.prepareLearning(competingEvent, "fixture", selected);
  const before = await repository.snapshot(query);
  await assert.rejects(repository.learn(permit, { principles: [], no_inference_reason: "No supported replacement." }), code("PROFILE_CORRECTION_NO_SUCCESSOR"));
  assert.deepEqual(await repository.snapshot(query), before, "no-inference cannot silently withdraw a user-selected predecessor");
  assert.equal(await repository.readLearningRegistration(event), null);
  const database = (repository as any).database, write = database.write.bind(database);
  database.write = () => { throw new Error("CORRECTION_WRITE_FAILURE"); };
  await assert.rejects(repository.learn(permit, result), /CORRECTION_WRITE_FAILURE/); database.write = write;
  assert.deepEqual(await repository.snapshot(query), before); assert.equal(database.read().corrections.length, 0);
  let release!: (value: string) => void, sends = 0;
  const late = repository.dispatchLearning(competingPermit, () => { sends++; return { response: new Promise<string>(resolveResponse => { release = resolveResponse; }) }; });
  await repository.control();
  const unrelated = await register(repository, "B", "unrelated");
  database.write = (...args: any[]) => { write(...args); throw new Error("CORRECTION_COMMIT_ACK_FAILURE"); };
  await assert.rejects(repository.learn(permit, result), /CORRECTION_COMMIT_ACK_FAILURE/); database.write = write;
  const registered = await repository.readLearningRegistration(event); assert.ok(registered);
  assert.equal(database.read().corrections.length, 1); assert.deepEqual(database.read().principles[0], initialBodies[0], "old principle and its result digest remain immutable");
  let writes = 0;
  await assert.rejects(repository.withSnapshot(before, () => { writes++; }), code("PROFILE_SNAPSHOT_STALE"));
  await assert.rejects(repository.dispatchLearning(competingPermit, () => { sends++; return { response: Promise.resolve("bad") }; }), code("PROFILE_CORRECTION_CONFLICT"));
  release("already sent response"); assert.equal(await late, "already sent response");
  await assert.rejects(repository.withLearning(competingPermit, () => { writes++; }), code("PROFILE_CORRECTION_CONFLICT"));
  await assert.rejects(repository.learn(competingPermit, outcome(competingEvent)), code("PROFILE_CORRECTION_CONFLICT"));
  assert.equal(writes, 0); assert.equal(sends, 1); assert.equal(await repository.readLearningRegistration(competingEvent), null);
  assert.deepEqual((await repository.snapshot(query)).principles.map(item => item.principle_id).sort(), [result.principles[0]!.principle_id, unrelated.registration.principle_ids[0]!].sort());
  assert.deepEqual(await repository.learn(permit, result), registered);
  const successor = await register(repository, "C", "successor", correctionOf(registered));
  assert.deepEqual(await repository.learn(permit, result), registered, "replaying an already superseded correction returns historical identity without reactivation");
  assert.ok((await repository.snapshot(query)).principles.every(item => ![initial.registration.principle_ids[0], registered.principle_ids[0]].includes(item.principle_id)));
  await repository.configure(credential, { ...consent, source_project_ids: ["B", "C"] });
  assert.deepEqual((await repository.snapshot(query)).principles.map(item => item.principle_id), unrelated.registration.principle_ids, "successor cannot launder source A outside narrowed consent");
  await repository.configure(credential, consent);
  const receipt = await repository.forgetSources(credential, ["A"]);
  assert.deepEqual(receipt.removed_events.map(item => item.source_event_id).sort(), ["original", "replacement", "successor"]);
  assert.deepEqual(receipt.excluded_sources, ["A"], "dependency cleanup does not exclude all of B or C");
  assert.deepEqual((await repository.snapshot(query)).principles.map(item => item.principle_id), unrelated.registration.principle_ids);
  await assert.rejects(repository.prepareLearning(event, "fixture", selected), code("PROFILE_EVENT_EXCLUDED"));
  await assert.rejects(repository.prepareLearning(successor.event, "fixture", successor.permit.correction), code("PROFILE_EVENT_EXCLUDED"));
  await repository.close(); repository = undefined;
  const bytes = await readFile(resolve(directory, "user-profile.sqlite"));
  for (const value of [initial, { outcome: result }, successor]) assert.equal(bytes.includes(Buffer.from(value.outcome.principles[0]!.statement)), false, "dependent reusable body is physically deleted");
  repository = new ProfileRepository(directory, "user", credential, now);
  assert.deepEqual((await repository.snapshot(query)).principles.map(item => item.principle_id), unrelated.registration.principle_ids);
  await assert.rejects(repository.prepareLearning(event, "fixture", selected), code("PROFILE_EVENT_EXCLUDED"));
  await register(repository, "B", "new-unrelated-after-delete");
  await repository.close(); repository = undefined;

  // Forgetting correction B must never resurrect the retained but wrong A.
  const secondDirectory = resolve(root, "forget-correction"); repository = new ProfileRepository(secondDirectory, "user", credential, now);
  await repository.configure(credential, consent);
  const old = await register(repository, "A", "old"), retained = await register(repository, "A", "keep");
  const replacement = await register(repository, "B", "corrected", correctionOf(old.registration));
  const chained = await register(repository, "C", "narrowed", correctionOf(replacement.registration));
  const deletion = await repository.forgetSources(credential, ["B"]);
  assert.deepEqual(deletion.removed_events.map(item => item.source_event_id).sort(), ["corrected", "narrowed"]);
  assert.deepEqual((await repository.snapshot(query)).principles.map(item => item.principle_id), retained.registration.principle_ids);
  await assert.rejects(repository.prepareLearning(chained.event, "fixture", chained.permit.correction), code("PROFILE_EVENT_EXCLUDED"));
  await repository.close(); repository = new ProfileRepository(secondDirectory, "user", credential, now);
  assert.deepEqual((await repository.snapshot(query)).principles.map(item => item.principle_id), retained.registration.principle_ids);
  const persisted = (repository as any).database.read();
  assert.ok(persisted.disabled_principle_ids.includes(old.registration.principle_ids[0])); assert.equal(persisted.corrections.length, 0);
  await assert.rejects(repository.prepareLearning(source("C", "revive", correctionOf(old.registration)), "fixture", correctionOf(old.registration)), code("PROFILE_CORRECTION_CONFLICT"));
  console.log("Stage3 profile correction: immutable predecessors, atomic successors, exact replay, concurrent conflict, stale snapshots, dependency-specific physical forgetting and no resurrection after reopen passed (SQLite fixtures only)");
} finally { await repository?.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
