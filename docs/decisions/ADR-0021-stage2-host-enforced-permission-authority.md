# ADR-0021 Stage 2 Host-enforced permission authority

- Status: Accepted
- Date: 2026-08-24

## Context

Stage 2 introduces project-local creative objects and human review, but a
standalone `authorize` call would only create an audit ledger: callers could
skip it and invoke the real Host use case directly. Caller-provided actor IDs,
roles or approval payloads also cannot establish a trusted identity root.

## Considered Options

1. Keep an optional authorization endpoint and require clients to call it.
2. Trust actor, role and approval fields supplied with each business request.
3. Put one deterministic gate inside every Stage 2 Host use case and derive
   human authority from a Host-owned authenticated-channel capability.

## Decision

Use option 3. The closed permission policy covers Evidence, Creative Contract
and Context, Skill, Duration, Direction, Story, Decision and semantic Edit
Intent operations. Project Host derives autonomous actor identity internally.
At construction, the trusted composition root may bind an opaque object
credential to a human reviewer identity. Only possession of that exact object
can ask Host to persist an approval record; business calls receive only its
ID and cannot select an actor.

Every approval binds the current built-in policy snapshot ref, exact subject
and context refs, canonical full-effect digest, requested fields, affected
scope, review digest and Host-owned approval/expiry times. Asset permission
effects include asset, location identity, authorize/deny outcome and policy.
Direction and Story effects include the complete candidate set and selection.
Intent approval includes Contract, approved Plan, Decisions, capability
snapshot, operation targets and expected effects. Host compares expiry against
its current clock, not caller timestamps.

The gate is embedded after read-only business preflight and before the
authoritative write. A denied or rebound request writes no object, artifact,
edge, event, Timeline, job, model run or object-store file. Permission Decision
retention occurs only after the business mutation succeeds, so a later
business conflict does not leave a misleading success Decision. Queries use
the same matrix without persisting read-side Decisions. Permission persistence
revalidates schema shape, policy row, actor/classification, refs, data fields,
effect/fingerprint consistency and performs conflict preflight before object
files are written.

## Rationale

The business use case, rather than cooperative client ordering, becomes the
security boundary. Opaque credential identity cannot be recreated by matching
a public string, and a stored approval cannot be rebound to another policy,
effect, location, candidate set or scope.

## Consequences

Stage 2 human operations require an authenticated integration layer to retain
the configured channel credential and explicitly create an approval record.
Existing tests and future UI adapters must no longer send actor or role fields.
Semantic approval remains proposal-only and grants no Timeline or execution
authority.

SQLite and object-store commits are still separate durability mechanisms.
Permission storage therefore rejects conflicts before object writes and
removes newly created unreferenced objects on rollback; full-table and
object-file snapshots cover rejection paths.

## Migration and rollback

Migration 0025 adds policy snapshots, human approval records, Permission
Decisions and exact target edges. Existing projects and Timeline data are not
rewritten. Rollback disables the Stage 2 Host use cases and leaves the additive
tables and immutable objects unread by older code.
