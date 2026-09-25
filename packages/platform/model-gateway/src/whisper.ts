import { createHash } from "node:crypto";
import { createOpenAICompatibleProvider, ModelGatewayError, ModelProviderError, validateModelInput, type ModelRequest, type ProviderResponse } from "./public.js";

export type WhisperConfiguration = Readonly<{ provider: string; model: string; base_url: string; api_key?: string; language?: string; fetch_impl?: typeof fetch }>;
export function createWhisperProvider(config: WhisperConfiguration) {
  config = Object.freeze({ ...config });
  const checked = createOpenAICompatibleProvider({ ...config, models: [{ model: config.model, media_types: ["audio/wav"] }] });
  const endpoint = checked.deployment.endpoint;
  const deployment = Object.freeze({ endpoint, digest: createHash("sha256").update(JSON.stringify({ endpoint, provider: config.provider, model: config.model, language: config.language ?? null, protocol: "whisper-verbose-words-v2" })).digest("hex") });
  return { transport_observable: true as const, deployment, async complete(request: ModelRequest): Promise<ProviderResponse> {
    const invalid = (message: string): never => { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", message); };
    if (request.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "transcription cancelled", { cause: request.signal.reason });
    if (request.provider !== config.provider || request.model !== config.model) throw new ModelGatewayError("MODEL_PRIVACY_BLOCKED", "transcription deployment differs from request");
    const measures = validateModelInput(request.input);
    if (measures.length !== 1 || measures[0]!.mime_type !== "audio/wav") throw new ModelGatewayError("MODEL_INPUT_INVALID", "Whisper requires exactly one bound WAV sample");
    const sample = request.input.media[0]!, form = new FormData();
    form.set("file", new Blob([new Uint8Array(Buffer.from(sample.data_base64, "base64"))], { type: "audio/wav" }), `${sample.sample_id}.wav`);
    form.set("model", config.model); form.set("response_format", "verbose_json"); form.append("timestamp_granularities[]", "segment");
    form.append("timestamp_granularities[]", "word");
    if (config.language) form.set("language", config.language);
    // Serialize once: hash and send these exact boundary/body bytes, never re-encode.
    const encoded = new Request(`${endpoint}/audio/transcriptions`, { method: "POST", body: form });
    const body = await encoded.arrayBuffer(), wire_digest = createHash("sha256").update(new Uint8Array(body)).digest("hex");
    const send = () => {
      if (request.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "transcription cancelled", { cause: request.signal.reason });
      request.on_send?.();
      return { response: (config.fetch_impl ?? fetch)(encoded.url, { method: "POST", redirect: "error", signal: request.signal, headers: { "content-type": encoded.headers.get("content-type")!, ...(config.api_key ? { authorization: `Bearer ${config.api_key}` } : {}) }, body }) };
    };
    const response = request.dispatch ? await request.dispatch(send, { wire_digest, input_bytes: body.byteLength }) : await send().response;
    if (!response.ok) {
      const failure = new ModelProviderError(`Whisper HTTP ${response.status}`, response.status, response.status === 429 || response.status >= 500);
      try { await response.body?.cancel(); } catch (cleanup) { throw new AggregateError([failure, cleanup], "transcription HTTP and cleanup failed", { cause: failure }); }
      throw failure;
    }
    const raw = await response.text(); let value: any, exact: any;
    try {
      value = JSON.parse(raw);
      // Preserve JSON decimal token spelling, including exponents, before Number conversion.
      exact = JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => token.startsWith('"') ? token : JSON.stringify(token)));
    } catch (cause) { throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "Whisper response is not verbose JSON", { cause }); }
    if (!value || typeof value.text !== "string" || typeof value.language !== "string" || !value.language || !Number.isFinite(value.duration) || value.duration < 0 || !Array.isArray(value.segments)) invalid("Whisper verbose text/language/duration/segments required");
    if (value.text.trim() && !value.segments.length) invalid("Whisper text has no segment timestamps");
    if (!value.text.trim() && value.segments.length) invalid("Whisper segments contradict empty text");
    const ids = new Set<number>();
    for (const segment of value.segments) {
      if (!segment || !Number.isSafeInteger(segment.id) || segment.id < 0 || ids.has(segment.id) || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0 || segment.end <= segment.start || typeof segment.text !== "string" || !segment.text.trim()) invalid("Whisper segment identity/time/text invalid");
      ids.add(segment.id);
      if (!Array.isArray(segment.words) || !segment.words.length) invalid("Whisper word alignment missing");
      // DTW may anchor a word to one instant; do not invent a duration or drop its text.
      let previous = 0;
      for (const word of segment.words) {
        if (!word || typeof word.word !== "string" || !word.word.trim() || !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < previous || word.end < word.start) invalid("Whisper word alignment invalid");
        previous = word.end;
      }
    }
    return { output: { text: value.text, language: value.language, duration: exact.duration, segments: value.segments.map((segment: any, index: number) => ({ id: segment.id, start: exact.segments[index].start, end: exact.segments[index].end, text: segment.text, words: segment.words.map((word: any, wi: number) => ({ word: word.word, start: exact.segments[index].words[wi].start, end: exact.segments[index].words[wi].end })) })) }, model_snapshot: config.model };
  } };
}
