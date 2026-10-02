import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { assertAudioResourcePack, creationDigest, CreationError } from "../../contract-runtime/src/public.js";
import type { AudioResourcePackV1 } from "../../../../contracts/generated/typescript/editorial/audio-resource-pack.v1.js";
import type { CreationMaterialV1 } from "../../../../contracts/generated/typescript/editorial/creation-material.v1.js";

export const AUDIO_PACK_DIGEST="4cb5e9360787b6e644cfde679d159e5ec36e27badecb49aeb4a83fa3a15273ac";
const bytes=readFileSync(new URL("../../../../resources/audio/free-audio-2026.10.02.1.json",import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==AUDIO_PACK_DIGEST)throw new CreationError('AUDIO_PACK_IDENTITY_CHANGED','catalog bytes differ from the reviewed version');
const catalog:unknown=JSON.parse(bytes.toString('utf8'));assertAudioResourcePack(catalog);
function freeze(value:object):void { for(const child of Object.values(value))if(child && typeof child==='object')freeze(child);Object.freeze(value); }
freeze(catalog);
export const AUDIO_PACK:AudioResourcePackV1=catalog;
export type AudioResource=AudioResourcePackV1['items'][number];
export function audioResource(id:string):AudioResource {
  const item=AUDIO_PACK.items.find(item=>item.resource_id===id);
  if(!item)throw new CreationError('AUDIO_RESOURCE_UNKNOWN',String(id));return structuredClone(item);
}
export function audioResourceRef(item:AudioResource):NonNullable<CreationMaterialV1['resource_ref']> {
  return {pack_id:AUDIO_PACK.pack_id,pack_version:AUDIO_PACK.pack_version,pack_digest:AUDIO_PACK_DIGEST,resource_id:item.resource_id,content_sha256:item.content_sha256,kind:item.kind,metadata_digest:creationDigest(item)};
}
export function assertAudioResourceRef(ref:NonNullable<CreationMaterialV1['resource_ref']>):void {
  const expected=audioResourceRef(audioResource(ref.resource_id));
  if(Object.keys(ref).length!==Object.keys(expected).length || Object.entries(expected).some(([key,value])=>ref[key as keyof typeof ref]!==value))throw new CreationError('AUDIO_RESOURCE_IDENTITY_CHANGED','resource reference differs from pinned catalog');
}
/** Retrieval ranks metadata candidates only; the existing planner chooses the music. */
export function audioPlanningCandidates(authorization:any,words:string,usedAssets:readonly string[]) {
  if(authorization.audio_library?.mode!=='automatic')return undefined;
  const noMusic=/不(?:要|需要|用)?(?:配乐|背景音乐)|无配乐|no\s+(?:background\s+)?music|without\s+music/i.test(words);
  const sounds=!/不(?:要|需要|用)(?:添加|加入)?音效|no\s+sound\s+effects/i.test(words)&&/音效|sound\s+effect|sfx/i.test(words);
  const uses=([[/日常|生活|daily/i,'daily'],[/旅行|出游|旅游|travel/i,'travel'],[/温暖|温馨|warm/i,'warm'],[/轻快|欢快|活力|upbeat/i,'upbeat'],[/安静|平静|留白|quiet|calm/i,'quiet'],[/城市|都市|city|urban/i,'city']] as const).filter(([pattern])=>pattern.test(words)).map(([,tag])=>tag);
  const ranked=(kind:'music'|'sfx')=>AUDIO_PACK.items.filter(item=>item.kind===kind).map(item=>({item,score:(usedAssets.includes(`asset:sha256:${item.content_sha256}`)?1000:0)+item.use_tags.filter(tag=>uses.includes(tag as typeof uses[number])).length*10+(item.vocals===false?2:0)})).sort((a,b)=>b.score-a.score||a.item.resource_id.localeCompare(b.item.resource_id)).map(({item})=>item);
  const chosen=[...(noMusic?[]:ranked('music').slice(0,sounds?10:12)),...(sounds?ranked('sfx').slice(0,noMusic?12:2):[])];
  return {authorization:structuredClone(authorization.audio_library),music_required:!noMusic,no_music:noMusic,
    candidates:chosen.map(item=>({resource_ref:audioResourceRef(item),title:item.title,author:item.author,license:item.license.spdx,source_page:item.source_page,use_tags:item.use_tags,source_tags:item.source_tags,display_length_seconds:item.measurement.display_length_seconds,vocals:item.vocals,bpm:item.bpm,loop_points:item.loop_points})),
    instruction:'Call1 selects resource IDs with match_evidence_ids from actual imported material and a reason considering mood, energy, instruments, vocals, dialogue density, work duration and quiet passages. This is source/curation metadata, not listening evidence. Prefer instrumentals; null vocal/BPM values are unknown. Return audio_resource_selections=[] for explicit no-music when no sound is requested. Only explicitly requested sound effects are candidates. Host downloads ONLY selected IDs after this call; Call2 arranges the resulting measured sources, with finite real-range repeats and music-only dialogue ducking.'};
}
export async function downloadAudioResource(item:AudioResource,signal:AbortSignal,fetchImpl:typeof fetch=fetch):Promise<Buffer> {
  const url=new URL(item.download.url);
  if(url.protocol!=='https:' || !['opengameart.org','kenney.nl'].includes(url.hostname) || url.username || url.password || url.port || url.hash)throw new CreationError('AUDIO_RESOURCE_URL_DENIED','only pinned original-site HTTPS attachments are accepted');
  const ranged=item.download.kind==='archive_range', download=item.download;
  const expected=ranged ? (download as Extract<AudioResource['download'],{kind:'archive_range'}>).compressed_bytes:item.byte_length;
  if(expected>32*1024*1024 || item.byte_length>32*1024*1024)throw new CreationError('AUDIO_RESOURCE_TOO_LARGE',item.resource_id);
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason),timer=setTimeout(()=>controller.abort(new CreationError('AUDIO_RESOURCE_TIMEOUT','download deadline exceeded')),180000);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  let response:Response|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,failure:unknown;
  try {
    if(controller.signal.aborted)throw controller.signal.reason;
    const headers:Record<string,string>={'Accept-Encoding':'identity','User-Agent':'Mozilla/5.0 AVE/1.0 (audio-resource-client)'};
    if(download.kind==='archive_range')headers.Range=`bytes=${download.range_start}-${download.range_end}`;
    response=await fetchImpl(download.url,{redirect:'error',signal:controller.signal,headers});
    if(controller.signal.aborted)throw controller.signal.reason;
    if(response.status!==(ranged?206:200))throw new CreationError('AUDIO_RESOURCE_HTTP_FAILED',`${item.resource_id}: HTTP ${response.status}`);
    if(download.kind==='archive_range' && response.headers.get('content-range')!==`bytes ${download.range_start}-${download.range_end}/${download.archive_byte_length}`)throw new CreationError('AUDIO_RESOURCE_RANGE_CHANGED',item.resource_id);
    const length=response.headers.get('content-length');if(length!==null && Number(length)!==expected)throw new CreationError('AUDIO_RESOURCE_LENGTH_CHANGED',item.resource_id);
    const encoding=response.headers.get('content-encoding');if(encoding && encoding!=='identity')throw new CreationError('AUDIO_RESOURCE_ENCODING_CHANGED',encoding);
    if(!response.body)throw new CreationError('AUDIO_RESOURCE_BODY_MISSING',item.resource_id);
    reader=response.body.getReader();const chunks:Buffer[]=[];let size=0;
    while(true){if(controller.signal.aborted)throw controller.signal.reason;const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>expected)throw new CreationError('AUDIO_RESOURCE_TOO_LARGE',item.resource_id);chunks.push(Buffer.from(part.value));}
    if(size!==expected)throw new CreationError('AUDIO_RESOURCE_LENGTH_CHANGED',`${item.resource_id}: ${size}/${expected}`);
    const wire=Buffer.concat(chunks),content=ranged?inflateRawSync(wire,{maxOutputLength:item.byte_length}):wire;
    if(content.length!==item.byte_length || createHash('sha256').update(content).digest('hex')!==item.content_sha256)throw new CreationError('AUDIO_RESOURCE_HASH_CHANGED',item.resource_id);
    return content;
  } catch(cause) {failure=controller.signal.aborted ? new AggregateError([cause,controller.signal.reason],'Audio resource download aborted',{cause}):cause;throw failure;}
  finally {clearTimeout(timer);signal.removeEventListener('abort',abort);try{if(reader){try{await reader.cancel();}finally{reader.releaseLock();}}else if(response?.body)await response.body.cancel();}catch(cleanup){if(failure!==undefined)throw new AggregateError([failure,cleanup],"Audio download and response cleanup failed",{cause:failure});throw cleanup;}}
}
