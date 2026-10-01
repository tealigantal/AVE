import { CREATION_PLANNING_QUERY_IDENTITY, assertCreationPlanningRoundIdentity } from "../../contract-runtime/src/public.js";
import type { CompletedPlanningMeasurement, PlanningRound, PlanningPending } from "../../contract-runtime/src/public.js";
import { CreationError } from "../../contract-runtime/src/public.js";
import { CREATION_PLANNING_PROTOCOL, CREATION_PLANNING_PROJECTION_VERSION, assertCreationPlanningExchangeV3, deriveCreationPlanningInput, resolveCreationPlanningFinal, measureCreationSelection, creationDigest } from "../../contract-runtime/src/public.js";
import { ModelGatewayError, runModel, type ModelProvider, type ModelRequest, type ProviderResponse, type PreparedModelTransport, type ProviderOutputDiagnostic, type TokenUsage } from "./public.js";

/** One fixed root authorization; rounds are read-only planning, never final retries. */
export function createCreationPlanningProvider(provider: Exclude<ModelProvider, Function>, assertFresh: () => Promise<void>) {
  return { transport_observable: true as const, manages_call_audit: true as const, deployment: provider.deployment,
    async complete(parent: ModelRequest): Promise<ProviderResponse> {
      if (!parent.dispatch || !parent.on_call_audit || parent.input.media.length || (parent.input.context as any)?.planning_projection_version !== CREATION_PLANNING_PROJECTION_VERSION || (parent.input.context as any)?.planning_query_identity !== CREATION_PLANNING_QUERY_IDENTITY || creationDigest((parent.input.context as any)?.planning) !== creationDigest(CREATION_PLANNING_PROTOCOL)) throw new ModelGatewayError("MODEL_INPUT_INVALID", "planning requires its fixed root protocol and durable dispatch/audit");
      const root = structuredClone(parent.input), rounds: PlanningRound[] = [], exchanges: CompletedPlanningMeasurement[] = [];
      let sent = 0, pending: PlanningPending | null = null;
      const fresh = async () => { if (parent.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "planning cancelled before the next boundary", { cause: parent.signal.reason }); await assertFresh(); if (parent.signal?.aborted) throw new ModelGatewayError("MODEL_CANCELLED", "planning cancelled after freshness check", { cause: parent.signal.reason }); };
      try {
        for (let index = 0; index < CREATION_PLANNING_PROTOCOL.max_physical_calls; index += 1) {
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
              if (index >= 2) throw new CreationError("CREATION_PLANNING_BUDGET_EXCEEDED", "at most two measurement queries are permitted before final");
              if (exchanges.some(item => item.exchange.query_id === value.query_id)) throw new CreationError("CREATION_PLANNING_QUERY_REUSED", "measurement query ID was already used");
              measureCreationSelection(value, root.context);
            }
          }, dispatch: (send, actual) => {
            if (transport || sent >= CREATION_PLANNING_PROTOCOL.max_physical_calls) throw new ModelGatewayError("MODEL_DISPATCH_DENIED", "planning physical-send ceiling exceeded");
            transport = structuredClone(actual); pending!.transport = transport; sent += 1;
            return parent.dispatch!(() => { parent.on_send?.(); return send(); }, actual);
          } }, provider, Date.now(), { policy: { allowed_sensitive_providers: [parent.provider], retry: { max_attempts: 1 } }, audit: provider.manages_call_audit ? undefined : parent.on_call_audit });
          if (!transport || !raw || result.input_hash !== creationDigest(input)) throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "planning round lacks physical input/output evidence");
          const exchange = result.output; assertCreationPlanningExchangeV3(exchange);
          const round = { model_snapshot: result.audit.model_snapshot, ...(result.audit.reasoning_observation ? { reasoning_observation: result.audit.reasoning_observation } : {}), input, input_hash: result.input_hash, transport, provider_output: raw, exchange, output_hash: result.output_hash, ...(usage ? { token_usage: usage } : {}) };
          rounds.push(round); pending = null;
          await fresh();
          if (exchange.kind === "final") {
            const known = rounds.every(item => item.token_usage !== undefined);
            const total = known ? rounds.reduce((sum, item) => ({ input: sum.input + item.token_usage!.input, output: sum.output + item.token_usage!.output }), { input: 0, output: 0 }) : undefined;
            return { output: resolveCreationPlanningFinal(exchange, root, exchanges), ...(result.audit.reasoning_observation ? { reasoning_observation: result.audit.reasoning_observation } : {}), model_snapshot: provider.deployment?.digest, ...(total ? { token_usage: { ...total, total: total.input + total.output } } : {}), planning: { protocol: "planning-exchange-v3", root_input_digest: creationDigest(root), rounds } };
          }
          // Query validation is pure above; computation/return are separately fresh.
          const measurement = measureCreationSelection(exchange, root.context);
          Object.assign(round, { measurement });
          await fresh();
          exchanges.push({ exchange, measurement });
        }
        throw new ModelGatewayError("MODEL_OUTPUT_INVALID", "planning exhausted its bounded exchanges without a final decision");
      } catch (cause) {
        const error = cause instanceof ModelGatewayError ? cause : new ModelGatewayError(cause instanceof CreationError && cause.code === "CREATION_PLANNING_BUDGET_EXCEEDED" ? "MODEL_OUTPUT_INVALID" : "MODEL_PROVIDER_FAILED", cause instanceof Error ? cause.message : "planning boundary failed", { cause });
        error.planning_diagnostic = { protocol: "planning-exchange-v3", root_input_digest: creationDigest(root), root_input: root, rounds, pending };
        throw error;
      }
    } };
}
