import { CreationError } from "../../packages/platform/contract-runtime/src/public.js";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { createOpenAICompatibleProvider, ModelGatewayError, runModel, type ModelRequest } from "../../packages/platform/model-gateway/src/public.js";
import { configuredModelProvider } from "../../apps/desktop/src/main/model-configuration.js";
import { creationErrorResult } from "../../apps/desktop/src/main/ipc/creation-errors.js";

const request: ModelRequest = { request_id: "protocol", provider: "local", model: "open-model", prompt_version: "test", input: { context: "Return JSON", media: [] }, privacy_class: "internal", structured_output: true };
const event = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`;
const content = event({ model: "snapshot", choices: [{ index: 0, delta: { content: '{"text":"中文"}' }, finish_reason: null }] });
const finish = event({ model: "snapshot", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
const usage = event({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 } });
const done = "data: [DONE]\r\n\r\n";
const config = { provider: "local", base_url: "http://127.0.0.1:1234/v1", models: [{ model: "open-model", media_types: [] }], response_mode: "sse" as const, structured_output: "validated_json" as const };
const outputError = (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_OUTPUT_INVALID";
// Rejected output remains local evidence, never a successful model run or cache.
for (const raw of ['  {"private":"PRIVATE_REJECTED_OUTPUT", broken 中文', ' {"private":"PRIVATE_REJECTED_OUTPUT","target_duration_ticks":1} \n']) {
  let sends = 0, cacheWrites = 0, replayWrites = 0;
  const audits: any[] = [], validatorCause = new Error("CREATION_DECISION_CAPACITY_INSUFFICIENT: exact cuts exceed target");
  const rejectedProvider = createOpenAICompatibleProvider({ ...config, response_mode: "json", fetch_impl: async () => {
    sends++;
    return new Response(JSON.stringify({ choices: [{ message: { content: raw }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 } }));
  } });
  await assert.rejects(runModel({ ...request, output_validator: () => { throw validatorCause; } }, rejectedProvider, Date.now(), {
    policy: { retry: { max_attempts: 3 } }, cache: { get: () => undefined, set: () => { cacheWrites++; } }, replayStore: { read: () => undefined, write: () => { replayWrites++; } }, audit: event => { audits.push(event); },
  }), (error: any) => {
    assert.equal(error.code, "MODEL_OUTPUT_INVALID");
    assert.equal(raw.includes("broken") ? error.cause instanceof SyntaxError : error.cause === validatorCause, true);
    assert.deepEqual(error.output_diagnostic, { representation: "provider-text", payload: raw, utf8_bytes: Buffer.byteLength(raw), sha256: createHash("sha256").update(raw).digest("hex") });
    assert.equal(JSON.stringify(creationErrorResult("COMMAND_FAILED", error)).includes("PRIVATE_REJECTED_OUTPUT"), false);
    return true;
  });
  assert.equal(sends, 1); assert.equal(cacheWrites, 0); assert.equal(replayWrites, 0);
  assert.equal(audits.length, 1); assert.equal(audits[0].usage_known, true);
  assert.deepEqual(audits[0].token_usage, { input: 5, output: 4, total: 9 });
  assert.equal(audits[0].provider_sent, true); assert.match(audits[0].input_hash, /^[a-f0-9]{64}$/);
}
const structuredRejection = { private: "PRIVATE_STRUCTURED_OUTPUT", nested: { z: 1, a: 2 } };
await assert.rejects(runModel({ ...request, output_validator: () => { throw new Error("explicit fixture rejection"); } }, async () => structuredRejection), (error: any) => {
  assert.equal(error.output_diagnostic.representation, "canonical-json");
  assert.deepEqual(JSON.parse(error.output_diagnostic.payload), structuredRejection); return true;
});
// Non-2xx keeps the actual bounded response as a local cause, with no resend.
let httpSends = 0;
const httpBody = JSON.stringify({ error: { code: "InvalidParameter", message: "specific provider rejection" } });
const diagnosticHttpProvider = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => {
  httpSends++; return new Response(httpBody, { status: 400, headers: { "content-type": "application/json", "x-request-id": "rejection-1" } });
} });
await assert.rejects(runModel(request, diagnosticHttpProvider), (error: any) => {
  assert.equal(error.code, "MODEL_PROVIDER_FAILED"); assert.equal(error.cause.status, 400);
  const detail = JSON.parse(error.cause.cause.message);
  assert.equal(detail.complete, true); assert.equal(detail.request_id, "rejection-1");
  assert.equal(Buffer.from(detail.body_base64, "base64").toString(), httpBody);
  assert.equal(error.message.includes("specific provider rejection"), false);
  return true;
});
assert.equal(httpSends, 1);
let httpBodyCancelled = false;
const oversizedHttp = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({
  start(controller) { controller.enqueue(new Uint8Array(100000).fill(65)); },
  cancel() { httpBodyCancelled = true; },
}), { status: 400 }) });
await assert.rejects(runModel(request, oversizedHttp), (error: any) => {
  const detail = JSON.parse(error.cause.cause.message);
  assert.equal(detail.complete, false); assert.equal(detail.captured_bytes, 65536); return true;
});
assert.equal(httpBodyCancelled, true);
const brokenHttp = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({
  start(controller) { controller.error(new Error("body stream broken")); },
}), { status: 400 }) });
await assert.rejects(runModel(request, brokenHttp), (error: any) => {
  assert.equal(error.cause.status, 400); assert.match(error.cause.cause.cause.message, /body stream broken|HTTP response read and cleanup failed/); return true;
});
let cancelled = 0;
function provider(text: string, close = true, chunkSize = 1) {
  return createOpenAICompatibleProvider({ ...config, fetch_impl: async (_url, init) => {
    assert.equal(init!.redirect, "error"); assert.equal("authorization" in init!.headers!, false);
    const wire = JSON.parse(init!.body as string); assert.equal(wire.stream, true); assert.equal(wire.response_format, undefined); assert.equal(wire.max_tokens, undefined);
    return new Response(new ReadableStream({ start(controller) {
      const bytes = new TextEncoder().encode(text);
      for (let offset = 0; offset < bytes.length; offset += chunkSize) controller.enqueue(bytes.slice(offset, offset + chunkSize));
      if (close) controller.close();
    }, cancel() { cancelled++; } }));
  } });
}
const result = await runModel(request, provider(content + finish + usage + done, false));
assert.deepEqual(result.output, { text: "中文" }); assert.deepEqual(result.token_usage, { input: 5, output: 4, total: 9 }); assert.equal(cancelled, 1, "DONE closes an otherwise open response");
for (const text of [content + finish, content + done, content + finish + "data: {", "data: null\n\n", event({ choices: [{ index: 1, delta: {}, finish_reason: "stop" }] }) + done, content + finish.replace('"stop"', '"length"') + done]) await assert.rejects(runModel(request, provider(text)), outputError);
await assert.rejects(runModel(request, provider(event({ error: { code: "InvalidModel" } }))), error => outputError(error) && (error as Error).cause !== undefined);
const unknown = await runModel(request, provider(content + finish + done)); assert.equal(unknown.token_usage, undefined);
for (const ending of ["\r\n", "\n", "\r"]) for (const size of [1, 2, 17, 65536]) {
  const stream = (content + finish + usage + done).replaceAll("\r\n", ending);
  const actual = await runModel(request, provider(stream, false, size));
  assert.deepEqual(actual.output, { text: "中文" });
  assert.deepEqual(actual.token_usage, { input: 5, output: 4, total: 9 });
}
// Missing finish is still a real output failure, with no success cache or retry.
const failureAudits: any[] = []; let cachedFailures = 0;
await assert.rejects(runModel(request, provider(content + done), Date.now(), {
  cache: { get: () => undefined, set: () => { cachedFailures++; } },
  policy: { retry: { max_attempts: 3 } }, audit: audit => { failureAudits.push(audit); },
}), (error: any) => {
  assert.equal(outputError(error), true); assert.equal(error.message, "incomplete stream: missing finish");
  assert.equal(error.stream_boundary.done_seen, true); assert.equal(error.stream_boundary.finish_reason, null);
  assert.equal(error.stream_boundary.data_events, 2); assert.equal(error.stream_boundary.transport_eof, false);
  const consumed = (content + done).slice(0, -1); // CR dispatches DONE before the final one-byte LF chunk.
  assert.equal(error.stream_boundary.received_bytes, Buffer.byteLength(consumed));
  assert.equal(error.stream_boundary.received_sha256, createHash("sha256").update(consumed).digest("hex")); return true;
});
assert.equal(cachedFailures, 0); assert.equal(failureAudits.length, 1);
assert.equal(failureAudits[0].code, "MODEL_OUTPUT_INVALID"); assert.equal(failureAudits[0].attempt, 1);
await assert.rejects(runModel(request, provider("data: {broken}\n\n")), error => outputError(error) && (error as Error).message === "stream event is not JSON" && (error as Error).cause instanceof SyntaxError);
await assert.rejects(runModel(request, provider(content + finish + done + content, true, 65536)), error => outputError(error) && (error as Error).message === "data follows stream terminator");
for (const suffix of [new Uint8Array([0xff]), new Uint8Array([0xe4, 0xb8])]) {
  const invalidUtf8 = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(content)); controller.enqueue(suffix); controller.close();
  } })) });
  await assert.rejects(runModel(request, invalidUtf8), error => outputError(error) && (error as Error).message === "stream contains invalid UTF-8" && (error as Error).cause instanceof TypeError);
}
// Test the adapter itself: runModel's outer cancellation race must not hide an
// adapter that incorrectly reports EOF/missing finish after reader.cancel().
const readAbort = new AbortController(), cancellationReason = new Error("new revision while SSE read is pending");
let pendingRead!: () => void, closedReason: unknown;
const reading = new Promise<void>(resolve => { pendingRead = resolve; });
const pendingReader = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({
  pull() { pendingRead(); }, cancel(reason) { closedReason = reason; },
}, { highWaterMark: 0 })) });
const directPending = pendingReader.complete({ ...request, signal: readAbort.signal });
await reading; readAbort.abort(cancellationReason);
await assert.rejects(directPending, error => error instanceof ModelGatewayError && error.code === "MODEL_CANCELLED" && error.cause === cancellationReason);
assert.equal(closedReason, cancellationReason);
const transportCause = new Error("socket disconnected during response body");
const failedReader = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({ pull(controller) { controller.error(transportCause); } })) });
await assert.rejects(runModel(request, failedReader), error => error instanceof ModelGatewayError && error.code === "MODEL_PROVIDER_FAILED" && error.cause instanceof AggregateError && error.cause.cause === transportCause);
const abort = new AbortController(); let readerStarted!: () => void;
const started = new Promise<void>(resolve => { readerStarted = resolve; });
const hanging = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({ start() { readerStarted(); }, cancel() { cancelled++; } })) });
const beforeCancel = cancelled, pending = runModel({ ...request, signal: abort.signal }, hanging);
await started; abort.abort(new Error("new intent"));
await assert.rejects(pending, error => error instanceof ModelGatewayError && error.code === "MODEL_CANCELLED");
await new Promise(resolve => setImmediate(resolve)); assert.equal(cancelled, beforeCancel + 1);
assert.notEqual(createOpenAICompatibleProvider(config).deployment.digest, createOpenAICompatibleProvider({ ...config, base_url: "http://localhost:1234/v1" }).deployment.digest);
assert.notEqual(createOpenAICompatibleProvider(config).deployment.digest, createOpenAICompatibleProvider({ ...config, structured_output: "json_object" }).deployment.digest);

const values = new Map<string, any>();
const cache = { get: (key: string) => values.get(key), set: (key: string, value: any) => { values.set(key, value); } };
const recordings = new Map<string, any>();
const replayStore = { read: (key: string) => recordings.get(key), write: (key: string, value: any) => { recordings.set(key, value); } };
let promptedCalls = 0;
function prompted(version: string, text: string) {
  const mutable = { version, text };
  const adapter = createOpenAICompatibleProvider({ ...config, system_prompt: mutable, fetch_impl: async (_url, init) => {
    promptedCalls++;
    assert.deepEqual(JSON.parse(init!.body as string).messages, [{ role: "system", content: text }, { role: "user", content: "Return JSON" }]);
    return new Response(content + finish + usage + done);
  } });
  mutable.text = "mutated after configuration";
  return adapter;
}
const originalPrompt = prompted("v1", "Observe attached audio");
await runModel(request, originalPrompt, Date.now(), { cache, replayStore });
assert.equal((await runModel(request, prompted("v1", "Observe attached audio"), Date.now(), { cache })).cache_hit, true);
assert.equal((await runModel({ ...request, replay: true }, prompted("v1", "Observe attached audio"), Date.now(), { replayStore })).cache_hit, true);
assert.equal(promptedCalls, 1);
for (const changed of [prompted("v1", "Describe attached audio"), prompted("v2", "Observe attached audio")]) {
  assert.notEqual(originalPrompt.deployment.digest, changed.deployment.digest);
  const beforeReplay: number = promptedCalls;
  await assert.rejects(runModel({ ...request, replay: true }, changed, Date.now(), { replayStore }), error => error instanceof ModelGatewayError && error.code === "MODEL_REPLAY_MISSING");
  assert.equal(promptedCalls, beforeReplay);
  assert.equal((await runModel(request, changed, Date.now(), { cache })).cache_hit, false);
}
assert.equal(promptedCalls, 3);
for (const invalid of [null, {}, { version: "", text: "a" }, { version: "v1", text: " " }, { version: "v1", text: 3 }, { version: "v1", text: "a", extra: true }]) {
  assert.throws(() => createOpenAICompatibleProvider({ ...config, system_prompt: invalid as any }), error => error instanceof ModelGatewayError && error.code === "MODEL_CONFIGURATION_INVALID");
}

// Explicit inference controls bind actual bytes, cache/replay identity and audit.
for (const invalid of [{ enable_thinking: "true" }, { thinking_budget: 4096 }, { enable_thinking: false, thinking_budget: 1 }, { enable_thinking: true, thinking_budget: 0 }, { enable_thinking: true, thinking_budget: 1.5 }, { max_tokens: 0 }, { max_tokens: Number.POSITIVE_INFINITY }]) {
  assert.throws(() => createOpenAICompatibleProvider({ ...config, ...invalid } as any), error => error instanceof ModelGatewayError && error.code === "MODEL_CONFIGURATION_INVALID");
}
let thinkingCalls = 0;
const thinking = (budget: number, maxTokens = 8192) => createOpenAICompatibleProvider({ ...config, response_mode: "json", enable_thinking: true, thinking_budget: budget, max_tokens: maxTokens,
  fetch_impl: async (_url, init) => {
    thinkingCalls++;
    const wire = JSON.parse(init!.body as string);
    assert.equal(wire.enable_thinking, true); assert.equal(wire.thinking_budget, budget); assert.equal(wire.max_tokens, maxTokens);
    assert.equal("extra_body" in wire, false); assert.equal("max_completion_tokens" in wire, false);
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"answer":24}', reasoning_content: "private chain never retained" }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, completion_tokens_details: { reasoning_tokens: 12 } } }));
  } });
const thought = await runModel(request, thinking(4096), Date.now(), { cache, replayStore });
assert.deepEqual(thought.output, { answer: 24 });
assert.deepEqual(thought.audit.reasoning_observation, { content_observed: true, tokens: 12 });
assert.equal(JSON.stringify(thought).includes("private chain"), false);
assert.equal((await runModel(request, thinking(4096), Date.now(), { cache })).cache_hit, true);
assert.equal(thinkingCalls, 1);
for (const changed of [thinking(2048), thinking(4096, 4096), createOpenAICompatibleProvider({ ...config, response_mode: "json", enable_thinking: false })]) {
  assert.notEqual(thinking(4096).deployment.digest, changed.deployment.digest);
  await assert.rejects(runModel({ ...request, replay: true }, changed, Date.now(), { replayStore }), error => error instanceof ModelGatewayError && error.code === "MODEL_REPLAY_MISSING");
}
const reasonEvent = event({ choices: [{ index: 0, delta: { content: null, reasoning_content: "private stream chain" }, finish_reason: null }] });
const reasoningUsage = event({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9, completion_tokens_details: { reasoning_tokens: 3 } } });
const streamedThought = await runModel(request, provider(reasonEvent + content + finish + reasoningUsage + done));
assert.deepEqual(streamedThought.output, { text: "中文" });
assert.deepEqual(streamedThought.audit.reasoning_observation, { content_observed: true, tokens: 3 });
assert.equal(JSON.stringify(streamedThought).includes("private stream chain"), false);
await assert.rejects(runModel(request, provider(reasonEvent + finish + done)), outputError, "reasoning without answer cannot succeed");
await assert.rejects(runModel(request, provider(reasonEvent + content + finish.replace('"stop"', '"length"') + done)), outputError);
await assert.rejects(runModel(request, provider(content + finish + reasoningUsage.replace('"reasoning_tokens":3', '"reasoning_tokens":5') + done)), outputError);
const noReasoning = createOpenAICompatibleProvider({ ...config, enable_thinking: true, response_mode: "json", fetch_impl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' }, finish_reason: "stop" }] })) });
assert.deepEqual((await runModel(request, noReasoning)).audit.reasoning_observation, { content_observed: false, tokens: null }, "request flag is not proof the provider actually reasoned");

let redirectedSends = 0, originalSends = 0;
const target = createServer((_request, response) => { redirectedSends++; response.end("unexpected"); });
const origin = createServer((_request, response) => { originalSends++; response.writeHead(307, { location: `http://127.0.0.1:${(target.address() as any).port}/sink` }); response.end(); });
await new Promise<void>(resolve => target.listen(0, "127.0.0.1", resolve));
await new Promise<void>(resolve => origin.listen(0, "127.0.0.1", resolve));
try {
  await assert.rejects(runModel(request, createOpenAICompatibleProvider({ ...config, base_url: `http://127.0.0.1:${(origin.address() as any).port}` })), error => error instanceof ModelGatewayError && error.code === "MODEL_PROVIDER_FAILED" && error.cause instanceof Error);
  assert.equal(originalSends, 1); assert.equal(redirectedSends, 0);
} finally { await Promise.all([new Promise<void>(resolve => origin.close(() => resolve())), new Promise<void>(resolve => target.close(() => resolve()))]); }

