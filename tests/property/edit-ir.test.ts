import { strict as assert } from "node:assert";
import { assetIdFromFingerprint, sourceRange } from "../../packages/core/media-identity/src/public.js";
import { resolveCommandEditIntent } from "../../packages/core/edit-ir/src/public.js";
import { Timeline } from "../../packages/core/timeline-core/src/public.js";

const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "b".repeat(64), byte_length: 100n });
const timeline: Timeline = { version: 0, tracks: [{ track_id: "v1", kind: "video", clips: [] }] };
const commandIntent = { intent_id: "manual-1", base_version: 0, actor: { actor_id: "user", producer: "manual" as const }, targets: [{ track_id: "v1", clip_id: "clip-1" }], commands: [{ type: "add_clip" as const, track_id: "v1", clip: { clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n } }], semantic_refs: ["manual"], preconditions: [{ kind: "timeline_version" as const, version: 0 }, { kind: "track_exists" as const, track_id: "v1" }], protected_refs: [], provenance: { source_id: "manual" }, reason: "add selected media", expected_effects: ["clip added"] };
assert.equal(resolveCommandEditIntent(commandIntent, timeline).actor.producer, "manual");
assert.equal(resolveCommandEditIntent(commandIntent, timeline).schema_version, 2);
assert.throws(() => resolveCommandEditIntent({ ...commandIntent, base_version: 1 }, timeline), /EDIT_VERSION_CONFLICT/);
assert.throws(() => resolveCommandEditIntent({ ...commandIntent, protected_refs: ["clip-1"] }, timeline), /EDIT_PROTECTED_REFERENCE/);
