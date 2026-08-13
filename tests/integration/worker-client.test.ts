import assert from "node:assert/strict";
import { createLocalWorkerJobPort, startWorker } from "../../packages/platform/worker-client/src/public.js";

const crashed = startWorker({ command: process.execPath, args: ["-e", "process.stdin.on('data', () => process.exit(17))"] });
crashed.send({ type: "request", request_id: "crash-1" });
await assert.rejects(() => crashed.waitFor("crash-1", 2000), /WORKER_CRASH/);
crashed.stop();

const worker = createLocalWorkerJobPort();
const result = await worker.submit("analysis.v1", { analysis_type: "asr", records: [{ asset_id: `asset:sha256:${"a".repeat(64)}`, start_pts: 0, end_pts: 2, text: "worker client" }] }, { jobId: "client-analysis-1" }) as { status: string; outputs: Array<{ source: string }> };
assert.equal(result.status, "succeeded");
assert.equal(result.outputs[0].source, "asr");
await worker.close();
console.log("worker client control check passed");
