import type { CreationSessionV1 } from "../../../../contracts/generated/typescript/editorial/creation-session.v1.js";

export type CreationState = CreationSessionV1;
export type RequestAuthorization = CreationState["authorization"];
export type IntentRevision = CreationState["revisions"][number];
export type CreationTicket = NonNullable<CreationState["active_run"]>;
export type DraftVersion = CreationState["drafts"][number];
export type ProfileIdentity = CreationTicket["profile"];
export type CreationModelCall = CreationState["model_calls"][number];
export type CreationModelSettlement = NonNullable<CreationModelCall["settlement"]>;

export { CreationError, creationDigest, validateCreationState } from "../../contract-runtime/src/public.js";
import { CreationError, creationDigest, validateCreationState } from "../../contract-runtime/src/public.js";
const reject = (code: string, message: string): never => { throw new CreationError(code, message); };

function successor(state: CreationState, changes: Partial<CreationState>): CreationState {
  if (state.sequence === Number.MAX_SAFE_INTEGER) reject("REQUEST_SEQUENCE_EXHAUSTED", "request sequence exhausted");
  const next = structuredClone({ ...state, ...changes, sequence: state.sequence + 1 });
  validateCreationState(next);
  return next;
}

export function beginCreation(authorization: RequestAuthorization, base: number, now: string): CreationState {
  const state: CreationState = {
    schema_version: 1, project_id: authorization.project_id, sequence: 1,
    authorization: structuredClone(authorization), authorization_generation: 0, cancellation_generation: 0, revoked: false,
    revisions: [{ revision: 1, raw_text: authorization.original_text, base_timeline_version: base, viewed_timeline_version: null, preserve_refs: [...authorization.protected_refs], created_at: now }],
    status: "received", drafts: [], model_calls: [], adopted_draft_id: null, viewed_draft_id: null, latest_draft_id: null, active_run: null,
  };
  validateCreationState(state);
  assertRequestLive(state, now);
  if (!authorization.allowed_data.includes("request")) reject("REQUEST_DATA_DENIED", "request text must be authorized for creative use");
  return state;
}

export function assertRequestLive(state: CreationState, now: string): void {
  if (!Number.isFinite(Date.parse(now))) reject("REQUEST_CLOCK_INVALID", "Host clock is invalid");
  if (state.revoked) reject("REQUEST_REVOKED", "request authorization was revoked");
  if (Date.parse(state.authorization.expires_at) <= Date.parse(now)) reject("REQUEST_EXPIRED", "request authorization expired");
}

export function reviseCreation(state: CreationState, expectedRevision: number, input: Omit<IntentRevision, "revision">): CreationState {
  assertRequestLive(state, input.created_at);
  if (expectedRevision !== state.revisions.length) reject("REQUEST_REVISION_STALE", "another user revision has already been received");
  const required = new Set([...state.authorization.protected_refs, ...state.revisions.at(-1)!.preserve_refs]);
  if ([...required].some(ref => !input.preserve_refs.includes(ref))) reject("REQUEST_PROTECTION_EXPANSION", "removing protected content requires new explicit authorization");
  return successor(state, { revisions: [...state.revisions, { ...input, revision: expectedRevision + 1 }], active_run: null, status: "received" });
}

export function cancelCreation(state: CreationState): CreationState {
  if (state.status === "cancelled") return state;
  return successor(state, { cancellation_generation: state.cancellation_generation + 1, active_run: null, status: "cancelled" });
}
export function interruptCreation(state: CreationState): CreationState {
  if (state.active_run === null && state.status !== "rendering") return state;
  return successor(state, { cancellation_generation: state.cancellation_generation + 1, active_run: null, status: "paused" });
}
export function failCreationRun(state: CreationState, ticket: CreationTicket): CreationState {
  if (state.active_run === null || creationDigest(state.active_run) !== creationDigest(ticket)) return state;
  return successor(state, { active_run: null, status: "failed" });
}
export function revokeCreation(state: CreationState): CreationState {
  if (state.revoked) return state;
  return successor(state, { authorization_generation: state.authorization_generation + 1, revoked: true, active_run: null, status: "cancelled" });
}

