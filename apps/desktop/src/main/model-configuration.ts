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
export function configuredSplitModelProvider(value: unknown) {
  const invalid = (field: string): never => { throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", `model-services.json: invalid or missing ${field}`); };
  const record = (item: unknown, fields: string[], at: string): Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some(key => !fields.includes(key))) return invalid(at);
    return item as Record<string, unknown>;
  };
  const root = record(value, ["version", "enabled", "vision", "transcription", "sound", "planner"], "root");
  if (root.version !== 1 || typeof root.enabled !== "boolean") invalid("version/enabled");
  if (!root.enabled) return {};
  const service = (role: string, audio: boolean, whisper = false) => {
    const allowed = ["provider", "base_url", "model", "api_key", ...(whisper ? ["language"] : ["audio_input", "response_mode", "structured_output", "text_output_only"])];
    const item = record(root[role], allowed, role);
    for (const name of ["provider", "base_url", "model"]) if (typeof item[name] !== "string" || !(item[name] as string).trim()) invalid(`${role}.${name}`);
    if (item.api_key !== undefined && typeof item.api_key !== "string") invalid(`${role}.api_key`);
    if (whisper) { if (item.language !== undefined && (typeof item.language !== "string" || !/^[a-z]{2,3}$/.test(item.language))) invalid(`${role}.language`); }
    else {
      if (item.response_mode !== "json" && item.response_mode !== "sse") invalid(`${role}.response_mode`);
      if (item.structured_output !== "json_object" && item.structured_output !== "validated_json") invalid(`${role}.structured_output`);
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
  return { provider: createSplitModelProvider(configuration), name: "ave-split", model: "creation-v1", creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 900000 }, creationObservationPolicy: { scene_threshold: 12, max_frame_edge: 768, max_samples: 256, timeout_seconds: 180 } };
}
export async function loadModelServices(defaultPath: string, env: NodeJS.ProcessEnv = process.env) {
  const path = env.AVE_MODEL_CONFIG ?? defaultPath;
  let text: string;
  try { text = await readFile(path, "utf8"); }
  catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
    if (env.AVE_MODEL_CONFIG) throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "AVE_MODEL_CONFIG file does not exist");
    if (env.AVE_MODEL_PROVIDER || env.AVE_MODEL_NAME || env.AVE_MODEL_BASE_URL) return configuredModelProvider(env);
    await mkdir(dirname(path), { recursive: true });
    try { await writeFile(path, JSON.stringify(modelServicesTemplate, null, 2) + "\n", { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; return loadModelServices(defaultPath, env); }
    return {};
  }
  let settings: unknown;
  try { settings = JSON.parse(text); } catch { throw new ModelGatewayError("MODEL_CONFIGURATION_INVALID", "model-services.json is not valid JSON; secret-containing input is not logged"); }
  return configuredSplitModelProvider(settings);
}
