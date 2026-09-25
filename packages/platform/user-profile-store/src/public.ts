import type { CreatorProfileStoreV1 } from "../../../../contracts/generated/typescript/editorial/creator-profile-store.v1.js";
import { assertCreatorProfileStoreV1, creationDigest } from "../../contract-runtime/src/public.js";
import { openUserProfileDatabase } from "../../project-storage/src/public.js";

export type ProfileConsent = NonNullable<CreatorProfileStoreV1["consent"]>;
export type EditingPrinciple = CreatorProfileStoreV1["principles"][number];
export type ProfileGeneration = Readonly<{ profile_id: string; version: number; consent_generation: number; deletion_generation: number }>;
export type ProfileQuery = Readonly<{ project_id: string; contexts: readonly string[]; except_principle_ids: readonly string[] }>;
export type ProfileSnapshot = Readonly<ProfileGeneration & { digest: string; mode: "unconfigured" | "disabled" | "empty" | "no_match" | "personalized"; query: ProfileQuery; principles: readonly EditingPrinciple[]; external_provider: string | null }>;
export type ProfileDeletionReceipt = Readonly<ProfileGeneration & { excluded_sources: readonly string[]; removed_events: readonly ProfileEventIdentity[]; removed_principles: number; removed_event_keys: number; derived_indexes: 0; reusable_caches: 0 }>;
export type ProfileConsentReview = Readonly<{ generation: ProfileGeneration; consent: ProfileConsent; previous_consent: ProfileConsent | null; review_digest: string }>;
export type ProfileDeletionReview = Readonly<{ generation: ProfileGeneration; source_project_ids: readonly string[]; removed_events: readonly ProfileEventIdentity[]; removed_principle_ids: readonly string[]; review_digest: string }>;
type LearningRecord = CreatorProfileStoreV1["processed_events"][number];
type ProfileEventIdentity = CreatorProfileStoreV1["excluded_events"][number];
export type ProfileCorrection = Readonly<CreatorProfileStoreV1["corrections"][number]["correction"]>;
export type ProfileLearningSource = Readonly<Pick<LearningRecord, "source_project_id" | "source_event_id" | "content_digest" | "data_type" | "evidence_refs" | "correction_digest">>;
export type ProfileLearningPermit = Readonly<{ profile_id: string; consent_generation: number; deletion_generation: number; provider: string; source: ProfileLearningSource; correction: ProfileCorrection | null }>;
export type ProfileLearningOutcome = Readonly<{ principles: readonly EditingPrinciple[]; no_inference_reason: string | null }>;
export type ProfileLearningRegistration = Readonly<LearningRecord & { profile_id: string }>;
export type ProfileWorkspaceRegistration = Readonly<ProfileEventIdentity & (
  | { state: "registered"; result_digest: string; registered_version: number; principle_ids: readonly string[]; outcome: "principles" | "no_inference" }
  | { state: "unregistered"; result_digest: null; registered_version: null }
  | { state: "excluded"; reason: "source_forgotten" | "event_forgotten"; result_digest: null; registered_version: null }
)>;
export type ProfileWorkspace = Readonly<{
  consent: ProfileConsent | null;
  snapshot: ProfileSnapshot;
  correction_predecessors: readonly ProfileCorrection["predecessors"][number][];
  registrations: readonly ProfileWorkspaceRegistration[];
}>;
type ProfileDatabase = { read(): CreatorProfileStoreV1; write(expectedVersion: number, state: CreatorProfileStoreV1): void; close(): void };

