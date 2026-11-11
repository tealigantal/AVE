import { creationDigest } from "../../contract-runtime/src/public.js";
import { assertCurrentCreationAudioStreamSelection, reserveCreationAudioStreamCall, settleCreationAudioStreamCall, type CreationAudioStreamSelection } from "../../project-storage/src/public.js";
import { modelInputHash, readTrustedModelFailureAudit, readTrustedModelSuccessAudit, validateModelInput, type ModelAudit, type ModelDeployment, type ModelFailureAudit, type ModelInput, type ModelRequest, type ModelRoute, type PreparedModelTransport } from "../../model-gateway/src/public.js";
import type { CreationAudioStreamRootV1 } from "../../../../contracts/generated/typescript/editorial/creation-audio-stream-root.v1.js";
import type { CreationAudioStreamCallV1 } from "../../../../contracts/generated/typescript/editorial/creation-audio-stream-call.v1.js";

type Session = Parameters<typeof reserveCreationAudioStreamCall>[0];
type Options = Readonly<{
  session: Session; projectId: string; selection: CreationAudioStreamSelection;
  deployment: ModelDeployment; target: ModelRoute; input: ModelInput; callId: string; attempt: number; explicitRetry?: boolean;
  assertCurrent: (root: Readonly<CreationAudioStreamRootV1>) => void;
  /** Must synchronously verify the pinned, prevalidated sample identity that
   * the trusted adapter used to construct its exact physical request. */
  assertSample: (chunk: CreationAudioStreamSelection["chunk"]) => void;
  assertLedgerOwner: () => void; signal?: AbortSignal; now?: () => number;
}>;

const invalid = (message: string): never => { throw new Error(`CREATION_AUDIO_DISPATCH_INVALID: ${message}`); };
function syncCheck(callback: () => void): void {
  const result: unknown = callback();
  if (result && typeof (result as { then?: unknown }).then === "function") { Promise.resolve(result).catch(() => {}); invalid("dispatch guards must be synchronous"); }
  if (result === false) invalid("dispatch guard rejected the operation");
}

/** One physical-call dispatcher for an already verified single chunk. It
 * commits a durable reservation before invoking the trusted adapter's send
 * closure, and never retries the closure. Provider completion must be settled
 * separately using the returned reservation and actual validated response. */
