# Product Intelligence Implementation Work Order Specification

## Purpose

This is the required repository-specific format for future product-intelligence
engineering work. It is not a generic template and it does not itself activate
work. Before coding, a Work Order must be promoted into the governed programme
with an ID, dependencies, `allowed_paths`, capability/acceptance ownership,
required tests, Evidence plan and an active ExecPlan. Only one governed work
package may be active.

## Required header and authority

State the Work Order ID, name, lifecycle (`draft`, `reviewed`, `ready`,
`active`, `blocked`, `completed`), owner and last reviewed date. Link every
normative product, architecture, object and runtime document. State explicitly
that current code/contracts/tests and Evidence outrank the Work Order when they
conflict, and list unresolved conflicts before implementation.

## Required sections

### Goal

One verifiable system outcome, phrased as a bounded contract or user flow. A
schema, folder or interface by itself is not the goal.

### Motivation

The concrete ambiguity, failure mode or user limitation being removed. Explain
why the work is needed now and why its dependency order is valid.

### Inputs

Exact object/schema versions, source documents, current APIs, fixtures,
policies and upstream work-package/Evidence IDs. Distinguish authoritative
inputs from advisory research. No input may be a mutable “latest” reference
without a snapshot/version rule.

### Outputs

Exact new or modified contracts, generated bindings, pure-core APIs, Project
Host use cases, persistence/migrations, diagnostics, tests, docs and Evidence.
For each output state its owner and whether it is authoritative, derived or
generated.

### Dependencies

Work-package IDs and the observable Evidence required from each. Also list
runtime capabilities, external source approvals and architectural decisions.
“The interface exists” is not sufficient dependency evidence.

### Modified paths

An exhaustive `allowed_paths` list narrow enough for review. Separately list
forbidden paths and generated paths that may only be changed by their generator.
Implementation must stop if an essential edit falls outside the list.

### Non-goals

Name tempting adjacent capabilities that remain unimplemented. For product
intelligence, explicitly address direct Timeline mutation, arbitrary model
tools, executable Skill content, external data acquisition, Marketplace,
background learning and automatic publication as applicable.

### Domain and interface contract

List each input/output object with exact schema ID/version, identity and
idempotency rules, owner, lifecycle, validation, persistence and migration.
State how existing persisted versions are read. Link target objects to
`OBJECT_MODEL.md` and do not silently redefine them in the Work Order.

### Runtime sequence

Give the call sequence from Project Host through features/core/ports and back.
For every boundary identify input, output, validation and failure result.
State the point before which Timeline must remain unchanged.

### Failure semantics and security

Enumerate stable diagnostic codes and whether each is retryable, blocked or
requires approval. Include stale inputs, invalid external/model output,
rights/trust, unavailable capability and persistence fault. Required invariant:
every blocked path leaves Timeline, events and authoritative artifacts
unchanged unless the Work Order explicitly defines a separate append-only
diagnostic record.

### Acceptance criteria

Use observable assertions, not implementation activities. Cover success,
failure, persistence/reopen, version conflict, idempotent retry, provenance,
authority boundaries and user approval. State which claim is `specified`,
`tested` or `accepted` and what real-user/media evidence is required.

### Tests

List exact commands and new fixture/test paths. Include schema positive/
negative fixtures, pure-core tests, Project Host integration, storage/reopen,
architecture boundary, deterministic/idempotency checks and fail-closed tests.
Use property tests where versioning, time or ordering has a wide input space.
Synthetic evidence never substitutes for required real-media or human review.

### Evidence and completion

Name the intended `EVD-*` record, fingerprint scope, retained artifacts and
human-review gate. Completion requires the governed package command sequence:
create Evidence, reconcile capability/acceptance matrices, run
`pnpm docs:complete -- <WP-ID> <EVIDENCE-ID>`, `pnpm docs:sync` and
`pnpm docs:check`. A blocked package gets Evidence plus active Debt; it is not
marked complete.

### Rollback, retry and migration

Describe additive migration, backup/reopen behavior, retry identity, cleanup of
unpublished derived artifacts and how to return to the last committed project
state. No Work Order may rely on destructive migration or silent schema rewrite.

### Open questions and decision gates

List only decisions that materially change product, security, public API,
dependency/cost, legal source use or persistence. Assign an owner and evidence
needed. Reversible implementation detail belongs in the ExecPlan, not here.

## Definition-of-ready checklist

- Goal and non-goals form one bounded vertical slice.
- Object/runtime contracts are versioned and compatible with current v1 data.
- Project Host/SQLite, Contracts, RationalTime, Timeline and RenderGraph
  invariants are explicit.
- Allowed paths, dependencies, diagnostics, tests and Evidence are concrete.
- Human approval and real-media requirements are identified before coding.
- No unresolved question would cause a materially different implementation.

## Definition-of-done checklist

- All outputs exist inside allowed paths and generated files match sources.
- Success and blocked paths pass; blocked execution proves zero Timeline
  mutation and correct persisted provenance/diagnostics.
- Reopen, version conflict and idempotent retry are exercised.
- Actual Evidence records executed commands and retained artifacts.
- Documentation and matrices describe the achieved narrow boundary without
  promoting adjacent capability.
- Independent review has no unresolved blocking finding.

## Worked scope example: Creative Skill schema

`WO-INT-001` must at minimum name additive schemas such as a Creative Skill
definition and Skill Evaluation under `contracts/schemas/editorial/`, generated
bindings through the existing contract toolchain, pure validation under
`packages/core/editorial-core/`, a Project Host registration/evaluation use
case, storage only if the governed design chooses project persistence, and
positive/negative/version/migration tests. It must forbid Timeline Commands,
execution code and model calls inside a Skill definition. Acceptance proves
immutable version pins, evidence/conflict validation and fail-closed output; it
does not claim that a Story Planner or editor exists.
