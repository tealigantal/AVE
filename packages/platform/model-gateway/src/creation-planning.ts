import { CREATION_PLANNING_QUERY_IDENTITY, assertCreationPlanningRoundIdentity } from "../../contract-runtime/src/public.js";
import type { CompletedPlanningMeasurement, PlanningRound, PlanningPending, PlanningAudioReceipt, PlanningQuery, PlanningResumeSeed } from "../../contract-runtime/src/public.js";
import { CreationError } from "../../contract-runtime/src/public.js";
import { CREATION_PLANNING_PROTOCOL, CREATION_PLANNING_PROJECTION_VERSION, assertCreationPlanningExchangeV3, deriveCreationPlanningInput, resolveCreationPlanningFinal, measureCreationSelection, creationDigest } from "../../contract-runtime/src/public.js";
import { ModelGatewayError, runModel, type ModelProvider, type ModelRequest, type ProviderResponse, type PreparedModelTransport, type ProviderOutputDiagnostic, type TokenUsage, type ModelDeployment } from "./public.js";
import { createHash } from "node:crypto";

/** Supplied only by trusted Host bootstrap; it must preserve the guard's atomic reserve/send boundary. */
export type PlanningResumeDispatch = (transport: PreparedModelTransport, send: () => Promise<Response>) => Promise<Response>;
const planningCallLimit = (root: ModelRequest["input"]) => (root.context as any)?.creative_skills && (root.context as any).creative_skills.projection_version !== "effect-bindings-v3" ? 2 : CREATION_PLANNING_PROTOCOL.max_physical_calls;

function validateTransport(transport: PreparedModelTransport): void {
  if (!transport || typeof transport !== "object" || Array.isArray(transport) || Object.keys(transport).some(key => !["wire_digest", "input_bytes", "target"].includes(key)) || !/^[a-f0-9]{64}$/.test(transport.wire_digest) || !Number.isSafeInteger(transport.input_bytes) || transport.input_bytes < 1) throw new ModelGatewayError("MODEL_INPUT_INVALID", "invalid planning transport identity");
  if (transport.target && (Object.keys(transport.target).sort().join(",") !== "digest,endpoint,model,provider,role" || transport.target.role !== "planner" || ![transport.target.endpoint, transport.target.model, transport.target.provider].every(value => typeof value === "string" && value.length > 0) || !/^[a-f0-9]{64}$/.test(transport.target.digest))) throw new ModelGatewayError("MODEL_INPUT_INVALID", "invalid planning transport target");
}