export function createCreationAudioStreamDispatch(options: Options): Readonly<{
  dispatch: NonNullable<ModelRequest["dispatch"]>;
  reservation: () => Readonly<{ call: CreationAudioStreamCallV1; acknowledged: boolean }> | null;
  recordUnknown: (audit: ModelFailureAudit) => Readonly<{ settlement_digest: string; status: "recorded" | "existing" }>;
  recordUnpublishedResponse: (audit: ModelAudit) => Readonly<{ settlement_digest: string; status: "recorded" | "existing" }>;
}> {
  if (!options || typeof options.assertCurrent !== "function" || typeof options.assertSample !== "function" || typeof options.assertLedgerOwner !== "function" || !Number.isSafeInteger(options.attempt) || options.attempt < 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(options.callId)) invalid("explicit Host authority and safe call identity required");
  const { session, projectId, selection, assertCurrent, assertSample, assertLedgerOwner, signal } = options;
  const deployment = structuredClone(options.deployment), target = Object.freeze(structuredClone(options.target)), input = structuredClone(options.input), chunk = Object.freeze(structuredClone(selection.chunk));
  const root = assertCurrentCreationAudioStreamSelection(session, projectId, selection, assertCurrent);
  const measures = validateModelInput(input), audio = input.media[0], measurement = measures[0];
  if (!target || !["transcription", "sound"].includes(target.role) || measures.length !== 1 || !audio || !measurement || audio.sample_id !== chunk.sample_id || audio.mime_type !== "audio/wav" || audio.content_digest !== chunk.sample_content_digest || measurement.byte_length !== chunk.sample_byte_length) invalid("the exact input and audio route must match the verified chunk");
  const expectedInputHash = modelInputHash(input);
  const mediaBinding = { sample_id: chunk.sample_id, mime_type: "audio/wav" as const, content_digest: chunk.sample_content_digest, byte_length: chunk.sample_byte_length };
  const providerBinding = { provider: target.provider, model: target.model, endpoint: target.endpoint, digest: target.digest };
  let attempted = false, reserved: CreationAudioStreamCallV1 | null = null, acknowledged = false;
  const guard = () => {
    if (signal?.aborted) throw signal.reason;
    assertCurrentCreationAudioStreamSelection(session, projectId, selection, assertCurrent);
    syncCheck(() => assertSample(chunk));
    if (signal?.aborted) throw signal.reason;
  };
  const dispatch: NonNullable<ModelRequest["dispatch"]> = (send, transport: PreparedModelTransport) => {
    if (attempted) invalid("a physical dispatch instance cannot send twice");
    attempted = true;
    guard();
    const actualTarget = transport?.target;
    if (actualTarget) {
      const { sample_id: transportSample, ...transportRoute } = actualTarget;
      if (transportSample !== chunk.sample_id || creationDigest(transportRoute) !== creationDigest(target)) return invalid("the trusted transport route differs from the authorized target");
    }
    const media = transport.media_binding;
    if (!media || media.sample_id !== chunk.sample_id || media.mime_type !== "audio/wav" || media.content_digest !== chunk.sample_content_digest || media.byte_length !== chunk.sample_byte_length) return invalid("the adapter's actual audio input differs from the verified chunk");
    if (!transport.provider_binding || creationDigest(transport.provider_binding) !== creationDigest(providerBinding) || !transport.gateway_input_hashes?.includes(expectedInputHash)) return invalid("the gateway input or physical provider differs from its authorized identity");
    const call: CreationAudioStreamCallV1 = { schema_version: 1, call_id: options.callId, root_digest: selection.root_digest, chunk_index: chunk.index, chunk_digest: creationDigest(chunk), sample_id: chunk.sample_id, attempt: options.attempt,
      target: target as CreationAudioStreamCallV1["target"], wire_digest: transport.wire_digest, input_bytes: transport.input_bytes, dispatch_committed_at: new Date((options.now ?? Date.now)()).toISOString() };
    reserved = call;
    reserveCreationAudioStreamCall(session, projectId, selection, call, { deployment, assertCurrent, explicitRetry: options.explicitRetry });
    acknowledged = true;
    try { guard(); }
    catch (cause) {
      // No send closure has been entered, so this cancellation is known to be
      // unsent. The ledger owner still records it after user revocation.
      try {
        settleCreationAudioStreamCall(session, projectId, call.call_id, { schema_version: 1, call_id: call.call_id, call_digest: creationDigest(call), root_digest: selection.root_digest, status: "cancelled", usage: null, response_ref: null, reason_code: "PRE_SEND_GUARD_FAILED", completed_at: new Date((options.now ?? Date.now)()).toISOString() }, undefined, { assertLedgerOwner });
      } catch (ledger) { throw new AggregateError([cause, ledger], "Dispatch was not sent and cancellation accounting failed", { cause }); }
      throw cause;
    }
    // No await separates the final guard and entering send. If that closure
    // throws, delivery is unknown; the reservation must never be replayed.
    const request = send();
    if (!request || !request.response || typeof request.response.then !== "function") invalid("trusted adapter did not return its physical response promise");
    return request.response;
  };
  // Ensure the selected root identity cannot silently change before this
  // dispatcher is handed to the gateway.
  if (creationDigest(root) !== selection.root_digest) invalid("selected root identity changed");
  // If COMMIT lost its acknowledgement, callers can recover using call_id;
  // false must never be interpreted as proof that no reservation exists.
  const recordUnknown = (audit: ModelFailureAudit) => {
    if (!reserved) return invalid("no physical call was reserved");
    const proof = readTrustedModelFailureAudit(audit, { dispatch, request_id: root.run_id, provider: target.provider, model: target.model, input_hash: expectedInputHash, wire_digest: reserved.wire_digest, input_bytes: reserved.input_bytes, media_binding: mediaBinding, provider_binding: providerBinding });
    if (proof.usage_known !== (proof.token_usage !== undefined)) return invalid("failure audit usage is inconsistent");
    const usage = proof.token_usage ? { input: proof.token_usage.input, output: proof.token_usage.output, total: proof.token_usage.total ?? proof.token_usage.input + proof.token_usage.output } : null;
    return settleCreationAudioStreamCall(session, projectId, reserved.call_id, { schema_version: 1, call_id: reserved.call_id, call_digest: creationDigest(reserved), root_digest: selection.root_digest, status: "unknown", usage, response_ref: null, reason_code: proof.code, completed_at: new Date((options.now ?? Date.now)()).toISOString() }, undefined, { assertLedgerOwner });
  };
  const recordUnpublishedResponse = (audit: ModelAudit) => {
    if (!reserved) return invalid("no physical call was reserved");
    const proof = readTrustedModelSuccessAudit(audit, { dispatch, request_id: root.run_id, provider: target.provider, model: target.model, input_hash: expectedInputHash, wire_digest: reserved.wire_digest, input_bytes: reserved.input_bytes, media_binding: mediaBinding, provider_binding: providerBinding });
    const usage = proof.token_usage ? { input: proof.token_usage.input, output: proof.token_usage.output, total: proof.token_usage.total ?? proof.token_usage.input + proof.token_usage.output } : null;
    return settleCreationAudioStreamCall(session, projectId, reserved.call_id, { schema_version: 1, call_id: reserved.call_id, call_digest: creationDigest(reserved), root_digest: selection.root_digest, status: "unknown", usage, response_ref: null, reason_code: "RESPONSE_NOT_PUBLISHED", completed_at: new Date((options.now ?? Date.now)()).toISOString() }, undefined, { assertLedgerOwner });
  };
  return Object.freeze({ dispatch, reservation: () => reserved ? { call: structuredClone(reserved), acknowledged } : null, recordUnknown, recordUnpublishedResponse });
}
