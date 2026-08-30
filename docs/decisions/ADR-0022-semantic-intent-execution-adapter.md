# ADR-0022 Semantic Intent execution adapter

- Status: Accepted
- Date: 2026-08-24

## Context

Stage 2 stores command-free Editorial Edit Intents. Existing approval retains
one reviewed semantic proposal but deliberately grants no Timeline authority.
The first executable vertical must reuse Project Host, CommandEditIntent,
CommandEditIR, CommitPlan and the existing Preview/Master render path without
letting a model, Skill or client submit commands.

## Considered Options

1. Treat semantic proposal approval as permission to mutate Timeline.
2. Let the caller translate semantic operations into Timeline Commands.
3. Add a Host-owned deterministic adapter and a separate exact execution
   approval over its content-addressed compiled effect.

## Decision

Use option 3. The first adapter version compiles only `select_evidence` into
ordinary `add_clip` commands. It resolves the exact approved Story beat and
Evidence object, chooses one unambiguous enabled video track, uses exact
RationalTime/source identity, and orders clips deterministically. Every other
semantic operation blocks the whole execution; there is no partial or
best-effort fallback.

Project Host exposes a read-only preparation result containing the compiler
identity, base Timeline, exact input refs, affected scope and compiled-effect
digest but no executable commands. A distinct
`editorial_edit_intent.execute` human approval binds that digest. At execution,
Host resolves every authority again, recompiles, checks the prior proposal
approval, consumes the exact execution approval, and commits the Permission
Decision, CommandEditIR, Timeline and execution provenance atomically.

Identical retries return the prior execution record. A reused execution ID or
Intent whose recomputed effect differs fails closed. Preview and Master remain
target-specific plans derived from one committed Timeline semantic identity.

## Rationale

The boundary keeps semantic reasoning non-executable, preserves the existing
Timeline authority chain, and makes human review correspond to the actual
effect rather than an earlier proposal description.

## Consequences

The Stage 2 permission snapshot advances to policy version 2 and snapshot
version 2. Earlier policy Decisions remain immutable but are stale under the
new built-in policy. Only evidence selection is executable in this package;
additional semantic operations require their own executed capability Evidence
and an explicit adapter version change.

## Migration and rollback

The policy update and execution persistence are additive. Rollback disables
the adapter and policy-v2 execution action; existing Timeline, policy-v1
Decisions and proposal artifacts remain readable. No stored semantic Intent is
rewritten.
