import type { CreationPlanningProof, CreationPlanningDiagnostic } from "../../contract-runtime/src/public.js";
export type { CreationPlanningProof } from "../../contract-runtime/src/public.js";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export type PrivacyClass = "public" | "internal" | "sensitive";
export type TokenUsage = Readonly<{ input: number; output: number; total?: number }>;
export type ModelMedia = Readonly<{ sample_id: string; mime_type: "image/png" | "audio/wav"; data_base64: string; content_digest: string }>;
export type ModelInput = Readonly<{ context: unknown; media: readonly ModelMedia[] }>;
export type ModelMediaMeasure = Readonly<{ sample_id: string; mime_type: ModelMedia["mime_type"]; byte_length: number; width?: number; height?: number; sample_rate?: number; channels?: number; sample_count?: number }>;
export type ModelRoute = Readonly<{ role: "vision" | "transcription" | "sound" | "planner"; provider: string; model: string; endpoint: string; digest: string }>;
export type ModelTarget = ModelRoute & Readonly<{ sample_id?: string }>;
export type ModelDeployment = Readonly<{ endpoint: string; digest: string; routes?: readonly ModelRoute[] }>;
export type PreparedModelTransport = Readonly<{ wire_digest: string; input_bytes: number; target?: ModelTarget }>;
export type ProviderOutputDiagnostic = Readonly<{ representation: "provider-text" | "canonical-json"; payload: string; utf8_bytes: number; sha256: string }>;
export type ModelRequest = Readonly<{ request_id: string; project_id?: string; related_artifact_id?: string; provider: string; model: string; model_snapshot?: string; prompt_version: string; input: ModelInput; privacy_class: PrivacyClass; on_provider_response?: (output: ProviderOutputDiagnostic, usage: TokenUsage | undefined) => void; output_validator?: (output: unknown) => void; structured_output?: boolean; replay?: boolean; signal?: AbortSignal; context_identity?: string; on_send?: () => void; on_call_audit?: AuditSink; observe_usage?: (usage: TokenUsage) => void; dispatch?: (send: () => { response: Promise<Response> }, transport: PreparedModelTransport) => Promise<Response> }>;
export type SplitObservationProof = Readonly<{ kind: "split-observation-v1" | "split-observation-v2"; parts: readonly Readonly<{ target: ModelTarget; output: unknown; output_hash: string; token_usage?: TokenUsage }>[] }>;
export type ReasoningObservation = Readonly<{ content_observed: boolean; tokens: number | null }>;
export type ProviderResponse = Readonly<{ planning?: CreationPlanningProof; output: unknown; model_snapshot?: string; token_usage?: TokenUsage; composition?: SplitObservationProof; reasoning_observation?: ReasoningObservation }>;
export type ModelAudit = Readonly<{ planning?: CreationPlanningProof; composition?: SplitObservationProof; reasoning_observation?: ReasoningObservation; provider: string; model: string; model_snapshot: string; prompt_version: string; input_hash: string; output_hash: string; token_usage?: TokenUsage; latency_ms: number; retry_count: number; cache_hit: boolean; privacy_class: PrivacyClass; project_id?: string; related_artifact_id?: string }>;
export type ModelResult = Readonly<{ request_id: string; provider: string; model: string; output: unknown; input_hash: string; output_hash: string; latency_ms: number; token_usage?: TokenUsage; cache_hit: boolean; retry_count: number; audit: ModelAudit }>;
export type ModelProvider = ((request: ModelRequest) => Promise<unknown>) | Readonly<{ transport_observable?: true; manages_call_audit?: true; deployment?: ModelDeployment; complete(request: ModelRequest): Promise<ProviderResponse> }>;
export type ModelPolicy = Readonly<{ allowed_sensitive_providers?: readonly string[]; retry?: Readonly<{ max_attempts: number; backoff_ms?: number; retryable?: (error: unknown) => boolean }> }>;
export type ModelCache = Readonly<{ get(key: string): Promise<ProviderResponse | undefined> | ProviderResponse | undefined; set(key: string, value: ProviderResponse): Promise<void> | void }>;
export type ReplayStore = Readonly<{ read(key: string): Promise<ProviderResponse | undefined> | ProviderResponse | undefined; write(key: string, value: ProviderResponse): Promise<void> | void }>;
export type ModelErrorCode = "MODEL_INPUT_INVALID" | "MODEL_MEDIA_UNSUPPORTED" | "MODEL_OUTPUT_INVALID" | "MODEL_CONFIGURATION_INVALID" | "MODEL_PRIVACY_BLOCKED" | "MODEL_RETRY_EXHAUSTED" | "MODEL_PROVIDER_FAILED" | "MODEL_CANCELLED" | "MODEL_REPLAY_MISSING" | "MODEL_DISPATCH_DENIED";
export type ModelFailureAudit = Readonly<{ code: ModelErrorCode; request_id: string; input_hash: string; attempt?: number; provider_sent: boolean | "unknown"; usage_known: boolean; token_usage?: TokenUsage; cause?: unknown }>;
export type AuditSink = (audit: ModelAudit | ModelFailureAudit) => void | Promise<void>;

