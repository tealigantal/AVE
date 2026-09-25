import type { CreationState } from "./stage3-request.js";
import { creationDigest, CreationError } from "./stage3-request.js";
import type { CreationMaterialV1 } from "../../../../contracts/generated/typescript/editorial/creation-material.v1.js";
import type { CreationObservationV1 } from "../../../../contracts/generated/typescript/editorial/creation-observation.v1.js";
import type { CreationRenderV1 } from "../../../../contracts/generated/typescript/editorial/creation-render.v1.js";
import type { CreationDraftExecutionV1 } from "../../../../contracts/generated/typescript/editorial/creation-draft-execution.v1.js";
import type { CreationLearningAttemptV1 } from "../../../../contracts/generated/typescript/editorial/creation-learning-attempt.v1.js";
import type { CreationLearningResultV1 } from "../../../../contracts/generated/typescript/editorial/creation-learning-result.v1.js";
import type { CreationLearningEventV1 } from "../../../../contracts/generated/typescript/editorial/creation-learning-event.v1.js";
import type { QCReport } from "../../../../contracts/generated/typescript/qc/qc-report.v1.js";
import type { ProfileWorkspace, ProfileQuery } from "../../user-profile-store/src/public.js";

type Stored<T> = Readonly<{ value: T; object_hash: string }>;
type ObjectRef = CreationLearningEventV1["source_refs"][number];
type EditRef = Readonly<{ edit_ir_id: string; timeline_version: number; digest: string }>;
export type CreationWorkspaceRecords = Readonly<{
  project_id: string;
  requests: readonly Readonly<{
    latest: Stored<CreationState>;
    history: readonly Readonly<{ value: CreationState; ref: ObjectRef }>[];
    materials: readonly Stored<CreationMaterialV1>[];
    drafts: readonly Readonly<{ draft: CreationState["drafts"][number]; execution: Stored<CreationDraftExecutionV1> & { ref: CreationRenderV1["execution_ref"]; edit_ref: EditRef }; renders: readonly Stored<CreationRenderV1>[] }>[];
  }>[];
  observations: readonly Stored<CreationObservationV1>[];
  learning: readonly Readonly<{ attempt: Stored<CreationLearningAttemptV1>; result: Stored<CreationLearningResultV1> | null; response_saved: boolean }>[];
  timelines: readonly ObjectRef[];
}>;
export type CreationWorkspaceInput = Readonly<{ profile_query: Omit<ProfileQuery, "project_id"> | null }>;
export function parseCreationWorkspaceInput(value: unknown): CreationWorkspaceInput {
  const input = value as CreationWorkspaceInput;
  if (!input || typeof input !== "object" || Object.keys(input).join(",") !== "profile_query") throw new CreationError("CREATION_WORKSPACE_INPUT_INVALID", "an explicit profile query or null is required");
  const query = input.profile_query;
  if (query !== null && (!query || typeof query !== "object" || Object.keys(query).sort().join(",") !== "contexts,except_principle_ids" || !Array.isArray(query.contexts) || !query.contexts.length || !Array.isArray(query.except_principle_ids) || [query.contexts, query.except_principle_ids].some(values => values.some(item => typeof item !== "string" || !item.trim()) || new Set(values).size !== values.length))) throw new CreationError("CREATION_WORKSPACE_INPUT_INVALID", "profile contexts and one-work exclusions must be explicit and distinct");
  return structuredClone(input);
}
const stateRef = (state: CreationState, hash: string) => ({ request_id: state.authorization.request_id, sequence: state.sequence, digest: hash });
const selectionContent = (state: CreationState) => ({ ...state, sequence: 0, adopted_draft_id: null });
const qcSummary = (value: unknown) => {
  // The storage reader already validated each full QC report and its render binding.
  const report = value as QCReport;
  return { status: report.status, issues: report.issues.map(issue => ({ code: issue.code, severity: issue.severity, blocker: issue.blocker === true })) };
};

