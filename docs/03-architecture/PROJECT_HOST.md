# Project Host

## Role

Project Host is AVE's sole project-state authority, transaction boundary, and
SQLite writer. This invariant is current and stable, not a future aspiration.

## Responsibilities

- own project sessions, locks, current versions, and recovery;
- validate external/model/Worker data through Contracts and domain rules;
- assemble bounded model and Worker context without granting state authority;
- resolve the current `CommandEditIntent` into `CommandEditIR`, enforce
  preconditions, simulate/validate Commands, and create CommitPlan; a future
  semantic Edit Intent may enter only through a Host-owned adapter;
- simulate and validate before one atomic Timeline commit;
- schedule jobs and verify results, identities, manifests, and QC;
- register immutable evidence, decision, render, and delivery references;
- enforce rights, privacy, trust, version, capability, and approval gates.

## Prohibited delegation

Project Host cannot delegate SQLite writes, Timeline commit, user approval,
source identity validation, or delivery authorization to Renderer, Model
Gateway, Worker, backend, Skill, or adapter.

## Failure contract

A rejected request leaves authoritative state unchanged except for a separately
defined append-only diagnostic or blocker record. Duplicate retries are accepted
only when idempotency identity and content match. Recovery returns the last
complete committed state; a partial artifact cannot become authoritative.

## Boundary references

Package ownership is recorded in
[`ADR-0002`](../decisions/ADR-0002-project-host-package-ownership.md); atomic Edit
IR commit is in [`ADR-0006`](../decisions/ADR-0006-atomic-edit-ir-commit-plan.md);
the unified edit path is in
[`ADR-0016`](../decisions/ADR-0016-unified-edit-and-content-authority.md).
