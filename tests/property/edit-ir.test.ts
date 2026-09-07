import { strict as assert } from "node:assert";
import { assetIdFromFingerprint, sourceRange } from "../../packages/core/media-identity/src/public.js";
import { feedbackExecutionLineageIntentIds, resolveCommandEditIntent, type FeedbackExecutionLineageNode } from "../../packages/core/edit-ir/src/public.js";
import { Timeline } from "../../packages/core/timeline-core/src/public.js";

const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "b".repeat(64), byte_length: 100n });
const timeline: Timeline = { version: 0, tracks: [{ track_id: "v1", kind: "video", clips: [] }] };
const commandIntent = { intent_id: "manual-1", base_version: 0, actor: { actor_id: "user", producer: "manual" as const }, targets: [{ track_id: "v1", clip_id: "clip-1" }], commands: [{ type: "add_clip" as const, track_id: "v1", clip: { clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n } }], semantic_refs: ["manual"], preconditions: [{ kind: "timeline_version" as const, version: 0 }, { kind: "track_exists" as const, track_id: "v1" }], protected_refs: [], provenance: { source_id: "manual" }, reason: "add selected media", expected_effects: ["clip added"] };
assert.equal(resolveCommandEditIntent(commandIntent, timeline).actor.producer, "manual");
assert.equal(resolveCommandEditIntent(commandIntent, timeline).schema_version, 2);
assert.throws(() => resolveCommandEditIntent({ ...commandIntent, base_version: 1 }, timeline), /EDIT_VERSION_CONFLICT/);
assert.throws(() => resolveCommandEditIntent({ ...commandIntent, protected_refs: ["clip-1"] }, timeline), /EDIT_PROTECTED_REFERENCE/);

const lineage = Array.from({ length: 65 }, (_, index): FeedbackExecutionLineageNode => ({ execution_id: `execution-${index}`, intent_ref: { object_id: `intent-${index}` }, ...(index ? { base_execution_ref: { object_id: `execution-${index - 1}` } } : {}) }));
const lineageById = new Map(lineage.map((node) => [node.execution_id, node]));
const lookup = (id: string) => lineageById.get(id);
assert.equal(feedbackExecutionLineageIntentIds(lineage[63]!, lookup)?.size, 64, "the supported 64-node lineage includes all current and ancestor intents");
assert.equal(feedbackExecutionLineageIntentIds(lineage[64]!, lookup), null, "depth overflow must discard every partially collected target");
assert.equal(feedbackExecutionLineageIntentIds({ ...lineage[0]!, base_execution_ref: { object_id: "missing" } }, lookup), null, "missing ancestors must close the entire target list");
lineageById.set("execution-0", { ...lineage[0]!, base_execution_ref: { object_id: "execution-1" } });
assert.equal(feedbackExecutionLineageIntentIds(lineage[1]!, lookup), null, "cycles must close the entire target list");
