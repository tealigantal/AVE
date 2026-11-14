import assert from "node:assert/strict";
import { createPersistentWorkerClient } from "../../packages/platform/worker-client/src/runtime.mjs";

// A busy machine can start the protocol process after the old five-second
// cutoff; concurrent jobs must share that process and still get real results.
const fixture = String.raw`
  const readline=require('readline');let handshakes=0;
  const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
  readline.createInterface({input:process.stdin}).on('line',line=>{
    const message=JSON.parse(line);
    if(message.message_type==='handshake'){handshakes++;setTimeout(()=>emit({protocol_version:1,message_type:'handshake',payload:{status:'ready'}}),5500);return;}
    if(message.message_type==='job'){if(message.job_id==='cancelled')process.exit(19);emit({protocol_version:1,message_type:'job_result',job_id:message.job_id,status:'succeeded',outputs:[{handshakes}],diagnostics:[]});}
  });`;
const client = createPersistentWorkerClient({ command: process.execPath, args: ["-e", fixture] });
try {
  const abort = new AbortController();
  const cancelled = client.submit("fixture.cancelled", {}, { jobId: "cancelled", signal: abort.signal });
  const firstPending = client.submit("fixture.one", {}, { jobId: "one" }), secondPending = client.submit("fixture.two", {}, { jobId: "two" });
  const cancelledAt = performance.now();
  abort.abort(new Error("explicit cancellation"));
  await assert.rejects(cancelled, /CANCELLED: worker job cancelled before dispatch/);
  assert.ok(performance.now() - cancelledAt < 3000, "cancelled callers must not wait for slow shared startup");
  const [first, second] = await Promise.all([firstPending, secondPending]);
  assert.equal(first.status, "succeeded"); assert.equal(second.status, "succeeded");
  assert.equal(first.outputs[0].handshakes, 1); assert.equal(second.outputs[0].handshakes, 1);
  assert.equal(client.generation, 1);
} finally { await client.close(); }
const invalid = createPersistentWorkerClient({ command: process.execPath, args: ["-e", "process.stdin.once('data',()=>process.stdout.write('not-json\\n')); setInterval(()=>{},1000);"] });
try {
  await assert.rejects(invalid.submit("fixture.invalid", {}, { jobId: "invalid" }), /WORKER_PROTOCOL_INVALID/);
  assert.equal(invalid.terminationUnconfirmed, false);
} finally { await invalid.close(); }
console.log("Delayed Worker readiness retains a single producer and completes concurrent jobs.");
