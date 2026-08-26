import assert from "node:assert/strict";
import { compileApprovedEditorialIntent, compileFeedbackRevision, resolveCommandEditIntent, FEEDBACK_REVISION_COMPILER_ID, SEMANTIC_INTENT_COMPILER_ID, SEMANTIC_INTENT_COMPILER_VERSION } from "../../packages/core/edit-ir/src/public.js";
import type { EditorialEditIntentV1 } from "../../contracts/generated/typescript/editorial/editorial-edit-intent.v1.js";
import type { ApprovedStoryPlanV2 } from "../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import { simulateCommands, type Timeline } from "../../packages/core/timeline-core/src/public.js";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";
import { canonicalSerialize } from "../../packages/core/render-graph/src/public.js";
import { editorialObjectDigest } from "../../packages/core/editorial-core/src/public.js";
import { diagnoseFeedbackRevision, createFeedbackRevisionIntent } from "../../packages/features/feedback/src/public.js";
import { createHash } from "node:crypto";

const digest = (value: string) => value.repeat(64);
const evidenceRef = { object_id: "asr:first", object_version: 1, digest: digest("e") };
const plan: ApprovedStoryPlanV2 = { schema_version: 2, plan_id: "plan", object_version: 1, status: "approved", proposal_ref: { object_id: "proposal", object_version: 1, digest: digest("1") }, direction_ref: { object_id: "direction", object_version: 2, digest: digest("2") }, contract_ref: { object_id: "contract", object_version: 2, digest: digest("3") }, material_pack_ref: { object_id: "pack", object_version: 1, digest: digest("4") }, duration_feasibility_ref: { object_id: "duration", object_version: 1, digest: digest("5") }, thesis: "Use approved evidence", audience_promise: "Show the real moment", beats: [{ beat_id: "hook", role: "hook", purpose: "open", target_duration: { schema_version: 1, value: 1, timescale: 1 }, evidence_refs: [evidenceRef], coverage_requirement_ids: ["req"], entry_state: "before", exit_state: "after", desired_emotion: "curiosity" }], duration_budget: { schema_version: 1, value: 1, timescale: 1 }, emotional_curve: [{ phase: "hook", position: 0, intensity: 0.8 }], decision_ref: { object_id: "decision", object_version: 1, digest: digest("6") }, approval: { actor_id: "user", actor_kind: "user", approved_at: "2026-08-24T01:00:00Z", review_digest: digest("7") }, created_at: "2026-08-24T01:00:00Z", provenance: { producer: "project-host", source_version: "story", policy_version: "story", input_refs: [digest("6")] } };
const planDigest = digest("8"), asset = `asset:sha256:${digest("a")}` as AssetId;
const intent: EditorialEditIntentV1 = { schema_version: 1, intent_id: "intent", object_version: 1, status: "candidate", base_timeline_version: 0, approved_story_ref: { object_id: plan.plan_id, object_version: 1, digest: planDigest }, decision_refs: [plan.decision_ref], evidence_refs: [evidenceRef], contract_ref: plan.contract_ref, capability_snapshot_ref: { object_id: "capabilities", object_version: 1, digest: digest("9") }, operations: [{ operation_id: "select-hook", kind: "select_evidence", target_refs: ["beat:hook", "evidence:asr:first"], parameter_values: { priority: 1 }, expected_effect: "place approved hook", required_capabilities: ["semantic-evidence-selection"], unsupported_policy: "block" }], preconditions: ["timeline remains current"], protected_refs: [], reason: "compile exact approved evidence", alternatives: [], risks: [], confidence: { score: 1, basis: ["approved evidence"] }, actor: { actor_id: "project-host", actor_kind: "policy" }, input_fingerprint: digest("b"), created_at: "2026-08-24T01:01:00Z", provenance: { producer: "project-host", source_version: "intent", policy_version: "story", input_refs: [planDigest] } };
const timeline: Timeline = { version: 0, tracks: [{ track_id: "v1", kind: "video", clips: [] }] };
const evidence = [{ evidence_id: evidenceRef.object_id, evidence_version: 1, object_hash: evidenceRef.digest, asset_id: asset, start_pts: 0, end_pts: 48000, timescale: 48000, review_status: "approved" as const }];
const input = { intent, intent_digest: digest("c"), plan, plan_digest: planDigest, evidence, timeline };

const first = compileApprovedEditorialIntent(input), second = compileApprovedEditorialIntent(input);
assert.deepEqual(first, second, "same exact authorities must compile deterministically");
assert.equal(first.effect.compiler_id, SEMANTIC_INTENT_COMPILER_ID); assert.equal(first.effect.compiler_version, SEMANTIC_INTENT_COMPILER_VERSION);
assert.equal(first.command_intent.commands.length, 1); assert.equal(first.command_intent.commands[0]?.type, "add_clip");
assert.equal(first.effect.clips[0]?.timeline_duration, "48000"); assert.equal(first.effect.clips[0]?.source_timescale, "48000");
assert.equal(resolveCommandEditIntent(first.command_intent, timeline).schema_version, 2);

