import { creationDigest, CreationError } from './creation-session.mjs';
import { audioSourceMeasurementV1Validator } from './generated/creative-context-validators.mjs';
import { audioResourceGranted } from './audio-resources.mjs';
const fail=(code,message)=>{throw new CreationError(code,message);};
const same=(a,b)=>creationDigest(a)===creationDigest(b);

/** Metadata selection is grounded in existing material, never invented listening. */
export function validateAudioResourceSelections(query,context) {
 const policy=context.audio_library,selected=query.audio_resource_selections;
 if(!policy){if(selected!==undefined)fail('AUDIO_LIBRARY_AUTHORIZATION_REQUIRED','request has no automatic library scope');return [];}
 if(!Array.isArray(selected)||selected.length>3)fail('AUDIO_SELECTION_REQUIRED','first planning call must select bounded resource IDs with reasons');
 const evidence=new Set(context.source_spans.flatMap(span=>span.observations.map(item=>item.evidence_id))),ids=new Set();
 for(const selection of selected){const candidate=policy.candidates.find(item=>item.resource_ref.resource_id===selection.resource_id);
  if(!candidate||ids.has(selection.resource_id)||!selection.reason?.trim()||!selection.match_evidence_ids?.length||selection.match_evidence_ids.some(id=>!evidence.has(id)))fail('AUDIO_SELECTION_INVALID','selection must match pinned candidates and actual imported material evidence');ids.add(selection.resource_id);
 }
 const music=selected.filter(selection=>policy.candidates.find(item=>item.resource_ref.resource_id===selection.resource_id).resource_ref.kind==='music');
 if(policy.music_required&&!music.length&&!context.source_spans.some(span=>span.resource_kind==='music'&&span.retained))fail('AUDIO_SOUNDTRACK_REQUIRED','enabled soundtrack cannot succeed without selected music');
 if(policy.no_music&&music.length)fail('AUDIO_MUSIC_FORBIDDEN','current request explicitly asks for no music');
 return selected;
}

export function assertAudioSourceMeasurement(value) {
 if(!audioSourceMeasurementV1Validator(value))fail('AUDIO_MEASUREMENT_INVALID',JSON.stringify(audioSourceMeasurementV1Validator.errors));
 const ref=value.resource_ref,item=value.resource_snapshot,sample=value.sample_receipt;
 if(creationDigest(item)!==ref.metadata_digest||item.content_sha256!==ref.content_sha256||item.resource_id!==ref.resource_id||item.kind!==ref.kind||sample.source_digest!==ref.content_sha256||sample.detail.kind!=='audio'||sample.detail.sample_rate!==value.sample_rate||sample.detail.channels!==value.channels||sample.stream_index!==value.stream_index||sample.content_digest!==value.sample_ref.digest)fail('AUDIO_MEASUREMENT_REBOUND','resource, probe and encoded audition identities differ');
 if(value.source_start.timescale!==value.sample_rate||value.source_end.timescale!==value.sample_rate||value.source_start.value<0||value.source_end.value<=value.source_start.value)fail('AUDIO_MEASUREMENT_TIME_INVALID','actual editable sample grid required');
 const cmp=(a,b)=>BigInt(a.value)*BigInt(b.timescale)-BigInt(b.value)*BigInt(a.timescale);
 if(cmp(sample.actual_start,value.source_start)<0n||cmp(sample.actual_end,value.source_end)>0n||cmp(sample.actual_start,sample.actual_end)>=0n)fail('AUDIO_MEASUREMENT_TIME_INVALID','audition must lie inside actual decoded bounds');
}

export function validateAudioMeasurementProbe(value,probe) {
 assertAudioSourceMeasurement(value);
 const streams=probe?.streams?.filter(stream=>stream.codec_type==='audio'),video=probe?.streams?.filter(stream=>stream.codec_type==='video');
 if(streams?.length!==1||video?.length||probe.still_image)fail('AUDIO_MEASUREMENT_PROBE_INVALID','one actual pure audio stream required');
 const stream=streams[0],timing=probe.timing?.streams?.[String(stream.index)],decoded=timing?.decoded_audio_bounds;
 if(stream.index!==value.stream_index||Number(stream.sample_rate)!==value.sample_rate||stream.channels!==value.channels||timing?.time_base!==stream.time_base||decoded?.method!=='decoded-contiguous-samples-v1'||decoded.sample_rate!==value.sample_rate||timing.frame_pts?.length!==decoded.frame_count)fail('AUDIO_MEASUREMENT_PROBE_INVALID','actual stream/decoded proof differs');
 const match=/^(\d+)\/(\d+)$/.exec(stream.time_base);if(!match||BigInt(match[1])<=0n||BigInt(match[2])<=0n)fail('AUDIO_MEASUREMENT_PROBE_INVALID','source timebase missing');
 const numerator=BigInt(match[1]),denominator=BigInt(match[2]),rate=BigInt(value.sample_rate),first=BigInt(decoded.start_pts),last=BigInt(decoded.end_pts),count=BigInt(decoded.sample_count),duration=BigInt(stream.duration_ts),declared=stream.start_pts===undefined?first:BigInt(stream.start_pts);
 if(duration<=0n||last<=first||count<=0n||(last-first)*numerator*rate!==count*denominator||BigInt(timing.frame_pts[0])!==first||String(timing.duration_ts)!==String(stream.duration_ts)||stream.start_pts===undefined&&duration!==last-first)fail('AUDIO_MEASUREMENT_PROBE_INVALID','decoded/source bounds disagree');
 const start=(declared>first?declared:first)*numerator*rate,end=(declared+duration<last?declared+duration:last)*numerator*rate;
 if((start+denominator-1n)/denominator!==BigInt(value.source_start.value)||end/denominator!==BigInt(value.source_end.value))fail('AUDIO_MEASUREMENT_PROBE_INVALID','receipt did not preserve exact editable sample bounds');
}

