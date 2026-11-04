---
evidence_id: EVD-20261104-S3-P4-ANNOTATION-RECOVERY
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-04
repository_commit: 39e0aadcc8282b15c3a6bd5302a91a8fd1529471
code_fingerprint: 70256a224ff6a78e53789d77993f617f84c4af8c4467a62eda66fefe0f338e73
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
scope_classification: historical-revalidation-debt
result: blocked
---

# Annotation recovery implementation checkpoint

The user reports that the previously suggested, unverified edited-text workaround also failed and asks the agent to investigate. Actual r16-user-retry-host.json records two TIMELINE_ANNOTATION_DRAFT_MISMATCH errors: the first failed annotation already saved request revision2 while latest committed v4 still belongs to revision1. No new model call or Timeline commit occurred. Baseline39e0aad is pushed; existing projects, outputs and unrelated untracked files are retained. Budget remains CNY44.580732 of70, zero pending at this checkpoint.

Focused tests first reproduced both draft-revision equality and whole-work-plus-anchor rejection. They then exposed ambiguous ownership when several preflight-failed batches share target revision/text/base. Fixes bind the exact current/latest draft independently of the request revision; accept consistent whole-work grayscale anchors while retaining explicit conflicts; and persist annotation_operation_id atomically in the existing creation.state.saved event for a new revision (null for ordinary intent). Replaying an operation verifies this binding. Public command schemas, permission checks, original message history, Timeline commit and output identity boundaries remain. An initially considered adjacency-only approach was rejected in read-only review because interruption can separate processing and revision transactions; it was never deployed.

The final controlled Host journey passes failure -> reopen -> two rejected competing batches -> processing-before-revision interruption -> unrelated event -> resume -> one actual commit with dual render -> exact replay, plus different-operation denial. Atomic storage tests inject event-write failure and verify state/binding rollback, reject identity rebinding, and prove ordinary same-text revision does not inherit a competing pending annotation. Legacy three-field compatibility tests cover unique proven association and explicit rejection of ambiguous/interrupted history; arbitrary old interruption recovery is not claimed. Scope property, typecheck, architecture and storage suites pass. Logs are retained under output/playwright/p4-20261104/budget70/recovery-*. No paid verification has yet run on repaired code.

Current real Browser recovery, full required checks, remaining P4 operations and successful current-build WIN09/WIN10 receipts remain necessary. DEBT-S3-P4-CURRENT-UI-REVALIDATION is not resolved. [Reviewed scopes](../assets/p4-ux/verification-20261104/recovery-reviewed-scopes.json) remain UNVERIFIED; this record does not advance P4/P5, main integration or release.