assert.throws(() => compileApprovedEditorialIntent({ ...input, timeline: { ...timeline, version: 1 } }), /SEMANTIC_TIMELINE_STALE/);
assert.throws(() => compileApprovedEditorialIntent({ ...input, evidence: [{ ...evidence[0]!, object_hash: digest("d") }] }), /SEMANTIC_EVIDENCE_REBOUND/);
assert.throws(() => compileApprovedEditorialIntent({ ...input, intent: { ...intent, operations: [{ ...intent.operations[0]!, kind: "set_pacing", required_capabilities: ["semantic-pacing"] }] } }), /SEMANTIC_OPERATION_UNSUPPORTED/);
assert.throws(() => compileApprovedEditorialIntent({ ...input, timeline: { ...timeline, tracks: [...timeline.tracks, { track_id: "v2", kind: "video", clips: [] }] } }), /SEMANTIC_VIDEO_TRACK_AMBIGUOUS/);
const protectedCompilation = compileApprovedEditorialIntent({ ...input, intent: { ...intent, protected_refs: [asset] } });
assert.throws(() => resolveCommandEditIntent(protectedCompilation.command_intent, timeline), /EDIT_PROTECTED_REFERENCE/);
assert.throws(() => compileApprovedEditorialIntent({ ...input, evidence: [{ ...evidence[0]!, end_pts: 1, timescale: 3 }], timeline: { ...timeline, sequence: { sequence_id: "main", timebase: { value: 1n, timescale: 2n }, tracks: [] } } }), /SEMANTIC_TIMEBASE_NOT_EXACT/);

const firstCut = simulateCommands(timeline, first.command_intent.commands), clip = firstCut.tracks[0]!.clips[0]!;
function feedbackCase(caseId: string, caseTimeline: Timeline, targetClip: Timeline["tracks"][number]["clips"][number], trimTicks: bigint) {
  const timelineDigest = createHash("sha256").update(canonicalSerialize(caseTimeline)).digest("hex");
  const diagnosis = diagnoseFeedbackRevision({ diagnosis_id: `diagnosis-${caseId}`, feedback_text: "收短这个开场镜头", base_execution_ref: { object_id: "execution-first", object_version: 1, digest: digest("f") }, base_timeline_ref: { version: caseTimeline.version, digest: timelineDigest }, target: { track_id: "v1", clip_id: targetClip.clip_id, original_source: { asset_id: targetClip.source.asset_id, start: { schema_version: 1, value: Number(targetClip.source.start_pts), timescale: Number(targetClip.source.timescale) }, end: { schema_version: 1, value: Number(targetClip.source.end_pts), timescale: Number(targetClip.source.timescale) } }, proposed_source: { asset_id: targetClip.source.asset_id, start: { schema_version: 1, value: Number(targetClip.source.start_pts), timescale: Number(targetClip.source.timescale) }, end: { schema_version: 1, value: Number(targetClip.source.end_pts - trimTicks), timescale: Number(targetClip.source.timescale) } } }, authority_refs: { approved_story_ref: intent.approved_story_ref, decision_refs: intent.decision_refs, evidence_refs: intent.evidence_refs, contract_ref: intent.contract_ref, capability_snapshot_ref: intent.capability_snapshot_ref }, reason: "one strict local trim", alternatives: ["retain first cut"], confidence: { score: 1, basis: ["exact clip and range"] }, created_at: "2026-08-24T04:00:00Z" });
  const feedbackIntent = createFeedbackRevisionIntent(diagnosis, intent, { intent_id: `intent-${caseId}`, created_at: diagnosis.created_at });
  return { diagnosis, feedbackIntent, feedbackInput: { intent: feedbackIntent, intent_digest: editorialObjectDigest(feedbackIntent), plan, plan_digest: planDigest, evidence, timeline: caseTimeline, timeline_digest: timelineDigest, diagnosis, diagnosis_digest: editorialObjectDigest(diagnosis), base_execution_digest: diagnosis.base_execution_ref.digest } };
}
const { diagnosis, feedbackIntent, feedbackInput } = feedbackCase("trim", firstCut, clip, 12000n);
const feedbackCompilation = compileFeedbackRevision(feedbackInput);
assert.equal(feedbackCompilation.effect.compiler_id, FEEDBACK_REVISION_COMPILER_ID); assert.equal(feedbackCompilation.command_intent.commands.length, 1); assert.equal(feedbackCompilation.command_intent.commands[0]?.type, "trim_source"); assert.deepEqual(feedbackCompilation.effect.affected_scope, [`clip:${clip.clip_id}`]);
assert.throws(() => compileFeedbackRevision({ ...feedbackInput, timeline_digest: digest("0") }), /FEEDBACK_REVISION_TIMELINE_STALE/);
assert.throws(() => compileFeedbackRevision({ ...feedbackInput, diagnosis: { ...diagnosis, target: { ...diagnosis.target, clip_id: "missing" } } }), /FEEDBACK_REVISION_TARGET_AMBIGUOUS|FEEDBACK_REVISION_OPERATION_UNSUPPORTED/);
assert.throws(() => compileFeedbackRevision({ ...feedbackInput, intent: { ...feedbackIntent, protected_refs: [`clip:${clip.clip_id}`] } }), /FEEDBACK_REVISION_TARGET_PROTECTED/);
assert.throws(() => compileFeedbackRevision({ ...feedbackInput, intent: { ...feedbackIntent, operations: [{ ...feedbackIntent.operations[0]!, kind: "set_pacing", required_capabilities: ["semantic-pacing"] }] } }), /FEEDBACK_REVISION_OPERATION_UNSUPPORTED/);

