import { strict as assert } from "node:assert";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import { compile, resolve, simulate, validate, EditIR } from "../../packages/core/edit-ir/src/public.js";
import { Timeline } from "../../packages/core/timeline-core/src/public.js";

const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "b".repeat(64), byte_length: 100n });
const timeline: Timeline = { version: 0, tracks: [{ track_id: "v1", kind: "video", clips: [] }] };
const ir: EditIR = { schema_version: 1, edit_ir_id: "ir-1", base_version: 0, operations: [{ operation: "add", clip_id: "clip-1", asset_id: asset, start_pts: 0n, end_pts: 30n, timeline_start: 0n }] };
const resolved = resolve(ir, { assets: new Set([asset]), source_timescales: new Map([[asset, 30n]]) }); assert.equal(resolved.issues.length, 0); const plan = compile(ir, resolved.operations, timeline, { assets: new Set([asset]), source_timescales: new Map([[asset, 30n]]) }); const simulation = simulate(timeline, plan); validate(plan, simulation); assert.equal(simulation.timeline.tracks[0].clips.length, 1);
