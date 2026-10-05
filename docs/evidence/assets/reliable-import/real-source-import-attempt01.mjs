// Authorised real files, compiled image/Worker/SQLite only. This is not WIN-01/02/08.
import assert from 'node:assert/strict';
import {readdir, readFile, mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ProjectHostSession} from '/opt/ave/app/packages/platform/project-host/src/public.js';
const run = promisify(execFile), digest = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = (await readdir('/ave-authorised-sources')).filter(name => /\.(jpe?g|mp4)$/i.test(name)).sort().map(name => '/ave-authorised-sources/' + name);
assert.equal(paths.length, 9, 'All nine currently authorised originals must participate');
const sources = [];
for (const [index,path] of paths.entries()) {
  const bytes = await readFile(path);
  sources.push({source_index:index+1,extension:extname(path).toLowerCase(),byte_length:bytes.length,sha256:digest(bytes)});
}
const projectRoot=await mkdtemp('/tmp/ave-real-import-');
const host=new ProjectHostSession();
const report={scope:'authorised real files + compiled image + actual Worker + SQLite; no Windows UI or human acceptance',sources,checks:[],result:'running'};
try {
  await host.create(projectRoot+'/project');
  const imported=await host.importMedia(paths,{identity:{actor_id:'authorised-real-source-engineering',idempotency_key:'real-all-nine'}});
  const batch=host.listMediaImportBatches().find(b=>b.idempotency_key==='real-all-nine');
  report.batch={batch_id:batch.batch_id,project_id:batch.project_id,status:batch.status,revision:batch.revision,items:batch.items.map((item,index)=>({source_index:index+1,item_id:item.item_id,asset_id:item.asset_id,asset_location_id:item.asset_location_id,status:item.status,compatibility_notes:item.compatibility_notes??[],error_code:item.error?.code??null}))};
  report.registered_count=imported.length;
  report.media=[];
  for(const row of imported){
    const index=paths.indexOf(row.location_ref), probe=row.probe;
    assert(index>=0,'Registered source belongs to authorised batch');
    assert.equal(row.metadata.fingerprint.digest,sources[index].sha256);
    report.media.push({source_index:index+1,asset_id:row.asset_id,streams:probe.streams.map(s=>({index:s.index,codec_type:s.codec_type,codec_name:s.codec_name,width:s.width??null,height:s.height??null,sample_rate:s.sample_rate??null,time_base:s.time_base??null,start_pts:s.start_pts??null,duration_ts:s.duration_ts??null})),timing_streams:Object.entries(probe.timing?.streams??{}).map(([key,s])=>({stream:key,time_base:s.time_base,decoded_frames:s.frame_pts?.length??0,first_frame_pts:s.frame_pts?.[0]??null,last_frame_pts:s.frame_pts?.at(-1)??null}))});
  }
  report.checks.push('registered fingerprint equals original bytes');
  const imageFacts=JSON.parse((await run('/opt/ave-python/bin/python',['-c',`import json,sys
from PIL import Image
out=[]
for i,p in enumerate(sys.argv[1:]):
 if p.lower().endswith(('.jpg','.jpeg')):
  with Image.open(p) as image:
   orientation=image.getexif().get(274)
   image.load()
   out.append({'source_index':i+1,'width':image.width,'height':image.height,'orientation':orientation,'decoded':True})
print(json.dumps(out))`,...paths],{maxBuffer:1024*1024})).stdout);
  report.image_facts=imageFacts;
  for(const image of imageFacts){
    const item=report.batch.items[image.source_index-1];
    if(image.orientation===0)assert(item.compatibility_notes.some(note=>note.includes('0')),'Actual orientation 0 has persistent compatibility note');
    const geometry=report.media.find(m=>m.source_index===image.source_index)?.streams.find(s=>s.codec_type==='video');
    assert(geometry,'Decoded image has durable dimensions');
    assert.deepEqual([geometry.width,geometry.height],[5,6,7,8].includes(image.orientation)?[image.height,image.width]:[image.width,image.height]);
  }
  report.checks.push('actual JPEG orientation and durable geometry');
  assert.equal(imported.length,9);assert.equal(batch.status,'completed');
  assert.deepEqual(imported.map(row=>row.location_ref),paths);
  await host.importMedia(paths,{identity:{actor_id:'authorised-real-source-engineering',idempotency_key:'real-all-nine'}});
  assert.deepEqual(host.listMediaImportBatches().find(b=>b.batch_id===batch.batch_id),batch);
  await host.importMedia(paths,{identity:{actor_id:'authorised-real-source-engineering',idempotency_key:'real-content-duplicates'}});
  const duplicates=host.listMediaImportBatches().find(b=>b.idempotency_key==='real-content-duplicates');
  assert(duplicates.items.every(item=>item.status==='duplicate'));
  report.duplicate_batch={batch_id:duplicates.batch_id,status:duplicates.status,count:duplicates.items.length};
  report.checks.push('repeat request idempotent and new batch all content duplicates');
  await host.close();await host.open(projectRoot+'/project');
  assert.deepEqual(host.listMediaImportBatches().find(b=>b.batch_id===batch.batch_id),batch);
  report.checks.push('persistent batch and identities after normal Host reopen');
  for(const [index,path] of paths.entries())assert.equal(digest(await readFile(path)),sources[index].sha256,'Original unchanged');
  report.checks.push('all original bytes unchanged');
  report.provenance=JSON.parse(await readFile('/opt/ave/app/build-provenance.json','utf8')).source_digest;
  report.result='passed';
} catch(error){report.result='failed';report.failure={name:error.name,code:error.code??null};console.error(error);process.exitCode=1;}
finally{await host.close();console.log(JSON.stringify(report,null,2));}
