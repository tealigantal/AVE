import type { ValidateFunction } from "ajv";
import { creativeSkillOutputValidator, presetApplicationRecordValidator, presetDefinitionValidator, presetSelectionValidator } from "./generated/preset-validators.mjs";
import type { CreativeSkillOutputV1 } from "../../../../contracts/generated/typescript/preset/creative-skill-output.v1.js";
import type { PresetApplicationRecordV1 } from "../../../../contracts/generated/typescript/preset/preset-application-record.v1.js";
import type { PresetDefinitionV1 } from "../../../../contracts/generated/typescript/preset/preset-definition.v1.js";
import type { PresetSelectionV1 } from "../../../../contracts/generated/typescript/preset/preset-selection.v1.js";

export type SchemaVersion = 1;
export type ContractEnvelope = Readonly<{ schema_version: SchemaVersion }>;
export function assertSchemaVersion(value: unknown, expected: SchemaVersion = 1): asserts value is ContractEnvelope { if (!value || typeof value !== "object" || (value as any).schema_version !== expected) throw new Error(`unsupported schema version; expected ${expected}`); }
export function parseContractJson(json: string, expected: SchemaVersion = 1): ContractEnvelope { let value: unknown; try { value = JSON.parse(json); } catch { throw new Error("invalid contract JSON"); } assertSchemaVersion(value, expected); return value; }

function assertContract<T>(validate: ValidateFunction, value: unknown, code: string): asserts value is T {
  if (validate(value)) return;
  const detail = (validate.errors ?? []).map((error) => `${error.instancePath || "/"}:${error.keyword}:${error.message ?? "invalid"}`).join("|");
  throw new Error(`${code}:${detail || "invalid"}`);
}

export function assertPresetDefinitionV1(value: unknown): asserts value is PresetDefinitionV1 { assertContract<PresetDefinitionV1>(presetDefinitionValidator, value, "CONTRACT_PRESET_DEFINITION_INVALID"); }
export function assertPresetSelectionV1(value: unknown): asserts value is PresetSelectionV1 { assertContract<PresetSelectionV1>(presetSelectionValidator, value, "CONTRACT_PRESET_SELECTION_INVALID"); }
export function assertCreativeSkillOutputV1(value: unknown): asserts value is CreativeSkillOutputV1 { assertContract<CreativeSkillOutputV1>(creativeSkillOutputValidator, value, "CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID"); }
export function assertPresetApplicationRecordV1(value: unknown): asserts value is PresetApplicationRecordV1 { assertContract<PresetApplicationRecordV1>(presetApplicationRecordValidator, value, "CONTRACT_PRESET_APPLICATION_RECORD_INVALID"); }