let errorBodiesClosed = 0, httpAttempts = 0;
const httpProvider = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => {
  httpAttempts++;
  if (httpAttempts === 2) { assert.equal(errorBodiesClosed, 1, "retry starts after previous error body is released"); return new Response(content + finish + done); }
  return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65536)); }, cancel() { errorBodiesClosed++; } }), { status: 429 });
} });
await runModel(request, httpProvider, Date.now(), { policy: { retry: { max_attempts: 2 } } });
assert.equal(httpAttempts, 2); assert.equal(errorBodiesClosed, 1);
const badRequest = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65536)); }, cancel() { errorBodiesClosed++; } }), { status: 400 }) });
await assert.rejects(runModel(request, badRequest), error => error instanceof ModelGatewayError && error.code === "MODEL_PROVIDER_FAILED" && (error.cause as any)?.status === 400);
assert.equal(errorBodiesClosed, 2);
let failedReleaseSends = 0;
const failedRelease = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => {
  failedReleaseSends++;
  return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(65536)); }, cancel() { throw new Error("HTTP release failed"); } }), { status: 429 });
} });
await assert.rejects(runModel(request, failedRelease, Date.now(), { policy: { retry: { max_attempts: 2 } } }), (error: any) => {
  assert.equal(error.cause.status, 429); assert.equal(error.cause.retryable, false);
  assert.match(error.cause.cause.cause.message, /HTTP release failed/); return true;
});
assert.equal(failedReleaseSends, 1, "resource-release failures must not enter provider retry");
await assert.rejects(runModel(request, provider(event({ choices: [null] }) + done)), outputError);