// Structural verification is defense in depth; it does not grant trust. The
// Host must independently verify persisted call lineage and inject authority.
function verifiedPrefix(root: ModelRequest["input"], seed: PlanningResumeSeed, deployment: ModelDeployment | undefined): { rounds: PlanningRound[]; exchanges: CompletedPlanningMeasurement[] } {
  if (!deployment || !/^[a-f0-9]{64}$/.test(deployment.digest ?? "") || !seed || typeof seed !== "object" || Array.isArray(seed) || Object.keys(seed).sort().join(",") !== "continuation_id,expected_pending,root_input_digest,round_call_refs,rounds" || seed.root_input_digest !== creationDigest(root) || typeof seed.continuation_id !== "string" || !seed.continuation_id.trim() || !Array.isArray(seed.rounds) || !Array.isArray(seed.round_call_refs) || seed.rounds.length < 1 || seed.rounds.length !== seed.round_call_refs.length || seed.rounds.length >= planningCallLimit(root) || (root.context as any)?.audio_library != null) throw new ModelGatewayError("MODEL_INPUT_INVALID", "invalid or unsupported planning continuation seed");
  validateTransport(seed.expected_pending);
  const plannerRoutes = deployment?.routes?.filter(route => route.role === "planner");
  if ((plannerRoutes && (plannerRoutes.length !== 1 || creationDigest(seed.expected_pending.target ?? null) !== creationDigest(plannerRoutes[0]))) || (!plannerRoutes && seed.expected_pending.target !== undefined)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "continuation target differs from configured deployment");
  const seen = new Set<string>(), exchanges: CompletedPlanningMeasurement[] = [], rounds: PlanningRound[] = [];
  for (const [index, round] of seed.rounds.entries()) {
    const ref = seed.round_call_refs[index];
    if (!ref || Object.keys(ref).sort().join(",") !== "call_id,run_id" || typeof ref.run_id !== "string" || !ref.run_id.trim() || ref.run_id !== seed.round_call_refs[0]?.run_id || typeof ref.call_id !== "string" || !ref.call_id.trim() || seen.has(ref.call_id)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "invalid or repeated continuation call identity");
    seen.add(ref.call_id);
    if (!round || typeof round.model_snapshot !== "string" || !round.model_snapshot || (round.transport?.target !== undefined && (deployment === undefined || round.model_snapshot !== deployment.digest)) || round.audio_receipts !== undefined || !round.provider_output || !["provider-text", "canonical-json"].includes(round.provider_output.representation) || typeof round.provider_output.payload !== "string" || Buffer.byteLength(round.provider_output.payload) !== round.provider_output.utf8_bytes || createHash("sha256").update(round.provider_output.payload).digest("hex") !== round.provider_output.sha256 || round.exchange?.kind !== "measure_selection") throw new ModelGatewayError("MODEL_INPUT_INVALID", "invalid completed planning measurement");
    validateTransport(round.transport);
    if ((plannerRoutes && creationDigest(round.transport.target ?? null) !== creationDigest(plannerRoutes[0])) || (!plannerRoutes && round.transport.target !== undefined)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "completed planning target differs from configured deployment");
    const derived = deriveCreationPlanningInput(root, exchanges);
    if (creationDigest(derived) !== round.input_hash || creationDigest(derived) !== creationDigest(round.input) || creationDigest(round.exchange) !== round.output_hash) throw new ModelGatewayError("MODEL_INPUT_INVALID", "completed planning measurement identity changed");
    let parsed: unknown; try { parsed = JSON.parse(round.provider_output.payload); } catch (cause) { throw new ModelGatewayError("MODEL_INPUT_INVALID", "completed planning response is not JSON", { cause }); }
    if (creationDigest(parsed) !== creationDigest(round.exchange)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "completed planning response differs from exchange");
    assertCreationPlanningExchangeV3(round.exchange); assertCreationPlanningRoundIdentity(derived, round.exchange);
    if (exchanges.some(item => item.exchange.query_id === round.exchange.query_id)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "completed planning query was repeated");
    const measurement = measureCreationSelection(round.exchange, root.context);
    if (round.measurement === undefined || creationDigest(measurement) !== creationDigest(round.measurement)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "completed planning measurement changed");
    if (round.token_usage && (![round.token_usage.input, round.token_usage.output, ...(round.token_usage.total === undefined ? [] : [round.token_usage.total])].every(value => Number.isSafeInteger(value) && value >= 0) || (round.token_usage.total !== undefined && round.token_usage.total !== round.token_usage.input + round.token_usage.output))) throw new ModelGatewayError("MODEL_INPUT_INVALID", "invalid completed planning usage");
    rounds.push(structuredClone(round)); exchanges.push({ exchange: structuredClone(round.exchange), measurement: structuredClone(measurement) });
  }
  return { rounds, exchanges };
}

