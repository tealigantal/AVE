import { createHash } from "node:crypto";
import { creationSessionV1Validator } from "./generated/creative-context-validators.mjs";

export class CreationError extends Error {
  constructor(code, message) { super(message); this.name = "CreationError"; this.code = code; }
}
const reject = (code, message) => { throw new CreationError(code, message); };
export function creationDigest(value) {
  const canonical = item => typeof item === "bigint" ? { $ave_bigint: item.toString(10) } : Array.isArray(item) ? item.map(canonical) : item !== null && typeof item === "object"
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, canonical(item[key])])) : item;
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
const same = (left, right) => creationDigest(left) === creationDigest(right);

function validateCalls(state) {
  const ids = new Set(), attempts = new Set();
  const routes = state.authorization.deployment?.routes;
  if (routes && [...new Set(routes.map(route => route.role))].sort().join(",") !== "planner,sound,transcription,vision") reject("REQUEST_CALL_TARGET_DENIED", "split deployment requires exactly four distinct receiving roles");
  for (const call of state.model_calls) {
    const attempt = `${call.run_id}:${call.attempt}`;
    if (ids.has(call.call_id) || attempts.has(attempt) || call.revision > state.revisions.length || call.provider !== state.authorization.provider || call.model !== state.authorization.model) reject("REQUEST_CALL_INVALID", "model call identity or authorization is inconsistent");
    const receivingRoute = call.target && Object.fromEntries(Object.entries(call.target).filter(([key]) => key !== "sample_id"));
    if (routes && (!receivingRoute || !routes.some(route => same(route, receivingRoute)))) reject("REQUEST_CALL_TARGET_DENIED", "physical call target is not an authorized deployment route");
    if (!routes && call.target) reject("REQUEST_CALL_TARGET_DENIED", "unregistered physical call target");
    ids.add(call.call_id); attempts.add(attempt);
    const settlement = call.settlement;
    if (settlement) {
      if (Date.parse(settlement.completed_at) < Date.parse(call.dispatch_committed_at)) reject("REQUEST_CALL_INVALID", "call completion precedes dispatch reservation");
      if (settlement.usage && BigInt(settlement.usage.total) !== BigInt(settlement.usage.input) + BigInt(settlement.usage.output)) reject("REQUEST_USAGE_INVALID", "reported token total is inconsistent");
      if (settlement.status === "response" && (settlement.code !== null || settlement.reason_code !== null || settlement.output_digest === null) || settlement.status !== "response" && (settlement.code === null || settlement.reason_code === null)) reject("REQUEST_CALL_INVALID", "call outcome lacks its result or failure identity");
    }
  }
}

