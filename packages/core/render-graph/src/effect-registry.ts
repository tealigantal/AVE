export type EffectRegistryEntry = Readonly<{ effect_id: string; version: string; parameters: Readonly<Record<string, Readonly<{ type: "number" | "boolean" | "string"; minimum?: number; maximum?: number }>>>; preview: boolean; master: boolean; adapter_capability: "video-filter"; fallback?: "bake" | "block" }>;
export const effectRegistry: ReadonlyMap<string, EffectRegistryEntry> = new Map([
  ["grayscale", { effect_id: "grayscale", version: "1", parameters: {}, preview: true, master: true, adapter_capability: "video-filter" }],
  ["blackwhite", { effect_id: "blackwhite", version: "1", parameters: {}, preview: true, master: true, adapter_capability: "video-filter" }],
  ["blur", { effect_id: "blur", version: "1", parameters: {}, preview: true, master: true, adapter_capability: "video-filter" }],
]);

export function validateRegisteredEffect(kind: string, parameters: Readonly<Record<string, string | number | boolean>> = {}): void {
  const entry = effectRegistry.get(kind); if (!entry) throw new Error(`EFFECT_UNSUPPORTED:${kind}`);
  for (const [name, value] of Object.entries(parameters)) {
    const definition = entry.parameters[name]; if (!definition) throw new Error(`EFFECT_PARAMETER_UNSUPPORTED:${kind}.${name}`);
    if (typeof value !== definition.type || (typeof value === "number" && ((definition.minimum !== undefined && value < definition.minimum) || (definition.maximum !== undefined && value > definition.maximum)))) throw new Error(`EFFECT_PARAMETER_INVALID:${kind}.${name}`);
  }
}
