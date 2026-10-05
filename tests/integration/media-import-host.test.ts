import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const run = promisify(execFileCallback), root = await mkdtemp(resolve(tmpdir(), "ave-import-host-"));
let host = new ProjectHostSession();
const identity = (id: string) => ({ actor_id: "local-user", idempotency_key: id });
try {
  const first = resolve(root, "first.png"), second = resolve(root, "second.png"), bad = resolve(root, "damaged.png"), alias = resolve(root, "same-content.png");
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=red:s=32x24", "-frames:v", "1", first]);
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=32x24", "-frames:v", "1", second]);
  await writeFile(bad, "invalid encoded png, not a media frame");
  await copyFile(first, alias);
  await host.create(resolve(root, "project"));
  for (const [position, paths] of [["first", [bad, first, second]], ["middle", [first, bad, second]], ["last", [first, second, bad]]] as const) {
    const results = await host.importMedia(paths, { identity: identity(`bad-${position}`) });
    const batch = host.listMediaImportBatches().find(item => item.idempotency_key === `bad-${position}`)!;
    assert.equal(results.length, 2);
    assert.deepEqual((results as Array<{location_ref:string}>).map(item=>item.location_ref),paths.filter(path=>path!==bad),'Public Host import results retain selected source order, including failures between successful items');
    assert.equal(batch.status, "partial");
    assert.equal(batch.items.filter(item => item.status === "failed").length, 1);
    assert.equal(batch.items.filter(item => ["imported", "duplicate"].includes(item.status)).length, 2);
    const failure = batch.items.find(item => item.status === "failed")!;
    assert.ok(failure.error?.message); assert.equal(failure.issues.length, 1);
    assert(!JSON.stringify(batch).includes(root), "renderer batch projection must not reveal source paths");
  }
  await host.importMedia([alias], { identity: identity("alias") });
  const aliasBatch = host.listMediaImportBatches().find(item => item.idempotency_key === "alias")!;
  assert.equal(aliasBatch.items[0].status, "duplicate");
  assert.equal(aliasBatch.items[0].asset_id, host.listMediaImportBatches()[0].items[1].asset_id);
  const count = host.listMediaImportBatches().length;
  await host.importMedia([alias], { identity: identity("alias") });
  assert.equal(host.listMediaImportBatches().length, count);
  assert.deepEqual(host.listMediaImportBatches().find(item => item.batch_id === aliasBatch.batch_id), aliasBatch);
  const otherDirectory = resolve(root, "same-name"); await mkdir(otherDirectory); const sameName = resolve(otherDirectory, "first.png"); await copyFile(second, sameName);
  await host.importMedia([sameName], { identity: identity("same-name") });
  const nameBatch = host.listMediaImportBatches().find(item => item.idempotency_key === "same-name")!;
  assert.notEqual(nameBatch.items[0].asset_id, host.listMediaImportBatches()[0].items[1].asset_id);
  const partial = host.listMediaImportBatches().find(item => item.idempotency_key === "bad-first")!;
  const successes = partial.items.filter(item => item.status !== "failed");
  await copyFile(first, bad);
  const retried = await host.retryMediaImportBatch(partial.batch_id);
  assert.equal(retried.status, "completed");
  assert.deepEqual(retried.items.filter(item => item.item_id !== partial.items[0].item_id), successes);
  assert.equal(retried.items[0].attempt, 2); assert.equal(retried.items[0].issues.length, 1);

  const inspect = (host as any).inspectMediaCandidate.bind(host);
  let reached!: () => void, release!: () => void;
  const inspected = new Promise<void>(accept => { reached = accept; });
  const late = new Promise<void>(accept => { release = accept; });
  (host as any).inspectMediaCandidate = async (...args: any[]) => { const candidate = await inspect(...args); if (args[0] === second) { reached(); await late; } return candidate; };
  const importing = host.importMedia([first, second, alias], { identity: identity("cancel-late") });
  await inspected;
  const cancelling = host.listMediaImportBatches().find(item => item.idempotency_key === "cancel-late")!;
  const cancelled = host.cancelMediaImportBatch(cancelling.batch_id);
  assert.equal(cancelled.status, "stopped"); assert.equal(cancelled.items[0].status, "duplicate");
  assert.equal(cancelled.items[1].status, "cancelled"); assert.equal(cancelled.items[2].status, "cancelled");
  assert.equal(cancelled.items[1].error?.recovery,"choose-source","Explicit cancellation requires reselection, not reopening an otherwise usable project");
  release(); await importing;
  assert.deepEqual(host.listMediaImportBatches().find(item => item.batch_id === cancelled.batch_id), cancelled, "late worker result cannot mutate cancelled batch");
  (host as any).inspectMediaCandidate = inspect;
  const db = (host as any).session.db, prepare = db.prepare.bind(db);
  const failure = new Error("injected real storage boundary failure");
  db.prepare = (sql: string) => { if (sql.startsWith("INSERT OR REPLACE INTO asset_locations")) throw failure; return prepare(sql); };
  await assert.rejects(host.importMedia([alias, second], { identity: identity("database-fault") }), (cause: any) => cause.code === "MEDIA_IMPORT_STORAGE_FAILED" && cause.cause === failure);
  db.prepare = prepare;
  const fault = host.listMediaImportBatches().find(item => item.idempotency_key === "database-fault")!;
  assert.equal(fault.status, "stopped"); assert.ok(fault.stop_reason); assert(fault.items.every(item => item.status === "cancelled"));
  const uploading = host.createMediaImportBatch(["pending.png"],identity("close-upload"),"uploading");
  const reserved=resolve(root,'pending.png');await writeFile(reserved,'incomplete upload');
  host.reserveMediaImportSource(uploading.batch_id,uploading.items[0].item_id,reserved);
  assert.equal(host.listMediaImportBatches().find(batch=>batch.batch_id===uploading.batch_id)!.items[0].status,'uploading');
  assert(!host.listMediaImportCleanupCandidates().some(source=>source.path===reserved),'In-flight reserved sources remain protected');
  await host.close(); host = new ProjectHostSession(); await host.open(resolve(root, "project"));
  assert.deepEqual(host.listMediaImportBatches().find(item => item.batch_id === fault.batch_id), fault);
  assert.deepEqual(host.listMediaImportBatches().find(item => item.batch_id === cancelled.batch_id), cancelled);
  assert.equal(host.listMediaImportBatches().find(item => item.batch_id === retried.batch_id)!.items[0].issues.length, 1);
  assert.equal(host.listMediaImportBatches().find(item => item.batch_id === uploading.batch_id)!.status,"stopped","Normal close must persist terminal state even before upload reaches Worker");
  assert(host.listMediaImportCleanupCandidates().some(source=>source.path===reserved),'Reopened Host can identify orphaned upload without browser session memory');
  assert(!host.listMediaImportCleanupCandidates().some(source=>source.path===first||source.path===second),'Registered originals remain protected');
  for(const code of ['ENOSPC','EACCES'] as const){
    const batch=host.createMediaImportBatch([`${code}.png`,'remaining.png'],identity(code),'uploading');
    const cause=Object.assign(new Error(`injected ${code} at upload boundary`),{code});
    const stopped=host.failMediaImportUpload(batch.batch_id,batch.items[0].item_id,cause);
    assert.equal(stopped.status,'stopped');assert.equal(stopped.stop_reason?.code,code);assert(stopped.items.every(item=>item.status==='cancelled'));
    assert.equal(stopped.stop_reason?.recovery,code==='ENOSPC'?'free-space':'check-permission');
  }
  const port=(host as any).workerPort,submit=port.submit.bind(port);
  for(const code of ['EACCES','ENOSPC'] as const){
    const result={status:'failed',outputs:[],metrics:{},diagnostics:[{code,message:`injected typed Worker ${code}`} ]};
    port.submit=async(task:string,input:any,control:any)=>task==='media.fingerprint.v1'&&input.input_path===first?result:submit(task,input,control);
    try{await assert.rejects(host.importMedia([first,second],{identity:identity(`worker-${code}`)}),(cause:any)=>cause.code===code&&cause.cause===result);}
    finally{port.submit=submit;}
    const stopped=host.listMediaImportBatches().find(batch=>batch.idempotency_key===`worker-${code}`)!;
    assert.equal(stopped.status,'stopped');assert.equal(stopped.stop_reason?.code,code);assert(stopped.items.every(item=>item.status==='cancelled'));
  }
  const grouped={status:'failed',outputs:[],metrics:{},diagnostics:[{code:'MEDIA_DECODE_INVALID',message:'original damaged'},{code:'ENOSPC',message:'cleanup failed: disk full'}]};
  port.submit=async()=>grouped;
  try{await assert.rejects(host.importMedia([first,second],{identity:identity('worker-cleanup-fault')}),(cause:any)=>cause.code==='MEDIA_DECODE_INVALID'&&cause.cause===grouped&&cause.message.includes('cleanup failed'));}
  finally{port.submit=submit;}
  const groupedStop=host.listMediaImportBatches().find(batch=>batch.idempotency_key==='worker-cleanup-fault')!;assert.equal(groupedStop.status,'stopped');assert.equal(groupedStop.stop_reason?.code,'ENOSPC');assert(groupedStop.stop_reason?.message.includes('original damaged'));assert(groupedStop.stop_reason?.message.includes('cleanup failed'));
  console.log("real Worker import bad first/middle/last, content/name identities, idempotency, failed-only retry, late cancellation, fatal DB fault and reopen passed; not UI acceptance");
} finally { await host.close(); await rm(root, { recursive: true, force: true }); }
