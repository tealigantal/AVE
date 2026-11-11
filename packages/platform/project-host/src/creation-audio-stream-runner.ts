import { createHash } from "node:crypto";
import { creationDigest } from "../../contract-runtime/src/public.js";
import { createSplitModelProvider } from "../../model-gateway/src/public.js";
import { type ModelAudit, type ModelFailureAudit, type ModelInput, type ModelRequest } from "../../model-gateway/src/public.js";
import { assertCurrentCreationAudioStreamSelection, recoverCreationAudioStreamCallIfPresent, settleCreationAudioStreamCall, type CreationAudioStreamSelection } from "../../project-storage/src/public.js";
import { createCreationAudioStreamDispatch } from "./creation-audio-stream-dispatch.js";

type Provider = ReturnType<typeof createSplitModelProvider>;
type DispatchOptions = Parameters<typeof createCreationAudioStreamDispatch>[0];
type Sample = Parameters<Provider["prepareAudioRole"]>[2];
type Role = "transcription" | "sound";
type Options = Readonly<{
  session: DispatchOptions["session"]; projectId: string; selection: CreationAudioStreamSelection;
  provider: Provider; media: ModelInput["media"][number]; sample: Sample;
  assertCurrent: DispatchOptions["assertCurrent"]; assertSample: DispatchOptions["assertSample"]; assertLedgerOwner: () => void;
  signal?: AbortSignal; now?: () => number; onResourceWait?: (waiting: boolean) => void;
}>;
const fail = (message: string): never => { throw new Error(`CREATION_AUDIO_RUNNER_INVALID: ${message}`); };
const callId = (root: string, index: number, role: Role) => `audio_${createHash("sha256").update(JSON.stringify(["audio-stream-call-v1", root, index, role, 1])).digest("hex")}`;

/** Executes one verified chunk without retaining or reconstructing another one.
 * Only a complete, currently authorized response is published; unresolved
 * sends, cancelled calls and explicit-retry outcomes stop rather than resend. */
export async function runCreationAudioStreamChunk(options: Options) {
  const { session, projectId, selection, provider, assertCurrent, assertSample, assertLedgerOwner, signal } = options;
  const root = assertCurrentCreationAudioStreamSelection(session, projectId, selection, assertCurrent), chunk = selection.chunk;
  const sample = structuredClone(options.sample), media = structuredClone(options.media), rate = root.chunk_policy.sample_rate;
  const exact = (time: Sample["actual_start"], value: number) => time?.schema_version === 1 && Number.isSafeInteger(time.value) && Number.isSafeInteger(time.timescale) && time.timescale > 0 && BigInt(time.value) * BigInt(rate) === BigInt(value) * BigInt(time.timescale);
  if (sample.sample_id !== chunk.sample_id || sample.sample_rate !== rate || !exact(sample.actual_start, chunk.input_start_sample) || !exact(sample.actual_end, chunk.input_end_sample)) fail("sample metadata differs from verified chunk input grid");
  if (creationDigest(provider.deployment) !== root.deployment_digest) fail("split deployment differs from the authorized root");
  const output: Array<Readonly<{ role: Role; call_id: string; response_ref: Readonly<{ object_ref_id: string; digest: string }>; response: unknown }>> = [];
  for (const role of ["transcription", "sound"] as const) {
    if (signal?.aborted) throw signal.reason;
    const prepared = provider.prepareAudioRole(role, media, sample), id = callId(selection.root_digest, chunk.index, role);
    const validateResponse = (actualRole: Role, value: unknown) => { if (role !== actualRole) fail("stored response role differs"); prepared.validate(value); };
    const recover = () => recoverCreationAudioStreamCallIfPresent(session, projectId, selection, id, { deployment: provider.deployment, assertCurrent, validateResponse });
    const prior = await recover();
    if (prior) {
      if (prior.action !== "reuse-verified-response" || !prior.response) throw new Error(`CREATION_AUDIO_RUNNER_${prior.action.toUpperCase().replaceAll("-", "_")}`);
      output.push({ role, call_id: id, response_ref: prior.response.ref, response: prior.response.value }); continue;
    }
    const dispatcher = createCreationAudioStreamDispatch({ session, projectId, selection, deployment: provider.deployment, target: prepared.target, input: prepared.input, callId: id, attempt: 1, assertCurrent, assertSample, assertLedgerOwner, signal, now: options.now });
    let audit: ModelAudit | ModelFailureAudit | undefined;
    const request: ModelRequest = { request_id: root.run_id, project_id: projectId, provider: "ave-split", model: "creation-v1", prompt_version: "creation-observation-v1", privacy_class: "sensitive", audio_stream_identity: true, input: prepared.input, dispatch: dispatcher.dispatch, signal, on_resource_wait: options.onResourceWait, on_call_audit: value => { audit = value; } };
    try {
      const result = await provider.runAudioRole(request, role, media, sample), reserved = dispatcher.reservation();
      if (!reserved || !reserved.acknowledged) throw new Error("CREATION_AUDIO_RUNNER_INVALID: no acknowledged durable reservation");
      if (result.input_hash !== creationDigest(prepared.input) || result.output_hash !== creationDigest(result.output)) fail("model result differs from durable reservation");
      const response_ref = { object_ref_id: `${projectId}:audio-stream-response:${id}`, digest: result.output_hash };
      const usage = result.token_usage ? { input: result.token_usage.input, output: result.token_usage.output, total: result.token_usage.total ?? result.token_usage.input + result.token_usage.output } : null;
      settleCreationAudioStreamCall(session, projectId, id, { schema_version: 1, call_id: id, call_digest: creationDigest(reserved.call), root_digest: selection.root_digest, status: "response", usage, response_ref, reason_code: null, completed_at: new Date((options.now ?? Date.now)()).toISOString() }, result.output, { assertLedgerOwner, selection, deployment: provider.deployment, assertCurrent, validateResponse });
      output.push({ role, call_id: id, response_ref, response: result.output });
    } catch (cause) {
      // A commit may have succeeded even when its acknowledgement was lost.
      try {
        const saved = await recover();
        if (saved?.action === "reuse-verified-response" && saved.response) { output.push({ role, call_id: id, response_ref: saved.response.ref, response: saved.response.value }); continue; }
      } catch { /* Current authority may have been revoked; never disclose a response. */ }
      if (dispatcher.reservation() && audit) {
        try { if ("code" in audit) dispatcher.recordUnknown(audit); else dispatcher.recordUnpublishedResponse(audit); }
        catch (ledger) { throw new AggregateError([cause, ledger], "audio role and conservative ledger settlement failed", { cause }); }
      }
      throw cause;
    }
  }
  return output;
}