export class ProfileError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "ProfileError"; }
}
function fail(code: string, message: string): never { throw new ProfileError(code, message); }
const generation = (state: CreatorProfileStoreV1): ProfileGeneration => ({ profile_id: state.profile_id, version: state.version, consent_generation: state.consent_generation, deletion_generation: state.deletion_generation });
const equal = (left: unknown, right: unknown) => creationDigest(left) === creationDigest(right);
const eventKey = (event: ProfileEventIdentity): string => JSON.stringify([event.source_project_id, event.source_event_id]);
export function assertProfileCorrection(value: unknown): asserts value is ProfileCorrection | null {
  if (value === null) return;
  const correction = value as ProfileCorrection;
  const text = (item: unknown) => typeof item === "string" && item.trim().length > 0;
  if (!correction || typeof correction !== "object" || Object.keys(correction).sort().join(",") !== "predecessors,profile_id" || !text(correction.profile_id) || !Array.isArray(correction.predecessors) || !correction.predecessors.length || correction.predecessors.some(ref => !ref || Object.keys(ref).sort().join(",") !== "principle_id,result_digest,source_event_id,source_project_id" || !text(ref.source_project_id) || !text(ref.source_event_id) || !text(ref.principle_id) || typeof ref.result_digest !== "string" || !/^[a-f0-9]{64}$/.test(ref.result_digest)) || new Set(correction.predecessors.map(ref => ref.principle_id)).size !== correction.predecessors.length) fail("PROFILE_CORRECTION_INVALID", "correction requires exact distinct user-selected predecessor identities");
}