export function startCreationRun(state: CreationState, runId: string, base: number, inputDigest: string, profile: ProfileIdentity, now: string): CreationState {
  assertRequestLive(state, now);
  if (state.status === "cancelled") reject("REQUEST_CANCELLED", "cancelled request needs a new user revision");
  if (base !== state.revisions.at(-1)!.base_timeline_version) reject("REQUEST_BASE_STALE", "manual changes require a new intent revision");
  if (state.active_run !== null) reject("REQUEST_RUN_ACTIVE", "a creative run is already active");
  if (state.drafts.some(draft => draft.source.kind === "model" && draft.source.run_id === runId)) reject("REQUEST_RUN_REUSED", "run ID has already committed a draft");
  const ticket: CreationTicket = { run_id: runId, request_id: state.authorization.request_id, revision: state.revisions.length, base_timeline_version: base,
    authorization_generation: state.authorization_generation, cancellation_generation: state.cancellation_generation,
    authorization_digest: creationDigest(state.authorization), input_digest: inputDigest, profile: structuredClone(profile) };
  return successor(state, { active_run: ticket, status: "adjusting" });
}

/** Re-run inside the project transaction, after entering profile authorization coordination. */
export function assertCreationCommit(state: CreationState, ticket: CreationTicket, base: number, profile: ProfileIdentity, now: string): void {
  assertRequestLive(state, now);
  if (state.status === "cancelled" || ticket.cancellation_generation !== state.cancellation_generation) reject("REQUEST_CANCELLED", "run was cancelled before commit");
  if (ticket.request_id !== state.authorization.request_id || ticket.authorization_generation !== state.authorization_generation || ticket.authorization_digest !== creationDigest(state.authorization)) reject("REQUEST_AUTHORIZATION_STALE", "run authorization no longer matches");
  if (ticket.revision !== state.revisions.length) reject("REQUEST_REVISION_STALE", "newer user intent superseded this response");
  if (ticket.base_timeline_version !== base) reject("REQUEST_BASE_STALE", "manual or other edits changed the base Timeline");
  if (creationDigest(profile) !== creationDigest(ticket.profile)) reject("REQUEST_PROFILE_STALE", "profile permission, deletion or content changed");
  if (state.status !== "adjusting") reject("REQUEST_RUN_STALE", "request is not in a committable running state");
  if (state.active_run === null || creationDigest(state.active_run) !== creationDigest(ticket)) reject("REQUEST_RUN_STALE", "candidate is not the current active run");
}

export function reserveCreationCall(state: CreationState, ticket: CreationTicket, call: CreationModelCall, currentBase: number, now: string): CreationState {
  assertCreationCommit(state, ticket, currentBase, ticket.profile, now);
  if (state.model_calls.some(item => item.call_id === call.call_id)) reject("REQUEST_CALL_ALREADY_RESERVED", "a possibly sent call must never be dispatched again");
  if (call.run_id !== ticket.run_id || call.revision !== ticket.revision || call.input_digest !== ticket.input_digest || creationDigest(call.profile) !== creationDigest(ticket.profile) || call.settlement !== null || call.dispatch_committed_at !== now) reject("REQUEST_CALL_INVALID", "reservation changed the fixed run context");
  const next = successor(state, { model_calls: [...state.model_calls, structuredClone(call)] });
  return next;
}

export function completeCreationObservation(state: CreationState, ticket: CreationTicket, currentBase: number, now: string): CreationState {
  assertCreationCommit(state, ticket, currentBase, null, now);
  return successor(state, { active_run: null, status: "received" });
}