/** Field allowlist: private paths, transport inputs, sample bytes and historical profile bodies stay in Host. */
export function projectCreationWorkspace(records: CreationWorkspaceRecords, actor: string, timelineVersion: number, profile: ProfileWorkspace | null) {
  const requests = records.requests.filter(row => row.latest.value.authorization.actor_id === actor).map(row => {
    const state = row.latest.value, authorization = state.authorization;
    const adoptions = row.history.flatMap((saved, index) => {
      const previous = row.history[index - 1]?.value, current = saved.value;
      if (!previous || current.adopted_draft_id === null || previous.adopted_draft_id === current.adopted_draft_id || creationDigest(selectionContent(previous)) !== creationDigest(selectionContent(current))) return [];
      return [{ state_ref: stateRef(current, saved.ref.digest), draft_id: current.adopted_draft_id, previous_draft_id: previous.adopted_draft_id }];
    });
    return {
      state_ref: stateRef(state, row.latest.object_hash), status: state.status, revoked: state.revoked,
      authorization_generation: state.authorization_generation, cancellation_generation: state.cancellation_generation,
      authorization: { request_id: authorization.request_id, actor_id: authorization.actor_id, original_text: authorization.original_text, asset_ids: [...authorization.asset_ids], provider: authorization.provider, model: authorization.model, deployment: authorization.deployment === null ? null : { ...authorization.deployment }, allowed_data: [...authorization.allowed_data], protected_refs: [...authorization.protected_refs], policy_version: authorization.policy_version, expires_at: authorization.expires_at },
      revisions: state.revisions.map(revision => ({ revision: revision.revision, raw_text: revision.raw_text, base_timeline_version: revision.base_timeline_version, viewed_timeline_version: revision.viewed_timeline_version, preserve_refs: [...revision.preserve_refs], created_at: revision.created_at })),
      latest_draft_id: state.latest_draft_id, adopted_draft_id: state.adopted_draft_id, viewed_draft_id: state.viewed_draft_id,
      active_run: state.active_run === null ? null : { run_id: state.active_run.run_id, revision: state.active_run.revision, base_timeline_version: state.active_run.base_timeline_version },
      model_calls: state.model_calls.map(call => ({ ...(call.target ? { target: { ...call.target } } : {}), call_id: call.call_id, run_id: call.run_id, revision: call.revision, provider: call.provider, model: call.model, attempt: call.attempt, input_bytes: call.input_bytes, dispatch_committed_at: call.dispatch_committed_at, settlement: call.settlement === null ? null : { status: call.settlement.status, usage: call.settlement.usage === null ? null : { ...call.settlement.usage }, cost: call.settlement.cost === null ? null : { ...call.settlement.cost }, completed_at: call.settlement.completed_at } })),
      materials: row.materials.map(({ value, object_hash }) => ({ operation_id: value.operation_id, digest: object_hash, asset_id: value.asset_id, authorization_generation: value.authorization_generation, created_at: value.created_at })),
      observations: records.observations.filter(item => item.value.ticket.request_id === authorization.request_id).map(({ value, object_hash }) => ({ ref: { run_id: value.ticket.run_id, digest: object_hash }, revision: value.ticket.revision, asset_ids: [...new Set(value.materials.map(item => item.asset_id))], span_count: value.spans.length, sample_count: value.samples.length, evidence_count: value.evidence_refs.length, created_at: value.created_at })),
      drafts: row.drafts.map(({ draft, execution, renders }) => ({
        draft_id: draft.draft_id, parent_draft_id: draft.parent_draft_id, revision: draft.revision, timeline_version: draft.timeline_version, base_timeline_version: draft.base_timeline_version,
        source: draft.source.kind === "manual" ? { kind: "manual" as const, operation_id: draft.source.operation_id, raw_text: draft.source.raw_text, preserve_refs: [...draft.source.preserve_refs] } : { kind: "model" as const, run_id: draft.source.run_id },
        execution_ref: { object_id: execution.ref.object_id, object_version: execution.ref.object_version, digest: execution.ref.digest },
        edit_ref: { edit_ir_id: execution.edit_ref.edit_ir_id, timeline_version: execution.edit_ref.timeline_version, digest: execution.edit_ref.digest },
        renders: renders.map(({ value, object_hash }) => ({ operation_id: value.operation_id, receipt_digest: object_hash, render_id: value.bundle.render_id, timeline_version: value.timeline_version, semantic_graph_hash: value.semantic_graph_hash, created_at: value.created_at, preview: { output_hash: value.preview.output_hash, qc: qcSummary(value.preview.qc_report) }, master: { output_hash: value.master.output_hash, qc: qcSummary(value.master.qc_report) } })),
      })),
      adoptions,
      learning: records.learning.filter(item => item.attempt.value.ticket.request_id === authorization.request_id).map(item => {
        const attempt = item.attempt.value, source = attempt.permit.source;
        const registration = profile?.registrations.find(value => value.source_project_id === source.source_project_id && value.source_event_id === source.source_event_id) ?? null;
        if (registration?.state === "registered" && (!item.result || profile!.snapshot.profile_id !== attempt.permit.profile_id || registration.result_digest !== creationDigest(item.result.value.outcome))) throw new CreationError("CREATION_LEARNING_REGISTRATION_REBOUND", "profile registration differs from the project's exact extraction");
        return { operation_id: attempt.operation_id, revision: attempt.ticket.revision, run_id: attempt.ticket.run_id, data_type: source.data_type, event_digest: attempt.event_digest, response_saved: item.response_saved, extraction: item.result === null ? null : { digest: item.result.object_hash, output_digest: item.result.value.output_digest, result_digest: creationDigest(item.result.value.outcome) }, registration };
      }),
    };
  });
  const content = { project_id: records.project_id, timeline_version: timelineVersion, timeline_refs: records.timelines.map(ref => ({ timeline_version: ref.version, digest: ref.digest })), requests, profile };
  return { ...content, workspace_digest: creationDigest(content) };
}
export type CreationWorkspace = ReturnType<typeof projectCreationWorkspace>;
