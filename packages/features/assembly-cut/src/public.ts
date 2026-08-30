export const featureId = "assembly-cut" as const;
import type { RationalTime } from "../../../../contracts/generated/typescript/common/rational-time.v1.js";
import type { ApprovedStoryPlanV2 } from "../../../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import type { AssetId } from "../../../core/media-identity/src/public.js";
import { sourceRange } from "../../../core/media-identity/src/public.js";
import type { Timeline } from "../../../core/timeline-core/src/public.js";
import type { CommandEditIntent } from "../../../core/edit-ir/src/public.js";
import type { VersionedObjectRef } from "../../../core/editorial-core/src/public.js";
export type AssemblyCutCommand = Readonly<{ type: string; payload: unknown }>;
export type AssemblyCutQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type AssemblyCutFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "assembly cut"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: AssemblyCutFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "assembly cut", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export type AssemblyClipV2 = Readonly<{ clip_id: string; beat_id: string; evidence_ref: VersionedObjectRef; asset_id: AssetId; source: Readonly<{ start: RationalTime; end: RationalTime }> }>;
export type AssemblyCutV2 = Readonly<{ schema_version: 2; assembly_id: string; object_version: number; approved_story_ref: VersionedObjectRef; clips: readonly AssemblyClipV2[]; status: "candidate" | "validated" | "rejected"; created_at: string; provenance: Readonly<{ producer: "project-host"; source_version: "assembly-cut-v2"; input_refs: readonly string[] }> }>;
export type ApprovedAssemblyEvidence = Readonly<{ evidence_id: string; evidence_version: number; object_hash: string; asset_id: AssetId; start: RationalTime; end: RationalTime; review_status: "approved" }>;

const exactRef = (left: VersionedObjectRef, right: VersionedObjectRef): boolean => left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;
const units = (value: RationalTime, timescale: bigint, label: string): bigint => {
  if (!Number.isSafeInteger(value.value) || !Number.isSafeInteger(value.timescale) || value.value < 0 || value.timescale < 1) throw new Error(`ASSEMBLY_RATIONAL_TIME_INVALID:${label}`);
  const numerator = BigInt(value.value) * timescale;
  if (numerator % BigInt(value.timescale) !== 0n) throw new Error(`ASSEMBLY_TIMEBASE_NOT_EXACT:${label}`);
  return numerator / BigInt(value.timescale);
};

export function validateAssemblyCutV2(input: Readonly<{ cut: AssemblyCutV2; plan: ApprovedStoryPlanV2; plan_digest: string; evidence: readonly ApprovedAssemblyEvidence[] }>): AssemblyCutV2 {
  const { cut, plan, plan_digest: planDigest } = input;
  if (cut.schema_version !== 2 || !Number.isInteger(cut.object_version) || cut.object_version < 1 || !cut.assembly_id.trim() || cut.status !== "candidate" || !Number.isFinite(Date.parse(cut.created_at)) || cut.provenance.producer !== "project-host" || cut.provenance.source_version !== "assembly-cut-v2" || !/^[0-9a-f]{64}$/.test(planDigest)) throw new Error("ASSEMBLY_CUT_V2_INVALID");
  if (plan.status !== "approved" || !exactRef(cut.approved_story_ref, { object_id: plan.plan_id, object_version: plan.object_version, digest: planDigest })) throw new Error("ASSEMBLY_STORY_REBOUND");
  if (cut.clips.length === 0 || cut.clips.some((clip) => !clip.clip_id.trim() || !clip.beat_id.trim() || !/^[0-9a-f]{64}$/.test(clip.evidence_ref.digest)) || new Set(cut.clips.map((clip) => clip.clip_id)).size !== cut.clips.length) throw new Error("ASSEMBLY_CLIPS_INVALID");
  const beats = new Map(plan.beats.map((beat) => [beat.beat_id, beat]));
  const evidence = new Map(input.evidence.map((item) => [item.evidence_id, item]));
  const seenEvidence = new Set<string>();
  for (const clip of cut.clips) {
    const beat = beats.get(clip.beat_id), item = evidence.get(clip.evidence_ref.object_id);
    if (!beat) throw new Error("ASSEMBLY_BEAT_UNKNOWN");
    if (!beat.evidence_refs.some((reference) => exactRef(reference, clip.evidence_ref))) throw new Error("ASSEMBLY_EVIDENCE_NOT_IN_BEAT");
    if (!item || item.review_status !== "approved" || item.asset_id !== clip.asset_id || !exactRef(clip.evidence_ref, { object_id: item.evidence_id, object_version: item.evidence_version, digest: item.object_hash })) throw new Error("ASSEMBLY_EVIDENCE_REBOUND");
    const referenceKey = `${clip.evidence_ref.object_id}@${clip.evidence_ref.object_version}#${clip.evidence_ref.digest}`;
    if (seenEvidence.has(referenceKey)) throw new Error("ASSEMBLY_EVIDENCE_DUPLICATE");
    seenEvidence.add(referenceKey);
    if (clip.source.start.timescale !== clip.source.end.timescale) throw new Error("ASSEMBLY_SOURCE_TIMEBASE_MISMATCH");
    const timescale = BigInt(Math.max(clip.source.start.timescale, item.start.timescale, item.end.timescale));
    const start = units(clip.source.start, timescale, "clip-start"), end = units(clip.source.end, timescale, "clip-end"), evidenceStart = units(item.start, timescale, "evidence-start"), evidenceEnd = units(item.end, timescale, "evidence-end");
    if (end <= start || start < evidenceStart || end > evidenceEnd) throw new Error("ASSEMBLY_SOURCE_RANGE_REBOUND");
  }
  const expectedInputRefs = [planDigest, ...cut.clips.map((clip) => clip.evidence_ref.digest)].sort();
  if (cut.provenance.input_refs.length !== expectedInputRefs.length || [...cut.provenance.input_refs].sort().some((value, index) => value !== expectedInputRefs[index])) throw new Error("ASSEMBLY_PROVENANCE_REBOUND");
  return { ...cut, clips: cut.clips.map((clip) => ({ ...clip, source: { start: { ...clip.source.start }, end: { ...clip.source.end } } })), status: "validated" };
}