/** Accounting survives cancellation, revocation and new intent; never restore an old state. */
export function settleCreationCall(state: CreationState, callId: string, settlement: CreationModelSettlement): CreationState {
  const call = state.model_calls.find(item => item.call_id === callId);
  if (!call) reject("REQUEST_CALL_NOT_FOUND", "cannot settle an unreserved model call");
  if (call!.settlement !== null) {
    if (creationDigest(call!.settlement) !== creationDigest(settlement)) reject("REQUEST_SETTLEMENT_CONFLICT", "a recorded model result cannot be replaced");
    return state;
  }
  return successor(state, { model_calls: state.model_calls.map(item => item.call_id === callId ? { ...item, settlement: structuredClone(settlement) } : item) });
}

export function saveCreationDraft(state: CreationState, ticket: CreationTicket, draft: DraftVersion, currentBase: number, profile: ProfileIdentity, now: string): CreationState {
  const existing = state.drafts.find(item => item.draft_id === draft.draft_id);
  if (existing) {
    if (creationDigest(existing) !== creationDigest(draft)) reject("DRAFT_IDEMPOTENCY_CONFLICT", "draft ID was reused with different content");
    return state;
  }
  assertCreationCommit(state, ticket, currentBase, profile, now);
  if (draft.source.kind !== "model" || draft.request_id !== ticket.request_id || draft.source.run_id !== ticket.run_id || draft.revision !== ticket.revision || draft.base_timeline_version !== currentBase || draft.parent_draft_id !== state.latest_draft_id || draft.input_digest !== ticket.input_digest || creationDigest(draft.source.profile) !== creationDigest(ticket.profile)) reject("DRAFT_CONTEXT_MISMATCH", "draft changed its fixed run inputs");
  return successor(state, { drafts: [...state.drafts, draft], latest_draft_id: draft.draft_id, active_run: null, status: "rendering" });
}

export function selectCreationDraft(state: CreationState, draftId: string, pointer: "adopted" | "viewed"): CreationState {
  if (!state.drafts.some(draft => draft.draft_id === draftId)) reject("DRAFT_NOT_FOUND", "selected version does not exist");
  const key = pointer === "adopted" ? "adopted_draft_id" : "viewed_draft_id";
  return state[key] === draftId ? state : successor(state, { [key]: draftId });
}

/** Manual work has no model ticket, profile snapshot or budget reservation. */
export function assertManualCreationCommit(state: CreationState, initial: CreationState, base: number, parentId: string, now: string): void {
  assertRequestLive(state, now);
  if (state.status === "cancelled" || state.cancellation_generation !== initial.cancellation_generation) reject("REQUEST_CANCELLED", "manual operation was cancelled");
  if (state.authorization_generation !== initial.authorization_generation || creationDigest(state.authorization) !== creationDigest(initial.authorization)) reject("REQUEST_AUTHORIZATION_STALE", "manual authorization changed");
  if (state.revisions.length !== initial.revisions.length) reject("REQUEST_REVISION_STALE", "new intent superseded manual work");
  if (state.active_run !== null) reject("REQUEST_RUN_STALE", "manual work cannot share an active model run");
  const parent = state.drafts.find(item => item.draft_id === parentId);
  if (state.latest_draft_id !== parentId || !parent || parent.timeline_version !== base) reject("REQUEST_BASE_STALE", "manual work must extend the exact latest draft");
}
export function saveManualCreationDraft(state: CreationState, initial: CreationState, draft: DraftVersion, base: number, now: string): CreationState {
  assertManualCreationCommit(state, initial, base, draft.parent_draft_id!, now);
  if (draft.source.kind !== "manual" || draft.source.actor_id !== state.authorization.actor_id || draft.request_id !== state.authorization.request_id || draft.revision !== state.revisions.length || draft.base_timeline_version !== base) reject("DRAFT_CONTEXT_MISMATCH", "manual draft changed its fixed user inputs");
  return successor(state, { drafts: [...state.drafts, draft], latest_draft_id: draft.draft_id, active_run: null, status: "rendering" });
}
