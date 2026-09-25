import type { CreationLearningEventV1 } from "../../../../contracts/generated/typescript/editorial/creation-learning-event.v1.js";
import type { CreationLearningDecisionV1 } from "../../../../contracts/generated/typescript/editorial/creation-learning-decision.v1.js";
import type { CreationState } from "./stage3-request.js";
import type { Timeline } from "../../../core/timeline-core/src/public.js";
import { assertProfileCorrection, type ProfileCorrection, type ProfileLearningSource, type ProfileLearningOutcome } from "../../user-profile-store/src/public.js";
import { assertValidTimeline } from "../../../core/timeline-core/src/public.js";
import { assertPreservedCreationContent } from "../../../core/edit-ir/src/public.js";
import { creationDigest, CreationError, creationLearningEventV1Validator, creationLearningDecisionV1Validator } from "../../contract-runtime/src/public.js";
import { readCreationLearningObject, readCreationObservation, readCreationDraftExecution } from "../../project-storage/src/public.js";
import { creationTimelineContext, type CreationObservationReference } from "./stage3-creative.js";

type StateReference = Readonly<{ request_id: string; sequence: number; digest: string }>;
export type CreationLearningSelection =
  | Readonly<{ data_type: "history_reference"; timeline_version: number | null; observation_refs: readonly CreationObservationReference[]; raw_text: string | null }>
  | Readonly<{ data_type: "feedback"; state_ref: StateReference; revision: number; result_draft_id: string | null }>
  | Readonly<{ data_type: "manual_diff"; edit_ref: Readonly<{ edit_ir_id: string; timeline_version: number; digest: string }>; raw_text: string }>
  | Readonly<{ data_type: "selection"; state_ref: StateReference }>;
export type CreationLearningInput = Readonly<{ operation_id: string; request_id: string; expected_revision: number; selection: CreationLearningSelection; correction: ProfileCorrection | null }>;
type SourceRef = CreationLearningEventV1["source_refs"][number];
const fail = (code: string, message: string): never => { throw new CreationError(code, message); };
const object = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("CREATION_LEARNING_INPUT_INVALID", "an explicit learning selection is required");
  return value as Record<string, any>;
};
const exact = (value: Record<string, any>, fields: readonly string[]) => {
  if (Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) fail("CREATION_LEARNING_INPUT_INVALID", "learning fields differ from the current contract");
};
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const integer = (value: unknown, minimum = 0): value is number => Number.isSafeInteger(value) && (value as number) >= minimum;
const digest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function learningJson(value: unknown): string {
  const canonical = (item: any): any => typeof item === "bigint" ? item.toString() : Array.isArray(item) ? item.map(canonical) : item !== null && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().filter(key => item[key] !== undefined).map(key => [key, canonical(item[key])])) : item;
  return JSON.stringify(canonical(value));
}

