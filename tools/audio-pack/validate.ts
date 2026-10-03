import assert from "node:assert/strict";
import { mkdtemp,readFile,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AUDIO_PACK,AUDIO_PACK_DIGEST,downloadAudioResource } from "../../packages/platform/project-host/src/audio-library.js";
import { assertAudioResourcePack } from "../../packages/platform/contract-runtime/src/public.js";
assertAudioResourcePack(AUDIO_PACK);
const proof=JSON.parse(await readFile(new URL("../../resources/audio/free-audio-2026.10.02.1.audit.json",import.meta.url),"utf8"));
assert.equal(proof.pack_digest,AUDIO_PACK_DIGEST);
assert.equal(proof.items.length,AUDIO_PACK.items.length);
for(const item of AUDIO_PACK.items){
 const rows=proof.items.filter((row:any)=>row.resource_id===item.resource_id && row.content_sha256===item.content_sha256);assert.equal(rows.length,1);
 const row=rows[0],receipt=row.worker_preview_receipt;assert.equal(row.source_page_sha256,item.license.source_page_sha256);assert.equal(row.license_evidence_sha256,item.license.license_evidence_sha256);assert.equal(row.full_pts_contiguous,true);assert.equal(row.worker_preview_pass,true);assert.equal(receipt.source_digest,item.content_sha256);assert.equal(receipt.detail.kind,"audio");assert.equal(receipt.detail.sample_rate,item.measurement.sample_rate);assert.ok(receipt.detail.sample_count>0 && row.decoded_sample_count>0);assert.match(receipt.content_digest,/^[0-9a-f]{64}$/);
}
const network=process.argv.includes("--network"),run=promisify(execFile),report:any={pack_version:AUDIO_PACK.pack_version,pack_digest:AUDIO_PACK_DIGEST,network,items:[]};
if(network) {
 const root=await mkdtemp(resolve(tmpdir(),"ave-audio-pack-audit-")),pages=new Map<string,string>();
 try {for(const item of AUDIO_PACK.items) {
   if(!pages.has(item.source_page)){const response=await fetch(item.source_page,{redirect:"error",signal:AbortSignal.timeout(60000),headers:{"User-Agent":"Mozilla/5.0 AVE/1.0 (audio-resource-audit)"}});assert.equal(response.status,200);const html=await response.text();const notice=item.license.spdx==="CC0-1.0"?/CC0|creativecommons.org\/publicdomain\/zero\/1.0/i:new RegExp(`creativecommons.org/licenses/by/${item.license.version.replace(".","\\.")}`);assert.ok(notice.test(html),`${item.source_page}: current license notice missing`);pages.set(item.source_page,html);}
   const bytes=await downloadAudioResource(item,AbortSignal.timeout(180000)),path=resolve(root,item.content_sha256);await writeFile(path,bytes,{flag:"wx"});
   try {
     const {stdout}=await run("ffprobe",["-v","error","-show_format","-show_streams","-of","json",path]);const probe=JSON.parse(stdout),audio=probe.streams.filter((stream:any)=>stream.codec_type==="audio");assert.equal(audio.length,1);assert.equal(probe.streams.filter((stream:any)=>stream.codec_type==="video").length,0);assert.equal(Number(audio[0].sample_rate),item.measurement.sample_rate);assert.equal(Number(audio[0].channels),item.measurement.channels);assert.ok(Math.abs(Number(probe.format.duration)-item.measurement.display_length_seconds)<=0.05);
     await run("ffmpeg",["-v","error","-i",path,"-map","0:a:0","-f","null","-"],{timeout:60000});
     const audit=await run(process.env.AVE_PYTHON ?? "python",[resolve("tools/audio-pack/audit-source.py"),path],{timeout:240000,maxBuffer:2*1024*1024});
     report.items.push({resource_id:item.resource_id,byte_length:bytes.length,decoded:true,display_length_seconds:Number(probe.format.duration),sample_rate:Number(audio[0].sample_rate),...JSON.parse(audit.stdout)});console.log(`Verified ${report.items.length}/120 ${item.resource_id}`);
   }finally{await rm(path);}
 }}finally{const output=process.argv.find(arg=>arg.startsWith("--report="))?.slice(9);if(output)await writeFile(resolve(output),JSON.stringify(report,null,2)+"\n");await rm(root,{recursive:true});}
}
const output=process.argv.find(arg=>arg.startsWith("--report="))?.slice(9);if(output)await writeFile(resolve(output),JSON.stringify(report,null,2)+"\n");
console.log(`Audio pack ${AUDIO_PACK.pack_version}: 40 music / 80 unique SFX; ${network?"original-site responses, licenses, hashes and full decoding verified":"structure, identities, licenses, coverage and bound full-PTS/actual-Worker curation receipts verified"}`);
