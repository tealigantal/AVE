# EVD-20260909-DOC-004-CURRENTNESS-AUDIT

## Scope and authority

Independent documentation-only DOC-004 Evidence, linked from its
[ExecPlan](../../plans/2026-09-09-document-currentness-audit.md). This new dated
record covers the user-requested repository-wide currentness audit, which no
prior immutable Evidence could record. It is not attached to or used to complete
REAL-001 and does not promote capabilities or direct human acceptance.

## Findings and correction

Inventoried 745 documentation/metadata files, including 477 historical archive,
Evidence and decision records. Audited current entry/authority routes, generated
state, programme metadata, version references, active/completed plans and the
backend supported-subset claims, with independent read-only review.

Corrected the backend's current v5/r15 identity and its overbroad audio,
transform-automation and tracked-mask blockers. Replaced stale missing-input
and current-version statements in the active plan. Marked completed repair
plans as historical records and centralized the historical version-selection
boundary in the authority map without rewriting completed package requirements.

Restored 2286 retagged historical applicability entries from HEAD, preserving
all 2402 existing bindings exactly and retaining the two genuinely new entries.
Current regression uses new REAL-003 Evidence, not relabeled historical proof.
Both programme latest-validation pointers now identify that executed current
cross-programme regression; package/capability acceptance states are unchanged.

## Executed validation

- pnpm docs:sync: passed.
- pnpm docs:check: passed after the scope-preserving historical classification.
- pnpm docs:architecture:test: passed structure and zero-write transition checks.
- pnpm docs:fingerprint:test: passed source, scope and interface-drift checks.
- git diff --check: passed.
- Current authority scan: no old adapter/Worker identity outside expressly
  historical records; independent review findings corrected.

An initial concurrent docs:check hit the shared publication lock; its sequential
rerun passed. No lock bypass or tooling change was made. Documentation-only
changes retain source fingerprint
fa7e8f9e98edb7b9c1a55ced7b532b62f79e01d78deaff0eba6b7a083471f121,
which already passed full check, final synthetic and real Product r16 in
EVD-20260909-WP-CA-REAL-003-COMPLETE.

## Boundary and remote checkpoint

Historical files remain historical rather than being deleted or rewritten as
current requirements. REAL-001 remains active with fresh Pipeline reconciliation
and direct human Preview/Master inspection outstanding. The user authorized
committing and pushing this worktree to its current feature branch without a
PR; Git verifies the actual resulting commit and remote ref after this record.
No release, merge, deployment or human Stage Exit is claimed.