export function parseCreationLearningInput(value: unknown): CreationLearningInput {
  const input = object(value); exact(input, ["operation_id", "request_id", "expected_revision", "selection", "correction"]);
  assertProfileCorrection(input.correction);
  if (!text(input.operation_id) || !text(input.request_id) || !integer(input.expected_revision, 1)) fail("CREATION_LEARNING_INPUT_INVALID", "operation, request and revision must be explicit");
  const selection = object(input.selection);
  const stateRef = (value: unknown) => { const ref = object(value); exact(ref, ["request_id", "sequence", "digest"]); if (!text(ref.request_id) || !integer(ref.sequence, 1) || !digest(ref.digest)) fail("CREATION_LEARNING_INPUT_INVALID", "exact state reference required"); };
  switch (selection.data_type) {
    case "history_reference": {
      exact(selection, ["data_type", "timeline_version", "observation_refs", "raw_text"]);
      if (selection.timeline_version !== null && !integer(selection.timeline_version) || selection.raw_text !== null && !text(selection.raw_text) || !Array.isArray(selection.observation_refs) || selection.timeline_version === null && !selection.observation_refs.length) fail("CREATION_LEARNING_INPUT_INVALID", "choose actual history or observed reference media");
      const ids = new Set();
      for (const item of selection.observation_refs) { const ref = object(item); exact(ref, ["run_id", "digest"]); if (!text(ref.run_id) || !digest(ref.digest) || ids.has(ref.run_id)) fail("CREATION_LEARNING_INPUT_INVALID", "observation references must be exact and unique"); ids.add(ref.run_id); }
      break;
    }
    case "feedback":
      exact(selection, ["data_type", "state_ref", "revision", "result_draft_id"]); stateRef(selection.state_ref);
      if (!integer(selection.revision, 2) || selection.result_draft_id !== null && !text(selection.result_draft_id)) fail("CREATION_LEARNING_INPUT_INVALID", "feedback must name a saved successor revision");
      break;
    case "manual_diff": {
      exact(selection, ["data_type", "edit_ref", "raw_text"]); const ref = object(selection.edit_ref); exact(ref, ["edit_ir_id", "timeline_version", "digest"]);
      if (!text(ref.edit_ir_id) || !integer(ref.timeline_version, 1) || !digest(ref.digest) || !text(selection.raw_text)) fail("CREATION_LEARNING_INPUT_INVALID", "user-endorsed exact edit reference and original statement required");
      break;
    }
    case "selection": exact(selection, ["data_type", "state_ref"]); stateRef(selection.state_ref); break;
    default: fail("CREATION_LEARNING_INPUT_INVALID", "unsupported learning source kind");
  }
  if (input.correction !== null && !["feedback", "manual_diff"].includes(selection.data_type)) fail("CREATION_CORRECTION_SOURCE_INVALID", "a correction requires explicit user feedback or an endorsed manual difference");
  return structuredClone(input) as CreationLearningInput;
}

// Revive only numeric Timeline fields; a caption such as "1n" stays user text.
const timelineNumbers = new Set(["timeline_start", "timeline_duration", "start_pts", "end_pts", "timescale", "value", "start", "end", "time"]);
function timelineValue(value: any, key = ""): any {
  if (timelineNumbers.has(key) && typeof value === "string" && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1));
  if (Array.isArray(value)) return value.map(item => timelineValue(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, timelineValue(item, field)]));
  return value;
}
function timelineFacts(timeline: Timeline): any {
  assertValidTimeline(timeline);
  if (timeline.sequences?.length || timeline.tracks.some(track => track.effects?.length || track.keyframes?.length || track.automation_curves?.length || track.transitions?.length)) fail("CREATION_LEARNING_TIMELINE_UNSUPPORTED", "selected history has semantics outside the current exact learning projection");
  const value = creationTimelineContext(timeline) as any;
  for (const [index, track] of value.tracks.entries()) {
    const original = timeline.tracks[index]!;
    if (original.blend_mode !== undefined) track.blend_mode = original.blend_mode;
    if (original.gaps !== undefined) track.gaps = original.gaps;
    if (original.audio_routing !== undefined) track.audio_routing = original.audio_routing;
    delete track.semantic_sidecar;
    for (const [clipIndex, clip] of track.clips.entries()) {
      if (clip.unsupported_semantics) fail("CREATION_LEARNING_TIMELINE_UNSUPPORTED", "selected history requires an explicit additional semantic projection");
      if (original.clips[clipIndex]!.kind !== undefined) clip.kind = original.clips[clipIndex]!.kind;
      delete clip.semantic_sidecar; delete clip.unsupported_semantics;
    }
    for (const [captionIndex, caption] of (track.captions ?? []).entries()) {
      const style = original.captions![captionIndex]!.style;
      if (style && Object.keys(style).some(key => /path|file|url|uri/i.test(key))) fail("CREATION_LEARNING_TIMELINE_UNSUPPORTED", "caption resource paths require an explicit path-free projection");
      if (style !== undefined) caption.style = style;
      delete caption.semantic_sidecar;
    }
  }
  if (timeline.sequence?.duration !== undefined) value.sequence.duration = timeline.sequence.duration;
  return { ...value, master_loudness: timeline.master_loudness ?? null, dialogue_music_ducking: timeline.dialogue_music_ducking ?? null };
}
function timelineItems(value: any, includeTrackContent = false): Map<string, unknown> {
  const entries: [string, unknown][] = [["sequence", value.sequence], ["master_loudness", value.master_loudness], ["dialogue_music_ducking", value.dialogue_music_ducking]];
  for (const [order, track] of value.tracks.entries()) {
    const { clips, captions, ...settings } = track;
    entries.push([`track:${track.track_id}`, includeTrackContent ? { ...track, order } : { ...settings, order, clip_order: clips.map((clip: any) => clip.clip_id), caption_order: (captions ?? []).map((caption: any) => caption.caption_id) }]);
    for (const clip of clips) entries.push([`clip:${clip.clip_id}`, { track_id: track.track_id, ...clip }]);
    for (const caption of captions ?? []) entries.push([`caption:${caption.caption_id}`, { track_id: track.track_id, ...caption }]);
  }
  return new Map(entries);
}

