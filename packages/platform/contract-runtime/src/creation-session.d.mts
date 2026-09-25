import type { CreationSessionV1 } from "../../../../contracts/generated/typescript/editorial/creation-session.v1.js";
export class CreationError extends Error { readonly code: string; constructor(code: string, message: string); }
export function creationDigest(value: unknown): string;
export function validateCreationState(value: unknown): asserts value is CreationSessionV1;
export function validateCreationTransition(current: CreationSessionV1 | null, next: CreationSessionV1, kind: "metadata" | "draft" | "render" | "observation" | "learning"): void;
