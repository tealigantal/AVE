import type { AudioResourcePackV1 } from "../../../../contracts/generated/typescript/editorial/audio-resource-pack.v1.js";
import type { CreationMaterialV1 } from "../../../../contracts/generated/typescript/editorial/creation-material.v1.js";
import type { CreationSessionV1 } from "../../../../contracts/generated/typescript/editorial/creation-session.v1.js";
export function assertAudioResourcePack(value: unknown): asserts value is AudioResourcePackV1;
export function audioResourceGranted(authorization: CreationSessionV1["authorization"], ref: CreationMaterialV1["resource_ref"], assetId: string): boolean;

import type { AudioLibraryOperationV1 } from "../../../../contracts/generated/typescript/editorial/audio-library-operation.v1.js";
export function assertAudioLibraryOperation(value: unknown): asserts value is AudioLibraryOperationV1;