/** One fixed root authorization; rounds are read-only planning, never final retries. */
export function createCreationPlanningProvider(provider: Exclude<ModelProvider, Function>, assertFresh: () => Promise<void>, resolveSelectedAudio?: (root:ModelRequest["input"], query:PlanningQuery, signal:AbortSignal|undefined) => Promise<readonly PlanningAudioReceipt[]>, resumeSeed?: PlanningResumeSeed, resumeDispatch?: PlanningResumeDispatch) {
  const suppliedSeed = resumeSeed === undefined ? undefined : structuredClone(resumeSeed);
  return { transport_observable: true as const, manages_call_audit: true as const, deployment: provider.deployment,
    async complete(parent: ModelRequest): Promise<ProviderResponse> {
      if (!parent.dispatch || !parent.on_call_audit || parent.input.media.length || (parent.input.context as any)?.planning_projection_version !== CREATION_PLANNING_PROJECTION_VERSION || (parent.input.context as any)?.planning_query_identity !== CREATION_PLANNING_QUERY_IDENTITY || creationDigest((parent.input.context as any)?.planning) !== creationDigest(CREATION_PLANNING_PROTOCOL)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "planning requires its fixed root protocol and durable dispatch/audit");
      const root = structuredClone(parent.input), seed = suppliedSeed === undefined ? undefined : structuredClone(suppliedSeed);
      if ((seed !== undefined && typeof resumeDispatch !== "function") || (seed === undefined && resumeDispatch !== undefined)) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "planning continuation requires a Host-owned dispatch authority");
      let rounds: PlanningRound[] = [], exchanges: CompletedPlanningMeasurement[] = [];
      let sent = 0, pending: PlanningPending | null = null;
      const fresh = async () => { if (parent.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "planning cancelled before the next boundary", { cause: parent.signal.reason }); await assertFresh(); if (parent.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "planning cancelled after freshness check", { cause: parent.signal.reason }); };
      try {
        if (seed) {
          await fresh();
          try { ({ rounds, exchanges } = verifiedPrefix(root, seed, provider.deployment)); }
          catch (cause) { if (cause instanceof ModelGatewayError) throw cause; throw new ModelGatewayError("MODEL_INPUT_INVALID", "planning continuation evidence failed validation", { cause }); }
          sent = rounds.length;
        }
        for (let index = rounds.length; index < planningCallLimit(root); index += 1) {
          await fresh();
          const input = deriveCreationPlanningInput(root, exchanges);
          let transport: PreparedModelTransport | undefined, raw: ProviderOutputDiagnostic | undefined, usage: TokenUsage | undefined;
          pending = { round: index + 1, input, input_hash: creationDigest(input) };
          const result = await runModel({ ...parent, input, on_send: parent.on_send, on_provider_response: (value, tokens) => {
            // A routed provider first reports its actual text and then its parsed envelope.
            // Retain the first exact boundary, never replace it with JSON reserialization.
            if (!raw) { raw = value; usage = tokens; pending!.provider_output = value; if (tokens) pending!.token_usage = tokens; }
          }, output_validator: value => {
            assertCreationPlanningExchangeV3(value);
            assertCreationPlanningRoundIdentity(input,value);
            if (value.kind === "final") parent.output_validator?.(resolveCreationPlanningFinal(value, root, exchanges));
            else {
              if (index >= planningCallLimit(root) - 1) throw new CreationError("CREATION_PLANNING_BUDGET_EXCEEDED", "at most two measurement queries are permitted before final");
              if (exchanges.some(item => item.exchange.query_id === value.query_id)) throw new CreationError("CREATION_PLANNING_QUERY_REUSED", "measurement query ID was already used");
              measureCreationSelection(value, root.context);
            }
          }, dispatch: (send, actual) => {
            if (transport || sent >= planningCallLimit(root)) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "planning physical-send ceiling exceeded");
            const fixed = structuredClone(actual); validateTransport(fixed);
            if (seed && index === seed.rounds.length && creationDigest(fixed) !== creationDigest(seed.expected_pending)) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "continuation transport differs from saved pending identity");
            if (fixed.target) Object.freeze(fixed.target);
            Object.freeze(fixed);
            transport = fixed; pending!.transport = fixed; sent += 1;
            let hostInvoked = false, hostDuplicate = false, authorizedResponse: Promise<Response> | undefined;
            let hostResult: Promise<Response>;
            try { hostResult = parent.dispatch!(() => {
              if (seed && hostInvoked) { hostDuplicate = true; throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "Host attempted duplicate continuation dispatch"); }
              hostInvoked = true;
              parent.on_send?.();
              if (!seed) return send();
              let invoked = false, duplicate = false, dispatched: Promise<Response> | undefined;
              const sendOnce = () => {
                if (invoked) { duplicate = true; throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "continuation attempted duplicate transport"); }
                invoked = true;
                dispatched = send().response; return dispatched;
              };
              authorizedResponse = (async () => {
                try {
                  const response = await resumeDispatch!(structuredClone(fixed), sendOnce);
                  if (dispatched === undefined) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "continuation authority did not dispatch");
                  const actualResponse = await dispatched;
                  if (duplicate || response !== actualResponse) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "continuation authority did not return the exact transport response");
                  return actualResponse;
                } catch (cause) {
                  // A broken authority may throw after invoking transport. Wait
                  // for that response and close it; never leave an unseen send
                  // running or mask its failure with a cleanup exception.
                  if (dispatched !== undefined) {
                    try { const response = await dispatched; await response.body?.cancel(); }
                    catch (cleanup) { if (cleanup !== cause) throw new AggregateError([cause, cleanup], "continuation dispatch and cleanup failed", { cause }); }
                  }
                  throw cause;
                }
              })();
              return { response: authorizedResponse };
            }, fixed); }
            catch (cause) {
              if (!seed || authorizedResponse === undefined) throw cause;
              return (async () => {
                try { const response = await authorizedResponse; await response.body?.cancel(); }
                catch (cleanup) { if (cleanup !== cause) throw new AggregateError([cause, cleanup], "Host dispatch and cleanup failed", { cause }); }
                throw cause;
              })();
            }
            if (!seed) return hostResult;
            return (async () => {
              try {
                const response = await hostResult;
                if (!hostInvoked || authorizedResponse === undefined) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "Host did not invoke continuation authority");
                const original = await authorizedResponse;
                if (hostDuplicate || response !== original) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "Host did not return the authorized transport response");
                return original;
              } catch (cause) {
                if (authorizedResponse !== undefined) {
                  try { const response = await authorizedResponse; await response.body?.cancel(); }
                  catch (cleanup) { if (cleanup !== cause) throw new AggregateError([cause, cleanup], "Host dispatch and cleanup failed", { cause }); }
                }
                throw cause;
              }
            })();
          } }, provider, Date.now(), { policy: { allowed_sensitive_providers: [parent.provider], retry: { max_attempts: 1 } }, audit: provider.manages_call_audit ? undefined : parent.on_call_audit });
          if (!transport || !raw || result.input_hash !== creationDigest(input)) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "planning round lacks physical input/output evidence");
          const exchange = result.output; assertCreationPlanningExchangeV3(exchange);
          const round = { model_snapshot: result.audit.model_snapshot, ...(result.audit.reasoning_observation ? { reasoning_observation: result.audit.reasoning_observation } : {}), input, input_hash: result.input_hash, transport, provider_output: raw, exchange, output_hash: result.output_hash, ...(usage ? { token_usage: usage } : {}) };
          rounds.push(round); pending = null;
          await fresh();
          if (exchange.kind === "final") {
            const known = rounds.every(item => item.token_usage !== undefined);
            const total = known ? rounds.reduce((sum, item) => ({ input: sum.input + item.token_usage!.input, output: sum.output + item.token_usage!.output }), { input: 0, output: 0 }) : undefined;
            return { output: resolveCreationPlanningFinal(exchange, root, exchanges), ...(result.audit.reasoning_observation ? { reasoning_observation: result.audit.reasoning_observation } : {}), model_snapshot: provider.deployment?.digest, ...(total ? { token_usage: { ...total, total: total.input + total.output } } : {}), planning: { protocol: "planning-exchange-v3", root_input_digest: creationDigest(root), rounds, ...(seed ? { continuation: { continuation_id: seed.continuation_id, prior_round_call_refs: structuredClone(seed.round_call_refs) } } : {}) } };
          }
          // Query validation is pure above; computation/return are separately fresh.
          const measurement = measureCreationSelection(exchange, root.context);
          Object.assign(round, { measurement });
          await fresh();
          const audioReceipts=(root.context as any).audio_library ? await resolveSelectedAudio?.(root,exchange,parent.signal) : undefined;
          if((root.context as any).audio_library && !audioReceipts)throw new CreationError("AUDIO_MEASUREMENT_REQUIRED","Host resource resolver is required");
          await fresh();
          if(audioReceipts)Object.assign(round,{audio_receipts:audioReceipts});
          exchanges.push({ exchange, measurement, ...(audioReceipts ? {audio_receipts:audioReceipts}: {}) });
        }
        throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "planning exhausted its bounded exchanges without a final decision");
      } catch (cause) {
        const error = cause instanceof ModelGatewayError ? cause : new ModelGatewayError(cause instanceof CreationError && cause.code === "CREATION_PLANNING_BUDGET_EXCEEDED" ? "MODEL_OUTPUT_INVALID" : "MODEL_PROVIDER_FAILED", cause instanceof Error ? cause.message : "planning boundary failed", { cause });
        error.planning_diagnostic = { protocol: "planning-exchange-v3", root_input_digest: creationDigest(root), root_input: root, rounds, pending };
        throw error;
      }
    } };
}
