import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { readProbeEvidence } from "../../packages/platform/project-host/src/media-evidence.js";
import { mediaProbeResultV2Validator } from "../../packages/platform/contract-runtime/src/public.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";

const run = promisify(execFile), root = await mkdtemp(resolve(tmpdir(), "ave-probe-image-")), output = resolve(root, "out"), worker = createLocalWorkerJobPort();
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex"), control = { assertCurrent() {} };
try {
  await mkdir(output);
  for (const task of ["media.probe.v1", "media.scene_scan.v1"]) {
    const denied=await worker.submit<any,any>(task,{input_path:"does-not-exist"},{timeoutMs:30000});
    assert.equal(denied.status,"failed"); assert.equal((await readdir(output)).length,0);
  }
  await run("python", ["-c", "from PIL import Image; import sys; from pathlib import Path; p=Path(sys.argv[1]); Image.new('RGB',(31,17),(10,20,30)).save(p/'jpeg',format='JPEG'); Image.new('RGBA',(21,13),(10,20,30,100)).save(p/'png',format='PNG')", root]);
  for (const [name, width, height, alpha] of [["jpeg",31,17,false],["png",21,13,true]] as const) {
    const source=resolve(root,name), digest=hash(await readFile(source));
    const result=await worker.submit<any,any>("media.probe.v2",{schema_version:2,task_type:"media.probe.v2",input_path:source,source_digest:digest,timeout_seconds:30,output_dir:output},{timeoutMs:30000});
    assert.equal(result.status,"succeeded",JSON.stringify(result.diagnostics)); const receipt=result.outputs[0];
    assert.equal(mediaProbeResultV2Validator(receipt),true); assert.equal(receipt.media_kind,"image"); assert.equal(receipt.record_count,0);
    const metadata=JSON.parse(receipt.metadata_json); assert.equal(metadata.format?.duration,undefined); assert.equal(metadata.format?.start_time,undefined); assert.deepEqual([metadata.still_image.width,metadata.still_image.height,metadata.still_image.alpha],[width,height,alpha]);
    const rows=[]; for await (const row of readProbeEvidence(receipt,output,digest,control)) rows.push(row); assert.deepEqual(rows,[]);
    await assert.rejects(async()=>{for await(const _ of readProbeEvidence({...receipt,media_kind:"video"},output,digest,control)){}},/MEDIA_EVIDENCE_INVALID/);
    const changed=structuredClone(metadata); changed.still_image.width+=1; const changedJson=JSON.stringify(changed);
    const records=(await readFile(receipt.path,"utf8")).trimEnd().split("\n").map(row=>JSON.parse(row)); records.at(-1).metadata_sha256=hash(Buffer.from(changedJson));
    const forgedBytes=Buffer.from(records.map(row=>JSON.stringify(row)).join("\n")+"\n"), forgedPath=resolve(output,`${name}-forged`); await writeFile(forgedPath,forgedBytes);
    await assert.rejects(async()=>{for await(const _ of readProbeEvidence({...receipt,path:forgedPath,metadata_json:changedJson,byte_length:forgedBytes.length,sha256:hash(forgedBytes)},output,digest,control)){}},/MEDIA_EVIDENCE_INVALID/);
    await assert.rejects(async()=>{for await(const _ of readProbeEvidence(receipt,output,"0".repeat(64),control)){}},/MEDIA_EVIDENCE_INVALID/);
    const bytes=await readFile(receipt.path); await writeFile(receipt.path,Buffer.from("bad")); await assert.rejects(async()=>{for await(const _ of readProbeEvidence(receipt,output,digest,control)){}},/MEDIA_EVIDENCE_INVALID/); await writeFile(receipt.path,bytes);
  }
  await run("python", ["-c", "from PIL import Image; import sys; from pathlib import Path; p=Path(sys.argv[1]); a=Image.new('RGBA',(24,16),(255,0,0,120)); b=Image.new('RGBA',(24,16),(0,255,0,200)); a.save(p/'static-webp',format='WEBP',lossless=True); a.save(p/'animated-webp',format='WEBP',save_all=True,append_images=[b],duration=[120,240],loop=0,lossless=True); a.save(p/'animated-gif',format='GIF',save_all=True,append_images=[b],duration=[120,240],loop=0)", root]);
  for(const name of ["static-webp","animated-webp","animated-gif"]) {
    const source=resolve(root,name),digest=hash(await readFile(source));
    const result=await worker.submit<any,any>("media.probe.v2",{schema_version:2,task_type:"media.probe.v2",input_path:source,source_digest:digest,timeout_seconds:30,output_dir:output},{timeoutMs:30000});
    assert.equal(result.status,"succeeded",JSON.stringify(result.diagnostics));
    for await(const _ of readProbeEvidence(result.outputs[0],output,digest,control)) {}
    assert.equal(result.outputs[0].media_kind,name==="static-webp"?"image":"video");
    if(name!=="static-webp") {
      const metadata=JSON.parse(result.outputs[0].metadata_json);assert.equal(metadata.animated_image.duration_ms,360);assert.equal(metadata.timing_summary.streams["0"].frame_count,2);
      const scene=await worker.submit<any,any>("media.scene_scan.v2",{schema_version:2,task_type:"media.scene_scan.v2",input_path:source,source_digest:digest,stream_index:0,threshold:12,timeout_seconds:30,output_dir:output},{timeoutMs:30000});
      assert.equal(scene.status,"succeeded",JSON.stringify(scene.diagnostics));assert.equal(scene.outputs[0].receipt.end_pts,360);assert.equal(scene.outputs[0].receipt.frame_count,2);
    }
  }
  const cli = await run(process.execPath,["--import","tsx",resolve("apps/dev-cli/src/main.ts"),"inspect-media",resolve(root,"jpeg")]);
  const cliOutput=JSON.parse(cli.stdout); assert.equal(cliOutput.ok,true); assert.equal(cliOutput.probe.media_kind,"image"); assert.equal(cliOutput.probe.record_count,0); assert.equal(cliOutput.probe.metadata.format.duration,undefined);
  for (const kind of ["audio", "video"] as const) {
    const source=resolve(root,kind+".mkv");
    const args=kind==="audio" ? ["-f","lavfi","-i","sine=frequency=440:sample_rate=48000:duration=1","-c:a","pcm_s16le"] : ["-f","lavfi","-i","testsrc2=size=32x32:rate=5:duration=1","-c:v","ffv1"];
    await run("ffmpeg",["-v","error",...args,source]); const digest=hash(await readFile(source));
    const result=await worker.submit<any,any>("media.probe.v2",{schema_version:2,task_type:"media.probe.v2",input_path:source,source_digest:digest,timeout_seconds:30,output_dir:output},{timeoutMs:30000});
    assert.equal(result.status,"succeeded",JSON.stringify(result.diagnostics)); const receipt=result.outputs[0]; assert.equal(receipt.media_kind,kind); assert.ok(receipt.record_count>0);
    const rows=[]; for await(const row of readProbeEvidence(receipt,output,digest,control)) rows.push(row); assert.equal(rows.length,receipt.record_count);

  }
  const bad=resolve(root,"bad"), bytes=Buffer.from([0xff,0xd8,0xff,0x00]); await writeFile(bad,bytes); const before=new Set(await readdir(output));
  const rejected=await worker.submit<any,any>("media.probe.v2",{schema_version:2,task_type:"media.probe.v2",input_path:bad,source_digest:hash(bytes),timeout_seconds:30,output_dir:output},{timeoutMs:30000}); assert.equal(rejected.status,"failed"); assert.deepEqual(new Set(await readdir(output)),before);
  console.log("JPEG/PNG probe v2 real worker and evidence verification passed");
} finally { await worker.close(); await rm(root,{recursive:true,force:true}); }
