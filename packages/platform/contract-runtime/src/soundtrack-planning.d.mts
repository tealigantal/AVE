import type { AudioSourceMeasurementV1 } from '../../../../contracts/generated/typescript/editorial/audio-source-measurement.v1.js';
import type { PlanningAudioReceipt } from './creation-planning.mjs';
export function assertAudioSourceMeasurement(value: unknown): asserts value is AudioSourceMeasurementV1;
export function validateAudioResourceSelections(query: unknown, context: unknown): readonly {resource_id:string;reason:string;match_evidence_ids:readonly string[]}[];
export function validatePlanningAudioReceipts(root: unknown, query: unknown, receipts: readonly PlanningAudioReceipt[] | undefined): readonly Record<string,any>[];
export function planningAudioContext(root: unknown, exchanges: readonly unknown[]): any;

export function validateAudioMeasurementProbe(value: AudioSourceMeasurementV1,probe:unknown):void;

export function retainedAudioSpan(row: PlanningAudioReceipt): any;