export class ModelGatewayError extends Error {
  planning_diagnostic?: CreationPlanningDiagnostic;
  stream_boundary?: Readonly<Record<string, string | number | boolean | null>>;
  /** Private local failure evidence, never Renderer-facing error copy. */
  output_diagnostic?: Readonly<{ representation: "provider-text" | "canonical-json"; payload: string; utf8_bytes: number; sha256: string }>;
  output_diagnostic_capture_error?: unknown;
  constructor(public readonly code: ModelErrorCode, message: string, options?: ErrorOptions) { super(message, options); this.name = "ModelGatewayError"; }
}
export class ModelProviderError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean, options?: ErrorOptions) { super(message, options); this.name = "ModelProviderError"; }
}
/** Local diagnostic cause only. Never expose a provider body in renderer copy. */
async function providerHttpFailure(response: Response, provider: string): Promise<never> {
  const primary = new ModelProviderError(`${provider} HTTP ${response.status}`, response.status, response.status === 429 || response.status >= 500);
  const reader = response.body?.getReader(), chunks: Uint8Array[] = [];
  let count = 0, complete = !reader, failure: unknown;
  const limit = 65536;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("provider HTTP error body exceeded 5-second diagnostic deadline")), 5000); });
  try {
    while (reader && count < limit) {
      const item = await Promise.race([reader.read(), deadline]);
      if (item.done) { complete = true; break; }
      const kept = item.value.subarray(0, limit - count); chunks.push(kept); count += kept.byteLength;
    }
  } catch (cause) { failure = cause; }
  finally {
    clearTimeout(timer);
    if (reader) {
      try { if (!complete) await reader.cancel(); }
      catch (cause) { failure = failure === undefined ? cause : new AggregateError([failure, cause], "HTTP response read and cleanup failed", { cause: failure }); }
      finally { reader.releaseLock(); }
    }
  }
  const bytes = Buffer.concat(chunks);
  const detail = new Error(JSON.stringify({ status: response.status, request_id: response.headers.get("x-request-id") ?? response.headers.get("request-id"), content_type: response.headers.get("content-type"), captured_bytes: bytes.length, complete, captured_sha256: createHash("sha256").update(bytes).digest("hex"), body_base64: bytes.toString("base64") }), { ...(failure === undefined ? {} : { cause: failure }) });
  detail.name = "ModelProviderHttpResponse";
  throw new ModelProviderError(primary.message, primary.status, failure === undefined && primary.retryable, { cause: detail });
}
function canonical(value: unknown): string { return JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item); }
function hash(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }
/** One current input envelope. Never guess that a JSON object is an image URL. */
export function validateModelInput(input: ModelInput): readonly ModelMediaMeasure[] {
  const invalid = (message: string): never => { throw new ModelGatewayError("MODEL_INPUT_INVALID", message); };
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== "context,media" || input.context === undefined || !Array.isArray(input.media)) invalid("explicit context and media fields are required");
  const seen = new Set<string>();
  return input.media.map(item => {
    if (!item || typeof item !== "object" || Object.keys(item).sort().join(",") !== "content_digest,data_base64,mime_type,sample_id" || typeof item.sample_id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(item.sample_id) || seen.has(item.sample_id)) invalid("media sample identity is invalid or repeated");
    seen.add(item.sample_id);
    if (typeof item.data_base64 !== "string" || !item.data_base64) invalid("media must contain canonical inline base64 bytes");
    const bytes = Buffer.from(item.data_base64, "base64");
    // Canonical round-trip rejects permissive decoder inputs without a recursive
    // repeated-group regexp, which overflows V8's stack on real-sized WAVs.
    if (bytes.toString("base64") !== item.data_base64) invalid("media must contain canonical inline base64 bytes");
    if (createHash("sha256").update(bytes).digest("hex") !== item.content_digest) invalid("media content digest differs from its bytes");
    const base = { sample_id: item.sample_id, mime_type: item.mime_type, byte_length: bytes.length };
    if (item.mime_type === "image/png") {
      if (bytes.length < 33 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(8) !== 13) invalid("PNG header is invalid");
      const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
      if (!width || !height) invalid("PNG geometry is empty");
      return { ...base, width, height };
    }
    if (item.mime_type === "audio/wav") {
      if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE" || bytes.readUInt32LE(4) + 8 !== bytes.length) invalid("WAV container is invalid");
      let offset = 12, format: { sample_rate: number; channels: number; block: number } | undefined, dataLength: number | undefined;
      while (offset < bytes.length) {
        if (offset + 8 > bytes.length) invalid("WAV chunk header is truncated");
        const kind = bytes.toString("ascii", offset, offset + 4), size = bytes.readUInt32LE(offset + 4), begin = offset + 8;
        if (begin + size > bytes.length) invalid("WAV chunk is truncated");
        if (kind === "fmt ") {
          if (format || size < 16 || bytes.readUInt16LE(begin) !== 1 || bytes.readUInt16LE(begin + 14) !== 16) invalid("only unambiguous PCM16 WAV is supported");
          const channels = bytes.readUInt16LE(begin + 2), sample_rate = bytes.readUInt32LE(begin + 4), block = bytes.readUInt16LE(begin + 12);
          if (!channels || !sample_rate || block !== channels * 2 || bytes.readUInt32LE(begin + 8) !== sample_rate * block) invalid("WAV format geometry is inconsistent");
          format = { channels, sample_rate, block };
        } else if (kind === "data") { if (dataLength !== undefined) invalid("multiple WAV data chunks are unsupported"); dataLength = size; }
        offset = begin + size + size % 2;
      }
      if (offset !== bytes.length || !format || !dataLength || dataLength % format.block) return invalid("WAV samples are missing or incomplete");
      return { ...base, channels: format.channels, sample_rate: format.sample_rate, sample_count: dataLength / format.block };
    }
    return invalid("unsupported media MIME type");
  });
}
export function modelCacheKey(request: ModelRequest): string { return hash({ provider: request.provider, model: request.model, model_snapshot: request.model_snapshot ?? "", prompt_version: request.prompt_version, input: request.input, privacy_class: request.privacy_class, structured_output: request.structured_output ?? false, context_identity: request.context_identity ?? null }); }
function cancelled(signal?: AbortSignal): void { if (signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "model request was cancelled; already-sent requests may still be billed", { cause: signal.reason }); }
function waitForProvider(pending: Promise<ProviderResponse>, signal?: AbortSignal): Promise<ProviderResponse> {
  if (!signal) return pending;
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (complete: () => void) => { if (finished) return; finished = true; signal.removeEventListener("abort", abort); complete(); };
    const abort = () => finish(() => reject(new ModelGatewayError("MODEL_CANCELLED", "model wait ended; already-sent usage remains unknown until reported", { cause: signal.reason })));
    // Keep both handlers attached after cancellation: late provider failure is consumed,
    // while late output cannot resume validation, auditing, caching or project writes.
    pending.then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
    signal.addEventListener("abort", abort, { once: true });
    // An already available response still supplies known usage before cancelled() rejects it.
    if (signal.aborted) queueMicrotask(abort);
  });
}
function parseStructured(output: unknown): unknown { if (typeof output !== "string") return output; try { return JSON.parse(output); } catch (cause) { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "model output is not valid JSON", { cause }); } }
function assertUsage(usage: TokenUsage | undefined): void {
  if (!usage) return;
  if (![usage.input, usage.output, ...(usage.total === undefined ? [] : [usage.total])].every(value => Number.isSafeInteger(value) && value >= 0) || !Number.isSafeInteger(usage.input + usage.output) || usage.total !== undefined && usage.total !== usage.input + usage.output) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider token usage is invalid");
}

