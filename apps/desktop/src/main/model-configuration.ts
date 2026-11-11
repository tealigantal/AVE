import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createSplitModelProvider, createOpenAICompatibleProvider, ModelGatewayError, type ModelMedia, type SplitModelConfiguration, type OpenAICompatibleConfig } from "../../../../packages/platform/model-gateway/src/public.js";

/** Explicit selected deployment; no provider/model fallback or implicit media support. */
export function configuredModelProvider(env: NodeJS.ProcessEnv = process.env) {
  const name = env.AVE_MODEL_PROVIDER?.trim(), model = env.AVE_MODEL_NAME?.trim();
  if (!name && !model && !env.AVE_MODEL_BASE_URL) return {};
  const invalid = (message: string): never => { throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", message); };
  if (!name || !model) return invalid("AVE_MODEL_PROVIDER and AVE_MODEL_NAME must select an exact deployment and model");
  const baseUrl = env.AVE_MODEL_BASE_URL?.trim() ?? (name === "qwen" ? "https://dashscope.aliyuncs.com/compatible-mode/v1" : name === "deepseek" ? "https://api.deepseek.com" : undefined);
  if (!baseUrl) return invalid("AVE_MODEL_BASE_URL is required for this deployment");
  const apiKey = env.AVE_MODEL_API_KEY ?? (name === "qwen" ? env.QWEN_API_KEY ?? env.DASHSCOPE_API_KEY : name === "deepseek" ? env.DEEPSEEK_API_KEY : undefined);
  const modalities = (env.AVE_MODEL_MEDIA_TYPES ?? "").split(",").map(value => value.trim()).filter(Boolean);
  if (new Set(modalities).size !== modalities.length || modalities.some(value => !["image/png", "audio/wav"].includes(value))) return invalid("AVE_MODEL_MEDIA_TYPES must declare supported image/png and/or audio/wav");
  const audio = env.AVE_MODEL_AUDIO_FORMAT;
  if (audio !== undefined && audio !== "base64" && audio !== "data-url") return invalid("AVE_MODEL_AUDIO_FORMAT must be base64 or data-url");
  if (modalities.includes("audio/wav") && !audio) return invalid("audio capability requires an explicit audio wire format");
  const response = env.AVE_MODEL_RESPONSE_MODE ?? "json", structured = env.AVE_MODEL_STRUCTURED_OUTPUT ?? "json_object";
  if (response !== "json" && response !== "sse" || structured !== "json_object" && structured !== "validated_json") return invalid("unsupported response or structured-output mode");
  const config: OpenAICompatibleConfig = { api_key: apiKey, base_url: baseUrl, provider: name, model_snapshot: env.AVE_MODEL_SNAPSHOT, models: [{ model, media_types: modalities as ModelMedia["mime_type"][] }], audio_input: audio, response_mode: response, structured_output: structured };
  return { provider: createOpenAICompatibleProvider(config), name, model,
    creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 300000 },
    creationObservationPolicy: { scene_threshold: 12, max_frame_edge: 768, max_samples: 256, timeout_seconds: 180 } };
}

