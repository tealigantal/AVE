import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { creationMaterialObservationSpans, validateCreationObservationOutput, validateCreationObservationSamples, validatedObservationPcm } from "../../packages/platform/project-storage/src/public.js";

const t=(value:number,timescale=48000)=>({schema_version:1,value,timescale});
const source={sample:{sample_id:"audio",actual_start:t(48000),actual_end:t(144000),detail:{kind:"audio",sample_rate:48000}}};
const frame={sample:{sample_id:"frame",actual_start:t(0),actual_end:t(1),detail:{kind:"frame"}}};
const event={kind:"ambient",start:t(48000),end:t(96000),uncertain:false,description:"outdoor sound"};
const audio={sample_id:"audio",description:"audio",uncertain:false,transcript:[],events:[event]};
const visual={sample_id:"frame",description:"frame",uncertain:false,transcript:[],events:[]};
const output={schema_version:2,samples:[audio,visual]};
assert.doesNotThrow(()=>validateCreationObservationOutput(output,[source,frame],2));
const overlap=structuredClone(output);overlap.samples[0]!.events.push({...event,kind:"speech",start:t(72000),end:t(120000),uncertain:true});
assert.doesNotThrow(()=>validateCreationObservationOutput(overlap,[source,frame],2),"simultaneous sounds may overlap");
for(const invalid of [
  {...event,start:t(47999)}, {...event,end:t(144001)}, {...event,start:t(96000),end:t(96000)},
  {...event,start:t(10,7)}, {...event,description:"   "},
]) {const changed=structuredClone(output);changed.samples[0]!.events=[invalid];assert.throws(()=>validateCreationObservationOutput(changed,[source,frame],2));}
const wrongSample=structuredClone(output);wrongSample.samples[0]!.sample_id="other";
assert.throws(()=>validateCreationObservationOutput(wrongSample,[source,frame],2));
const duplicate=structuredClone(output);duplicate.samples[1]!.sample_id="audio";
assert.throws(()=>validateCreationObservationOutput(duplicate,[source,frame],2));
const visualEvent=structuredClone(output);visualEvent.samples[1]!.events=[event];
assert.throws(()=>validateCreationObservationOutput(visualEvent,[source,frame],2));
const legacy={samples:[{sample_id:"audio",description:"old",uncertain:true,transcript:[]}]};
assert.doesNotThrow(()=>validateCreationObservationOutput(legacy,[source]));
assert.throws(()=>validateCreationObservationOutput(legacy,[source],2),"new input cannot downgrade to v1");
assert.throws(()=>validateCreationObservationOutput(output,[source,frame]),"v1 input cannot bind a v2 output");
assert.throws(()=>validateCreationObservationOutput(output,[source,frame],3),"unknown version cannot fall back");
const wav=Buffer.alloc(52);wav.write("RIFF",0);wav.writeUInt32LE(44,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(8,40);wav.writeInt16LE(123,48);
const waveSample={actual_start:t(48000),actual_end:t(48004),requested_start:t(48000),requested_end:t(48004),detail:{kind:"audio",sample_rate:48000,channels:1,sample_count:4,mime_type:"audio/wav"},byte_length:wav.length,content_digest:createHash("sha256").update(wav).digest("hex")};
assert.deepEqual(validatedObservationPcm(waveSample,wav),wav.subarray(44));
const changedWav=Buffer.from(wav);changedWav[48]^=1;
assert.throws(()=>validatedObservationPcm(waveSample,changedWav),/CREATION_OBSERVATION_AUDIO_REBOUND/,"WAV bytes are content-bound");
const rebound={...waveSample,actual_end:t(48003)};
assert.throws(()=>validatedObservationPcm(rebound,wav),/CREATION_OBSERVATION_AUDIO_REBOUND/,"time and PCM count must still agree");
const asset=`asset:sha256:${"a".repeat(64)}`;
const material={asset_id:asset,source_digest:"a".repeat(64),media_kind:"audio",start:t(48000),end:t(48004)};
const span=creationMaterialObservationSpans(material)[0];
const sample={...waveSample,sample_id:"bound-audio",stream_index:1,source_digest:material.source_digest};
const value={materials:[material],spans:[span],samples:[{span_id:span.span_id,asset_id:asset,sample}]};
const descriptor={span_id:span.span_id,asset_id:asset,sample_id:sample.sample_id,kind:"audio",actual_start:sample.actual_start,actual_end:sample.actual_end,sample_rate:48000,stream_index:1};
const input={context:{observation_output_version:2,spans:[span],samples:[descriptor]},media:[{sample_id:sample.sample_id,mime_type:"audio/wav",content_digest:sample.content_digest,data_base64:wav.toString("base64")}]};
assert.doesNotThrow(()=>validateCreationObservationSamples(value,input));
const changedStream=structuredClone(value);changedStream.samples[0]!.sample.stream_index=2;
assert.throws(()=>validateCreationObservationSamples(changedStream,input),/CREATION_OBSERVATION_INPUT_REBOUND/,"v2 source stream identity is bound to the original model input");
console.log("Observation v2: exact sample binding, bounded sample-grid events, overlap, legacy and downgrade checks passed");
