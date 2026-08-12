# ADR-0015 Persistent Worker and Explicit Job Recovery

## Status

Accepted for WP-FND-001 implementation.

## Context

ADR-0005 established persistent jobs, but the TypeScript Worker facade still created one Python process and handshake per submission and defaulted jobs to idempotent. This made process recovery and automatic replay authority ambiguous.

## Considered Options

- Keep per-job processes and treat database persistence as sufficient.
- Add a persistent client while retaining opt-out idempotency.
- Add a persistent client and require an explicit task policy before automatic recovery.

## Decision

Worker Client owns one process generation with one handshake and routed pending jobs. Crash recovery recreates the process. Job replay is allowed only for tasks declared idempotent by Project Host policy; all other recovering jobs block. The existing Worker job port remains a compatibility facade over the persistent client.

## Rationale

Process lifetime, task idempotency and project-state authority are independent. Explicit policies prevent a transport restart from repeating a stateful side effect.

## Consequences

Project Host must declare job policy, close the client explicitly and surface non-idempotent recovery. Worker protocol stdout stays structured and cancellation must reach child media processes.

## Migration

Existing callers keep `submit()`. The local port lazily creates and reuses the persistent client. Tests cover one handshake, concurrent routing, crash generation and cancellation.

## Rollback

The compatibility facade can be changed back to a per-job process without changing protocol contracts, but automatic recovery must remain explicit.

## Date

2026-08-12
