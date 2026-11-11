import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResourceDeadline, ResourceGate } from "../../packages/platform/project-host/src/resource-gate.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";

let timedOut = false;
const deadline = new ResourceDeadline(100, () => { timedOut = true; });
deadline.setWaiting(true);
await new Promise(resolve => setTimeout(resolve, 180));
assert.equal(timedOut, false, "queue time cannot consume the model deadline");
deadline.setWaiting(false);
await new Promise(resolve => setTimeout(resolve, 150));
assert.equal(timedOut, true, "the deadline must still apply once admitted");
deadline.close();

const gate = new ResourceGate(true);
const release = await gate.acquire();
const controller = new AbortController();
const cancelled = gate.acquire(controller.signal);
const cancelledResult = assert.rejects(cancelled, /CANCELLED/);
const order: number[] = [];
const second = gate.acquire().then(done => { order.push(2); done(); });
const third = gate.acquire().then(done => { order.push(3); done(); });
controller.abort();
await cancelledResult;
release();
release();
await Promise.all([second, third]);
assert.deepEqual(order, [2, 3]);

const blocked = new ResourceGate(true);
const held = await blocked.acquire();
const rejected = assert.rejects(blocked.acquire(), /UNCONFIRMED/);
blocked.poison(new Error("WORKER_TERMINATION_UNCONFIRMED"));
held();
await rejected;
await assert.rejects(blocked.acquire(), /UNCONFIRMED/);

const root = await mkdtemp(join(tmpdir(), "ave-resource-gate-"));
const script = join(root, "worker.cjs");
try {
  await writeFile(script, `
const send=m=>process.stdout.write(JSON.stringify(m)+'\\n');
const active=new Map();
require('node:readline').createInterface({input:process.stdin}).on('line',line=>{
 const m=JSON.parse(line);
 if(m.message_type==='handshake') send({message_type:'handshake'});
 if(m.message_type==='job') {
   let count=0;
   const tick=m.payload.progressMode ? setInterval(()=>send({message_type:'progress',request_id:m.request_id,job_id:m.job_id,payload:{progress:m.payload.progressMode==='repeat' ? 0.1 : Math.min(0.9,++count/20)}}),50) : undefined;
   const timer=setTimeout(()=>{clearInterval(tick); active.delete(m.job_id); send({message_type:'job_result',request_id:m.request_id,job_id:m.job_id,status:'succeeded'});},m.payload.delay);
   active.set(m.job_id,{tick,timer,request_id:m.request_id});
 }
 if(m.message_type==='cancel') {const item=active.get(m.job_id);if(item){clearInterval(item.tick);clearTimeout(item.timer);active.delete(m.job_id);send({message_type:'job_result',request_id:item.request_id,job_id:m.job_id,status:'cancelled'});}}
});`);
  const port = createLocalWorkerJobPort({ command: process.execPath, args: [script], cwd: root, resourceGate: new ResourceGate(true) });
  const first = port.submit("first", { delay: 350 }, { timeoutMs: 3000 });
  const later = port.submit("later", { delay: 1 }, { timeoutMs: 200 });
  assert.equal((await first as { status: string }).status, "succeeded");
  assert.equal((await later as { status: string }).status, "succeeded", "queue time must not count against worker deadline");
  const bounded = { execution_policy: { mode: "bounded-linear-v1" } };
  const progressing = await port.submit("render.timeline.v1", { delay: 450, progressMode: "advance", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 });
  assert.equal((progressing as { status: string }).status, "succeeded", "advancing progress permits work beyond one inactivity interval");
  await assert.rejects(port.submit("render.timeline.v1", { delay: 1000, progressMode: "repeat", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 }), /TIMEOUT/, "repeated progress cannot extend a stalled job");
  await assert.rejects(port.submit("render.timeline.v1", { delay: 1000, progressMode: "advance", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 350 }), /TIMEOUT/, "absolute deadline must remain in force despite progress");
  const segment = await port.submit("render.segment.v1", { delay: 450, progressMode: "advance", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 });
  assert.equal((segment as { status: string }).status, "succeeded", "bounded segment progress must extend its inactivity deadline");
  await assert.rejects(port.submit("render.segment.v1", { delay: 1000, progressMode: "repeat", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 }), /TIMEOUT/, "repeated segment progress cannot hide a stall");
  await assert.rejects(port.submit("render.segment.v1", { delay: 1000, progressMode: "advance", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 350 }), /TIMEOUT/, "segment absolute deadline remains in force despite progress");
  const assembly = await port.submit("render.segment.assemble.v1", { delay: 450, progressMode: "advance", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 });
  assert.equal((assembly as { status: string }).status, "succeeded", "assembly progress must extend its inactivity deadline");
  await assert.rejects(port.submit("render.segment.assemble.v1", { delay: 1000, progressMode: "repeat", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 }), /TIMEOUT/, "repeated assembly progress cannot hide a stall");
  await assert.rejects(port.submit("other.segment.v1", { delay: 450, progressMode: "advance", execution_plan: bounded }, { timeoutMs: 200, absoluteTimeoutMs: 2000 }), /TIMEOUT/, "unrelated tasks do not inherit bounded deadlines");
  const running = port.submit("running", { delay: 20000 }, { timeoutMs: 30000 });
  const runningResult = running.then(result => assert.equal((result as { status: string }).status, "cancelled"), error => assert.match(String(error), /WORKER_CRASH|WORKER_CLIENT_CLOSED|CANCELLED/));
  const waiting = port.submit("waiting", { delay: 1 }, { timeoutMs: 3000 });
  const waitingResult = assert.rejects(waiting, /CANCELLED|WORKER_CLIENT_CLOSING/);
  await new Promise(resolve => setTimeout(resolve, 100));
  const closing = port.close();
  assert.equal(port.close(), closing);
  await assert.rejects(port.submit("new", {}), /WORKER_CLIENT_CLOSING/);
  await closing;
  await Promise.all([runningResult, waitingResult]);
  assert.equal(port.terminationUnconfirmed, false);
  const reopened = await port.submit("reopened", { delay: 1 }, { timeoutMs: 3000 });
  assert.equal((reopened as { status: string }).status, "succeeded");
  await port.close();
} finally {
  await rm(root, { recursive: true, force: true });
}
console.log("resource gate integration passed");