export function validateCreationState(value) {
  if (!creationSessionV1Validator(value)) reject("CONTRACT_CREATION_SESSION_INVALID", JSON.stringify(creationSessionV1Validator.errors));
  if (value.project_id !== value.authorization.project_id) reject("REQUEST_PROJECT_MISMATCH", "request belongs to another project");
  validateCalls(value);
  const revisions = value.revisions;
  if (revisions.some((revision, index) => revision.revision !== index + 1)) reject("REQUEST_REVISION_INVALID", "intent revisions must be contiguous");
  if (revisions[0].raw_text !== value.authorization.original_text) reject("REQUEST_ORIGINAL_MISMATCH", "original user request was changed");
  for (const [index, revision] of revisions.entries()) {
    const protectedRefs = index === 0 ? value.authorization.protected_refs : revisions[index - 1].preserve_refs;
    if (protectedRefs.some(ref => !revision.preserve_refs.includes(ref))) reject("REQUEST_PROTECTION_EXPANSION", "intent revision removed protected content");
  }
  const ids = new Set(), runs = new Set(), operations = new Set(), versions = new Set();
  let parent = null;
  for (const draft of value.drafts) {
    if (ids.has(draft.draft_id) || versions.has(draft.timeline_version) || draft.request_id !== value.authorization.request_id || draft.revision > revisions.length || draft.timeline_version !== draft.base_timeline_version + 1)
      reject("DRAFT_IDENTITY_INVALID", "draft identity, Timeline or revision is inconsistent");
    if (draft.parent_draft_id !== parent) reject("DRAFT_PARENT_INVALID", "draft must extend its immutable parent");
    if (draft.source.kind === "model") {
      if (runs.has(draft.source.run_id) || draft.base_timeline_version !== revisions[draft.revision - 1].base_timeline_version) reject("DRAFT_IDENTITY_INVALID", "model draft must bind its unique run and revision base");
      runs.add(draft.source.run_id);
    } else {
      const previous = value.drafts.find(item => item.draft_id === parent);
      if (operations.has(draft.source.operation_id) || draft.source.actor_id !== value.authorization.actor_id || !previous || previous.timeline_version !== draft.base_timeline_version || draft.base_timeline_version < revisions[draft.revision - 1].base_timeline_version || revisions[draft.revision - 1].preserve_refs.some(ref => !draft.source.preserve_refs.includes(ref))) reject("DRAFT_MANUAL_IDENTITY_INVALID", "manual draft must extend its exact parent, actor, revision and protection");
      operations.add(draft.source.operation_id);
    }
    ids.add(draft.draft_id); versions.add(draft.timeline_version); parent = draft.draft_id;
  }
  for (const pointer of [value.adopted_draft_id, value.viewed_draft_id, value.latest_draft_id])
    if (pointer !== null && !ids.has(pointer)) reject("DRAFT_POINTER_INVALID", "version pointer names no saved draft");
  if (value.latest_draft_id !== parent) reject("DRAFT_HEAD_INVALID", "latest pointer disagrees with draft history");
  const run = value.active_run;
  if (run !== null && value.status !== "adjusting") reject("REQUEST_RUN_INVALID", "only an adjusting request may contain an active run");
  if (run !== null && (run.request_id !== value.authorization.request_id || run.revision !== revisions.length || run.base_timeline_version !== revisions.at(-1).base_timeline_version || run.authorization_generation !== value.authorization_generation || run.cancellation_generation !== value.cancellation_generation || run.authorization_digest !== creationDigest(value.authorization))) reject("REQUEST_RUN_INVALID", "run is not bound to the current authorization and intent");
  if ((value.revoked || value.status === "cancelled") && run !== null) reject("REQUEST_RUN_INVALID", "cancelled or revoked state cannot contain an active run");
  if (value.status === "adjusting" && run === null) reject("REQUEST_RUN_INVALID", "adjusting requires a bound run");
  if (["rendering", "watchable"].includes(value.status) && value.drafts.length === 0) reject("DRAFT_STATE_INVALID", "rendering or watchable requires a saved draft");
}