export const modelServicesTemplate = {
  version: 1, enabled: false,
  vision: { provider: "qwen", base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3-vl-plus", api_key: "", response_mode: "json", structured_output: "validated_json" },
  transcription: { provider: "whisper", base_url: "https://api.openai.com/v1", model: "whisper-1", api_key: "" },
  sound: { provider: "qwen-audio", base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen3-omni-flash", api_key: "", audio_input: "data-url", response_mode: "sse", structured_output: "validated_json", text_output_only: true },
};
export function configuredSplitModelProvider(value: unknown, resourceGate?: import("../../../../packages/platform/worker-client/src/public.js").WorkerResourceGate) {
  const invalid = (field: string): never => { throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", `model-services.json: invalid or missing ${field}`); };
  const record = (item: unknown, fields: string[], at: string): Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some(key => !fields.includes(key))) return invalid(at);
    return item as Record<string, unknown>;
  };
  const root = record(value, ["version", "enabled", "vision", "transcription", "sound", "planner"], "root");
  if (root.version !== 1 || typeof root.enabled !== "boolean") invalid("version/enabled");
  if (!root.enabled) return {};
  const service = (role: string, audio: boolean, whisper = false) => {
    const allowed = ["provider", "base_url", "model", "api_key", ...(whisper ? ["language", "protocol"] : ["audio_input", "response_mode", "structured_output", "text_output_only", "enable_thinking", "thinking_budget", "max_tokens"])];
    const item = record(root[role], allowed, role);
    for (const name of ["provider", "base_url", "model"]) if (typeof item[name] !== "string" || !(item[name] as string).trim()) invalid(`${role}.${name}`);
    if (item.api_key !== undefined && typeof item.api_key !== "string") invalid(`${role}.api_key`);
    if (whisper) {
      if (item.protocol !== undefined && item.protocol !== "whisper" && item.protocol !== "qwen-audio-asr") invalid(`${role}.protocol`);
      if (item.language !== undefined && (item.protocol === "qwen-audio-asr" || typeof item.language !== "string" || !/^[a-z]{2,3}$/.test(item.language))) invalid(`${role}.language`);
    }
    else {
      if (item.response_mode !== "json" && item.response_mode !== "sse") invalid(`${role}.response_mode`);
      if (item.structured_output !== "json_object" && item.structured_output !== "validated_json") invalid(`${role}.structured_output`);
      if (item.enable_thinking !== undefined && typeof item.enable_thinking !== "boolean") invalid(`${role}.enable_thinking`);
      if (item.thinking_budget !== undefined && (!Number.isSafeInteger(item.thinking_budget) || (item.thinking_budget as number) <= 0 || item.enable_thinking !== true)) invalid(`${role}.thinking_budget`);
      if (item.max_tokens !== undefined && (!Number.isSafeInteger(item.max_tokens) || (item.max_tokens as number) <= 0)) invalid(`${role}.max_tokens`);
      if (item.text_output_only !== undefined && typeof item.text_output_only !== "boolean") invalid(`${role}.text_output_only`);
      if (audio && item.audio_input !== "base64" && item.audio_input !== "data-url") invalid(`${role}.audio_input`);
      if (!audio && item.audio_input !== undefined) invalid(`${role}.audio_input`);
    }
    let endpoint: URL; try { endpoint = new URL(item.base_url as string); } catch { return invalid(`${role}.base_url`); }
    if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) invalid(`${role}.base_url`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname) && (typeof item.api_key !== "string" || !item.api_key.trim())) invalid(`${role}.api_key`);
    return { ...item, api_key: (item.api_key as string | undefined)?.trim() || undefined };
  };
  const configuration = { vision: service("vision", false), transcription: service("transcription", false, true), sound: service("sound", true), ...(root.planner !== undefined ? { planner: service("planner", false) } : {}) } as SplitModelConfiguration;
  return { provider: createSplitModelProvider(configuration, resourceGate ? { resource_gate: resourceGate } : {}), name: "ave-split", model: "creation-v1", creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 900000 }, creationObservationPolicy: { scene_threshold: 12, max_frame_edge: 768, max_samples: 256, timeout_seconds: 180 } };
}

/** Startup-owned profiles only; Renderer never supplies a URL, credential or
 * provider. Cloud-only admission stays separate from the mixed-mode gate. */
