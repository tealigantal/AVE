export type SchemaVersion = 1;
export type ContractEnvelope = Readonly<{ schema_version: SchemaVersion }>;
export function assertSchemaVersion(value: unknown, expected: SchemaVersion = 1): asserts value is ContractEnvelope { if (!value || typeof value !== "object" || (value as any).schema_version !== expected) throw new Error(`unsupported schema version; expected ${expected}`); }
export function parseContractJson(json: string, expected: SchemaVersion = 1): ContractEnvelope { let value: unknown; try { value = JSON.parse(json); } catch { throw new Error("invalid contract JSON"); } assertSchemaVersion(value, expected); return value; }