export async function runModel(request: ModelRequest, provider: ModelProvider, startedAt = Date.now(), options: Readonly<{ policy?: ModelPolicy; cache?: ModelCache; replayStore?: ReplayStore; audit?: AuditSink; authorizeAttempt?: (attempt: number) => void | Promise<void> }> = {}): Promise<ModelResult> {
  if (!request.request_id || !request.provider || !request.model || !request.prompt_version) throw new Error("model request metadata is incomplete");
  request = { ...request, input: structuredClone(request.input) };
  const input_hash = hash(request.input), policy = options.policy ?? {};
  let providerSent: boolean | "unknown" = false, usageKnown = false, attempt = 0, authorizationFailure = false;
  let observedUsage: TokenUsage | undefined, observedPlanning: CreationPlanningProof | undefined;
  try {
    cancelled(request.signal);
    validateModelInput(request.input);
    if (request.privacy_class === "sensitive" && !(policy.allowed_sensitive_providers ?? []).includes(request.provider)) throw new ModelGatewayError("MODEL_PRIVACY_BLOCKED", "sensitive model input requires an approved provider policy");
    const maxAttempts = policy.retry?.max_attempts ?? 1, backoff = policy.retry?.backoff_ms ?? 0;
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3 || !Number.isSafeInteger(backoff) || backoff < 0) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "retry policy allows one initial attempt and at most two explicit external retries");
    const key = hash({ request: modelCacheKey(request), deployment: typeof provider === "object" ? provider.deployment ?? null : null });
    const replay = request.replay ? await options.replayStore?.read(key) : undefined;
    if (request.replay && !replay) throw new ModelGatewayError("MODEL_REPLAY_MISSING", "recorded response is unavailable; replay never sends a new request");
    const cached = replay ?? await options.cache?.get(key);
    cancelled(request.signal);
    let response = cached, retry_count = 0;
    if (!response) {
      for (attempt = 1; attempt <= maxAttempts; attempt += 1) {
        providerSent = false; usageKnown = false; observedUsage = undefined;
        cancelled(request.signal);
        // Host records dispatch and rechecks request/profile consent here, for every send.
        try { await options.authorizeAttempt?.(attempt); } catch (cause) { authorizationFailure = true; throw cause; }
        cancelled(request.signal);
        try {
          providerSent = typeof provider === "object" && provider.transport_observable ? false : "unknown";
          const effectiveRequest: ModelRequest = { ...request,
            on_send: () => { providerSent = true; },
            observe_usage: usage => { assertUsage(usage); observedUsage = usage; usageKnown = true; },
            dispatch: request.dispatch ? async (send, transport) => {
              try { return await request.dispatch!(send, transport); }
              catch (cause) { if (providerSent === false) authorizationFailure = true; throw cause; }
            } : undefined,
          };
          const pending = typeof provider === "function" ? provider(effectiveRequest).then(output => ({ output })) : provider.complete(effectiveRequest);
          response = await (typeof provider === "object" && provider.manages_call_audit ? pending : waitForProvider(pending, request.signal));
          observedPlanning = response.planning;
          observedUsage = response.token_usage; usageKnown = observedUsage !== undefined;
          cancelled(request.signal);
          break;
        } catch (cause) {
          if (request.signal?.aborted && cause instanceof ModelGatewayError && cause.code === "MODEL_CANCELLED") throw cause;
          cancelled(request.signal);
          if (authorizationFailure || cause instanceof ModelGatewayError) throw cause;
          const retryable = policy.retry?.retryable?.(cause) ?? (cause instanceof ModelProviderError && cause.retryable);
          const code = retryable && attempt >= maxAttempts && maxAttempts > 1 ? "MODEL_RETRY_EXHAUSTED" : "MODEL_PROVIDER_FAILED";
          const failure = new ModelGatewayError(code, cause instanceof Error ? cause.message : String(cause), { cause });
          if (!retryable || attempt >= maxAttempts) throw failure;
          await options.audit?.({ code: failure.code, request_id: request.request_id, input_hash, attempt, provider_sent: providerSent, usage_known: usageKnown, token_usage: observedUsage, cause });
          retry_count += 1;
          try { await delay(backoff, undefined, { signal: request.signal }); } catch (error) { cancelled(request.signal); throw error; }
        }
      }
    }
    if (!response) throw new ModelGatewayError("MODEL_PROVIDER_FAILED", "model provider returned no response");
    observedUsage = response.token_usage;
    usageKnown = observedUsage !== undefined;
    assertUsage(response.token_usage);
    if (request.on_provider_response) {
      const payload = typeof response.output === "string" ? response.output : canonical(response.output);
      if (typeof payload !== "string") throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider output has no serializable diagnostic");
      request.on_provider_response({ representation: typeof response.output === "string" ? "provider-text" : "canonical-json", payload, utf8_bytes: Buffer.byteLength(payload), sha256: createHash("sha256").update(payload).digest("hex") }, response.token_usage);
    }
    let output: unknown;
    try { output = request.structured_output ? parseStructured(response.output) : response.output; request.output_validator?.(output); }
    catch (cause) {
      const failure = cause instanceof ModelGatewayError ? cause : new ModelGatewayError("MODEL_OUTPUT_INVALID", cause instanceof Error ? cause.message : "structured output validation failed", { cause });
      try {
        const text = typeof response.output === "string";
        const payload = text ? response.output as string : canonical(response.output);
        if (typeof payload !== "string") throw new Error("provider output has no JSON serialization; no raw output was fabricated");
        failure.output_diagnostic = Object.freeze({ representation: text ? "provider-text" : "canonical-json", payload, utf8_bytes: Buffer.byteLength(payload, "utf8"), sha256: createHash("sha256").update(payload, "utf8").digest("hex") });
      } catch (capture) { failure.output_diagnostic_capture_error = capture; }
      throw failure;
    }
    cancelled(request.signal);
    const output_hash = hash(output), cache_hit = cached !== undefined;
    const audit: ModelAudit = { ...(response.planning ? { planning: response.planning } : {}), ...(response.reasoning_observation ? { reasoning_observation: response.reasoning_observation } : {}), ...(response.composition ? { composition: response.composition } : {}), provider: request.provider, model: request.model, model_snapshot: response.model_snapshot ?? request.model_snapshot ?? "unknown", prompt_version: request.prompt_version, input_hash, output_hash, token_usage: response.token_usage, latency_ms: Date.now() - startedAt, retry_count, cache_hit, privacy_class: request.privacy_class, project_id: request.project_id, related_artifact_id: request.related_artifact_id };
    await options.cache?.set(key, { ...response, output });
    cancelled(request.signal);
    if (!request.replay) await options.replayStore?.write(key, { ...response, output });
    cancelled(request.signal);
    await options.audit?.(audit);
    cancelled(request.signal);
    return { request_id: request.request_id, provider: request.provider, model: request.model, output, input_hash, output_hash, latency_ms: audit.latency_ms, token_usage: response.token_usage, cache_hit, retry_count, audit };
  } catch (error) {
    if (error instanceof ModelGatewayError && observedPlanning && !error.planning_diagnostic) error.planning_diagnostic = { ...observedPlanning, root_input: request.input, pending: null };
    if (authorizationFailure || error instanceof ModelGatewayError) {
      try { await options.audit?.({ code: authorizationFailure ? "MODEL_DISPATCH_DENIED" : (error as ModelGatewayError).code, request_id: request.request_id, input_hash, attempt, provider_sent: providerSent, usage_known: usageKnown, token_usage: observedUsage, cause: error instanceof Error ? error.cause ?? error : error }); }
      catch (auditError) { throw new AggregateError([error, auditError], "model operation and failure audit both failed", { cause: error }); }
    }
    throw error;
  }
}