/** Electron Main owns one repository per user. Hosts never receive its database handle. */
export class ProfileRepository {
  private readonly database: ProfileDatabase;
  private tail: Promise<void> = Promise.resolve();
  private closing: Promise<void> | undefined;
  private admissionClosed = false;
  private closed = false;
  constructor(directory: string, private readonly profileId: string, private readonly credential: object, private readonly now: () => number = Date.now) {
    if (!profileId.trim() || !credential || typeof credential !== "object") fail("PROFILE_OWNER_INVALID", "profile identity and trusted user channel required");
    this.database = openUserProfileDatabase(directory, { schema_version: 1, profile_id: profileId, version: 0, consent_generation: 0, deletion_generation: 0, consent: null, principles: [], excluded_sources: [], processed_events: [], corrections: [], disabled_principle_ids: [], excluded_events: [] }) as ProfileDatabase;
  }
  private serialize<T>(operation: () => T): Promise<T> {
    if (this.admissionClosed) return Promise.reject(new ProfileError("PROFILE_CLOSED", "profile owner is closing or closed"));
    const task = this.tail.then(() => {
      if (this.closed) fail("PROFILE_CLOSED", "profile owner is closed");
      return operation();
    });
    // Recover queue availability, while returning the original rejection to the caller.
    this.tail = task.then(() => undefined, () => undefined);
    return task;
  }
  private trusted(credential: object): void { if (credential !== this.credential) fail("PROFILE_CHANNEL_DENIED", "profile control requires the trusted user channel"); }
  private read(): CreatorProfileStoreV1 {
    const state = this.database.read(); this.validateState(state); return state;
  }
  private validateState(state: CreatorProfileStoreV1): void {
    assertCreatorProfileStoreV1(state);
    const ids = new Set<string>(), events = new Set<string>();
    const excludedEvents = new Set(state.excluded_events.map(eventKey));
    for (const principle of state.principles) {
      if (ids.has(principle.principle_id) || state.excluded_sources.includes(principle.source_project_id)) fail("PROFILE_CONTENT_INVALID", "duplicate or excluded principle in profile");
      ids.add(principle.principle_id);
      if (!state.processed_events.some(event => event.source_project_id === principle.source_project_id && event.source_event_id === principle.source_event_id)) fail("PROFILE_PROVENANCE_INVALID", "principle source event is missing");
    }
    for (const event of state.processed_events) {
      const key = eventKey(event);
      const principles = state.principles.filter(item => item.source_project_id === event.source_project_id && item.source_event_id === event.source_event_id);
      if (events.has(key) || excludedEvents.has(key) || state.excluded_sources.includes(event.source_project_id) || event.registered_version > state.version || event.consent_generation > state.consent_generation || event.deletion_generation > state.deletion_generation || !equal(principles.map(item => item.principle_id), event.principle_ids) || principles.some(item => item.source_digest !== event.content_digest || item.data_type !== event.data_type || item.evidence_refs.some(ref => !event.evidence_refs.includes(ref))) || (principles.length === 0) !== (event.no_inference_reason !== null) || creationDigest({ principles, no_inference_reason: event.no_inference_reason }) !== event.result_digest) fail("PROFILE_PROVENANCE_INVALID", "learning record and registered principles disagree");
      events.add(key);
    }
    const correctedEvents = new Set<string>(), predecessors = new Set<string>();
    for (const relation of state.corrections) {
      const key = eventKey(relation), event = state.processed_events.find(item => eventKey(item) === key);
      assertProfileCorrection(relation.correction);
      if (!event || correctedEvents.has(key) || relation.correction.profile_id !== state.profile_id || event.correction_digest !== creationDigest(relation.correction) || event.content_digest !== relation.content_digest || event.registered_version !== relation.registered_version || !equal(event.principle_ids, relation.successor_principle_ids)) fail("PROFILE_CORRECTION_PROVENANCE_INVALID", "correction and immutable successor event disagree");
      correctedEvents.add(key);
      for (const ref of relation.correction.predecessors) {
        const origin = state.processed_events.find(item => eventKey(item) === eventKey(ref));
        if (!origin || origin.result_digest !== ref.result_digest || !origin.principle_ids.includes(ref.principle_id) || origin.registered_version >= relation.registered_version || predecessors.has(ref.principle_id) || !state.disabled_principle_ids.includes(ref.principle_id)) fail("PROFILE_CORRECTION_PROVENANCE_INVALID", "correction predecessor is missing, rebound, cyclic or multiply replaced");
        predecessors.add(ref.principle_id);
      }
    }
    if (state.processed_events.some(event => (event.correction_digest !== null) !== correctedEvents.has(eventKey(event)))) fail("PROFILE_CORRECTION_PROVENANCE_INVALID", "correction relation is missing or invented");
  }
  private save(state: CreatorProfileStoreV1, changes: Partial<CreatorProfileStoreV1>): CreatorProfileStoreV1 {
    const next = { ...state, ...changes, version: state.version + 1 };
    this.validateState(next); this.database.write(state.version, next); return next;
  }
  private consent(state: CreatorProfileStoreV1): ProfileConsent {
    const consent = state.consent;
    if (consent === null || !consent.enabled) throw new ProfileError("PROFILE_LEARNING_DENIED", "learning permission is not enabled");
    if (Date.parse(consent.retention_until) <= this.now()) fail("PROFILE_CONSENT_EXPIRED", "profile retention or consent expired");
    return consent;
  }
  control(): Promise<ProfileGeneration> { return this.serialize(() => generation(this.read())); }
  private consentReview(state: CreatorProfileStoreV1, consent: ProfileConsent): ProfileConsentReview {
    // Reuse the authoritative contract before presenting a review or writing.
    if (!consent || typeof consent !== "object" || Array.isArray(consent)) fail("PROFILE_CONSENT_INVALID", "an explicit consent object is required");
    this.validateState({ ...state, consent });
    if (!consent.source_project_ids.every(id => id.trim()) || consent.external_provider !== null && !consent.external_provider.trim()) fail("PROFILE_CONSENT_INVALID", "consent identifiers must be explicit");
    if (!Number.isFinite(Date.parse(consent.retention_until)) || Date.parse(consent.retention_until) <= this.now()) fail("PROFILE_CONSENT_EXPIRED", "new consent must have a future retention deadline");
    const content = { generation: generation(state), consent: structuredClone(consent), previous_consent: structuredClone(state.consent) };
    return { ...content, review_digest: creationDigest(content) };
  }
  prepareConsent(credential: object, consent: ProfileConsent): Promise<ProfileConsentReview> {
    consent = structuredClone(consent);
    return this.serialize(() => { this.trusted(credential); return this.consentReview(this.read(), consent); });
  }
  configure(credential: object, consent: ProfileConsent, assertCurrent?: () => void, confirmedReview?: ProfileConsentReview): Promise<ProfileGeneration> {
    consent = structuredClone(consent); confirmedReview = structuredClone(confirmedReview);
    return this.serialize(() => {
      this.trusted(credential); assertCurrent?.(); const state = this.read();
      const review = this.consentReview(state, consent);
      if (confirmedReview !== undefined && !equal(confirmedReview, review)) fail("PROFILE_CONTROL_REVIEW_STALE", "profile or confirmed consent changed");
      return generation(this.save(state, { consent: structuredClone(consent), consent_generation: state.consent_generation + 1 }));
    });
  }
  private validateLearningSource(source: ProfileLearningSource): void {
    if (!source || Object.keys(source).sort().join(",") !== "content_digest,correction_digest,data_type,evidence_refs,source_event_id,source_project_id" || typeof source.source_project_id !== "string" || !source.source_project_id.trim() || typeof source.source_event_id !== "string" || !source.source_event_id.trim() || !/^[a-f0-9]{64}$/.test(source.content_digest) || source.correction_digest !== null && (typeof source.correction_digest !== "string" || !/^[a-f0-9]{64}$/.test(source.correction_digest)) || !["feedback", "manual_diff", "selection", "history_reference"].includes(source.data_type) || !Array.isArray(source.evidence_refs) || !source.evidence_refs.length || source.evidence_refs.some(ref => typeof ref !== "string" || !ref.trim()) || new Set(source.evidence_refs).size !== source.evidence_refs.length) fail("PROFILE_LEARNING_SOURCE_INVALID", "learning requires a fixed typed source and exact evidence whitelist");
  }
  private learningPermit(state: CreatorProfileStoreV1, source: ProfileLearningSource, provider: string, correction: ProfileCorrection | null): ProfileLearningPermit {
    this.validateLearningSource(source);
    assertProfileCorrection(correction);
    const consent = this.consent(state);
    if (!consent.source_project_ids.includes(source.source_project_id) || state.excluded_sources.includes(source.source_project_id)) fail("PROFILE_SOURCE_EXCLUDED", "source project is not authorized for learning");
    if (state.excluded_events.some(item => eventKey(item) === eventKey(source))) fail("PROFILE_EVENT_EXCLUDED", "this dependent event was forgotten and cannot be relearned");
    if (!consent.data_types.includes(source.data_type)) fail("PROFILE_DATA_DENIED", "source data category is not authorized for learning");
    if (typeof provider !== "string" || !provider.trim() || consent.external_provider !== provider) fail("PROFILE_EXTERNAL_DENIED", "learning source is not authorized for this provider");
    if (source.correction_digest !== (correction === null ? null : creationDigest(correction)) || correction !== null && (!['feedback', 'manual_diff'].includes(source.data_type) || correction.profile_id !== state.profile_id)) fail("PROFILE_CORRECTION_INVALID", "correction must bind this profile and an explicit feedback or manual-diff event");
    return { profile_id: state.profile_id, consent_generation: state.consent_generation, deletion_generation: state.deletion_generation, provider, source: structuredClone(source), correction: structuredClone(correction) };
  }
  private assertCorrectionActive(state: CreatorProfileStoreV1, correction: ProfileCorrection | null): void {
    if (correction === null) return;
    const consent = this.consent(state);
    for (const ref of correction.predecessors) {
      const event = state.processed_events.find(item => eventKey(item) === eventKey(ref));
      if (!event || event.result_digest !== ref.result_digest || !event.principle_ids.includes(ref.principle_id)) fail("PROFILE_CORRECTION_REFERENCE_INVALID", "the selected predecessor's immutable identity does not match");
      if (state.disabled_principle_ids.includes(ref.principle_id)) fail("PROFILE_CORRECTION_CONFLICT", "another correction already superseded this exact predecessor");
      if (!consent.source_project_ids.includes(event.source_project_id) || !consent.data_types.includes(event.data_type)) fail("PROFILE_CORRECTION_SOURCE_DENIED", "predecessor source is outside current learning consent");
    }
  }
  prepareLearning(source: ProfileLearningSource, provider: string, correction: ProfileCorrection | null): Promise<ProfileLearningPermit> {
    source = structuredClone(source); correction = structuredClone(correction);
    return this.serialize(() => {
      const state = this.read(), permit = this.learningPermit(state, source, provider, correction);
      this.assertCorrectionActive(state, correction); return permit;
    });
  }
  private assertLearning(state: CreatorProfileStoreV1, permit: ProfileLearningPermit, checkPredecessors = true): void {
    if (!permit || state.profile_id !== permit.profile_id || state.consent_generation !== permit.consent_generation || state.deletion_generation !== permit.deletion_generation) fail("PROFILE_GENERATION_STALE", "learning uses stale consent or deletion generation");
    if (!equal(permit, this.learningPermit(state, permit.source, permit.provider, permit.correction))) fail("PROFILE_LEARNING_PERMIT_INVALID", "learning permit fields changed");
    if (checkPredecessors) this.assertCorrectionActive(state, permit.correction);
  }
  /** The profile queue guards only the immediate send, never the remote wait. */
  async dispatchLearning<T>(permit: ProfileLearningPermit, send: () => { response: Promise<T> }): Promise<T> {
    permit = structuredClone(permit);
    const handle = await this.serialize(() => {
      this.assertLearning(this.read(), permit);
      if (Object.prototype.toString.call(send) === "[object AsyncFunction]") fail("PROFILE_ASYNC_SEND_DENIED", "prepare before the coordinated immediate send");
      const { response: pending } = send(); pending.catch(() => undefined);
      return { pending };
    });
    return handle.pending;
  }
  /** Fixed queue -> synchronous project transaction order for extracted results. */
  withLearning<T>(permit: ProfileLearningPermit, commit: () => T & (T extends PromiseLike<unknown> ? never : unknown)): Promise<T> {
    permit = structuredClone(permit);
    return this.serialize(() => {
      this.assertLearning(this.read(), permit);
      if (Object.prototype.toString.call(commit) === "[object AsyncFunction]") fail("PROFILE_ASYNC_COMMIT_DENIED", "learning project commit must be synchronous");
      const result = commit();
      if (result && typeof (result as any).then === "function") fail("PROFILE_ASYNC_COMMIT_DENIED", "learning project commit returned asynchronous work");
      return result;
    });
  }
  /** Historical registration identity; does not authorize new sends or learning. */
  private registrationFrom(state: CreatorProfileStoreV1, source: ProfileLearningSource): ProfileLearningRegistration | null {
    this.validateLearningSource(source);
    const existing = state.processed_events.find(item => eventKey(item) === eventKey(source));
    if (!existing) return null;
    const saved = { source_project_id: existing.source_project_id, source_event_id: existing.source_event_id, content_digest: existing.content_digest, data_type: existing.data_type, evidence_refs: existing.evidence_refs, correction_digest: existing.correction_digest };
    if (!equal(source, saved)) fail("PROFILE_EVENT_CONFLICT", "source event was rebound");
    return { ...existing, profile_id: state.profile_id };
  }
  readLearningRegistration(source: ProfileLearningSource): Promise<ProfileLearningRegistration | null> {
    source = structuredClone(source);
    return this.serialize(() => this.registrationFrom(this.read(), source));
  }
  learn(permit: ProfileLearningPermit, outcome: ProfileLearningOutcome, validateHost: () => void = () => {}): Promise<ProfileLearningRegistration> {
    permit = structuredClone(permit); outcome = structuredClone(outcome);
    return this.serialize(() => {
      const state = this.read();
      this.assertLearning(state, permit, false);
      if (Object.prototype.toString.call(validateHost) === "[object AsyncFunction]") fail("PROFILE_ASYNC_COMMIT_DENIED", "Host learning guard must be synchronous");
      const checked = validateHost() as unknown;
      if (checked && typeof (checked as any).then === "function") fail("PROFILE_ASYNC_COMMIT_DENIED", "Host learning guard returned asynchronous work");
      if (!outcome || Object.keys(outcome).sort().join(",") !== "no_inference_reason,principles" || !Array.isArray(outcome.principles) || (outcome.principles.length === 0 ? typeof outcome.no_inference_reason !== "string" || !outcome.no_inference_reason.trim() : outcome.no_inference_reason !== null)) fail("PROFILE_LEARNING_OUTCOME_INVALID", "no inference requires an explicit reason; learned principles must not claim no inference");
      const event = permit.source, resultDigest = creationDigest(outcome);
      const principles: readonly EditingPrinciple[] = outcome.principles;
      const existing = state.processed_events.find(item => item.source_project_id === event.source_project_id && item.source_event_id === event.source_event_id);
      if (existing) {
        if (existing.content_digest !== event.content_digest || existing.correction_digest !== event.correction_digest || existing.data_type !== event.data_type || !equal(existing.evidence_refs, event.evidence_refs) || existing.result_digest !== resultDigest) fail("PROFILE_EVENT_CONFLICT", "source event was replayed with changed content or extraction");
        return { ...existing, profile_id: state.profile_id };
      }
      this.assertCorrectionActive(state, permit.correction);
      if (permit.correction !== null && !principles.length) fail("PROFILE_CORRECTION_NO_SUCCESSOR", "replacement has no supported successor; no predecessor was disabled");
      const ids = new Set([...state.principles.map(item => item.principle_id), ...state.disabled_principle_ids]);
      for (const principle of principles) {
        if (principle.source_project_id !== event.source_project_id || principle.source_event_id !== event.source_event_id || principle.source_digest !== event.content_digest || principle.data_type !== event.data_type || !Array.isArray(principle.evidence_refs) || !principle.evidence_refs.length || principle.evidence_refs.some(ref => !event.evidence_refs.includes(ref))) fail("PROFILE_PROVENANCE_INVALID", "principle does not bind the authorized source event/data/evidence");
        if (principle.status !== "hypothesis") fail("PROFILE_EXPLICIT_DENIED", "model inference cannot confirm a preference");
        if (ids.has(principle.principle_id)) fail("PROFILE_PRINCIPLE_CONFLICT", "principle ID already exists"); ids.add(principle.principle_id);
      }
      const record: LearningRecord = { ...event, provider: permit.provider, consent_generation: permit.consent_generation, deletion_generation: permit.deletion_generation, registered_version: state.version + 1, result_digest: resultDigest, principle_ids: principles.map(item => item.principle_id), no_inference_reason: outcome.no_inference_reason };
      const corrections = permit.correction === null ? state.corrections : [...state.corrections, { source_project_id: event.source_project_id, source_event_id: event.source_event_id, content_digest: event.content_digest, correction: structuredClone(permit.correction), successor_principle_ids: record.principle_ids, registered_version: record.registered_version }];
      const disabled = [...new Set([...state.disabled_principle_ids, ...(permit.correction?.predecessors.map(ref => ref.principle_id) ?? [])])];
      this.save(state, { principles: [...state.principles, ...principles], processed_events: [...state.processed_events, record], corrections, disabled_principle_ids: disabled });
      return { ...record, profile_id: state.profile_id };
    });
  }
  private snapshotFrom(state: CreatorProfileStoreV1, query: ProfileQuery): ProfileSnapshot {
    if (!query.project_id.trim() || query.contexts.length === 0 || query.contexts.some(value => !value.trim())) fail("PROFILE_QUERY_INVALID", "project and explicit context required");
    let mode: ProfileSnapshot["mode"], principles: EditingPrinciple[] = [];
    if (state.consent === null) mode = "unconfigured";
    else if (!state.consent.enabled) mode = "disabled";
    else {
      const consent = this.consent(state);
      const usable = new Set(state.processed_events.filter(event => consent.source_project_ids.includes(event.source_project_id) && consent.data_types.includes(event.data_type)).map(eventKey));
      // Topological order follows immutable registration versions. A successor
      // cannot launder a predecessor whose source is no longer authorized.
      for (const relation of [...state.corrections].sort((a, b) => a.registered_version - b.registered_version)) if (relation.correction.predecessors.some(ref => !usable.has(eventKey(ref)))) usable.delete(eventKey(relation));
      principles = state.principles.filter(item => usable.has(eventKey(item)) && !state.disabled_principle_ids.includes(item.principle_id) && !query.except_principle_ids.includes(item.principle_id) && item.contexts.some(context => query.contexts.includes(context)));
      mode = state.principles.length === 0 ? "empty" : principles.length ? "personalized" : "no_match";
    }
    const content = { ...generation(state), mode, query: structuredClone(query), principles: structuredClone(principles), external_provider: state.consent?.external_provider ?? null };
    return { ...content, digest: creationDigest(content) };
  }
  snapshot(query: ProfileQuery): Promise<ProfileSnapshot> { return this.serialize(() => this.snapshotFrom(this.read(), query)); }
  /** One queue state for the visible principles, exact correction refs and registration history. */
  readWorkspace(credential: object, query: ProfileQuery, sources: readonly ProfileLearningSource[]): Promise<ProfileWorkspace> {
    query = structuredClone(query); sources = structuredClone(sources);
    return this.serialize(() => {
      this.trusted(credential);
      if (!query || Object.keys(query).sort().join(",") !== "contexts,except_principle_ids,project_id" || typeof query.project_id !== "string" || !query.project_id.trim() || !Array.isArray(query.contexts) || !query.contexts.length || !Array.isArray(query.except_principle_ids) || [query.contexts, query.except_principle_ids].some(values => values.some(value => typeof value !== "string" || !value.trim()) || new Set(values).size !== values.length) || !Array.isArray(sources)) fail("PROFILE_QUERY_INVALID", "workspace needs an exact project/context query and distinct event sources");
      sources.forEach(source => this.validateLearningSource(source));
      if (new Set(sources.map(eventKey)).size !== sources.length) fail("PROFILE_QUERY_INVALID", "workspace learning sources must be distinct");
      const state = this.read(), snapshot = this.snapshotFrom(state, query);
      const correction_predecessors = snapshot.principles.map(principle => {
        const event = state.processed_events.find(item => eventKey(item) === eventKey(principle))!;
        return { source_project_id: event.source_project_id, source_event_id: event.source_event_id, principle_id: principle.principle_id, result_digest: event.result_digest };
      });
      const registrations: ProfileWorkspaceRegistration[] = sources.map(source => {
        const existing = this.registrationFrom(state, source), identity = { source_project_id: source.source_project_id, source_event_id: source.source_event_id };
        if (existing) return { ...identity, state: "registered", result_digest: existing.result_digest, registered_version: existing.registered_version, principle_ids: [...existing.principle_ids], outcome: existing.principle_ids.length ? "principles" : "no_inference" };
        if (state.excluded_sources.includes(source.source_project_id)) return { ...identity, state: "excluded", reason: "source_forgotten", result_digest: null, registered_version: null };
        if (state.excluded_events.some(item => eventKey(item) === eventKey(source))) return { ...identity, state: "excluded", reason: "event_forgotten", result_digest: null, registered_version: null };
        return { ...identity, state: "unregistered", result_digest: null, registered_version: null };
      });
      return { consent: structuredClone(state.consent), snapshot, correction_predecessors, registrations };
    });
  }
  private assertSnapshot(snapshot: ProfileSnapshot): void {
    const current = this.snapshotFrom(this.read(), snapshot.query);
    if (!equal(current, snapshot)) fail("PROFILE_SNAPSHOT_STALE", "profile consent, deletion, selected content or query changed");
  }
  /** Fixed order: this queue, then synchronous Host project transaction. No network/render holds it. */
  withSnapshot<T>(snapshot: ProfileSnapshot, commit: () => T & (T extends PromiseLike<unknown> ? never : unknown)): Promise<T> {
    return this.serialize(() => {
      this.assertSnapshot(snapshot);
      if (Object.prototype.toString.call(commit) === "[object AsyncFunction]") fail("PROFILE_ASYNC_COMMIT_DENIED", "async work cannot enter the synchronous project commit boundary");
      const result = commit();
      if (result && typeof (result as any).then === "function") fail("PROFILE_ASYNC_COMMIT_DENIED", "project commit must finish synchronously under authorization coordination");
      return result;
    });
  }
  /** Starts an authorized send inside the queue; waits for the remote response outside it. */
  async dispatch<T>(snapshot: ProfileSnapshot, provider: string, send: () => { response: Promise<T> }): Promise<T> {
    const handle = await this.serialize(() => {
      this.assertSnapshot(snapshot);
      if (snapshot.principles.length && snapshot.external_provider !== provider) fail("PROFILE_EXTERNAL_DENIED", "profile data is not authorized for this provider");
      if (Object.prototype.toString.call(send) === "[object AsyncFunction]") fail("PROFILE_ASYNC_SEND_DENIED", "prepare outside coordination; pass only the immediate network dispatch");
      const { response: pending } = send();
      // Attach a handler immediately; the same failure still propagates below.
      pending.catch(() => undefined);
      return { pending };
    });
    return handle.pending;
  }
  private deletionPlan(state: CreatorProfileStoreV1, sourceProjectIds: readonly string[]): Readonly<{ review: ProfileDeletionReview; changes: Partial<CreatorProfileStoreV1> }> {
      if (!Array.isArray(sourceProjectIds) || !sourceProjectIds.length || sourceProjectIds.some(id => typeof id !== "string" || !id.trim()) || new Set(sourceProjectIds).size !== sourceProjectIds.length) fail("PROFILE_DELETE_SCOPE_INVALID", "explicit distinct source scope required");
      const removed = new Set(sourceProjectIds);
      const affected = new Set(state.processed_events.filter(event => removed.has(event.source_project_id)).map(eventKey));
      for (const relation of [...state.corrections].sort((a, b) => a.registered_version - b.registered_version)) if (relation.correction.predecessors.some(ref => affected.has(eventKey(ref)))) affected.add(eventKey(relation));
      const removedEvents = state.processed_events.filter(event => affected.has(eventKey(event))).map(event => ({ source_project_id: event.source_project_id, source_event_id: event.source_event_id }));
      const principles = state.principles.filter(item => !affected.has(eventKey(item))), events = state.processed_events.filter(item => !affected.has(eventKey(item)));
      const disabled = [...new Set([...state.disabled_principle_ids, ...state.principles.filter(item => affected.has(eventKey(item))).map(item => item.principle_id)])];
      const content = { generation: generation(state), source_project_ids: [...sourceProjectIds], removed_events: removedEvents, removed_principle_ids: state.principles.filter(item => affected.has(eventKey(item))).map(item => item.principle_id) };
      return { review: { ...content, review_digest: creationDigest(content) }, changes: { principles, processed_events: events, corrections: state.corrections.filter(item => !affected.has(eventKey(item))), disabled_principle_ids: disabled, excluded_events: [...state.excluded_events, ...removedEvents], excluded_sources: [...new Set([...state.excluded_sources, ...removed])], deletion_generation: state.deletion_generation + 1 } };
  }
  prepareDeletion(credential: object, sourceProjectIds: readonly string[]): Promise<ProfileDeletionReview> {
    sourceProjectIds = structuredClone(sourceProjectIds);
    return this.serialize(() => { this.trusted(credential); return this.deletionPlan(this.read(), sourceProjectIds).review; });
  }
  forgetSources(credential: object, sourceProjectIds: readonly string[], assertCurrent?: () => void, confirmedReview?: ProfileDeletionReview): Promise<ProfileDeletionReceipt> {
    sourceProjectIds = structuredClone(sourceProjectIds); confirmedReview = structuredClone(confirmedReview);
    return this.serialize(() => {
      this.trusted(credential); assertCurrent?.(); const state = this.read(), plan = this.deletionPlan(state, sourceProjectIds);
      if (confirmedReview !== undefined && !equal(confirmedReview, plan.review)) fail("PROFILE_CONTROL_REVIEW_STALE", "profile or confirmed deletion impact changed");
      const next = this.save(state, plan.changes);
      return { ...generation(next), excluded_sources: plan.review.source_project_ids, removed_events: plan.review.removed_events, removed_principles: plan.review.removed_principle_ids.length, removed_event_keys: plan.review.removed_events.length, derived_indexes: 0, reusable_caches: 0 };
    });
  }
  close(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.closing) return this.closing;
    this.admissionClosed = true;
    // Previously admitted operations own their place in the queue. A failed
    // resource close remains retryable without reopening ordinary admission.
    this.closing = this.tail.then(() => { this.database.close(); this.closed = true; }).finally(() => { this.closing = undefined; });
    this.tail = this.closing.then(() => undefined, () => undefined);
    return this.closing;
  }
}
