import { createHash } from "node:crypto";

export type InvalidationRule = Readonly<{ changed: string; stale: readonly string[] }>;
export type InvalidationPlan = Readonly<{ changed: readonly string[]; stale: readonly string[]; rules: readonly InvalidationRule[]; plan_hash: string }>;

export const INVALIDATION_RULES: readonly InvalidationRule[] = [
  { changed: "target_duration", stale: ["sufficiency", "story_plan", "timeline", "render", "qc"] },
  { changed: "sponsor_cta", stale: ["sponsor_plan", "timeline_effects", "render", "sponsor_qc"] },
  { changed: "caption_text", stale: ["caption_track", "render", "subtitle_qc"] },
];

const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right))) : item);
const hash = (value: unknown): string => createHash("sha256").update(canonical(value)).digest("hex");

export class InvalidationPlanner {
  constructor(private readonly rules: readonly InvalidationRule[] = INVALIDATION_RULES) {}

  plan(changed: readonly string[]): InvalidationPlan {
    const normalized = [...new Set(changed)].sort();
    const applied = this.rules.filter((rule) => normalized.includes(rule.changed)).map((rule) => ({ changed: rule.changed, stale: [...rule.stale] }));
    const stale = [...new Set(applied.flatMap((rule) => rule.stale))].sort();
    return { changed: normalized, stale, rules: applied, plan_hash: hash({ changed: normalized, stale, rules: applied }) };
  }
}

export { canonical, hash };
