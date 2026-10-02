import { audioResourcePackV1Validator, audioLibraryOperationV1Validator } from "./generated/creative-context-validators.mjs";
import { CreationError } from "./creation-session.mjs";

export function assertAudioResourcePack(value) {
  if (!audioResourcePackV1Validator(value)) throw new CreationError("AUDIO_PACK_INVALID", JSON.stringify(audioResourcePackV1Validator.errors));
  const ids=new Set(), hashes=new Set();
  for(const item of value.items) {
    if(ids.has(item.resource_id) || hashes.has(item.content_sha256) || !item.resource_id.endsWith(item.content_sha256.slice(0,16))) throw new CreationError("AUDIO_PACK_DUPLICATE_IDENTITY",item.resource_id);
    ids.add(item.resource_id);hashes.add(item.content_sha256);
    if(!item.measurement.waveform.some(n=>n>0) || item.download.kind==='archive_range' && (item.download.range_end-item.download.range_start+1!==item.download.compressed_bytes || item.download.range_end>=item.download.archive_byte_length)) throw new CreationError("AUDIO_PACK_MEASUREMENT_INVALID",item.resource_id);
    if(item.license.verified_at!==value.audited_at)throw new CreationError("AUDIO_PACK_LICENSE_UNVERIFIED",item.resource_id);
  }
  if(value.items.filter(i=>i.kind==='music').length!==40 || value.items.filter(i=>i.kind==='sfx').length!==80)throw new CreationError("AUDIO_PACK_COVERAGE_INVALID","40 music and 80 unique sounds are required");
  for(const use of ['daily','travel','warm','upbeat','quiet','city'])if(value.items.filter(i=>i.kind==='music'&&i.use_tags.includes(use)).length<4)throw new CreationError("AUDIO_PACK_COVERAGE_INVALID",use);
}

/** An uploaded asset list never implicitly grants a cloud-library source. */
export function audioResourceGranted(authorization, ref, assetId) {
  const scope=authorization?.audio_library;
  return Boolean(scope && ref && scope.pack_id===ref.pack_id && scope.pack_version===ref.pack_version && scope.pack_digest===ref.pack_digest && ['manual','automatic'].includes(scope.mode)
    && assetId===`asset:sha256:${ref.content_sha256}` && ref.resource_id.endsWith(ref.content_sha256.slice(0,16)));
}

export function assertAudioLibraryOperation(value) { if(!audioLibraryOperationV1Validator(value)) throw new CreationError("AUDIO_LIBRARY_INPUT_INVALID", JSON.stringify(audioLibraryOperationV1Validator.errors)); }