function configuredProfiles(value: unknown, resourceGate: import("../../../../packages/platform/worker-client/src/public.js").WorkerResourceGate | undefined, mode: "cloud" | "mixed") {
  const invalid = (): never => { throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "model-services.json: invalid cloud profiles"); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const root = value as Record<string, unknown>;
  if (Object.keys(root).sort().join(",") !== "default_profile,enabled,profiles,version" || root.version !== 1 || root.enabled !== true || typeof root.default_profile !== "string" || !Array.isArray(root.profiles) || root.profiles.length < 1 || root.profiles.length > 8) return invalid();
  const ids = new Set<string>(), labels = new Set<string>(), digests = new Set<string>();
  const profiles = root.profiles.map((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalid();
    const entry = raw as Record<string, unknown>;
    if (Object.keys(entry).sort().join(",") !== "id,label,planner,sound,transcription,vision" || typeof entry.id !== "string" || !/^[a-z][a-z0-9_-]{0,31}$/.test(entry.id) || ids.has(entry.id) || typeof entry.label !== "string" || !entry.label.trim() || labels.has(entry.label.trim()) || entry.label.length > 80 || /[\u0000-\u001f\u007f]/.test(entry.label)) return invalid();
    ids.add(entry.id);
    labels.add(entry.label.trim());
    const localTranscription = (entry.transcription as Record<string, unknown> | undefined)?.provider === "local-whisper";
    const localSound = (entry.sound as Record<string, unknown> | undefined)?.provider === "local-yamnet";
    if (localTranscription !== localSound || mode === "cloud" && localTranscription) return invalid();
    for (const role of ["vision", "planner", "transcription", "sound"] as const) {
      const service = entry[role];
      if (!service || typeof service !== "object" || Array.isArray(service)) return invalid();
      const record = service as Record<string, unknown>;
      let endpoint: URL;
      try { endpoint = new URL(String(record.base_url)); } catch { return invalid(); }
      if (localTranscription && (role === "transcription" || role === "sound")) {
        const transcription = role === "transcription";
        if (record.base_url !== (transcription ? "http://127.0.0.1:18080/v1" : "http://127.0.0.1:18081/v1") || record.provider !== (transcription ? "local-whisper" : "local-yamnet") || record.model !== (transcription ? "Systran/faster-whisper-small" : "yamnet-tflite-1-10c95ea3eb9a7bb4") || record.api_key !== undefined && record.api_key !== "" || transcription && record.protocol !== undefined && record.protocol !== "whisper" || !transcription && (record.audio_input !== "base64" && record.audio_input !== "data-url" || record.response_mode !== "json" || record.structured_output !== "validated_json" || record.text_output_only !== true)) return invalid();
        continue;
      }
      const hostname = endpoint.hostname.toLowerCase().replace(/\.$/, ""), path = endpoint.pathname.replace(/\/$/, "");
      const expectedPath = role === "transcription" ? "/api/v1/services/aigc/multimodal-generation/generation" : "/compatible-mode/v1";
      const expectedProvider = role === "vision" || role === "planner" ? "qwen" : "qwen-audio";
      if (endpoint.protocol !== "https:" || endpoint.port || hostname !== "dashscope.aliyuncs.com" || path !== expectedPath || record.provider !== expectedProvider || typeof record.model !== "string" || !record.model.startsWith("qwen") || role === "transcription" && (record.protocol !== "qwen-audio-asr" || record.model !== "qwen-audio-3.1-asr-flash")) return invalid();
    }
    const configured = configuredSplitModelProvider({ version: 1, enabled: true, vision: entry.vision, planner: entry.planner, transcription: entry.transcription, sound: entry.sound }, resourceGate);
    const provider = configured.provider;
    if (!provider?.deployment?.routes || provider.deployment.routes.length !== 4 || digests.has(provider.deployment.digest)) return invalid();
    digests.add(provider.deployment.digest);
    return { id: entry.id, label: entry.label.trim(), audio_mode: localTranscription ? "local" as const : "cloud" as const, ...configured, provider };
  });
  const selected = profiles.find(profile => profile.id === root.default_profile);
  if (!selected) return invalid();
  return { ...selected, creationModelProviders: profiles.filter(profile => profile.id !== selected.id).map(profile => ({ provider: profile.provider, observation_output_version: 1 as const })), profiles: profiles.map(profile => ({ id: profile.id, label: profile.label, digest: profile.provider.deployment.digest, provider: profile.name, model: profile.model, ...(mode === "mixed" ? { audio_mode: profile.audio_mode } : {}), routes: profile.provider.deployment.routes!.map(route => ({ role: route.role, provider: route.provider, model: route.model, endpoint: route.endpoint })) })) };
}
export function configuredCloudProfiles(value: unknown, resourceGate?: import("../../../../packages/platform/worker-client/src/public.js").WorkerResourceGate) { return configuredProfiles(value, resourceGate, "cloud"); }
export function configuredMixedProfiles(value: unknown, resourceGate?: import("../../../../packages/platform/worker-client/src/public.js").WorkerResourceGate) { return configuredProfiles(value, resourceGate, "mixed"); }
export async function loadModelServices(defaultPath: string, env: NodeJS.ProcessEnv = process.env, resourceGate?: import("../../../../packages/platform/worker-client/src/public.js").WorkerResourceGate) {
  const cloudProfiles = env.AVE_CLOUD_PROFILES === "1", mixedProfiles = env.AVE_MODEL_PROFILES === "1";
  if (cloudProfiles && mixedProfiles) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "cloud-only and mixed profile modes are mutually exclusive");
  const path = env.AVE_MODEL_CONFIG ?? defaultPath;
  let text: string;
  try { text = await readFile(path, "utf8"); }
  catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
    if (cloudProfiles || mixedProfiles) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "profiles configuration file is required");
    if (env.AVE_MODEL_CONFIG) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "AVE_MODEL_CONFIG file does not exist");
    if (env.AVE_MODEL_PROVIDER || env.AVE_MODEL_NAME || env.AVE_MODEL_BASE_URL) return configuredModelProvider(env);
    await mkdir(dirname(path), { recursive: true });
    try { await writeFile(path, JSON.stringify(modelServicesTemplate, null, 2) + "\n", { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; return loadModelServices(defaultPath, env, resourceGate); }
    return {};
  }
  let settings: unknown;
  try { settings = JSON.parse(text); } catch { throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "model-services.json is not valid JSON; secret-containing input is not logged"); }
  const hasProfiles = Boolean(settings && typeof settings === "object" && !Array.isArray(settings) && "profiles" in settings);
  if (hasProfiles && !cloudProfiles && !mixedProfiles) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "profiles require an explicit startup feature");
  if (cloudProfiles || mixedProfiles) {
    if (!hasProfiles) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "profiles configuration is required");
    return cloudProfiles ? configuredCloudProfiles(settings, resourceGate) : configuredMixedProfiles(settings, resourceGate);
  }
  return configuredSplitModelProvider(settings, resourceGate);
}
