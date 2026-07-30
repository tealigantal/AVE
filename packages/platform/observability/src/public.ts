import { createHash } from "node:crypto";

export type AuditEvent = { event_type: string; request_id: string; payload_hash: string; metadata?: Record<string, string | number | boolean> };
export function hashPayload(payload: unknown): string { return createHash("sha256").update(JSON.stringify(payload)).digest("hex"); }
export function createAuditEvent(event_type: string, request_id: string, payload: unknown, metadata?: AuditEvent["metadata"]): AuditEvent {
  if (!event_type || !request_id) throw new Error("event_type and request_id are required");
  return { event_type, request_id, payload_hash: hashPayload(payload), metadata };
}
const SENSITIVE_KEYS = /token|secret|password|authorization|api[_-]?key|cookie/i;
export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactSensitive(item)]));
}
export function formatStructuredLog(level: "debug" | "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}): string {
  return JSON.stringify({ level, event, fields: redactSensitive(fields), at: new Date().toISOString() });
}
