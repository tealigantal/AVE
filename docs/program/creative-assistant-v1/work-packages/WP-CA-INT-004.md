# WP-CA-INT-004 Permission matrix and malicious-input denial

## Goal

Turn the documented Stage 2 actor/action boundary into one deterministic,
Host-enforced permission matrix for the implemented Creative Context, Skill,
Duration, Direction, Story, Decision and semantic Intent operations.

## Authority and compatibility

The canonical policy is
`docs/product-intelligence/AI_AGENT_PERMISSION_MODEL.md`, together with the
Creative Intelligence Runtime and Review/Approval model. Project Host remains
the sole state authority. This package may add typed policy decisions and pure
validation, but it may not execute semantic Intent, add Timeline Commands,
change Edit IR/RenderGraph, call a model, or broaden media/filesystem/network
access.

The matrix must bind actor kind, requested action, exact subject/context refs,
approval requirement, allowed data fields, affected scope and failure result.
Host derives authoritative project state and policy; caller-supplied role,
capability, approval or provenance never grants authority.

## Acceptance

`ACC-CA-INT-004-PERMISSION` proves every currently implemented Stage 2 action
is classified as allowed autonomous, exact human approval required, or
forbidden. Cross-actor impersonation, stale approvals, subject/scope/digest
rebinding, protected refs, extra data fields, execution-shaped payloads and
unknown actions fail before object, artifact, edge, event or Timeline writes.

Tests must cover Contract Runtime parity, a table-driven actor/action matrix,
Project Host integration, persistence/reopen where a Decision is retained,
malicious payload corpus, idempotency and zero-mutation snapshots.

Execution adaptation, rendering, feedback recut, conversation UI and external
publication remain non-goals.