export function retainedAudioSpan(row) {
 assertAudioSourceMeasurement(row.value);const value=row.value;
 if(row.ref.digest!==creationDigest(value))fail('AUDIO_MEASUREMENT_REBOUND','retained immutable measurement changed');
 return {span_id:`resource:${value.run_id}:${value.resource_ref.resource_id}`,asset_id:`asset:sha256:${value.resource_ref.content_sha256}`,media_kind:'audio',has_audio:true,editable_start:value.source_start,editable_end:value.source_end,observations:[],selection_evidence_ids:value.match_evidence_ids,audio_coverage_receipt:row.ref,resource_kind:value.resource_ref.kind,measurement:{sample_rate:value.sample_rate,channels:value.channels},selection_reason:value.selection_reason,retained:true};
}

/** Pure reconstruction; storage separately resolves every referenced immutable object. */
export function validatePlanningAudioReceipts(root,query,receipts) {
 const selected=validateAudioResourceSelections(query,root.context);
 if(!root.context.audio_library){if(receipts!==undefined)fail('AUDIO_MEASUREMENT_UNAUTHORIZED','unexpected resource receipts');return [];}
 if(!Array.isArray(receipts)||receipts.length!==selected.length)fail('AUDIO_MEASUREMENT_REQUIRED','each exact selection needs one measured receipt');
 const scope=root.context.audio_library.authorization;
 return receipts.map((row,index)=>{assertAudioSourceMeasurement(row.value);const value=row.value,selection=selected[index],candidate=root.context.audio_library.candidates.find(item=>item.resource_ref.resource_id===selection.resource_id);
  if(row.ref.digest!==creationDigest(value)||value.root_input_digest!==creationDigest(root)||value.query_output_hash!==creationDigest(query)||!same(value.resource_ref,candidate.resource_ref)||value.selection_reason!==selection.reason||!same(value.match_evidence_ids,selection.match_evidence_ids)||!audioResourceGranted({audio_library:scope},value.resource_ref,`asset:sha256:${value.resource_ref.content_sha256}`))fail('AUDIO_MEASUREMENT_REBOUND','receipt differs from the fixed root, exact query or authorization');
  return {span_id:`resource:${value.run_id}:${selection.resource_id}`,asset_id:`asset:sha256:${value.resource_ref.content_sha256}`,media_kind:'audio',has_audio:true,editable_start:value.source_start,editable_end:value.source_end,observations:[],selection_evidence_ids:selection.match_evidence_ids,audio_coverage_receipt:row.ref,resource_kind:value.resource_ref.kind,measurement:{sample_rate:value.sample_rate,channels:value.channels},selection_reason:selection.reason};
 });
}

export function planningAudioContext(root,exchanges) {
 const round=exchanges.at(-1);if(!round||!root.context.audio_library)return root.context;
 const spans=validatePlanningAudioReceipts(root,round.exchange,round.audio_receipts),context=structuredClone(root.context);
 context.source_spans.push(...spans);
 const audio=context.output_schema.properties.audio;
 if(spans.length){const prior=structuredClone(audio.items.properties.source);const hasPrior=audio.maxItems!==0;delete audio.maxItems;
  const bounds=spans.map(span=>({type:'object',properties:{asset_id:{const:span.asset_id},span_id:{const:span.span_id},start:{properties:{timescale:{const:span.editable_start.timescale},value:{minimum:span.editable_start.value,maximum:span.editable_end.value-1}}},end:{properties:{timescale:{const:span.editable_end.timescale},value:{minimum:span.editable_start.value+1,maximum:span.editable_end.value}}}}}));
  const source=audio.items.properties.source;delete source.anyOf;delete source.allOf;source.anyOf=[...(hasPrior?[prior]:[]),...bounds];
 }
 context.audio_library={authorization:root.context.audio_library.authorization,music_required:root.context.audio_library.music_required,no_music:root.context.audio_library.no_music,selected_receipts:structuredClone(round.audio_receipts),instruction:'Arrange only these measured resource spans. Source sample grids are exact; choose real source ranges and finite repeats, never stretch. No unselected cloud music or sound can be used. Metadata is source/curation information, not a listening observation. Preserve current silence requirements and existing protected audio.'};
 return context;
}