for (const name of ["ollama", "vllm", "sglang", "llama.cpp"]) {
  const configured = configuredModelProvider({ AVE_MODEL_PROVIDER: name, AVE_MODEL_NAME: "open-model", AVE_MODEL_BASE_URL: "http://localhost:1234/v1", AVE_MODEL_MEDIA_TYPES: "image/png", AVE_MODEL_STRUCTURED_OUTPUT: "validated_json" });
  assert.equal(configured.name, name); assert.equal(configured.model, "open-model"); assert.ok(configured.provider?.deployment.digest);
}
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "qwen" }), /exact deployment/);
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "custom", AVE_MODEL_NAME: "open-model" }), /BASE_URL/);
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "custom", AVE_MODEL_NAME: "open-model", AVE_MODEL_BASE_URL: "https://remote.invalid/v1" }), /authentication/);
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "custom", AVE_MODEL_NAME: "open-model", AVE_MODEL_BASE_URL: "http://localhost:1234/v1", AVE_MODEL_MEDIA_TYPES: "audio/wav" }), /audio wire/);

for (const [code,words] of [
  ["CREATION_PLANNING_RECEIPT_REBOUND",["创作确认","本次已核验的选材记录不匹配","制作已停止"]],
  ["CREATION_PACING_GOAL_UNMET",["平均镜头时长没有增加","比参考作品更短的镜头","本次制作已停止"]],
  ["CREATION_PACING_MAPPING_REQUIRED",["逐个延长镜头","明确对应的参考片段","当前无法可靠对应","本次制作已停止"]],
  ["CREATION_PACING_PRESERVATION_CONFLICT",["受保护"]],
  ["CREATION_PACING_REFERENCE_STALE",["参考版本"]],
] as const) {
  const cause=new CreationError(code,"private diagnostic path and original cause");
  const error=new ModelGatewayError("MODEL_OUTPUT_INVALID","private raw output",{cause});
  const projected=creationErrorResult("CREATION_FAILED",error);
  for (const word of words) assert.ok(projected.error.message.includes(word),`${code} must explain ${word}`);
  assert.equal(error.cause,cause);assert.equal(cause.code,code);
  assert.equal(projected.error.message.includes("private"),false);assert.equal(projected.error.code,"MODEL_OUTPUT_INVALID");
}
console.log("Stage3 JSON/SSE deployment modes, stream completion/cancellation, malformed output, actual redirect denial and private-safe pacing errors passed (local fixtures only)");
