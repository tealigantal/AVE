import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { registerAssetLocation, registerMediaAsset } from "../../../packages/platform/project-storage/src/public.js";
import { assetIdFromFingerprint } from "../../../packages/core/media-identity/src/public.js";

// A small, real byte source for tests that exercise request state without
// claiming to decode media. The identity is always derived from its bytes.
export async function createRequestOriginal(path: string, bytes = Buffer.from("request-original-fixture")) {
  await writeFile(path, bytes, { flag: "wx" });
  return inspectRequestOriginal(path);
}

export async function inspectRequestOriginal(path: string) {
  const bytes = await readFile(path), file = await stat(path);
  const digest = createHash("sha256").update(bytes).digest("hex");
  return { path, digest, asset_id: assetIdFromFingerprint({ algorithm: "sha256", digest, byte_length: BigInt(file.size) }), size: file.size, mtime_ms: file.mtimeMs };
}

export function registerRequestOriginal(session: any, source: Awaited<ReturnType<typeof inspectRequestOriginal>>) {
  const project = session.manifest.project_id;
  registerMediaAsset(session, project, { asset_id: source.asset_id, algorithm: "sha256", digest: source.digest, byte_length: source.size, stream_facts: {} });
  registerAssetLocation(session, project, { asset_location_id: `fixture-original:${source.digest}`, asset_id: source.asset_id, location_type: "original", location_ref: source.path, verified_at: "2026-09-24T00:00:00.000Z", metadata: { verification_status: "verified", fingerprint: { algorithm: "sha256", digest: source.digest, byte_length: source.size }, file_stat: { size: source.size, mtime_ms: source.mtime_ms } } });
  return source.asset_id;
}