/** Host constructs this from fixed objects. Caller text is only an explicit user selection. */
export function buildCreationLearningEvent(session: unknown, request: CreationState, actorId: string, input: CreationLearningInput, createdAt: string): CreationLearningEventV1 {
  const projectId = request.project_id, refs = new Map<string, SourceRef>(), facts: CreationLearningEventV1["facts"] = [], assets = new Set<string>(), requested = new Set<string>(), unchanged = new Set<string>();
  const addFact = (kind: CreationLearningEventV1["facts"][number]["kind"], content: string, sourceRefs: readonly SourceRef[]) => facts.push({ fact_id: `learning:${input.operation_id}:fact:${facts.length}`, kind, content, source_ref_ids: sourceRefs.map(ref => ref.object_ref_id) });
  const read = (kind: SourceRef["object_type"], key: string, version: number, expected: string | null = null): { value: any; ref: SourceRef } => {
    const result = readCreationLearningObject(session, projectId, kind, key, version, expected) as { value: any; ref: SourceRef };
    refs.set(result.ref.object_ref_id, result.ref); return result;
  };
  const readTimeline = (version: number) => {
    const result = read("timeline_snapshot", `timeline:${version}`, version), timeline = timelineValue(result.value) as Timeline, projection = timelineFacts(timeline);
    for (const track of timeline.tracks) for (const clip of track.clips) assets.add(clip.source.asset_id);
    addFact("timeline", learningJson(projection), [result.ref]); return { timeline, projection, ref: result.ref };
  };
  const compare = (before: ReturnType<typeof readTimeline>, after: ReturnType<typeof readTimeline>, preserve: readonly string[]) => {
    const left = timelineItems(before.projection), right = timelineItems(after.projection), changed: unknown[] = [];
    const exactLeft = timelineItems(before.projection, true), exactRight = timelineItems(after.projection, true);
    for (const id of [...new Set([...left.keys(), ...right.keys()])].sort()) {
      const a = left.get(id) ?? null, b = right.get(id) ?? null;
      if (learningJson(a) !== learningJson(b)) changed.push({ ref: id, before: a, after: b });
      // A track includes its children. Unchanged track settings alone do not
      // establish that its captions, clips or their ordering were preserved.
      if (learningJson(exactLeft.get(id) ?? null) === learningJson(exactRight.get(id) ?? null)) unchanged.add(id);
    }
    addFact("difference", learningJson({ before_version: before.timeline.version, after_version: after.timeline.version, changed }), [before.ref, after.ref]);
    const violations: { ref: string; code: string }[] = [], contentPreserved: string[] = [];
    for (const ref of preserve) {
      requested.add(ref);
      try { assertPreservedCreationContent(before.timeline, after.timeline, [ref]); contentPreserved.push(ref); }
      catch (cause) {
        const code = cause instanceof Error ? cause.message.split(":")[0] : "";
        if (!["CREATION_PROTECTED_CONTENT_CHANGED", "CREATION_PRESERVATION_REFERENCE_INVALID", "CREATION_PRESERVATION_ANCHOR_MISSING"].includes(code)) throw cause;
        violations.push({ ref, code });
        for (const key of unchanged) if (key === ref || ["track:", "clip:", "caption:"].some(prefix => key === `${prefix}${ref}`)) unchanged.delete(key);
      }
    }
    addFact("preservation", learningJson({ requested: preserve, content_preserved_refs: contentPreserved, verified_unchanged: [...unchanged].sort(), violations }), [before.ref, after.ref]);
  };
  const selection = input.selection;
  if (selection.data_type === "history_reference") {
    if (selection.raw_text !== null) addFact("user_statement", selection.raw_text, []);
    if (selection.timeline_version !== null) readTimeline(selection.timeline_version);
    for (const ref of selection.observation_refs) {
      const source = read("creation_observation", ref.run_id, 1, ref.digest), observed = readCreationObservation(session, projectId, ref.run_id);
      for (const sample of source.value.samples) assets.add(sample.asset_id);
      // Include only the actual observation result and source-time descriptors,
      // never the original model input, profile snapshot or narrative summary.
      addFact("observation", learningJson({ spans: observed.value.spans, samples: observed.value.samples.map((item: any) => ({ span_id: item.span_id, asset_id: item.asset_id, sample_id: item.sample.sample_id, kind: item.sample.detail.kind, start: item.sample.actual_start, end: item.sample.actual_end })), observations: observed.output.samples }), [source.ref]);
    }
  } else if (selection.data_type === "manual_diff") {
    const selected = selection.edit_ref, edit = read("edit_ir", selected.edit_ir_id, selected.timeline_version, selected.digest);
    addFact("user_statement", selection.raw_text, [edit.ref]);
    const before = readTimeline(edit.value.base_version), after = readTimeline(selected.timeline_version);
    compare(before, after, [...new Set<string>([...edit.value.protected_refs, ...edit.value.preconditions.filter((item: any) => item.kind === "content_preserved").flatMap((item: any) => item.refs)])]);
    addFact("selection", learningJson({ user_endorsed_edit_ir: selected.edit_ir_id, base_version: edit.value.base_version, result_version: selected.timeline_version }), [edit.ref]);
  } else {
    const selected = selection.state_ref, source = read("creation_session", selected.request_id, selected.sequence, selected.digest), state = source.value as CreationState;
    if (selection.data_type === "feedback") {
      const revision = state.revisions[selection.revision - 1];
      if (!revision || revision.revision !== selection.revision) fail("CREATION_LEARNING_REVISION_UNAVAILABLE", "selected state does not contain that exact user revision");
      addFact("user_statement", revision.raw_text, [source.ref]);
      addFact("selection", learningJson({ revision: revision.revision, viewed_timeline_version: revision.viewed_timeline_version, base_timeline_version: revision.base_timeline_version }), [source.ref]);
      if (revision.viewed_timeline_version !== null && revision.viewed_timeline_version !== revision.base_timeline_version) readTimeline(revision.viewed_timeline_version);
      const before = readTimeline(revision.base_timeline_version), preserve = [...new Set([...state.authorization.protected_refs, ...revision.preserve_refs])];
      preserve.forEach(ref => requested.add(ref));
      if (selection.result_draft_id !== null) {
        const draft = state.drafts.find(item => item.draft_id === selection.result_draft_id);
        if (!draft || draft.revision !== selection.revision || !readCreationDraftExecution(session, projectId, draft.draft_id)) fail("CREATION_LEARNING_DRAFT_UNAVAILABLE", "selected result is not this feedback revision's real saved draft");
        let member = draft!;
        while (member.base_timeline_version > revision.base_timeline_version) {
          const parent = state.drafts.find(item => item.draft_id === member.parent_draft_id);
          if (!parent || parent.revision !== selection.revision || parent.timeline_version !== member.base_timeline_version || !readCreationDraftExecution(session, projectId, parent.draft_id)) fail("CREATION_LEARNING_DRAFT_UNAVAILABLE", "feedback result has a broken revision draft chain");
          member = parent!;
        }
        if (member.base_timeline_version !== revision.base_timeline_version) fail("CREATION_LEARNING_DRAFT_UNAVAILABLE", "feedback result does not extend the selected revision base");
        compare(before, readTimeline(draft!.timeline_version), preserve);
      }
    } else {
      if (selected.sequence <= 1 || state.adopted_draft_id === null) fail("CREATION_LEARNING_SELECTION_UNAVAILABLE", "selected state must record an actual adoption");
      const previous = read("creation_session", selected.request_id, selected.sequence - 1);
      const withoutPointer = (value: CreationState) => ({ ...value, sequence: 0, adopted_draft_id: null });
      if (previous.value.adopted_draft_id === state.adopted_draft_id || creationDigest(withoutPointer(previous.value)) !== creationDigest(withoutPointer(state))) fail("CREATION_LEARNING_SELECTION_UNAVAILABLE", "state transition is not the user's adoption change");
      const draft = state.drafts.find(item => item.draft_id === state.adopted_draft_id)!;
      if (!readCreationDraftExecution(session, projectId, draft.draft_id)) fail("CREATION_LEARNING_DRAFT_UNAVAILABLE", "adopted version lacks its exact draft execution");
      readTimeline(draft.timeline_version);
      addFact("selection", learningJson({ adopted_draft_id: draft.draft_id, previous_adopted_draft_id: previous.value.adopted_draft_id, timeline_version: draft.timeline_version, note: "Other versions were not implicitly rejected." }), [previous.ref, source.ref]);
    }
  }
  if (!assets.size || [...assets].some(asset => !request.authorization.asset_ids.includes(asset))) fail("CREATION_LEARNING_ASSET_DENIED", "all selected historical material must be covered by this request");
  const value: CreationLearningEventV1 = { schema_version: 1, project_id: projectId, event_id: input.operation_id, request_id: input.request_id, actor_id: actorId, data_type: selection.data_type, selection_json: learningJson(selection), correction_digest: input.correction === null ? null : creationDigest(input.correction), source_refs: [...refs.values()], facts, asset_ids: [...assets].sort(), requested_preserve_refs: [...requested].sort(), verified_unchanged_refs: [...unchanged].sort(), created_at: createdAt };
  if (!creationLearningEventV1Validator(value)) fail("CREATION_LEARNING_EVENT_INVALID", JSON.stringify(creationLearningEventV1Validator.errors));
  return value;
}

