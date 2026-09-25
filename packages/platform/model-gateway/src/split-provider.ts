import { splitTranscript, fuseSplitObservation } from "../../contract-runtime/src/public.js";
import { createHash } from "node:crypto";
import { createOpenAICompatibleProvider, ModelGatewayError, runModel, validateModelInput, type ModelProvider, type ModelRequest, type ModelRoute, type OpenAICompatibleConfig, type ProviderResponse, type SplitObservationProof } from "./public.js";
import { createWhisperProvider, type WhisperConfiguration } from "./whisper.js";

export type ChatServiceConfiguration = Omit<OpenAICompatibleConfig, "models"> & Readonly<{ model: string }>;
export type WhisperServiceConfiguration = WhisperConfiguration;
export type SplitModelConfiguration = Readonly<{ vision: ChatServiceConfiguration; transcription: WhisperServiceConfiguration; sound: ChatServiceConfiguration; planner?: ChatServiceConfiguration }>;
function description(output: any): void {
  if (!output || Object.keys(output).sort().join(",") !== "description,uncertain" || typeof output.description !== "string" || !output.description.trim() || typeof output.uncertain !== "boolean") throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "perception requires exactly description and uncertain; no invented transcript");
}
export function createSplitModelProvider(configuration: SplitModelConfiguration) {
  const config = { ...configuration }, planner = config.planner ?? config.vision;
  const services = { vision: config.vision, transcription: config.transcription, sound: config.sound, planner };
  const adapters = {
    vision: createOpenAICompatibleProvider({ ...config.vision, models: [{ model: config.vision.model, media_types: ["image/png"] }] }),
    transcription: createWhisperProvider(config.transcription),
    sound: createOpenAICompatibleProvider({ ...config.sound, models: [{ model: config.sound.model, media_types: ["audio/wav"] }] }),
    planner: createOpenAICompatibleProvider({ ...planner, models: [{ model: planner.model, media_types: [] }] }),
  };
  const routes = Object.freeze((Object.keys(adapters) as (keyof typeof adapters)[]).map(role => Object.freeze({ role, provider: services[role].provider, model: services[role].model, ...adapters[role].deployment })));
  const deployment = Object.freeze({ endpoint: adapters.planner.deployment.endpoint, routes, digest: createHash("sha256").update(JSON.stringify({ protocol: "ave-split-v1", routes })).digest("hex") });
  return { transport_observable: true as const, manages_call_audit: true as const, deployment, async complete(parent: ModelRequest): Promise<ProviderResponse> {
    if (parent.provider !== "ave-split" || parent.model !== "creation-v1") throw new ModelGatewayError("MODEL_PRIVACY_BLOCKED", "request must authorize the configured split deployment");
    validateModelInput(parent.input);
    if (!parent.dispatch || !parent.on_call_audit) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "split calls require durable per-call dispatch and settlement");
    const parts: SplitObservationProof["parts"][number][] = [];
    async function invoke(role: ModelRoute["role"], input: ModelRequest["input"], validate: (value: any) => void, sample_id?: string) {
      const target = routes.find(route => route.role === role)!;
      const result = await runModel({ ...parent, provider: target.provider, model: target.model, input, structured_output: true, output_validator: validate, on_call_audit: undefined,
        dispatch: (send, transport) => parent.dispatch!(() => { parent.on_send?.(); return send(); }, { ...transport, target: { ...target, ...(sample_id ? { sample_id } : {}) } }),
      }, adapters[role] as ModelProvider, Date.now(), { policy: { allowed_sensitive_providers: [target.provider], retry: { max_attempts: 1 } }, audit: parent.on_call_audit });
      if (sample_id) parts.push({ target: { ...target, sample_id }, output: result.output, output_hash: result.output_hash, ...(result.token_usage ? { token_usage: result.token_usage } : {}) });
      return result;
    }
    if (!parent.input.media.length) {
      const result = await invoke("planner", parent.input, output => parent.output_validator?.(output));
      return { output: result.output, model_snapshot: deployment.digest, token_usage: result.token_usage };
    }
    const context = parent.input.context as any;
    if (!context || context.operation !== "observe" || !Array.isArray(context.samples) || context.samples.length !== parent.input.media.length) throw new ModelGatewayError("MODEL_INPUT_INVALID", "split perception requires Host-bound sample metadata");
    const metadata = new Map<string, any>();
    for (const sample of context.samples) {
      if (!sample || typeof sample.sample_id !== "string" || metadata.has(sample.sample_id)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "duplicate sample metadata");
      metadata.set(sample.sample_id, sample);
    }
    for (const media of parent.input.media) {
      const sample = metadata.get(media.sample_id);
      if (!sample || sample.kind !== (media.mime_type === "image/png" ? "frame" : "audio")) throw new ModelGatewayError("MODEL_INPUT_INVALID", "sample metadata/media mismatch");
      // Do not expose user requests, profile, unrelated samples or local paths to perception services.
      if (media.mime_type === "image/png") {
        await invoke("vision", { context: { task: "Describe only the attached frame. Return JSON {description:string,uncertain:boolean}. Do not infer speech, unseen motion or events.", sample_id: media.sample_id }, media: [media] }, description, media.sample_id);
      } else {
        await invoke("transcription", { context: { sample_id: media.sample_id }, media: [media] }, value => { splitTranscript(sample, value); }, media.sample_id);
        await invoke("sound", { context: { task: "Listen to the attached original audio. Describe music, applause, ambience, noise and vocal presence. Do not transcribe or invent words. Return JSON {description:string,uncertain:boolean}.", sample_id: media.sample_id }, media: [media] }, description, media.sample_id);
      }
    }
    const composition: SplitObservationProof = { kind: "split-observation-v1", parts };
    return { output: fuseSplitObservation(parent.input, composition), model_snapshot: deployment.digest, composition };
  } };
}
