import { strict as assert } from "node:assert";
import { createDeepSeekProvider, ModelGatewayError, runModel, type ModelRequest } from "../../packages/platform/model-gateway/src/public.js";

const request: ModelRequest = { request_id: "s3-model", provider: "deepseek", model: "fixture-only", prompt_version: "s3-test-v1", privacy_class: "internal", input: { context: { text: "hello" }, media: [] }, structured_output: true };
const code = (expected: string) => (error: unknown) => error instanceof ModelGatewayError && error.code === expected;
let calls = 0;
const provider = { complete: async () => { calls += 1; return { output: "{}", token_usage: { input: 2, output: 2, total: 4 } }; } };
await runModel(request, provider); assert.equal(calls, 1);
const unknownUsage = await runModel(request, async () => ({})); assert.equal(unknownUsage.token_usage, undefined);
await assert.rejects(runModel(request, { complete: async () => ({ output: "{}", token_usage: { input: 2, output: 2, total: 9 } }) }), code("MODEL_OUTPUT_INVALID"));

const controller = new AbortController(); controller.abort(new Error("user cancelled"));
const beforeCancelled = calls;
await assert.rejects(runModel({ ...request, signal: controller.signal }, provider), error => error instanceof ModelGatewayError && error.code === "MODEL_CANCELLED" && error.cause === controller.signal.reason);
assert.equal(calls, beforeCancelled);
const late = new AbortController(); let saved = 0;
await assert.rejects(runModel({ ...request, signal: late.signal }, { complete: async () => { late.abort("new intent"); return { output: "{}" }; } }, Date.now(), { cache: { get: () => undefined, set: () => { saved += 1; } } }), code("MODEL_CANCELLED"));
assert.equal(saved, 0, "cancelled late response cannot enter result cache");
const original = new Error("provider connection reset");
await assert.rejects(runModel(request, async () => { throw original; }), error => error instanceof ModelGatewayError && error.code === "MODEL_PROVIDER_FAILED" && error.cause === original && error.cause instanceof Error && error.cause.stack!.includes("provider connection reset"));
const validation = new Error("unknown source id: absent");
let invalidCalls = 0;
await assert.rejects(runModel({ ...request, output_validator: () => { throw validation; } }, async () => { invalidCalls += 1; return {}; }, Date.now(), { policy: { retry: { max_attempts: 3, retryable: () => true } } }), error => error instanceof ModelGatewayError && error.code === "MODEL_OUTPUT_INVALID" && error.cause === validation);
assert.equal(invalidCalls, 1, "invalid output is not an external retryable failure");

const sent: any[] = [];
const wireSignal = new AbortController();
const wire = createDeepSeekProvider({ api_key: "fixture-secret", fetch_impl: async (_url, init) => {
  sent.push(JSON.parse(init!.body as string)); assert.equal(init!.signal, wireSignal.signal);
  return new Response(JSON.stringify({ model: "fixture-only", choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 } }));
} });
await runModel({ ...request, signal: wireSignal.signal }, wire, Date.now(), { policy: {  } });
assert.equal("max_tokens" in sent[0], false, "no product output ceiling is inserted");
let attempts = 0, authorized = 0; const failures: unknown[] = [];
await runModel(request, async () => { attempts += 1; if (attempts === 1) throw original; return {}; }, Date.now(), { authorizeAttempt: () => { authorized += 1; }, policy: { retry: { max_attempts: 2, retryable: error => error === original } }, audit: audit => { if ("code" in audit) failures.push(audit); } });
assert.equal(attempts, 2); assert.equal(authorized, 2); assert.equal(failures.length, 1);
const audits: any[] = [];
let actualSends = 0;
const observedWire = (finish_reason: string | undefined = "stop") => createDeepSeekProvider({ api_key: "fixture-secret", fetch_impl: async () => {
  actualSends += 1;
  return new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason }], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } }));
} });
const denied = new Error("PROFILE_SNAPSHOT_STALE fixture gate");
await assert.rejects(runModel({ ...request, dispatch: async () => { throw denied; } }, observedWire(), Date.now(), { audit: item => { audits.push(item); } }), error => error === denied);
assert.equal(actualSends, 0); assert.equal(audits.at(-1).provider_sent, false); assert.equal(audits.at(-1).code, "MODEL_DISPATCH_DENIED");
await assert.rejects(runModel({ ...request, replay: true }, observedWire()), code("MODEL_REPLAY_MISSING")); assert.equal(actualSends, 0);
await assert.rejects(runModel({ ...request, privacy_class: "sensitive" }, observedWire()), code("MODEL_PRIVACY_BLOCKED")); assert.equal(actualSends, 0);
await assert.rejects(runModel(request, observedWire("length"), Date.now(), { audit: item => { audits.push(item); } }), code("MODEL_OUTPUT_INVALID"));
assert.equal(audits.at(-1).usage_known, true); assert.deepEqual(audits.at(-1).token_usage, { input: 3, output: 4, total: 7 });
const cancelledAfterResponse = new AbortController();
await assert.rejects(runModel({ ...request, signal: cancelledAfterResponse.signal }, { complete: async () => { cancelledAfterResponse.abort("changed intent"); return { output: "{}", token_usage: { input: 3, output: 4, total: 7 } }; } }, Date.now(), { audit: item => { audits.push(item); } }), code("MODEL_CANCELLED"));
assert.deepEqual(audits.at(-1).token_usage, { input: 3, output: 4, total: 7 });
const cancelledInAudit = new AbortController();
await assert.rejects(runModel({ ...request, signal: cancelledInAudit.signal }, observedWire(), Date.now(), { audit: item => { if (!("code" in item)) cancelledInAudit.abort("cancel during success audit"); } }), code("MODEL_CANCELLED"));
const cancelledInCache = new AbortController(); let replayWrites = 0;
await assert.rejects(runModel({ ...request, signal: cancelledInCache.signal }, observedWire(), Date.now(), {
  cache: { get: () => undefined, set: async () => { cancelledInCache.abort("cancel while cache write completes"); } },
  replayStore: { read: () => undefined, write: () => { replayWrites += 1; } },
}), code("MODEL_CANCELLED"));
assert.equal(replayWrites, 0, "cancellation cannot start another persistence operation after cache finishes");
const uncooperative = new AbortController();
let rejectLate!: (cause: Error) => void, startedProvider!: () => void;
const started = new Promise<void>(resolve => { startedProvider = resolve; });
const waiting = runModel({ ...request, signal: uncooperative.signal }, { complete: () => { startedProvider(); return new Promise((_, reject) => { rejectLate = reject; }); } }, Date.now(), { audit: item => { audits.push(item); } });
await started; uncooperative.abort(new Error("close while provider ignores cancellation"));
await assert.rejects(waiting, error => error instanceof ModelGatewayError && error.code === "MODEL_CANCELLED" && error.cause === uncooperative.signal.reason);
const settledAudits = audits.length;
rejectLate(new Error("late provider transport failure")); await new Promise(resolve => setImmediate(resolve));
assert.equal(audits.length, settledAudits, "detached provider failure must be consumed without another audit or persistence attempt");
console.log("Stage3 gateway pre-send authorization, cancellation, cause preservation and bounded retries passed (no network)");
