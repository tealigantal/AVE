export type AssetId = string & { readonly __brand: "AssetId" };
export type ContentFingerprint = Readonly<{ algorithm: "sha256"; digest: string; byte_length: bigint }>;
export type AssetLocation = Readonly<{ path: string; verified_at: string }>;
export type SourceRange = Readonly<{ asset_id: AssetId; start_pts: bigint; end_pts: bigint; timescale: bigint }>;
export function assetIdFromFingerprint(fingerprint: ContentFingerprint): AssetId { return `asset:${fingerprint.algorithm}:${fingerprint.digest}` as AssetId; }
export function sourceRange(asset_id: AssetId, start_pts: bigint, end_pts: bigint, timescale: bigint): SourceRange { if (timescale <= 0n || start_pts < 0n || end_pts <= start_pts) throw new Error("invalid source range"); return { asset_id, start_pts, end_pts, timescale }; }
