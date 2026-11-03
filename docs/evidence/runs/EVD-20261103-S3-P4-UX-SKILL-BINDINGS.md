---
evidence_id: EVD-20261103-S3-P4-UX-SKILL-BINDINGS
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-03
repository_commit: 12011539c829db46cda93661b7a0a14e59869da6
code_fingerprint: 4748a8218600c6c88d150f02ae47ae59ca9ef8e3f3437a15c2e58fc24fb04888
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
scope_classification: historical-revalidation-debt
result: blocked
---

# Versioned Skill binding repair and one authorized retry

Execution evidence owned by DOC-007. Prior immutable EVD-BUDGET36 remains unchanged. User permits total CNY40 and exactly one combined-annotation retry after repair; stop if it fails, continue remaining P4 only if it succeeds. Retain baseline reservations CNY34.826196 and all existing data.

New Host roots select effect-bindings-v2. The second physical input lists only applicable/edit_proposed bindings and explicitly requires empty skill_effects for an empty list while retaining legal direct user edits. Existing validation still rejects invented attribution, wrong pins and evidence. No filtering, repair, fallback or additional model retry. Unversioned historical roots keep exact old projection/prompt identity; unknown versions fail. Same-root errors now distinguish disposition, missing evaluation and mismatched pin.

Offline property tests include legacy prompt identities, direct requested grayscale with empty attribution, the actual decision_only contradiction, pin denial and a real Gateway transport with two controlled responses. Final Skill tests, typecheck, budget-guard tests and stage3:generation:test pass. The persisted historical failed request also reconstructs under the new runtime and returns the original semantic failure, rather than a rebound-input error. Historical applicability remains explicitly UNVERIFIED; scope review is recorded in [reviewed-scopes.json](../assets/p4-ux/verification-20261103/budget40/reviewed-scopes.json).

Standard r7 Desktop/Whisper builds and live provenance passed, retaining the existing mounts. Docker used the existing build-only proxy and verified cached sound artifacts; no global proxy change. The actual Browser reopened prior v1/v4 with working playback. Exactly one normal `重试此任务` action ran from 15:28:35Z to 15:29:48Z, making two planner calls. It committed v5 (`draft:8809b5c9-2a65-460b-b5ad-7159184e6f34`) in synthetic project `2f934e68-d8dc-4604-9ff7-5a28ae9ace8a`; both Preview and Master QC passed. All 90 decoded frames have zero RGB channel difference. Source/timing/captions/gain/fades are retained and decoded audio is byte-identical to v4. The old failed task and versions remain historical. See [media verification](../assets/p4-ux/verification-20261103/budget40/retry-media-verification.json) and [build identity](../assets/p4-ux/verification-20261103/budget40/build-identity-r7.json).

Reservations increased by CNY2.418372 to **CNY37.244568/40**, leaving **CNY2.755432**; these are conservative retained reservations, not an invoice. Ledger has 132 rows, 30 planner/36 vision calls and no pending response. No further paid dispatch occurred. This successful cross-build recovery is not DOC-007 WIN10's same-current-build empty-project journey. A fresh initial generation plus combined annotations needs four planner calls (approximately CNY4.8 before any new observations), exceeding the remainder. Remaining OP coverage and formal WIN receipts are incomplete. At this real authorization boundary, stop new validation as the user instructed; a further explicit budget decision is needed. P4 remains blocked and P5 is not entered.

The export page showed v5 with dual passed QC. The automation incorrectly awaited files before completing the normal download confirmation; zero downloads does not establish a product export defect. The confirmation was canceled at the stop boundary. Final UI has no dialog and says export was canceled with no new file saved. Recording and trace were stopped. Ten prior project identities were preserved; only the authorized retry project gained one Timeline version. All four prior export hashes are unchanged. See [preservation](../assets/p4-ux/verification-20261103/budget40/preservation.json).

The full `pnpm check` exited **1**: `stage3-desktop-workspace.test.ts` reached the native journey but the Electron review process did not finish shutdown within its 90-second fixture limit (`tests/fixtures/stage3/electron-review.ts:28`). Root cause remains unconfirmed; no timeout increase, blind rerun or successful aggregate claim. Later checks in that aggregate were not reached. The passing focused checks above and actual Browser retry are bounded results, not whole-P4 acceptance. Local logs/recording locations and hashes are retained in [local-evidence-index.json](../assets/p4-ux/verification-20261103/budget40/local-evidence-index.json); the failed aggregate log and [check outcomes](../assets/p4-ux/verification-20261103/budget40/check-outcomes.json) are retained alongside this evidence.

Resume only after the user's budget decision: first diagnose the free Electron shutdown check and finish free interactions/fixes; then bind the final build to one new empty-project full journey, stopping again on failure or a human-only boundary. Suggested total CNY45 is not authorization and has not been applied. No completion, merge, Stage Exit or Release claim.
