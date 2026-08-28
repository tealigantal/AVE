import assert from "node:assert/strict";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";
import type { ApprovedStoryPlanV2 } from "../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import { compileAssemblyCutToCommandEditIntent, type AssemblyCutV2 } from "../../packages/features/assembly-cut/src/public.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";

const digest = (value: string) => value.repeat(64), evidenceRef = { object_id: "evidence-1", object_version: 1, digest: digest("e") }, asset = `asset:sha256:${digest("a")}` as AssetId, planDigest = digest("8"), cutDigest = digest("9");
const plan = { schema_version: 2, plan_id: "plan-1", object_version: 1, status: "approved", beats: [{ beat_id: "beat-1", evidence_refs: [evidenceRef] }] } as unknown as ApprovedStoryPlanV2;
const cut: AssemblyCutV2 = { schema_version: 2, assembly_id: "assembly-1", object_version: 1, approved_story_ref: { object_id: "plan-1", object_version: 1, digest: planDigest }, clips: [{ clip_id: "clip-1", beat_id: "beat-1", evidence_ref: evidenceRef, asset_id: asset, source: { start: { schema_version: 1, value: 0, timescale: 30 }, end: { schema_version: 1, value: 30, timescale: 30 } } }], status: "validated", created_at: "2026-08-28T00:00:00Z", provenance: { producer: "project-host", source_version: "assembly-cut-v2", input_refs: [planDigest] } };
const timeline: Timeline = { version: 4, sequence: { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] }, tracks: [{ track_id: "output", kind: "video", clips: [] }] };
const intent = compileAssemblyCutToCommandEditIntent({ cut, cut_digest: cutDigest, plan, plan_digest: planDigest, timeline, output_track_id: "output" });
assert.equal(intent.actor.producer, "assembly"); assert.equal(intent.base_version, 4); assert.equal(intent.commands[0]?.type, "add_clip"); assert.equal((intent.commands[0] as any).clip.timeline_duration, 30n); assert.ok(intent.semantic_refs.some((value) => value.includes(cutDigest)));
assert.throws(() => compileAssemblyCutToCommandEditIntent({ cut: { ...cut, status: "candidate" }, cut_digest: cutDigest, plan, plan_digest: planDigest, timeline, output_track_id: "output" }), /NOT_VALIDATED/);
