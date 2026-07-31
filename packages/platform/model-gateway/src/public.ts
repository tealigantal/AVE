import { createHash } from "node:crypto";

export type PrivacyClass = "public" | "internal" | "sensitive";
export type TokenUsage = Readonly<{ input: number; output: number; total?: number }>;
export type BudgetPolicy = Readonly<{ max_input_tokens?: number; max_output_tokens?: number; max_total_tokens?: number }>;
export type ModelRequest = Readonly<{ request_id: string; project_id?: string; related_artifact_id?: string; provider: string; model: string; model_snapshot?: string; prompt_version: string; input: unknown; privacy_class: PrivacyClass; output_validator?: (output: unknown) => void; budget?: BudgetPolicy; structured_output?: boolean; replay?: boolean }>;
export type ProviderResponse = Readonly<{ output: unknown; model_snapshot?: string; token_usage?: TokenUsage }>;
export type ModelAudit = Readonly<{ provider: string; model: string; model_snapshot: string; prompt_version: string; input_hash: string; output_hash: string; token_usage?: TokenUsage; latency_ms: number; retry_count: number; cache_hit: boolean; privacy_class: PrivacyClass; project_id?: string; related_artifact_id?: string }>;
export type ModelResult = Readonly<{ request_id: string; provider: string; model: string; output: unknown; input_hash: string; output_hash: string; latency_ms: number; token_usage?: TokenUsage; cache_hit: boolean; retry_count: number; audit: ModelAudit }>;
export type ModelProvider = ((request: ModelRequest) => Promise<unknown>) | Readonly<{ complete(request: ModelRequest): Promise<ProviderResponse> }>;
export type ModelPolicy = Readonly<{ allowed_sensitive_providers?: readonly string[]; retry?: Readonly<{ max_attempts: number; backoff_ms?: number; retryable?: (error: unknown) => boolean }>; budget?: BudgetPolicy }>;
export type ModelCache = Readonly<{ get(key: string): Promise<ProviderResponse | undefined> | ProviderResponse | undefined; set(key: string, value: ProviderResponse): Promise<void> | void }>;
export type ReplayStore = Readonly<{ read(key: string): Promise<ProviderResponse | undefined> | ProviderResponse | undefined; write(key: string, value: ProviderResponse): Promise<void> | void }>;
export type AuditSink = (audit: ModelAudit | Readonly<{ code: "MODEL_OUTPUT_INVALID" | "MODEL_BUDGET_EXCEEDED" | "MODEL_PRIVACY_BLOCKED"; request_id: string; input_hash: string }>) => void | Promise<void>;

export class ModelGatewayError extends Error { constructor(public readonly code: "MODEL_OUTPUT_INVALID" | "MODEL_BUDGET_EXCEEDED" | "MODEL_PRIVACY_BLOCKED" | "MODEL_RETRY_EXHAUSTED", message: string) { super(message); this.name = "ModelGatewayError"; } }

function canonical(value: unknown): string { return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item); }
function hash(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }
export function modelCacheKey(request: ModelRequest): string { return hash({ provider: request.provider, model: request.model, model_snapshot: request.model_snapshot ?? "", prompt_version: request.prompt_version, input: request.input, privacy_class: request.privacy_class, structured_output: request.structured_output ?? false }); }
function parseStructured(output: unknown): unknown { if (typeof output !== "string") return output; try { return JSON.parse(output); } catch { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "model output is not valid JSON"); } }
function assertBudget(usage: TokenUsage | undefined, budget: BudgetPolicy | undefined): void { if (!usage || !budget) return; const total = usage.total ?? usage.input + usage.output; if (budget.max_input_tokens !== undefined && usage.input > budget.max_input_tokens || budget.max_output_tokens !== undefined && usage.output > budget.max_output_tokens || budget.max_total_tokens !== undefined && total > budget.max_total_tokens) throw new ModelGatewayError("MODEL_BUDGET_EXCEEDED", "model token usage exceeded budget"); }
function wait(ms: number): Promise<void> { return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve(); }

