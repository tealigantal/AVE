---
evidence_id: EVD-20260908-WP-CA-REAL-001-BLOCKED
date: 2026-09-08
work_package_id: WP-CA-REAL-001
repository_commit: 239073bfcf7f26a85c71bc43d5115c042107dc65-worktree
code_fingerprint: 9a15b455c0aba94e1171ae99e85fb584fa094683ce0a9614101d451e35a36d1e
capability_ids: [CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
commands: ["pnpm run stage2-product-workspace:real"]
result: blocked
environment: "Windows Node 22 local checkout; authorized real project and review root remain repository-external"
artifacts: ["current authorized original and immutable bytes have matching SHA-256", "copied review project keeps the source-project immutable path", "Host rejected the copied-project stale immutable path before Material Evidence or Electron review"]
remaining_risks: ["No real Product Electron review, direct-human inspection or Stage Exit acceptance has occurred.", "WP-CA-REAL-003 must rebind an immutable Original through the existing Host permission flow without weakening ownership checks.", "No media, local project or review path is tracked by Git."]
---

# WP-CA-REAL-001 blocked by copied-project immutable ownership

The real Product harness correctly copied the authorized project, but the
copied database retained an immutable Original location under the source
project's internal directory. Project Host requires a current immutable
Original under the opened project's own internal path, so Material Evidence
assembly failed closed before Electron or human review. The source file, copied
file and stored SHA-256 agree; this is an ownership-path fixture defect, not a
media integrity failure.
