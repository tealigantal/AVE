---
evidence_id: EVD-20261103-S3-P4-UX-REVOCATION-HISTORY
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-03
recorded_at: 2026-11-03T09:07:48.849Z
repository_commit: b62655a9de9941a4bdb33aacb3a0b7493812c592
code_fingerprint: 59b998b880745cad35f93e01c6fbb9066fe421c1f82239dbeef1f7a092483ab3
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# Historical observation preservation after revocation

Bounded P4 verification checkpoint, linked from the owning execution plan and Stage3 navigation. This is not package completion. User-requested b62655a was pushed before verification; existing projects, exports, volumes and unrelated worktree artifacts were preserved.

Full check exposed a real historical-reader regression: revocation advances an invalidation generation without issuing another grant. The historical authorization matcher now compares receipts against the last actual grant and exact earlier renewal digests. Live dispatch and commit revocation checks are unchanged.

The existing real-media Host observation integration passed with additional cases for pre/post-renewal receipts, revocation, reopen, rejected invalidation/future generations and wrong digests, and zero new sends/publications after revocation. Controlled HTTP fixtures, no paid model claim. Log: ../assets/p4-ux/verification-20261103/observation-regression.log. Independent read-only review found no blocking issue. Full final checks and current-build interaction remain in progress.

Pre-repair Browser WIN-09 on labelled/provenance-verified images imported an invalid recovery.mp4, retained the failure beyond 30 seconds and a successful blue.mp4 import, then recovered through normal UI same-name corrected source selection. The issue moved to processed history. Recording and trace are retained under output/playwright/p4-20261103; this run predates the source repair and is not final current-build acceptance. Test-owned project only.

Shared historical capability scopes affected by these two changed source/test files are explicitly reclassified UNVERIFIED in reviewed-scopes.json. Existing debts remain active; this checkpoint does not revalidate or promote their acceptance. No original Evidence was changed.