export async function runModel(request: ModelRequest, provider: ModelProvider, startedAt = Date.now(), options: Readonly<{ policy?: ModelPolicy; cache?: ModelCache; replayStore?: ReplayStore; audit?: AuditSink }> = {}): Promise<ModelResult> {
  if (!request.request_id || !request.provider || !request.model || !request.prompt_version) throw new Error("model request metadata is incomplete");
  const policy = options.policy ?? {};
  if (request.privacy_class === "sensitive" && !(policy.allowed_sensitive_providers ?? []).includes(request.provider)) { await options.audit?.({ code: "MODEL_PRIVACY_BLOCKED", request_id: request.request_id, input_hash: hash(request.input) }); throw new ModelGatewayError("MODEL_PRIVACY_BLOCKED", "sensitive model input requires an approved provider policy"); }
  const input_hash = hash(request.input); const key = modelCacheKey(request); const budget = { ...(policy.budget ?? {}), ...(request.budget ?? {}) };
  const replay = request.replay ? await options.replayStore?.read(key) : undefined;
  const cached = replay ?? await options.cache?.get(key);
  let response: ProviderResponse | undefined = cached; let cache_hit = Boolean(cached); let retry_count = 0; const started = startedAt;
  if (!response) {
    const maxAttempts = Math.max(1, policy.retry?.max_attempts ?? 1);
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try { response = typeof provider === "function" ? { output: await provider(request) } : await provider.complete(request); break; }
      catch (error) { retry_count = attempt; const retryable = policy.retry?.retryable?.(error) ?? false; if (attempt >= maxAttempts || !retryable) throw new ModelGatewayError("MODEL_RETRY_EXHAUSTED", error instanceof Error ? error.message : String(error)); await wait(policy.retry?.backoff_ms ?? 0); }
    }
  }
  if (!response) throw new ModelGatewayError("MODEL_RETRY_EXHAUSTED", "model provider returned no response");
  let output: unknown;
  try { output = request.structured_output ? parseStructured(response.output) : response.output; request.output_validator?.(output); } catch (error) { await options.audit?.({ code: "MODEL_OUTPUT_INVALID", request_id: request.request_id, input_hash }); throw error instanceof ModelGatewayError ? error : new ModelGatewayError("MODEL_OUTPUT_INVALID", error instanceof Error ? error.message : "structured output validation failed"); }
  try { assertBudget(response.token_usage, budget); } catch (error) { await options.audit?.({ code: "MODEL_BUDGET_EXCEEDED", request_id: request.request_id, input_hash }); throw error; }
  const output_hash = hash(output); const audit: ModelAudit = { provider: request.provider, model: request.model, model_snapshot: response.model_snapshot ?? request.model_snapshot ?? "unknown", prompt_version: request.prompt_version, input_hash, output_hash, token_usage: response.token_usage, latency_ms: Date.now() - started, retry_count, cache_hit, privacy_class: request.privacy_class, project_id: request.project_id, related_artifact_id: request.related_artifact_id };
  await options.cache?.set(key, { ...response, output }); if (request.replay && !replay) await options.replayStore?.write(key, { ...response, output }); await options.audit?.(audit);
  return { request_id: request.request_id, provider: request.provider, model: request.model, output, input_hash, output_hash, latency_ms: audit.latency_ms, token_usage: response.token_usage, cache_hit, retry_count, audit };
}

export type OpenAICompatibleConfig = Readonly<{ api_key: string; base_url: string; provider: string; model_snapshot?: string; fetch_impl?: typeof fetch }>;
export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): { complete(request: ModelRequest): Promise<ProviderResponse> } {
  return { async complete(request) { const fetchImpl = config.fetch_impl ?? fetch; const response = await fetchImpl(`${config.base_url.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.api_key}` }, body: JSON.stringify({ model: request.model, messages: [{ role: "user", content: typeof request.input === "string" ? request.input : JSON.stringify(request.input) }], response_format: request.structured_output ? { type: "json_object" } : undefined }) }); if (!response.ok) throw new Error(`${config.provider} HTTP ${response.status}`); const body = await response.json() as any; const content = body.choices?.[0]?.message?.content; if (content === undefined) throw new Error(`${config.provider} response has no message content`); return { output: content, model_snapshot: config.model_snapshot ?? body.model, token_usage: body.usage ? { input: Number(body.usage.prompt_tokens ?? 0), output: Number(body.usage.completion_tokens ?? 0), total: Number(body.usage.total_tokens ?? 0) } : undefined }; } };
}
export function createQwenProvider(config: Omit<OpenAICompatibleConfig, "provider" | "base_url"> & Partial<Pick<OpenAICompatibleConfig, "base_url">>): { complete(request: ModelRequest): Promise<ProviderResponse> } { return createOpenAICompatibleProvider({ ...config, provider: "qwen", base_url: config.base_url ?? "https://dashscope.aliyuncs.com/compatible-mode/v1" }); }
export function createDeepSeekProvider(config: Omit<OpenAICompatibleConfig, "provider" | "base_url"> & Partial<Pick<OpenAICompatibleConfig, "base_url">>): { complete(request: ModelRequest): Promise<ProviderResponse> } { return createOpenAICompatibleProvider({ ...config, provider: "deepseek", base_url: config.base_url ?? "https://api.deepseek.com" }); }

export type Prompt = Readonly<{ name: string; version: string; template: string }>;
export class PromptRegistry {
  private readonly prompts = new Map<string, Prompt>();
  register(prompt: Prompt): void { if (!prompt.name || !prompt.version || !prompt.template) throw new Error("prompt metadata is incomplete"); const key = `${prompt.name}@${prompt.version}`; if (this.prompts.has(key)) throw new Error("prompt version already registered"); this.prompts.set(key, prompt); }
  get(name: string, version: string): Prompt { const prompt = this.prompts.get(`${name}@${version}`); if (!prompt) throw new Error(`prompt not found: ${name}@${version}`); return prompt; }
  render(name: string, version: string, variables: Readonly<Record<string, string>>): string { return this.get(name, version).template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => variables[key] ?? (() => { throw new Error(`prompt variable missing: ${key}`); })()); }
}
