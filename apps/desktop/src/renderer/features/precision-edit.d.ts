import type {PrecisionEditV1} from "../../../../../contracts/generated/typescript/editorial/precision-edit.v1.js";
import type {Timeline} from "../../../../../packages/core/timeline-core/src/public.js";
export function exactSourceTime(text:unknown):{schema_version:1;value:number;timescale:number};
export function precisionAction(timeline:Timeline,values:Record<string,string>,ticks:(text:string)=>bigint):PrecisionEditV1["action"];
export const precisionFields:readonly (readonly string[])[];
export const precisionOperations:readonly (readonly string[])[];
export function showPrecisionFields(controls:Record<string,HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>):void;
