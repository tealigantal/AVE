# ADR-0029: Stage3 model accounting and explicit capabilities

Status: accepted for the active first-loop implementation; real verification pending.
Date: 2026-09-24

## Context
The user explicitly removed product ceilings for sent data, call totals and costs,
and requested broad model support, primarily open models. ADR-0028 remains historical;
its mandatory budget reservation is superseded by this decision only. The existing
Stage3 implementation incorrectly couples media capability to a certified token counter.

## Considered Options
Keep mandatory quotas; pretend an enormous quota is unlimited; or remove quotas while
retaining exact authorization, durable dispatch audit and model capability checks.

## Decision
Use the third option. The single current request contract has no budget. Calls retain
immutable request/run/revision/profile, exact serialized wire digest and bytes, dispatch
and settlement identity. Usage and monetary receipts are actual observations; unknown
is null, never zero or a fabricated price. Currency travels with a monetary receipt.
Before every external send Host persists its call and rechecks current authority;
storage failure, cancellation, expired consent or stale input causes zero send/commit.

OpenAI-compatible deployments share one protocol adapter with explicit exact model,
endpoint identity, media types, JSON/validated-JSON and JSON/SSE response modes.
No model or parameter fallback follows provider failure. Finite retries and deadlines
are technical lifetime controls, not cumulative user cost or data limits. Provider
context/output restrictions remain explicit errors. Media sampling is an evidence
selection strategy and never proof that unsampled content was understood.

## Rationale
Open-model deployments commonly expose this protocol. Protocol support does not prove
particular models support images, audio or structured output. Removing quota controls
must not remove permission checks, actual dispatch audit, cancellation or schema checks.

## Consequences
Update schema/examples/generated readers, Host, Main, Renderer and tests together.
No current production counter/tariff prerequisite and no quota form survive. Existing
historical Evidence stays unchanged. Real model/media verification remains required.

## Migration
Replace the unreleased Stage3 interface under ADR-0025; do not silently reinterpret old
budget-bearing development projects. Preserve external artifacts and failure records.
The current active WP registers this ADR and Main model configuration before edits.

## Rollback
Revert the coherent interface change with consumers and generated artifacts; preserve
user data and audit records. Do not automatically reopen a different-schema project.
