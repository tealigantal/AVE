import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createOpenAICompatibleProvider, ModelGatewayError, runModel, type ModelRequest } from "../../packages/platform/model-gateway/src/public.js";
import { configuredModelProvider } from "../../apps/desktop/src/main/model-configuration.js";

const request: ModelRequest = { request_id: "protocol", provider: "local", model: "open-model", prompt_version: "test", input: { context: "Return JSON", media: [] }, privacy_class: "internal", structured_output: true };
const event = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`;
const content = event({ model: "snapshot", choices: [{ index: 0, delta: { content: '{"text":"中文"}' }, finish_reason: null }] });
const finish = event({ model: "snapshot", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
const usage = event({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 } });
const done = "data: [DONE]\r\n\r\n";
const config = { provider: "local", base_url: "http://127.0.0.1:1234/v1", models: [{ model: "open-model", media_types: [] }], response_mode: "sse" as const, structured_output: "validated_json" as const };
const outputError = (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_OUTPUT_INVALID";
let cancelled = 0;
function provider(text: string, close = true) {
  return createOpenAICompatibleProvider({ ...config, fetch_impl: async (_url, init) => {
    assert.equal(init!.redirect, "error"); assert.equal("authorization" in init!.headers!, false);
    const wire = JSON.parse(init!.body as string); assert.equal(wire.stream, true); assert.equal(wire.response_format, undefined); assert.equal(wire.max_tokens, undefined);
    return new Response(new ReadableStream({ start(controller) {
      // Byte-by-byte delivery exercises UTF-8 and CRLF split across chunks.
      for (const byte of new TextEncoder().encode(text)) controller.enqueue(new Uint8Array([byte]));
      if (close) controller.close();
    }, cancel() { cancelled++; } }));
  } });
}
const result = await runModel(request, provider(content + finish + usage + done, false));
assert.deepEqual(result.output, { text: "中文" }); assert.deepEqual(result.token_usage, { input: 5, output: 4, total: 9 }); assert.equal(cancelled, 1, "DONE closes an otherwise open response");
for (const text of [content + finish, content + done, content + finish + "data: {", "data: null\n\n", event({ choices: [{ index: 1, delta: {}, finish_reason: "stop" }] }) + done, content + finish.replace('"stop"', '"length"') + done]) await assert.rejects(runModel(request, provider(text)), outputError);
await assert.rejects(runModel(request, provider(event({ error: { code: "InvalidModel" } }))), error => outputError(error) && (error as Error).cause !== undefined);
const unknown = await runModel(request, provider(content + finish + done)); assert.equal(unknown.token_usage, undefined);
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
  return new Response(new ReadableStream({ cancel() { errorBodiesClosed++; } }), { status: 429 });
} });
await runModel(request, httpProvider, Date.now(), { policy: { retry: { max_attempts: 2 } } });
assert.equal(httpAttempts, 2); assert.equal(errorBodiesClosed, 1);
const badRequest = createOpenAICompatibleProvider({ ...config, fetch_impl: async () => new Response(new ReadableStream({ cancel() { errorBodiesClosed++; } }), { status: 400 }) });
await assert.rejects(runModel(request, badRequest), error => error instanceof ModelGatewayError && error.code === "MODEL_PROVIDER_FAILED" && (error.cause as any)?.status === 400);
assert.equal(errorBodiesClosed, 2);
await assert.rejects(runModel(request, provider(event({ choices: [null] }) + done)), outputError);

for (const name of ["ollama", "vllm", "sglang", "llama.cpp"]) {
  const configured = configuredModelProvider({ AVE_MODEL_PROVIDER: name, AVE_MODEL_NAME: "open-model", AVE_MODEL_BASE_URL: "http://localhost:1234/v1", AVE_MODEL_MEDIA_TYPES: "image/png", AVE_MODEL_STRUCTURED_OUTPUT: "validated_json" });
  assert.equal(configured.name, name); assert.equal(configured.model, "open-model"); assert.ok(configured.provider?.deployment.digest);
}
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "qwen" }), /exact deployment/);
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "custom", AVE_MODEL_NAME: "open-model" }), /BASE_URL/);
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "custom", AVE_MODEL_NAME: "open-model", AVE_MODEL_BASE_URL: "https://remote.invalid/v1" }), /authentication/);
assert.throws(() => configuredModelProvider({ AVE_MODEL_PROVIDER: "custom", AVE_MODEL_NAME: "open-model", AVE_MODEL_BASE_URL: "http://localhost:1234/v1", AVE_MODEL_MEDIA_TYPES: "audio/wav" }), /audio wire/);
console.log("Stage3 JSON/SSE deployment modes, stream completion/cancellation, malformed output and actual redirect denial passed (local fixtures only)");
