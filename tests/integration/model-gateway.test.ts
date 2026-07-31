import { strict as assert } from "node:assert";
import { createDeepSeekProvider, createQwenProvider, ModelGatewayError, PromptRegistry, runModel, type ModelCache, type ProviderResponse } from "../../packages/platform/model-gateway/src/public.js";

const audits: any[] = [];
const cacheValues = new Map<string, ProviderResponse>();
const cache: ModelCache = { get: (key) => cacheValues.get(key), set: (key, value) => { cacheValues.set(key, value); } };
let calls = 0;
const request = { request_id: "model-1", project_id: "project-1", related_artifact_id: "artifact-1", provider: "qwen", model: "qwen-test", model_snapshot: "snap-1", prompt_version: "story:v1", input: { text: "hello" }, privacy_class: "internal" as const, structured_output: true };
const first = await runModel(request, async () => { calls += 1; return '{"label":"ok"}'; }, Date.now(), { cache, audit: (event) => { audits.push(event); } });
assert.deepEqual(first.output, { label: "ok" }); assert.equal(first.audit.input_hash.length, 64); assert.equal(first.audit.output_hash.length, 64); assert.equal(calls, 1);
const second = await runModel({ ...request, request_id: "model-2" }, async () => { calls += 1; return '{"label":"wrong"}'; }, Date.now(), { cache });
assert.equal(second.cache_hit, true); assert.deepEqual(second.output, { label: "ok" }); assert.equal(calls, 1);

let retryCalls = 0;
const retried = await runModel({ ...request, request_id: "model-retry", structured_output: false }, async () => { retryCalls += 1; if (retryCalls === 1) throw new Error("temporary"); return { ok: true }; }, Date.now(), { policy: { retry: { max_attempts: 2, retryable: () => true } } });
assert.equal(retried.retry_count, 1); assert.equal(retryCalls, 2);
await assert.rejects(() => runModel({ ...request, request_id: "model-invalid" }, async () => "not-json", Date.now(), { audit: (event) => { audits.push(event); } }), (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_OUTPUT_INVALID");
await assert.rejects(() => runModel({ ...request, request_id: "model-budget" }, { complete: async () => ({ output: { ok: true }, token_usage: { input: 2, output: 2, total: 4 } }) }, Date.now(), { policy: { budget: { max_total_tokens: 2 } }, audit: (event) => { audits.push(event); } }), (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_BUDGET_EXCEEDED");
await assert.rejects(() => runModel({ ...request, request_id: "model-sensitive", privacy_class: "sensitive" }, async () => ({})), (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_PRIVACY_BLOCKED");
const sensitive = await runModel({ ...request, request_id: "model-sensitive-ok", privacy_class: "sensitive" }, async () => ({ ok: true }), Date.now(), { policy: { allowed_sensitive_providers: ["qwen"] } });
assert.equal((sensitive.output as any).ok, true);

const fakeFetch = async (url: RequestInfo | URL, init?: RequestInit) => { assert.match(String(url), /chat\/completions$/); assert.equal((init?.headers as Record<string, string>).authorization, "Bearer test-key"); return new Response(JSON.stringify({ model: "qwen-test-snapshot", choices: [{ message: { content: '{"answer":1}' } }], usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } }), { status: 200, headers: { "content-type": "application/json" } }); };
const qwen = createQwenProvider({ api_key: "test-key", fetch_impl: fakeFetch });
const deepseek = createDeepSeekProvider({ api_key: "test-key", fetch_impl: fakeFetch });
assert.deepEqual((await qwen.complete(request)).token_usage, { input: 2, output: 3, total: 5 }); assert.equal((await deepseek.complete(request)).model_snapshot, "qwen-test-snapshot");

const prompts = new PromptRegistry(); prompts.register({ name: "story", version: "v1", template: "写{{language}}：{{topic}}" }); assert.equal(prompts.render("story", "v1", { language: "中文", topic: "旅行" }), "写中文：旅行"); assert.throws(() => prompts.register({ name: "story", version: "v1", template: "duplicate" }), /already registered/); assert.throws(() => prompts.render("story", "v1", { language: "中文" }), /variable missing/);
assert.ok(audits.some((event) => event.code === "MODEL_OUTPUT_INVALID"));
console.log("model gateway policy/provider/replay check passed");
