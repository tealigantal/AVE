import { strict as assert } from "node:assert";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import { observationFromAnalysis } from "../../packages/core/editorial-core/src/public.js";
const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "d".repeat(64), byte_length: 4n }); const observation = observationFromAnalysis({ schema_version: 1, segment_id: "seg-1", asset_id: asset, start_pts: 0n, end_pts: 12n, text: "明确的 ASR 文本", source: "asr" }); assert.equal(observation.observation_id, "asr:seg-1"); assert.throws(() => observationFromAnalysis({ schema_version: 1, segment_id: "seg-2", asset_id: asset, start_pts: 12n, end_pts: 12n, text: "", source: "ocr" }), /range/);