const equivalentTimeline: Timeline = { ...firstCut, sequence: { sequence_id: "main", timebase: { value: 2n, timescale: 96000n }, tracks: [] } };
const equivalentCompilation = compileFeedbackRevision(feedbackCase("equivalent-timebase", equivalentTimeline, equivalentTimeline.tracks[0]!.clips[0]!, 12000n).feedbackInput);
assert.equal(equivalentCompilation.command_intent.commands[0]?.type, "trim_source", "an exactly equivalent RationalTime tick must remain supported");

const explicitMismatchTimeline: Timeline = { ...firstCut, sequence: { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] } };
assert.throws(() => compileFeedbackRevision(feedbackCase("explicit-mixed-timebase", explicitMismatchTimeline, explicitMismatchTimeline.tracks[0]!.clips[0]!, 12000n).feedbackInput), /FEEDBACK_TRIM_TIMEBASE_UNSUPPORTED/, "an explicit non-equivalent Timeline tick must fail closed");

const speedTimeline: Timeline = { ...firstCut, tracks: [{ ...firstCut.tracks[0]!, clips: [{ ...clip, speed: { numerator: 1n, denominator: 2n } }] }] };
assert.throws(() => compileFeedbackRevision(feedbackCase("speed", speedTimeline, speedTimeline.tracks[0]!.clips[0]!, 12000n).feedbackInput), /FEEDBACK_TRIM_RETIME_UNSUPPORTED/, "a non-unit-speed clip needs a retime-aware trim command");
const mappedTimeline: Timeline = { ...firstCut, tracks: [{ ...firstCut.tracks[0]!, clips: [{ ...clip, time_map: { map_id: "identity-map", pitch_policy: "preserve", segments: [{ segment_id: "identity", timeline_start: 0n, timeline_end: 48000n, source_start: 0n, source_end: 48000n, mode: "speed", speed_numerator: 1n, speed_denominator: 1n }] } }] }] };
assert.throws(() => compileFeedbackRevision(feedbackCase("time-map", mappedTimeline, mappedTimeline.tracks[0]!.clips[0]!, 12000n).feedbackInput), /FEEDBACK_TRIM_RETIME_UNSUPPORTED/, "a TimeMap needs a map-aware trim command even when its current segment is identity-shaped");
const mismatchedDurationTimeline: Timeline = { ...firstCut, tracks: [{ ...firstCut.tracks[0]!, clips: [{ ...clip, timeline_duration: 24000n }] }] };
assert.throws(() => compileFeedbackRevision(feedbackCase("duration-mismatch", mismatchedDurationTimeline, mismatchedDurationTimeline.tracks[0]!.clips[0]!, 12000n).feedbackInput), /FEEDBACK_TRIM_RETIME_UNSUPPORTED/, "a source-to-timeline duration mismatch must not be rewritten as raw source ticks");

const targetCommand = first.command_intent.commands[0]!;
if (targetCommand.type !== "add_clip") throw new Error("semantic first cut must add the target clip");
const anchorAsset = `asset:sha256:${digest("0")}` as AssetId;
const implicitMixedTimeline = simulateCommands(timeline, [
  { type: "add_clip", track_id: "v1", clip: { clip_id: "implicit-30fps-anchor", source: { asset_id: anchorAsset, start_pts: 0n, end_pts: 30n, timescale: 30n }, timeline_start: 0n, timeline_duration: 30n, media_kind: "video" } },
  { ...targetCommand, clip: { ...targetCommand.clip, timeline_start: 30n, timeline_duration: 30n } },
]);
const mixedTarget = implicitMixedTimeline.tracks[0]!.clips.find((candidate) => candidate.clip_id === targetCommand.clip.clip_id)!;
assert.throws(() => compileFeedbackRevision(feedbackCase("implicit-mixed-timebase", implicitMixedTimeline, mixedTarget, 24000n).feedbackInput), /FEEDBACK_TRIM_TIMEBASE_UNSUPPORTED/, "an implicit first-clip tick must reject a mixed-timescale trim before command creation");

console.log("Semantic Intent and feedback revision compiler determinism and fail-closed property checks passed");
