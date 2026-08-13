export type AssetId = string & { readonly __brand: "AssetId" };
export type ContentFingerprint = Readonly<{ algorithm: "sha256"; digest: string; byte_length: bigint }>;
export type MediaLocationKind = "original" | "proxy";
export type AssetLocation = Readonly<{ location_id: string; asset_id: AssetId; kind: MediaLocationKind; path: string; verified_at: string; fingerprint: ContentFingerprint }>;
export type StreamFacts = Readonly<{ video_timebase?: RationalTimeValue; frame_rate?: RationalTimeValue; audio_sample_rate?: bigint; has_audio: boolean }>;
export type RationalTimeValue = Readonly<{ value: bigint; timescale: bigint }>;
export type ProxyRelation = Readonly<{ original_asset_id: AssetId; proxy_asset_id: AssetId; proxy_location_id: string }>;
export type SourceRange = Readonly<{ asset_id: AssetId; start_pts: bigint; end_pts: bigint; timescale: bigint }>;
export function assetIdFromFingerprint(fingerprint: ContentFingerprint): AssetId { if (fingerprint.algorithm !== "sha256" || !/^[0-9a-f]{64}$/.test(fingerprint.digest) || fingerprint.byte_length < 0n) throw new Error("invalid content fingerprint"); return `asset:${fingerprint.algorithm}:${fingerprint.digest}` as AssetId; }
export function assertOriginalLocation(location: AssetLocation, expectedAssetId: AssetId): void { if (location.kind !== "original" || location.asset_id !== expectedAssetId || assetIdFromFingerprint(location.fingerprint) !== expectedAssetId) throw new Error("VERIFIED_ORIGINAL_REQUIRED"); }
export function proxyRelation(originalAssetId: AssetId, proxyLocation: AssetLocation): ProxyRelation { if (proxyLocation.kind !== "proxy") throw new Error("proxy relation requires a Proxy location"); if (proxyLocation.asset_id === originalAssetId) throw new Error("Proxy content identity must differ from Original identity"); return { original_asset_id: originalAssetId, proxy_asset_id: proxyLocation.asset_id, proxy_location_id: proxyLocation.location_id }; }
export function sourceRange(asset_id: AssetId, start_pts: bigint, end_pts: bigint, timescale: bigint): SourceRange { if (timescale <= 0n || start_pts < 0n || end_pts <= start_pts) throw new Error("invalid source range"); return { asset_id, start_pts, end_pts, timescale }; }
