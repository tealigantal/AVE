import {creationDigest,CreationError} from "../../contract-runtime/src/public.js";
import type {Timeline} from "../../../core/timeline-core/src/public.js";
import type {CreationMaterialV1} from "../../../../contracts/generated/typescript/editorial/creation-material.v1.js";
/** Uses the selected historical Timeline, never all resources acquired by a request. */
export function creationAudioCredits(timeline:Timeline,materials:readonly {value:CreationMaterialV1}[]) {
 const used=[...new Set(timeline.tracks.filter(track=>track.enabled!==false).flatMap(track=>track.clips.map(clip=>clip.source.asset_id)))];
 const items=used.flatMap(asset_id=>{const rows=materials.filter(row=>row.value.asset_id===asset_id&&row.value.resource_ref);
  if(!rows.length)return [];const material=rows.at(-1)!.value,ref=material.resource_ref!,source=material.resource_snapshot!;
  if(!source||creationDigest(source)!==ref.metadata_digest||source.content_sha256!==asset_id.slice('asset:sha256:'.length))throw new CreationError('AUDIO_CREDITS_SOURCE_REBOUND',asset_id);
  const usage=timeline.tracks.flatMap(track=>track.clips.filter(clip=>clip.source.asset_id===asset_id).map(clip=>({clip_id:clip.clip_id,source:{start_pts:String(clip.source.start_pts),end_pts:String(clip.source.end_pts),timescale:String(clip.source.timescale)},timeline:{start_ticks:String(clip.timeline_start),duration_ticks:String(clip.timeline_duration),timebase:timeline.sequence?.timebase?{value:String(timeline.sequence.timebase.value),timescale:String(timeline.sequence.timebase.timescale)}:null},gain_db:clip.gain_db??0,muted:track.muted===true||track.audio_routing?.find(route=>route.source_clip_id===clip.clip_id)?.muted===true,fades:clip.boundary_fades?JSON.parse(JSON.stringify(clip.boundary_fades,(_key,value)=>typeof value==='bigint'?String(value):value)):null})));
  const modifications=`Arranged and mixed in this work; source ranges, timing, gain and fades are recorded in the accompanying audio usage list. Original file unchanged. Clips: ${usage.map(use=>`${use.clip_id} source ${use.source.start_pts}..${use.source.end_pts}/${use.source.timescale}, gain ${use.gain_db} dB${use.muted?', muted':''}`).join('; ')}`;
  const text=`${source.title} — ${source.author}\nSource: ${source.source_page}\nLicense: ${source.license.spdx} (${source.license.url})\n${source.attribution_notice??''}\nChanges: ${modifications}`;
  return [{asset_id,resource_ref:ref,title:source.title,author:source.author,source_page:source.source_page,use_tags:source.use_tags,license:source.license,usage,modifications,attribution_text:text}];
 });
 return {schema_version:1,timeline_version:timeline.version,items,publish_text:items.filter(item=>item.license.attribution_required).map(item=>item.attribution_text).join('\n\n'),source_text:items.map(item=>item.attribution_text).join('\n\n')};
}
