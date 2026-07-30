import { strict as assert } from "node:assert";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import { compileAssemblyToEditIR } from "../../packages/core/editorial-core/src/public.js";
const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "f".repeat(64), byte_length: 30n }); const cut = { schema_version: 1 as const, assembly_id: "a-1", approved_plan_id: "p-1", clips: [{ clip_id: "clip-1", beat_id: "beat-1", evidence_ids: ["obs-1"], asset_id: asset, start_pts: 0n, end_pts: 30n }], status: "validated" as const }; const operations = compileAssemblyToEditIR(cut); assert.equal(operations[0].operation, "add"); assert.throws(() => compileAssemblyToEditIR({ ...cut, status: "candidate" }), /validated/);
