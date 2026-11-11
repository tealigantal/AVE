import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createQwenAudioAsrProvider, createSplitModelProvider, runModel, type ModelRequest, type PreparedModelTransport } from "../../packages/platform/model-gateway/src/public.js";
import { splitTranscript } from "../../packages/platform/contract-runtime/src/public.js";
import { configuredSplitModelProvider } from "../../apps/desktop/src/main/model-configuration.js";

const wav = Buffer.alloc(44 + 32000);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(32000, 40);
const digest = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const output = () => ({ text: "你好。再见。", sentences: [
  { sentence_id: 1, sentence_end: true, begin_time: 101, end_time: 300, text: "你好。", words: [{ text: "你好", punctuation: "。", begin_time: 101, end_time: 300, fixed: true }] },
  { sentence_id: 2, sentence_end: true, begin_time: 501, end_time: 899, text: "再见。", words: [{ text: "再见", punctuation: "。", begin_time: 501, end_time: 899, fixed: true }] },
] });
// Token values also exercise the units seen in one independently run synthetic
// speech probe; this fixture does not reproduce its audio or provider response.
let payload: any = { output: output(), usage: { input_tokens: 58, output_tokens: 42, total_tokens: 100 } }, sends = 0, audit: any[] = [], reserved: PreparedModelTransport | undefined;
const fetchImpl: typeof fetch = async (url, init) => {
  sends++;
  assert.equal(String(url), "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation");
  assert.equal(init?.redirect, "error");
  const body = JSON.parse(init!.body as string);
  assert.equal(reserved!.wire_digest, digest(init!.body as string)); assert.equal(reserved!.input_bytes, Buffer.byteLength(init!.body as string));
  assert.equal(body.parameters.speaker_diarization_enabled, true); assert.equal(body.parameters.sample_rate, 16000);
  assert.equal(body.input.messages[0].content[0].input_audio.data, `data:audio/wav;base64,${wav.toString("base64")}`);
  return Response.json(payload);
};
const provider = createQwenAudioAsrProvider({ protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation", api_key: "fixture", fetch_impl: fetchImpl });
assert.throws(() => createQwenAudioAsrProvider({ protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "http://asr.example.invalid/api", api_key: "fixture" }), /requires HTTPS/);
const request: ModelRequest = { request_id: "qwen-test", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", prompt_version: "fixture", privacy_class: "internal", input: { context: {}, media: [{ sample_id: "audio", mime_type: "audio/wav", data_base64: wav.toString("base64"), content_digest: digest(wav) }] }, dispatch: (send, transport) => { reserved = transport; return send().response; } };
const run = () => runModel(request, provider, Date.now(), { audit: value => { audit.push(value); } });
const result = await run();
assert.deepEqual(result.token_usage, { input: 58, output: 42, total: 100 });
assert.equal(audit[0].token_usage.total, 100);
assert.deepEqual(splitTranscript({ actual_start: { schema_version: 1, value: 10, timescale: 1 }, actual_end: { schema_version: 1, value: 11, timescale: 1 } }, result.output), [
  { start: { schema_version: 1, value: 10101, timescale: 1000 }, end: { schema_version: 1, value: 103, timescale: 10 }, text: "你好。" },
  { start: { schema_version: 1, value: 10501, timescale: 1000 }, end: { schema_version: 1, value: 10899, timescale: 1000 }, text: "再见。" },
]);
// Controlled form of the observed provider response: whitespace can be a
// separately timed word, including at sentence boundaries.
const timedWord = (text: string, begin_time: number, end_time: number, punctuation = "") => ({ text, begin_time, end_time, punctuation, fixed: true });
const rawWords = [
  [timedWord(" ", 10, 20), timedWord("Hi", 21, 100), timedWord(" ", 101, 110), timedWord(" ", 111, 120), timedWord("there", 121, 200, "."), timedWord(" ", 201, 210)],
  [timedWord(" ", 400, 410), timedWord("Good", 411, 500), timedWord(" ", 501, 510), timedWord("day", 511, 600, "."), timedWord(" ", 601, 610)],
];
payload = { output: { text: " Hi  there.  Good day. ", sentences: [
  { sentence_id: 1, sentence_end: true, begin_time: 10, end_time: 210, text: " Hi  there. ", words: rawWords[0] },
  { sentence_id: 2, sentence_end: true, begin_time: 400, end_time: 610, text: " Good day. ", words: rawWords[1] },
] } };
const whitespace = (await run()).output as any;
assert.deepEqual(whitespace.segments.map((s: any) => s.provider_words), rawWords);
assert.deepEqual(whitespace.segments[0].words, [{ word: " Hi  ", start: "0.021", end: "0.100" }, { word: "there. ", start: "0.121", end: "0.200" }]);
assert.deepEqual(whitespace.segments[1].words, [{ word: " Good ", start: "0.411", end: "0.500" }, { word: "day. ", start: "0.511", end: "0.600" }]);
assert.equal(whitespace.segments.map((s: any) => s.words.map((w: any) => w.word).join("")).join(""), payload.output.text);
assert.deepEqual(splitTranscript({ actual_start: { schema_version: 1, value: 10, timescale: 1 }, actual_end: { schema_version: 1, value: 11, timescale: 1 } }, whitespace), [
  { start: { schema_version: 1, value: 10021, timescale: 1000 }, end: { schema_version: 1, value: 51, timescale: 5 }, text: " Hi  there. " },
  { start: { schema_version: 1, value: 10411, timescale: 1000 }, end: { schema_version: 1, value: 53, timescale: 5 }, text: " Good day. " },
]);
payload = { output: { text: "", sentences: [] } }; assert.deepEqual((await run()).output, { text: "", segments: [] });
for (const mutate of [
  (v: any) => { v.output.sentences.pop(); },
  (v: any) => { v.output.sentences[0].words[0].fixed = false; },
  (v: any) => { v.output.sentences[0].words = []; },
  (v: any) => { v.output.sentences[1].begin_time = 99; },
  (v: any) => { v.output.sentences[0].words[0].text = "伪造"; },
  (v: any) => { v.output.sentences[0].words = [{ text: " ", punctuation: ".", fixed: true, begin_time: 101, end_time: 300 }]; v.output.sentences[0].text = " ."; v.output.text = " .再见。"; },
  (v: any) => { v.output.sentences[0].words.unshift({ text: " ", punctuation: "", fixed: true, begin_time: 99, end_time: 110 }); v.output.sentences[0].text = " 你好。"; v.output.text = " 你好。再见。"; },
  (v: any) => { v.output.sentences[0].words[0].text = ""; },
  (v: any) => { v.output.sentences[1].end_time = 1010; v.output.sentences[1].words.push({ text: " ", punctuation: "", fixed: true, begin_time: 999, end_time: 1010 }); v.output.sentences[1].text += " "; v.output.text += " "; },
]) { payload = { output: output() }; mutate(payload); await assert.rejects(run()); }
payload = { output: output() };
const before = sends;
await assert.rejects(runModel({ ...request, dispatch: async () => { throw new Error("permission denied"); } }, provider));
assert.equal(sends, before, "denied dispatch must not send");
const controller = new AbortController(); controller.abort();
await assert.rejects(runModel({ ...request, signal: controller.signal }, provider)); assert.equal(sends, before);
const httpProvider = createQwenAudioAsrProvider({ protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation", api_key: "fixture", fetch_impl: async () => new Response("failure", { status: 503 }) });
await assert.rejects(runModel(request, httpProvider), /Qwen ASR HTTP 503/);
const errorProvider = (status: number, body: unknown) => createQwenAudioAsrProvider({ protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation", api_key: "fixture", fetch_impl: async () => Response.json(body, { status }) });
const noWords = { code: "CLIENT_ERROR", message: "ASR_RESPONSE_HAVE_NO_WORDS" };
const noWordsResult = await runModel(request, errorProvider(400, noWords));
assert.deepEqual(noWordsResult.output, { text: "", segments: [], provider_no_words: { http_status: 400, ...noWords } });
assert.equal(noWordsResult.token_usage, undefined);
const chargedNoWords = await runModel(request, errorProvider(400, { ...noWords, usage: { input_tokens: 3, output_tokens: 1, total_tokens: 4 } }));
assert.deepEqual(chargedNoWords.token_usage, { input: 3, output: 1, total: 4 });
await assert.rejects(runModel(request, errorProvider(400, { code: "CLIENT_ERROR", message: "different error" })), /Qwen ASR HTTP 400/);
const failureAudits: any[] = [];
await assert.rejects(runModel(request, errorProvider(400, { code: "CLIENT_ERROR", message: "other", usage: { input_tokens: 8, output_tokens: 2, total_tokens: 10 } }), Date.now(), { audit: entry => { failureAudits.push(entry); } }), /Qwen ASR HTTP 400/);
assert.equal(failureAudits[0].usage_known, true); assert.deepEqual(failureAudits[0].token_usage, { input: 8, output: 2, total: 10 });
await assert.rejects(runModel(request, errorProvider(400, { code: "OTHER", message: noWords.message })), /Qwen ASR HTTP 400/);
await assert.rejects(runModel(request, errorProvider(503, noWords)), /Qwen ASR HTTP 503/);
let oversizedCancelled = false;
const oversizedProvider = createQwenAudioAsrProvider({ protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api", api_key: "fixture", fetch_impl: async () => new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(9 * 1024 * 1024)); }, cancel() { oversizedCancelled = true; } })) });
await assert.rejects(runModel(request, oversizedProvider), /invalid or too large/); assert.equal(oversizedCancelled, true);
let sentSignal!: () => void; const started = new Promise<void>(resolve => { sentSignal = resolve; });
const cancelProvider = createQwenAudioAsrProvider({ protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation", api_key: "fixture", fetch_impl: async (_url, init) => { sentSignal(); return await new Promise<Response>((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(new Error("cancelled")), { once: true })); } });
const later = new AbortController(); const pending = runModel({ ...request, signal: later.signal }, cancelProvider); await started; later.abort(); await assert.rejects(pending);
const qwenFetch: typeof fetch = async (_url, init) => { assert.equal(reserved!.wire_digest, digest(init!.body as string)); return Response.json({ output: output(), usage: { input_tokens: 3, output_tokens: 4, total_tokens: 7 } }); };
const chat = { provider: "fixture-chat", model: "fixture", base_url: "https://chat.example.invalid/v1", api_key: "fixture", response_mode: "json" as const, structured_output: "validated_json" as const, audio_input: "data-url" as const, fetch_impl: async () => Response.json({ choices: [{ message: { content: JSON.stringify({ description: "synthetic", uncertain: true }) }, finish_reason: "stop" }] }) };
const split = createSplitModelProvider({ vision: chat, sound: chat, transcription: { protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation", api_key: "fixture", fetch_impl: qwenFetch } });
const configChat = { provider: "fixture-chat", model: "fixture", base_url: "https://chat.example.invalid/v1", api_key: "fixture", response_mode: "json", structured_output: "validated_json" };
const savedConfig = { version: 1, enabled: true, vision: configChat, sound: { ...configChat, audio_input: "data-url" }, transcription: { protocol: "qwen-audio-asr", provider: "qwen-asr", model: "qwen-audio-3.1-asr-flash", base_url: "https://asr.example.invalid/api/v1/services/aigc/multimodal-generation/generation", api_key: "fixture" } };
assert.equal(configuredSplitModelProvider(savedConfig).provider?.deployment.routes?.find(route => route.role === "transcription")?.model, "qwen-audio-3.1-asr-flash");
assert.throws(() => configuredSplitModelProvider({ ...savedConfig, transcription: { ...savedConfig.transcription, protocol: "unknown" } }), /protocol/);
const childAudits: any[] = [];
const splitResult = await runModel({ ...request, provider: "ave-split", model: "creation-v1", input: { ...request.input, context: { operation: "observe", samples: [{ sample_id: "audio", kind: "audio", actual_start: { schema_version: 1, value: 10, timescale: 1 }, actual_end: { schema_version: 1, value: 11, timescale: 1 } }] } }, on_call_audit: value => { childAudits.push(value); } }, split);
assert.equal((splitResult.output as any).samples[0].transcript.length, 2);
assert.equal(childAudits[0].token_usage.total, 7); assert.equal(childAudits.length, 2);
console.log("Qwen native ASR controlled tests passed");
