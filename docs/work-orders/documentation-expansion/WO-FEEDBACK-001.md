# WO-FEEDBACK-001 Scoped feedback revision

Status: promoted to `WP-CA-FEEDBACK-001`; implementation remains untested until
programme Evidence passes. Owner: creative-assistant-v1. Last reviewed:
2026-08-24.

This Work Order is the bounded design handoff. The active programme package,
current code/contracts/tests and executed Evidence outrank it if they conflict.
It exists because the pipeline, reasoning and approval documents define stable
semantics but do not provide an implementation allowlist, test plan or Evidence
gate.

## Goal and motivation

Turn one exact user feedback item about the accepted first cut into a persisted,
evidence-bound diagnosis and one local semantic revision. The user can inspect
the proposed effect, reject it with no Timeline mutation, or approve and receive
a recoverable encoded revision through the existing Host execution path.

## Inputs and dependencies

- Completed `WP-CA-PIPE-001` and `EVD-20260824-WP-CA-PIPE-001-R2-COMPLETE`.
- Exact accepted execution, current Timeline, approved Story/Decision/Evidence/
  Contract/capability refs and authorized Original media.
- `docs/pipeline/FEEDBACK_TO_EDIT_PIPELINE.md`,
  `docs/intelligence/EDITING_REASONING_SYSTEM.md`, and
  `docs/ux/REVIEW_APPROVAL_MODEL.md`.
- Current `EditorialEditIntentV1`, Stage 2 permission v2, Host semantic adapter,
  Foundation Command/Edit IR, render and QC contracts.

Style and Trend packages are not dependencies for this first Stage 2 slice.
No unresolved external dependency or product choice changes the bounded result.

## Outputs and modified paths

The promoted package owns the exhaustive machine-readable paths. Expected
outputs are one strict current Feedback Diagnosis Contract; non-current
identities fail before writes, with generated
bindings, deterministic feedback normalization/validation, exact persisted
diagnosis edges, a new local Editorial Edit Intent linked to the diagnosis, the
minimal currently evidenced compiler route, Host review/approval/execution
orchestration, current-baseline atomic write if typed persistence requires it, focused
property/Host/storage/real-media tests, and immutable Evidence.

Generated contract bindings may only be changed by the existing generator.
Timeline Core, RenderGraph, Worker, Model Gateway, apps and archive are forbidden.

## Domain and runtime contract

Feedback Diagnosis v2 owns identity, immutable feedback text digest, category,
exact accepted execution and base Timeline refs, affected clip/range, evidence
basis, proposed operation, confidence, alternatives, lifecycle and provenance.
It contains no Commands, backend, shell, FFmpeg, RenderGraph or CommitPlan data.

```text
exact user feedback + accepted execution/current Timeline
  -> Project Host validation and bounded diagnosis
  -> persisted inert diagnosis
  -> new command-free Editorial Edit Intent candidate
  -> non-mutating effect preview
  -> reject with zero Timeline mutation
     or exact approval -> existing Host adapter/Edit IR/CommitPlan
  -> Preview/Master/QC -> undo/redo/reopen
```

Identical input retries are read-only. Reusing an identity with different text,
scope, base execution, Timeline, refs or effect fails. Timeline remains unchanged
until the existing atomic semantic execution transaction commits.

## Failure and security semantics

Empty, ambiguous, stale, missing, protected, widened, unsupported, forged,
rebound and storage-fault inputs fail closed. A rejected patch may retain an
append-only rejection decision only when its exact review is authorized; it
never writes Timeline or render success. Caller role, capability, provenance,
approval or path data grants no authority.

## Acceptance, tests and Evidence

Run `pnpm run feedback-revision:test`, the existing intelligence-pipeline and
permission regressions, Contract generation/identity/clean gates,
typecheck, architecture, full `pnpm run check`, docs sync/check and whitespace
validation. Cover success, deterministic preview, explicit rejection, exact
approval, atomic commit, idempotency, conflicts, zero mutation, undo/redo,
reopen and execution-bound Preview/Master/QC.

Completion Evidence is `EVD-<YYYYMMDD>-WP-CA-FEEDBACK-001-*-COMPLETE` and must
bind the current code fingerprint, retained authorized real-media artifacts and
human acceptance. Synthetic feedback smoke tests cannot promote this capability.

## Rollback and non-goals

Schema/database changes are additive. Disabling the new Host use case leaves
the accepted first cut and all earlier immutable records readable. This package
does not implement the conversation workspace, arbitrary feedback categories,
full regeneration, Style/Trend retrieval, cross-project memory, autonomous
agents, delivery, publication or a second project-state authority.
