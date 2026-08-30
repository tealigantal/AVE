# WP-CA-STAB-005: Compiler-aligned feedback target eligibility

## Outcome

Issue #14 exposes a clip for local feedback only when the current Feedback trim compiler can deterministically compile it. The same pure support predicate classifies the Host workspace projection and revalidates the selected target before a Feedback Diagnosis or Edit Intent is persisted.

## Scope and boundaries

- Allowed: the existing Feedback trim compiler, Project Host Stage 2 workspace projection and create path, the Stage 2 desktop feedback control, focused tests, programme Evidence and the feedback-pipeline authority.
- Unsupported targets remain visible with stable reason codes but cannot be selected or submitted.
- Forbidden: new edit operations, storage ownership changes, compatibility paths, real-media acceptance and Stage Exit claims.

## Invariants

1. Locked tracks or ranges, Contract-protected clips, retimed/time-mapped clips, incompatible or unsafe RationalTime, stale lineage and non-current execution output fail closed.
2. The renderer receives `editable_targets` and `unavailable_editable_targets`; support-state changes are part of the workspace digest.
3. A stale or forged target fails before Diagnosis, Intent, Approval or Timeline writes.
4. The predicate is deterministic and shared by compiler and Host rather than duplicated in the renderer.

## Definition of Done

Unsupported Feedback trim targets are explained in the workspace, rejected by Project Host without partial writes, and covered by focused, full and remote Development Integration checks. This package makes no real-media, human-acceptance, Stage Exit or Release claim.
