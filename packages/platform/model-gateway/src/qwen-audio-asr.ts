import { createHash } from "node:crypto";
import { createOpenAICompatibleProvider, ModelGatewayError, ModelProviderError, validateModelInput, type ModelRequest, type ProviderResponse } from "./public.js";

export type QwenAudioAsrConfiguration = Readonly<{ protocol: "qwen-audio-asr"; provider: string; model: string; base_url: string; api_key?: string; fetch_impl?: typeof fetch }>;

/** DashScope native HTTP protocol; the compatible chat API has no timestamps. */
export function createQwenAudioAsrProvider(config: QwenAudioAsrConfiguration) {
  config = Object.freeze({ ...config });
  if (config.model !== "qwen-audio-3.1-asr-flash") throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "qwen-audio-asr requires qwen-audio-3.1-asr-flash");
  const endpoint = createOpenAICompatibleProvider({ ...config, models: [{ model: config.model, media_types: ["audio/wav"] }] }).deployment.endpoint;
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(endpointUrl.hostname)) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "remote Qwen ASR requires HTTPS");
  const deployment = Object.freeze({ endpoint, digest: createHash("sha256").update(JSON.stringify({ endpoint, provider: config.provider, model: config.model, protocol: "qwen-audio-asr-3.1-diarized-v1" })).digest("hex") });
  const invalid = (message: string): never => { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", message); };
  // Preserve the provider's integer milliseconds exactly through the existing decimal-time contract.
  const seconds = (ms: number) => `${Math.floor(ms / 1000)}.${String(ms % 1000).padStart(3, "0")}`;
  return { transport_observable: true as const, deployment, async complete(request: ModelRequest): Promise<ProviderResponse> {
    if (request.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "transcription cancelled", { cause: request.signal.reason });
    if (request.provider !== config.provider || request.model !== config.model) throw new ModelGatewayError("MODEL_PRIVACY_BLOCKED", "transcription deployment differs from request");
    const measures = validateModelInput(request.input), measure = measures[0];
    if (measures.length !== 1 || measure?.mime_type !== "audio/wav" || !measure.sample_rate || !Number.isSafeInteger(measure.sample_count) || measure.sample_count! > measure.sample_rate * 300) throw new ModelGatewayError("MODEL_INPUT_INVALID", "Qwen ASR requires one WAV sample of at most five minutes");
    const body = JSON.stringify({ model: config.model, input: { messages: [{ role: "user", content: [{ type: "input_audio", input_audio: { data: `data:audio/wav;base64,${request.input.media[0]!.data_base64}` } }] }] }, parameters: { format: "wav", sample_rate: measure.sample_rate, speaker_diarization_enabled: true } });
    const transport = { wire_digest: createHash("sha256").update(body).digest("hex"), input_bytes: Buffer.byteLength(body) };
    const send = () => {
      if (request.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "transcription cancelled", { cause: request.signal.reason });
      request.on_send?.();
      return { response: (config.fetch_impl ?? fetch)(endpoint, { method: "POST", redirect: "error", signal: request.signal, headers: { "content-type": "application/json", "X-DashScope-SSE": "disable", ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {}) }, body }) };
    };
    const response = request.dispatch ? await request.dispatch(send, transport) : await send().response;
    if (!response.ok) {
      const failure = new ModelProviderError(`Qwen ASR HTTP ${response.status}`, response.status, response.status === 429 || response.status >= 500);
      if (response.status === 400) {
        let body: any;
        try { body = await readJson(response); } catch (cause) { throw new ModelProviderError(failure.message, failure.status, failure.retryable, { cause }); }
        const token_usage = parseUsage(body?.usage, request);
        if (body?.code === "CLIENT_ERROR" && body?.message === "ASR_RESPONSE_HAVE_NO_WORDS") {
          return { output: { text: "", segments: [], provider_no_words: { http_status: 400, code: body.code, message: body.message } }, model_snapshot: config.model, ...(token_usage ? { token_usage } : {}) };
        }
        throw failure;
      }
      try { await response.body?.cancel(); } catch (cleanup) { throw new AggregateError([failure, cleanup], "transcription HTTP and cleanup failed", { cause: failure }); }
      throw failure;
    }
    let value: any;
    try { value = await readJson(response); } catch (cause) { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "Qwen ASR response is invalid or too large", { cause }); }
    const token_usage = parseUsage(value?.usage, request);
    const output = value?.output;
    if (!output || typeof output.text !== "string" || !Array.isArray(output.sentences)) invalid("Qwen ASR full sentence results missing");
    if (!output.text.trim() && output.sentences.length !== 0 || output.text.trim() && output.sentences.length === 0) invalid("Qwen ASR text and sentences disagree");
    const withinSample = (ms: number) => BigInt(ms) * BigInt(measure.sample_rate!) <= BigInt(measure.sample_count!) * 1000n;
    let previous = 0;
    const ids = new Set<number>();
    const segments = output.sentences.map((sentence: any) => {
      if (!sentence || !Number.isSafeInteger(sentence.sentence_id) || sentence.sentence_id < 0 || ids.has(sentence.sentence_id) || sentence.sentence_end !== true || !Number.isSafeInteger(sentence.begin_time) || !Number.isSafeInteger(sentence.end_time) || sentence.begin_time < previous || sentence.end_time <= sentence.begin_time || !withinSample(sentence.end_time) || typeof sentence.text !== "string" || !sentence.text.trim() || !Array.isArray(sentence.words) || !sentence.words.length) invalid("Qwen ASR sentence identity, timing or words invalid");
      ids.add(sentence.sentence_id);
      let wordEnd = sentence.begin_time;
      let leading = "";
      const words: { word: string; start: string; end: string }[] = [];
      for (const word of sentence.words) {
        if (!word || typeof word.text !== "string" || word.text.length === 0 || typeof word.punctuation !== "string" || word.fixed !== true || !Number.isSafeInteger(word.begin_time) || !Number.isSafeInteger(word.end_time) || word.begin_time < wordEnd || word.end_time < word.begin_time || word.end_time > sentence.end_time) invalid("Qwen ASR word alignment invalid");
        wordEnd = word.end_time;
        const text = word.text + word.punctuation;
        if (!word.text.trim()) {
          // A timed separator has no speech interval of its own. Preserve its
          // bytes in order without extending a real word's timestamp.
          if (words.length) words[words.length - 1]!.word += text;
          else leading += text;
        } else {
          words.push({ word: leading + text, start: seconds(word.begin_time), end: seconds(word.end_time) });
          leading = "";
        }
      }
      if (!words.length || leading) invalid("Qwen ASR sentence has no recoverable words");
      if (words.map((word: any) => word.word).join("") !== sentence.text) invalid("Qwen ASR sentence and words differ");
      previous = sentence.end_time;
      return { id: sentence.sentence_id, start: seconds(sentence.begin_time), end: seconds(sentence.end_time), text: sentence.text, quality: { avg_logprob: null, no_speech_prob: null, compression_ratio: null }, words, provider_words: sentence.words };
    });
    if (segments.map((segment: any) => segment.text).join("") !== output.text) invalid("Qwen ASR full text and sentence coverage differ");
    return { output: { text: output.text, segments }, model_snapshot: config.model, ...(token_usage ? { token_usage } : {}) };
  } };
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("Qwen ASR response body missing");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0, completed = false;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) { completed = true; break; }
      size += item.value.byteLength;
      if (size > 8 * 1024 * 1024) throw new Error("Qwen ASR response exceeds 8 MiB");
      chunks.push(item.value);
    }
    return JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch (failure) {
    if (!completed) try { await reader.cancel(); } catch (cleanup) { throw new AggregateError([failure, cleanup], "Qwen ASR response and cleanup failed", { cause: failure }); }
    throw failure;
  } finally { reader.releaseLock(); }
}

function parseUsage(value: any, request: ModelRequest): { input: number; output: number; total: number } | undefined {
  if (value?.input_tokens === undefined && value?.output_tokens === undefined && value?.total_tokens === undefined) return undefined;
  const { input_tokens: input, output_tokens: output, total_tokens: total } = value;
  if (![input, output, total].every((n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0) || input + output !== total) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "Qwen ASR usage invalid");
  const usage = { input, output, total }; request.observe_usage?.(usage); return usage;
}