export function creationLearningSource(event: CreationLearningEventV1): ProfileLearningSource {
  return { source_project_id: event.project_id, source_event_id: event.event_id, content_digest: creationDigest(event), data_type: event.data_type, evidence_refs: event.facts.map(fact => fact.fact_id), correction_digest: event.correction_digest };
}
export function bindCreationLearningDecision(value: unknown, event: CreationLearningEventV1, createdAt: string): ProfileLearningOutcome {
  if (!creationLearningDecisionV1Validator(value)) fail("CREATION_LEARNING_DECISION_INVALID", JSON.stringify(creationLearningDecisionV1Validator.errors));
  const output = value as CreationLearningDecisionV1, source = creationLearningSource(event), allowed = new Set(source.evidence_refs);
  const principles = output.principles.map((item, index) => {
    if (!item.statement.trim() || item.contexts.some(context => !context.trim()) || item.evidence_refs.some(ref => !allowed.has(ref))) fail("CREATION_LEARNING_EVIDENCE_INVALID", "every extracted principle must cite exact selected facts");
    return { ...item, principle_id: `principle:${creationDigest({ event: source, index, item })}`, source_project_id: event.project_id, source_event_id: event.event_id, source_digest: source.content_digest, data_type: event.data_type, status: "hypothesis" as const, created_at: createdAt };
  });
  return { principles, no_inference_reason: output.no_inference_reason };
}