export type ModelCapability = Readonly<{ model: string; media_types: readonly ModelMedia["mime_type"][] }>;
export type OpenAICompatibleConfig = Readonly<{
  api_key?: string; base_url: string; provider: string; model_snapshot?: string;
  models?: readonly ModelCapability[]; audio_input?: "base64" | "data-url";
  response_mode?: "json" | "sse"; structured_output?: "json_object" | "validated_json"; text_output_only?: boolean;
  enable_thinking?: boolean; thinking_budget?: number; max_tokens?: number;
  system_prompt?: Readonly<{ version: string; text: string }>;
  fetch_impl?: typeof fetch;
}>;
function reasoningObservation(content: unknown, usage: any): ReasoningObservation {
  if (content != null && typeof content !== "string") throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider reasoning content has an invalid type");
  const tokens = usage?.completion_tokens_details?.reasoning_tokens;
  if (tokens != null && (!Number.isSafeInteger(tokens) || tokens < 0 || (typeof usage?.completion_tokens === "number" && tokens > usage.completion_tokens))) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider reasoning token count is invalid");
  // Keep only observations of provider behavior, never raw reasoning text.
  return { content_observed: typeof content === "string" && content.length > 0, tokens: tokens ?? null };
}
function providerUsage(value: any): TokenUsage | undefined {
  if (value == null) return undefined;
  if (typeof value !== "object" || typeof value.prompt_tokens !== "number" || typeof value.completion_tokens !== "number" || typeof value.total_tokens !== "number") throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider usage fields are missing or invalid");
  const usage = { input: value.prompt_tokens, output: value.completion_tokens, total: value.total_tokens };
  assertUsage(usage); return usage;
}
async function readStream(response: Response, request: ModelRequest): Promise<ProviderResponse> {
  if (!response.body) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "stream has no body");
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  const receivedDigest = createHash("sha256");
  let receivedBytes = 0, receivedChunks = 0, receivedEvents = 0, transportEof = false;
  let reasoningSeen = false, reasoningTokens: number | null = null, reasoningReported = false;
  let line = "", lines: string[] = [], previousCR = false, content = "", model: string | undefined, finish: string | undefined, done = false, usage: TokenUsage | undefined;
  const invalid = (message: string): never => { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", message); };
  function event(raw: string): void {
    const data = raw.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, "")).join("\n");
    if (!data) return;
    receivedEvents++;
    if (done) invalid("data follows stream terminator");
    if (data === "[DONE]") { done = true; return; }
    let chunk: any; try { chunk = JSON.parse(data); } catch (cause) { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "stream event is not JSON", { cause }); }
    if (!chunk || typeof chunk !== "object" || Array.isArray(chunk)) invalid("stream event is not an object");
    if (chunk.error) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider returned a stream error", { cause: { code: typeof chunk.error.code === "string" ? chunk.error.code : "UNKNOWN_PROVIDER_STREAM_ERROR" } });
    if (chunk.model !== undefined) { if (typeof chunk.model !== "string" || model && model !== chunk.model) invalid("stream model identity changed"); model = chunk.model; }
    if (chunk.usage != null) { if (usage) invalid("stream usage repeated"); usage = providerUsage(chunk.usage); const reasoning = reasoningObservation(undefined, chunk.usage); reasoningTokens = reasoning.tokens; reasoningReported ||= reasoning.tokens !== null; if (usage) request.observe_usage?.(usage); }
    if (!Array.isArray(chunk.choices) || chunk.choices.length > 1) invalid("stream choices are ambiguous");
    if (!chunk.choices.length) { if (!chunk.usage) invalid("empty stream event"); return; }
    const choice = chunk.choices[0];
    if (!choice || typeof choice !== "object" || choice.index !== 0 || finish !== undefined || !choice.delta || typeof choice.delta !== "object") invalid("stream choice is invalid or follows completion");
    if (choice.delta.tool_calls || choice.delta.function_call || choice.delta.refusal) invalid("stream contains unsupported tool call or refusal");
    if (choice.delta.reasoning_content != null) { const reasoning = reasoningObservation(choice.delta.reasoning_content, undefined); reasoningSeen ||= reasoning.content_observed; reasoningReported = true; }
    if (choice.delta.content != null) { if (typeof choice.delta.content !== "string") invalid("stream text is invalid"); content += choice.delta.content; }
    if (choice.finish_reason != null) { if (typeof choice.finish_reason !== "string") invalid("stream completion is invalid"); finish = choice.finish_reason; }
  }
  // SSE permits CR, LF and CRLF. Keep the CR state across byte chunks so a
  // split CRLF is one line ending, and a final CR dispatches without an EOF.
  function consume(text: string): void {
    for (const character of text) {
      if (previousCR && character === "\n") { previousCR = false; continue; }
      previousCR = character === "\r";
      if (character === "\r" || character === "\n") {
        if (line === "") { event(lines.join("\n")); lines = []; }
        else { lines.push(line); line = ""; }
      } else line += character;
    }
  }
  let operationFailure: unknown, cancellation: Promise<void> | undefined;
  const stop = () => { cancellation ??= reader.cancel(request.signal?.reason); cancellation.catch(() => {}); };
  request.signal?.addEventListener("abort", stop, { once: true });
  if (request.signal?.aborted) stop();
  try {
    while (true) {
      cancelled(request.signal);
      const next = await reader.read();
      transportEof = next.done;
      if (next.value) { receivedDigest.update(next.value); receivedBytes += next.value.byteLength; receivedChunks++; }
      // Cancelling a pending read can resolve it as EOF. Preserve that cause
      // instead of reporting a provider's truncated/malformed completion.
      cancelled(request.signal);
      let text: string;
      try { text = decoder.decode(next.value, { stream: !next.done }); }
      catch (cause) { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "stream contains invalid UTF-8", { cause }); }
      consume(text);
      if (done || next.done) break;
    }
    if (line.trim() || lines.join("\n").trim()) invalid("stream ended inside an event");
    if (!done || finish !== "stop" || !content) invalid(`incomplete stream: ${finish ?? "missing finish"}`);
    return { output: content, model_snapshot: model, token_usage: usage, ...(reasoningReported ? { reasoning_observation: { content_observed: reasoningSeen, tokens: reasoningTokens } } : {}) };
  } catch (cause) {
    if (cause instanceof ModelGatewayError && cause.code === "MODEL_OUTPUT_INVALID") {
      cause.stream_boundary = Object.freeze({ request_id: response.headers.get("x-request-id") ?? response.headers.get("request-id"), received_bytes: receivedBytes, received_chunks: receivedChunks, received_sha256: receivedDigest.digest("hex"), data_events: receivedEvents, transport_eof: transportEof, done_seen: done, finish_reason: finish ?? null, partial_line_characters: line.length, pending_event_characters: lines.join("\n").length, output_bytes: Buffer.byteLength(content, "utf8") });
    }
    operationFailure = cause;
    throw operationFailure;
  }
  finally {
    request.signal?.removeEventListener("abort", stop);
    try { cancellation ??= reader.cancel(); await cancellation; }
    catch (cleanup) { if (operationFailure) throw new AggregateError([operationFailure, cleanup], "model stream and cleanup failed", { cause: operationFailure }); throw cleanup; }
    finally { reader.releaseLock(); }
  }
}
export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig) {
  if (config.enable_thinking !== undefined && typeof config.enable_thinking !== "boolean") throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "enable_thinking must be boolean");
  if (config.thinking_budget !== undefined && (!Number.isSafeInteger(config.thinking_budget) || config.thinking_budget <= 0 || config.enable_thinking !== true)) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "thinking_budget requires explicit enable_thinking=true and a positive safe integer");
  if (config.max_tokens !== undefined && (!Number.isSafeInteger(config.max_tokens) || config.max_tokens <= 0)) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "max_tokens must be a positive safe integer");
  const inference = { ...(config.enable_thinking !== undefined ? { enable_thinking: config.enable_thinking } : {}), ...(config.thinking_budget !== undefined ? { thinking_budget: config.thinking_budget } : {}), ...(config.max_tokens !== undefined ? { max_tokens: config.max_tokens } : {}) };
  if (config.system_prompt !== undefined && (!config.system_prompt || Object.keys(config.system_prompt).sort().join(",") !== "text,version" || typeof config.system_prompt.version !== "string" || !config.system_prompt.version.trim() || typeof config.system_prompt.text !== "string" || !config.system_prompt.text.trim())) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "system prompt requires nonempty version and text");
  config = { ...config, ...(config.system_prompt ? { system_prompt: Object.freeze({ ...config.system_prompt }) } : {}) };
  config = Object.freeze({ ...config, models: config.models ? Object.freeze(config.models.map(item => Object.freeze({ model: item.model, media_types: Object.freeze([...item.media_types]) }))) : undefined });
  const endpoint = new URL(config.base_url);
  if (!["https:", "http:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "model endpoint must be an HTTP(S) base URL without credentials, query or fragment");
  if (!config.api_key && !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "remote model service requires explicit authentication");
  const deployment = Object.freeze({ endpoint: endpoint.href.replace(/\/$/, ""), digest: hash({ ...inference, endpoint: endpoint.href.replace(/\/$/, ""), provider: config.provider, snapshot: config.model_snapshot ?? null, models: config.models ?? null, text_output_only: config.text_output_only ?? false, audio: config.audio_input ?? null, response: config.response_mode ?? "json", structured: config.structured_output ?? "json_object", ...(config.system_prompt ? { system_prompt: config.system_prompt } : {}) }) });
  return { transport_observable: true as const, deployment, async complete(request: ModelRequest): Promise<ProviderResponse> {
    cancelled(request.signal);
    if (request.provider !== config.provider) throw new ModelGatewayError("MODEL_PRIVACY_BLOCKED", "request provider differs from the configured transport");
    const measures = validateModelInput(request.input), capability = config.models?.find(item => item.model === request.model);
    if (config.models && !capability) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "configured capabilities do not cover this exact model");
    if (measures.some(item => !capability?.media_types.includes(item.mime_type))) throw new ModelGatewayError("MODEL_MEDIA_UNSUPPORTED", "configured model does not support this media type");
    if (measures.some(item => item.mime_type === "audio/wav") && !config.audio_input) throw new ModelGatewayError("MODEL_MEDIA_UNSUPPORTED", "this adapter has no declared audio wire format");
    const context = typeof request.input.context === "string" ? request.input.context : JSON.stringify(request.input.context);
    const inputContent = measures.length ? [{ type: "text", text: context }, ...request.input.media.flatMap(item => [{ type: "text", text: `sample_id: ${item.sample_id}` }, item.mime_type === "image/png" ? { type: "image_url", image_url: { url: `data:image/png;base64,${item.data_base64}` } } : { type: "input_audio", input_audio: { data: config.audio_input === "data-url" ? `data:audio/wav;base64,${item.data_base64}` : item.data_base64, format: "wav" } }])] : context;
    const stream = config.response_mode === "sse";
    const init: RequestInit = {
      method: "POST", redirect: "error", signal: request.signal, headers: { "content-type": "application/json", ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {}) },
      body: JSON.stringify({ ...inference, ...(config.text_output_only ? { modalities: ["text"] } : {}), model: request.model, messages: [...(config.system_prompt ? [{ role: "system", content: config.system_prompt.text }] : []), { role: "user", content: inputContent }], ...(request.structured_output && config.structured_output !== "validated_json" ? { response_format: { type: "json_object" } } : {}), ...(stream ? { stream: true, stream_options: { include_usage: true } } : {}) }),
    };
    const serialized = init.body as string;
    const transport: PreparedModelTransport = { wire_digest: createHash("sha256").update(serialized).digest("hex"), input_bytes: Buffer.byteLength(serialized, "utf8") };
    const send = () => { cancelled(request.signal); request.on_send?.(); return { response: (config.fetch_impl ?? fetch)(`${config.base_url.replace(/\/$/, "")}/chat/completions`, init) }; };
    const response = request.dispatch ? await request.dispatch(send, transport) : await send().response;
    if (!response.ok) {
      return providerHttpFailure(response, config.provider);
    }
    if (stream) { const result = await readStream(response, request); return { ...result, ...(config.enable_thinking === true && !result.reasoning_observation ? { reasoning_observation: { content_observed: false, tokens: null } } : {}), model_snapshot: config.model_snapshot ?? result.model_snapshot }; }
    let body: any;
    try { body = await response.json(); } catch (cause) { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider response is not JSON", { cause }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider response is not an object");
    const token_usage = providerUsage(body.usage);
    if (token_usage) request.observe_usage?.(token_usage);
    if (!Array.isArray(body.choices) || body.choices.length !== 1) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider choices are missing or ambiguous");
    const choice = body.choices[0];
    if (!choice || typeof choice !== "object") throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "provider choice is not an object");
    const content = choice.message?.content;
    if (typeof content !== "string" || choice.message?.tool_calls || choice.message?.function_call || choice.message?.refusal) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", `${config.provider} response has no supported text message content`);
    if (choice.finish_reason !== "stop") throw new ModelGatewayError("MODEL_OUTPUT_INVALID", `${config.provider} response is incomplete: ${choice.finish_reason}`);
    const reasoning = reasoningObservation(choice.message?.reasoning_content, body.usage);
    return { output: content, model_snapshot: config.model_snapshot ?? body.model, token_usage, ...(config.enable_thinking === true || choice.message?.reasoning_content != null || reasoning.tokens !== null ? { reasoning_observation: reasoning } : {}) };
  } };
}
export function createQwenProvider(config: Omit<OpenAICompatibleConfig, "provider" | "base_url" | "audio_input"> & Partial<Pick<OpenAICompatibleConfig, "base_url">>) { return createOpenAICompatibleProvider({ ...config, provider: "qwen", audio_input: "data-url", base_url: config.base_url ?? "https://dashscope.aliyuncs.com/compatible-mode/v1" }); }
export function createDeepSeekProvider(config: Omit<OpenAICompatibleConfig, "provider" | "base_url" | "audio_input"> & Partial<Pick<OpenAICompatibleConfig, "base_url">>) { return createOpenAICompatibleProvider({ ...config, provider: "deepseek", audio_input: undefined, base_url: config.base_url ?? "https://api.deepseek.com" }); }

export type Prompt = Readonly<{ name: string; version: string; template: string }>;
export class PromptRegistry {
  private readonly prompts = new Map<string, Prompt>();
  register(prompt: Prompt): void { if (!prompt.name || !prompt.version || !prompt.template) throw new Error("prompt metadata is incomplete"); const key = `${prompt.name}@${prompt.version}`; if (this.prompts.has(key)) throw new Error("prompt version already registered"); this.prompts.set(key, prompt); }
  get(name: string, version: string): Prompt { const prompt = this.prompts.get(`${name}@${version}`); if (!prompt) throw new Error(`prompt not found: ${name}@${version}`); return prompt; }
  render(name: string, version: string, variables: Readonly<Record<string, string>>): string { return this.get(name, version).template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => variables[key] ?? (() => { throw new Error(`prompt variable missing: ${key}`); })()); }
}

export { createWhisperProvider } from "./whisper.js";
export { createSplitModelProvider } from "./split-provider.js";
export type { SplitModelConfiguration, ChatServiceConfiguration, WhisperServiceConfiguration } from "./split-provider.js";

export { createCreationPlanningProvider } from "./creation-planning.js";