export function compileAssemblyCutToCommandEditIntent(input: Readonly<{ cut: AssemblyCutV2; cut_digest: string; plan: ApprovedStoryPlanV2; plan_digest: string; timeline: Timeline; output_track_id: string }>): CommandEditIntent {
  const { cut, plan, timeline } = input;
  if (cut.status !== "validated" || plan.status !== "approved" || !exactRef(cut.approved_story_ref, { object_id: plan.plan_id, object_version: plan.object_version, digest: input.plan_digest })) throw new Error("ASSEMBLY_NOT_VALIDATED");
  const track = timeline.tracks.find((candidate) => candidate.track_id === input.output_track_id);
  if (!track) throw new Error("ASSEMBLY_TRACK_NOT_FOUND");
  let timelineStart = track.clips.reduce((end, clip) => clip.timeline_start + clip.timeline_duration > end ? clip.timeline_start + clip.timeline_duration : end, 0n);
  const commands = cut.clips.map((clip) => {
    if (clip.source.start.timescale !== clip.source.end.timescale) throw new Error("ASSEMBLY_SOURCE_TIMEBASE_MISMATCH");
    const sourceTimescale = BigInt(clip.source.start.timescale), start = BigInt(clip.source.start.value), end = BigInt(clip.source.end.value), tick = timeline.sequence?.timebase ?? { value: 1n, timescale: sourceTimescale };
    const numerator = (end - start) * tick.timescale, denominator = sourceTimescale * tick.value;
    if (end <= start || denominator <= 0n || numerator % denominator !== 0n) throw new Error("ASSEMBLY_TIMEBASE_NOT_EXACT");
    const duration = numerator / denominator;
    const command = { type: "add_clip" as const, track_id: track.track_id, clip: { clip_id: clip.clip_id, source: sourceRange(clip.asset_id, start, end, sourceTimescale), timeline_start: timelineStart, timeline_duration: duration, media_kind: "video" as const, semantic_sidecar: { semantic_id: `assembly:${cut.assembly_id}:${clip.clip_id}`, labels: [`beat:${clip.beat_id}`], evidence_refs: [clip.evidence_ref.object_id, clip.evidence_ref.digest], metadata: { assembly_id: cut.assembly_id, story_plan_id: plan.plan_id } } } };
    timelineStart += duration;
    return command;
  });
  return { intent_id: `assembly:${cut.assembly_id}:v${cut.object_version}`, base_version: timeline.version, actor: { actor_id: cut.assembly_id, producer: "assembly" }, targets: [{ track_id: track.track_id }], commands, semantic_refs: [`assembly_cut_v2:${cut.assembly_id}@${cut.object_version}#${input.cut_digest}`, `approved_story_plan_v2:${plan.plan_id}@${plan.object_version}#${input.plan_digest}`, ...cut.clips.map((clip) => `evidence:${clip.evidence_ref.object_id}@${clip.evidence_ref.object_version}#${clip.evidence_ref.digest}`)], preconditions: [{ kind: "timeline_version", version: timeline.version }, { kind: "track_exists", track_id: track.track_id }, { kind: "track_unlocked", track_id: track.track_id }], protected_refs: [], provenance: { source_id: cut.assembly_id, source_version: cut.object_version, correlation_id: input.cut_digest }, reason: "execute validated AssemblyCutV2", expected_effects: ["append exact approved Story evidence clips in Assembly order"] };
}
