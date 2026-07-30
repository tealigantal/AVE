export type ModelRequest = { request_id: string; provider: string; model: string; prompt_version: string; input: unknown; privacy_class: "public" | "internal" | "sensitive" };
export type ModelResult = { request_id: string; provider: string; model: string; output: unknown; input_hash: string; output_hash: string; latency_ms: number; token_usage?: { input: number; output: number }; cache_hit: boolean };
export type ModelProvider = (request: ModelRequest) => Promise<unknown>;

import { hashPayload } from "../../observability/src/public.js";
export async function runModel(request: ModelRequest, provider: ModelProvider, startedAt = Date.now()): Promise<ModelResult> {
  if (!request.request_id || !request.provider || !request.model || !request.prompt_version) throw new Error("model request metadata is incomplete");
  if (request.privacy_class === "sensitive") throw new Error("sensitive model input requires an approved provider policy");
  const output = await provider(request);
  return { request_id: request.request_id, provider: request.provider, model: request.model, output, input_hash: hashPayload(request.input), output_hash: hashPayload(output), latency_ms: Date.now() - startedAt, cache_hit: false };
}
