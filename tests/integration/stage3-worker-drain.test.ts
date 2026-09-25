import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createPersistentWorkerClient, startWorker } from "../../packages/platform/worker-client/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-worker-drain-"));
const fixture = resolve(root, "worker with spaces.cjs");
const fixtureCode = `
const fs=require('node:fs'), path=require('node:path'), cp=require('node:child_process');
const [mode, directory]=process.argv.slice(2), pidFile=path.join(directory,'producer.pid'), bytes=path.join(directory,'bytes');
const send=m=>process.stdout.write(JSON.stringify(m)+'\\n');
require('node:readline').createInterface({input:process.stdin}).on('line', line=>{
 const m=JSON.parse(line);
 if(m.message_type==='handshake') {send({message_type:'handshake'});return;}
 if(m.message_type!=='job') return; // Intentionally ignores cancellation.
 if(mode==='owner-crash') {process.kill(process.ppid);process.exit(17);}
 const marker=path.join(directory,'attempt');
 if(mode==='retry' && fs.existsSync(marker)) {
   let alive=true;try{process.kill(Number(fs.readFileSync(pidFile,'utf8')),0)}catch(e){if(e.code==='ESRCH')alive=false;else throw e}
   send({message_type:'job_result',request_id:m.request_id,job_id:m.job_id,status:alive?'failed':'succeeded',outputs:[{old_producer_alive:alive}]});return;
 }
 fs.writeFileSync(marker,'first');
 const producer = "const fs=require('node:fs');fs.writeFileSync(process.argv[1],String(process.pid));fs.appendFileSync(process.argv[2],'x');setInterval(()=>fs.appendFileSync(process.argv[2],'x'),10);";
 // Grandchild deliberately owns no inherited stdio. Linux also starts another
 // session, so waiting for the worker or its pipe close cannot prove drain.
 const intermediate = "require('node:child_process').spawn(process.execPath,['-e',"+JSON.stringify(producer)+",...process.argv.slice(1)],{stdio:'ignore',detached:true,windowsHide:true}).unref();";
 cp.spawn(process.execPath,['-e',intermediate,pidFile,bytes],{stdio:'ignore',windowsHide:true}).unref();
 if(mode==='retry') {const poll=setInterval(()=>{if(fs.existsSync(bytes)){clearInterval(poll);process.exit(17)}},5);}
});
`;
const waitForProducer = async (directory: string) => {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try { const bytes = await readFile(resolve(directory, "bytes")); if (bytes.length) return; }
    catch (error: any) { if (error.code !== "ENOENT") throw error; }
    await new Promise(done => setTimeout(done, 10));
  }
  throw new Error("fixture producer never started");
};
const assertDrained = async (directory: string) => {
  const pid = Number(await readFile(resolve(directory, "producer.pid"), "utf8"));
  assert.throws(() => process.kill(pid, 0), (error: any) => error.code === "ESRCH", "producer must actually have exited");
  const bytes = await readFile(resolve(directory, "bytes"));
  await new Promise(done => setTimeout(done, 100));
  assert.deepEqual(await readFile(resolve(directory, "bytes")), bytes, "no writes may arrive after the termination barrier");
};
try {
  await writeFile(fixture, fixtureCode);
  for (const mode of ["timeout", "cancel", "close", "retry"]) {
    const directory = await mkdtemp(resolve(root, `${mode}-中文-`));
    const client = createPersistentWorkerClient({ command: process.execPath, args: [fixture, mode, directory], cwd: directory });
    const controller = new AbortController();
    const operation = client.submit("fixture.producer", {}, { timeoutMs: mode === "timeout" ? 500 : 15000, signal: controller.signal, idempotent: mode === "retry" });
    const outcome = mode === "retry" ? operation : assert.rejects(operation, mode === "timeout" ? /TIMEOUT/ : mode === "cancel" ? /CANCELLED/ : /WORKER_CRASH|WORKER_CLIENT_CLOSED/);
    try {
      if (mode !== "retry") {
        await waitForProducer(directory);
        if (mode === "cancel") controller.abort(new Error("EXPLICIT_USER_CANCEL"));
        if (mode === "close") {
          const close = client.close();
          assert.equal(client.close(), close, "concurrent close shares one barrier");
          await assert.rejects(client.submit("fixture.new", {}), /WORKER_CLIENT_CLOSED/);
          await close;
        }
      }
      const result: any = await outcome;
      if (mode === "retry") { assert.equal(result.status, "succeeded"); assert.equal(result.outputs[0].old_producer_alive, false); assert.equal(client.generation, 2); }
      await assertDrained(directory);
      assert.equal(client.terminationUnconfirmed, false);
    } finally { await client.close(); }
  }

  const blocked = startWorker({ command: process.execPath, args: ["-e", "process.stdin.pause();process.stdout.write(JSON.stringify({type:'ready',request_id:'ready'})+'\\n');setInterval(()=>{},1000)"] });
  try {
    await blocked.waitFor("ready");
    blocked.send({ type: "request", request_id: "large", payload: "x".repeat(4 * 1024 * 1024) });
    await new Promise(done => setTimeout(done, 100));
    const stop = blocked.stop(); assert.equal(blocked.stop(), stop); await stop;
  } finally { await blocked.stop(); }

  const stuckOwner = startWorker({ command: process.execPath, args: ["-e", "process.stdout.write(JSON.stringify({type:'ready',request_id:'ready'})+'\\n');setInterval(()=>{},1000)"] });
  await stuckOwner.waitFor("ready");
  const ownerChild = stuckOwner.child as any, destroyInput = ownerChild.stdin.destroy;
  const waiting = assert.rejects(stuckOwner.waitFor("never", 60000), /WORKER_TERMINATION_UNCONFIRMED/);
  // Fault injection drops the stop signal while leaving the actual owner alive.
  // Verify its real termination deadline also wakes the longer response waiter.
  ownerChild.stdin.destroy = () => ownerChild.stdin;
  const deadlineStarted = Date.now();
  try {
    await assert.rejects(stuckOwner.stop(), /WORKER_TERMINATION_UNCONFIRMED/);
    await waiting;
    assert.ok(Date.now() - deadlineStarted < 30000, "response waiter must not wait for its original 60-second deadline");
    await assert.rejects(stuckOwner.waitFor("later", 60000), /WORKER_TERMINATION_UNCONFIRMED/);
  } finally {
    ownerChild.stdin.destroy = destroyInput;
    const closed = once(ownerChild, "close"); destroyInput.call(ownerChild.stdin); await closed;
  }

  const unconfirmed = createPersistentWorkerClient({ command: process.execPath, args: [fixture, "owner-crash", root] });
  await assert.rejects(unconfirmed.submit("fixture.owner-crash", {}, { idempotent: true }), /WORKER_TERMINATION_UNCONFIRMED/);
  assert.equal(unconfirmed.terminationUnconfirmed, true); assert.equal(unconfirmed.generation, 1);
  await assert.rejects(unconfirmed.submit("fixture.no-new-producer", {}), /WORKER_TERMINATION_UNCONFIRMED/);
  await assert.rejects(unconfirmed.close(), /WORKER_CLOSE_FAILED/);
  console.log(`Stage3 ${process.platform} producer drain: timeout, explicit cancellation, concurrent close, orphaned grandchild/retry, blocked stdin and unconfirmed-owner poison passed`);
} finally { await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
