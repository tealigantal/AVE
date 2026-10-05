// Encoded synthetic media and real image/Worker/SQLite boundaries; not UI acceptance.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,chmod,open,unlink,statfs,readFile} from 'node:fs/promises';
import {ProjectHostSession} from '/opt/ave/app/packages/platform/project-host/src/public.js';

const root=await mkdtemp('/tmp/ave-import-image-'),host=new ProjectHostSession();
const identity=key=>({actor_id:'synthetic-image-check',idempotency_key:key});
const image=`${root}/valid.png`,bad=`${root}/bad.png`,restricted=`${root}/restricted.png`;
await promisify(execFile)('ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=8x8','-frames:v','1',image]);
await writeFile(bad,'not an encoded PNG');
await writeFile(restricted,await readFile(image));
try{
  await host.create(`${root}/project`);
  const results=await host.importMedia([bad,image],{identity:identity('bad-first')});
  assert.equal(results.length,1);
  assert.equal(results[0].location_ref,image);
  const batch=host.listMediaImportBatches().find(batch=>batch.idempotency_key==='bad-first');
  assert.equal(batch.status,'partial');
  assert.deepEqual(batch.items.map(item=>item.status),['failed','imported']);
  await chmod(restricted,0);
  await assert.rejects(host.importMedia([restricted,image],{identity:identity('real-permission')}),error=>error.code==='EACCES');
  const denied=host.listMediaImportBatches().find(batch=>batch.idempotency_key==='real-permission');
  assert.equal(denied.status,'stopped');
  assert.equal(denied.stop_reason.code,'EACCES');
  assert(denied.items.every(item=>item.status==='cancelled'));
  await chmod(restricted,0o600);
  const pending=host.createMediaImportBatch(['valid.png'],identity('real-low-space'));
  host.bindMediaImportSource(pending.batch_id,pending.items[0].item_id,image);
  const fillPath=`${root}/fill`,file=await open(fillPath,'wx');
  try{
    const space=await statfs(root,{bigint:true}),reserve=8n*1024n*1024n;
    assert(space.bavail*space.bsize>reserve);
    const chunk=Buffer.alloc(1024*1024,1);
    let remaining=space.bavail*space.bsize-reserve;
    while(remaining>0n){const size=Number(remaining>BigInt(chunk.length)?BigInt(chunk.length):remaining);const written=await file.write(chunk,0,size);assert(written.bytesWritten>0);remaining-=BigInt(written.bytesWritten);}
    assert((await statfs(root,{bigint:true})).bavail*space.bsize<16n*1024n*1024n);
    await assert.rejects(host.importMedia([],{batch_id:pending.batch_id}),error=>error.code==='ENOSPC');
    const stopped=host.listMediaImportBatches().find(batch=>batch.batch_id===pending.batch_id);
    assert.equal(stopped.status,'stopped');assert.equal(stopped.stop_reason.code,'ENOSPC');
    assert.equal(stopped.stop_reason.recovery,'free-space');
  }finally{await file.close();await unlink(fillPath);}
  await host.close();await host.open(`${root}/project`);
  assert.equal(host.listMediaImportBatches().find(batch=>batch.batch_id===pending.batch_id).stop_reason.code,'ENOSPC');
  assert.equal(host.listMediaImportBatches().find(batch=>batch.batch_id===denied.batch_id).stop_reason.code,'EACCES');
  const provenance=JSON.parse(await readFile('/opt/ave/app/build-provenance.json','utf8'));
  console.log(JSON.stringify({result:'passed',scope:'compiled image + real Worker + SQLite, not Windows UI',source_digest:provenance.source_digest,checks:['bad-first continues','selected order','actual Linux permission denial stops','actual tmpfs free-space guard stops','persistent terminal states after reopen']},null,2));
}finally{await host.close();}
