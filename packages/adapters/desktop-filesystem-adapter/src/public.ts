import { readFile, writeFile } from "node:fs/promises";
import type { Timeline } from "../../../core/timeline-core/src/public.js";
export type FilesystemTimelineDocument = Readonly<{ format: "ave-timeline"; schema_version: 1; timeline: unknown }>;
const encode = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item));
const decode = (value: unknown): unknown => typeof value === "string" && /^-?\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : Array.isArray(value) ? value.map(decode) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)])) : value;
export function serializeTimeline(timeline: Timeline): FilesystemTimelineDocument { return { format: "ave-timeline", schema_version: 1, timeline: encode(timeline) }; }
export async function writeTimeline(path: string, timeline: Timeline): Promise<void> { await writeFile(path, JSON.stringify(serializeTimeline(timeline), null, 2), "utf8"); }
export async function readTimeline(path: string): Promise<Timeline> { const document = JSON.parse(await readFile(path, "utf8")) as FilesystemTimelineDocument; if (document.format !== "ave-timeline" || document.schema_version !== 1) throw new Error("unsupported AVE timeline document"); return decode(document.timeline) as Timeline; }