/** Enforces immutable authority/history before either metadata or Timeline writes. */
export function validateCreationTransition(current, next, kind) {
  validateCreationState(next);
  if (current === null) {
    if (kind !== "metadata" || next.sequence !== 1 || next.revisions.length !== 1 || next.drafts.length !== 0 || next.model_calls.length !== 0 || next.authorization_generation !== 0 || next.cancellation_generation !== 0 || next.revoked || next.status !== "received" || next.active_run !== null) reject("REQUEST_INITIAL_STATE_INVALID", "new requests start with one user revision and no derived work");
    return;
  }
  validateCreationState(current);
  if (kind === "observation" || kind === "learning") {
    const withoutRun = state => ({ ...state, sequence: 0, status: "received", active_run: null });
    if (current.status !== "adjusting" || !current.active_run || current.revoked || next.status !== "received" || next.active_run !== null || !same(withoutRun(current), withoutRun(next))) reject(kind === "learning" ? "CREATION_LEARNING_TRANSITION_INVALID" : "CREATION_OBSERVATION_TRANSITION_INVALID", "result publication changes only the active run, status and sequence");
  }
  if (kind !== "render" && next.status === "watchable" && current.status !== "watchable") reject("DRAFT_RENDER_PROOF_REQUIRED", "only atomic output and QC publication may make a draft watchable");
  if (kind === "render") {
    const withoutStatus = state => ({ ...state, sequence: 0, status: "rendering" });
    const draft = current.drafts.find(item => item.draft_id === current.latest_draft_id);
    if (current.status !== "rendering" || current.active_run !== null || current.revoked || !draft || draft.revision !== current.revisions.length || next.status !== "watchable" || !same(withoutStatus(current), withoutStatus(next))) reject("DRAFT_RENDER_TRANSITION_INVALID", "render publication changes only current draft readiness and sequence");
  }
  if (next.sequence !== current.sequence + 1) reject("REQUEST_SEQUENCE_INVALID", "request successor must increment exactly once");
  if (!same(next.authorization, current.authorization) || next.project_id !== current.project_id) reject("REQUEST_AUTHORIZATION_IMMUTABLE", "new request required to change authorization");
  if (kind === "metadata" && current.active_run !== null && next.active_run === null && next.status === "received" && next.revisions.length === current.revisions.length) reject("CREATION_OBSERVATION_PROOF_REQUIRED", "successful observation completion requires atomic evidence publication");
  if (!same(next.model_calls, current.model_calls)) {
    const withoutCalls = state => ({ ...state, sequence: 0, model_calls: [] });
    if (kind !== "metadata" || !same(withoutCalls(current), withoutCalls(next))) reject("REQUEST_LEDGER_MUTATION_INVALID", "accounting cannot rewrite current creative state");
    if (next.model_calls.length === current.model_calls.length + 1 && same(next.model_calls.slice(0, -1), current.model_calls)) {
      const call = next.model_calls.at(-1), run = current.active_run;
      if (!run || current.revoked || current.status !== "adjusting" || call.settlement !== null || call.run_id !== run.run_id || call.revision !== run.revision || call.input_digest !== run.input_digest || !same(call.profile, run.profile) || Date.parse(call.dispatch_committed_at) >= Date.parse(current.authorization.expires_at)) reject("REQUEST_CALL_INVALID", "new reservation must bind the current authorized run");
    } else if (next.model_calls.length === current.model_calls.length) {
      let settled = 0;
      for (const [index, old] of current.model_calls.entries()) {
        const call = next.model_calls[index];
        if (same(old, call)) continue;
        if (old.settlement !== null || call.settlement === null || !same({ ...old, settlement: null }, { ...call, settlement: null })) reject("REQUEST_CALL_IMMUTABLE", "model reservations and settled results are immutable");
        settled += 1;
      }
      if (settled !== 1) reject("REQUEST_LEDGER_MUTATION_INVALID", "settle exactly one recorded call");
      // Actual overuse must be recorded, then block future sends and work commits.
    } else reject("REQUEST_LEDGER_MUTATION_INVALID", "model-call history cannot be truncated or replaced");
  }
  if (next.revisions.length < current.revisions.length || next.revisions.length > current.revisions.length + 1 || !same(next.revisions.slice(0, current.revisions.length), current.revisions)) reject("REQUEST_HISTORY_IMMUTABLE", "prior user statements cannot be rewritten");
  if (!same(next.drafts.slice(0, current.drafts.length), current.drafts) || next.drafts.length !== current.drafts.length + (kind === "draft" ? 1 : 0)) reject("DRAFT_HISTORY_IMMUTABLE", "only an atomic Timeline commit may append a draft");
  if (next.authorization_generation !== current.authorization_generation + (!current.revoked && next.revoked ? 1 : 0) || (current.revoked && !next.revoked)) reject("REQUEST_GENERATION_INVALID", "revocation cannot be undone or rebound");
  if (next.cancellation_generation < current.cancellation_generation || next.cancellation_generation > current.cancellation_generation + 1 || (next.cancellation_generation > current.cancellation_generation && !["cancelled", "paused"].includes(next.status))) reject("REQUEST_GENERATION_INVALID", "cancellation generation is invalid");
  if (current.status !== "cancelled" && next.status === "cancelled" && !next.revoked && next.cancellation_generation !== current.cancellation_generation + 1) reject("REQUEST_GENERATION_INVALID", "cancel must invalidate outstanding runs");
  if (next.revisions.length > current.revisions.length && (next.status !== "received" || next.active_run !== null)) reject("REQUEST_REVISION_INVALID", "new user intent must invalidate the prior run");
  if (kind === "draft" && (next.revisions.length !== current.revisions.length || next.active_run !== null || next.status !== "rendering" || next.adopted_draft_id !== current.adopted_draft_id || next.viewed_draft_id !== current.viewed_draft_id)) reject("REQUEST_DRAFT_STATE_INVALID", "draft commit cannot change user intent or adopt/play itself");
}
