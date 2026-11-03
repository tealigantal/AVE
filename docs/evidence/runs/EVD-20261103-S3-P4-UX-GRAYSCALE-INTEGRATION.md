---
evidence_id: EVD-20261103-S3-P4-UX-GRAYSCALE-INTEGRATION
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-03
recorded_at: 2026-11-03T05:13:16.063353+00:00
code_fingerprint: b30788df40536e73adb7edd16534b971b9c726224711e3f6dc7593eeb32af66a
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# Bounded grayscale repair and integration

User authorized repair and a local integration commit, plus CNY 20 additional paid validation (cumulative ceiling CNY 33). No push, merge, release or P5 scope. Existing projects, volumes, ledger and unrelated files are preserved.

## Implemented and verified

Strict neutral grayscale on untagged video compiles to the existing registered grayscale effect. No source ColorContext is invented. Ordinary grades still require verified source context. Repeated grayscale preserves effect identity; follow-up model context represents current grayscale; tagged grades remain available in mixed inputs. Unknown effects, protected clips and tracks remain denied. Removal wording is not interpreted as a positive grayscale goal.

The existing same-request renewal, historical material/execution reads and annotation recovery changes are integrated with this repair. The old storage test now asserts REQUEST_AUTHORIZATION_IMMUTABLE instead of a retired error sentence; unchanged-state/rollback assertions remain.

Passed in this run: stage3-edit and feedback-goals property tests; base TypeScript; architecture; contracts; web:host:test; P4 workbench/integration/timeline/annotation/recycle aggregate; timeline-render:test; worker:render-graph:test; renderer:workbench:test; interaction-acceptance:test; render-graph:test; stage3 generation/model groups; request property/Host/storage tests. Actual encoded manual-draft tests verify Preview/Master/QC, decoded grayscale pixels, undo/redo, effect removal and reopen. These use synthetic media and controlled providers. Worker media correctness passed with bundled Python/Pillow 12.3.0 after default Python failed its pinned-version assertion. One early protection implementation failed manual-edit regression and was corrected before passing; the failure is not hidden.

## Actual Browser and paid model

Reused project P4-20261020-Paid-Synthetic-0948-a27cc43e on existing 6081 Compose services/volumes. Normal UI renewed the same expired request with unchanged scope. First real retry committed v7 and completed render-824be9de4baa0e64b1adfa31. Browser reported both QC checks passed and downloaded AVE-v7.mp4. The 238970-byte file hashes to 3ee2e65ca5038597afe66322e31b1e7a14c0577389e5392e73768c638d233dac; ffprobe reports H.264 640x360, AAC, exactly 3 seconds. Decoded frame at 1 second has mean RGB channel spread 0.0. This is a real paid generation on synthetic input, not private real-media or subjective acceptance.

Second round initially failed because Host incorrectly inherited the original 180-tick target when the latest explicit phrase 保持当前3秒时长 was missed. Read-only stored diagnostic proved this contradiction. After parser repair and negative/local-duration regression, normal UI retry committed v8 / draft:54c8cfa2-6372-4fa6-9d00-45ab68337419 / render-991b57c453615987d8d0f33b. Browser Preview and Master QC both passed. Actual downloaded AVE-v8.mp4 is 239606 bytes, SHA-256 02a8eb98344236c48b6896470209a1c2a9a135d2e537a3068d45f0c65a0bf6d3, 640x360 H.264/AAC, 3 seconds, decoded RGB spread 0.0. Audio RMS change versus v7 is -6.00640890795029 dB. Outputs and measurements are in ../assets/p4-ux/repair-20261103/. The failed intermediate round committed nothing. No whole-package closure is claimed.

## Historical applicability classification

The current worktree already had 36 tracked modifications and multiple historical Evidence applicability failures. Source changes involve same-request authority history, material/receipt binding, renderer recovery, Browser provenance and bounded color compilation. The exact reviewed affected scope definitions and previous/current hashes are recorded in ../assets/p4-ux/repair-scopes-20261103.json. Those prior capabilities remain UNVERIFIED under active historical-evidence-applicability debts; this record classifies their current changed dependency scopes, not their full product behavior. No historical Evidence, acceptance result or applicability index is rewritten as passed. Strict checks and full P4 closure remain blocked. Stage2 corrected-duration/representative-media and advanced editing debts remain independent.

## Remaining boundary

Full OP-01..24 and WIN-09/WIN-10 current-build coverage is not established by this bounded repair. Read-only review confirmed that multi-shot local grayscale wording is still interpreted as a global goal; this is an unresolved full-P4 defect, not merely an unrun check; the successful case is the existing single-shot annotation. P4 remains open, P5 not started. Monetary reservations are upper bounds, not provider invoices. Prices checked against https://help.aliyun.com/zh/model-studio/model-pricing on 2026-11-03; model/provider/data allowlist unchanged.

CAP-CA-SEC-001 also depends on the changed documentation tooling scope. Its previous applicability is explicitly classified UNVERIFIED, not a current dependency/security acceptance; the dependency lockfile is unchanged. docs-fingerprint and renderer boundary tests passed.

## Final budget

{"ceiling_cny": 33, "records": 54, "reservations": 27, "reserved_micro_cny": 18420612, "pending": 0, "usage_priced_estimate_cny": 4.5511479999999995, "ledger_sha256": "0eaa362db92cbca5768f7a5c2a44048acbbbc1b089e41ea3b02290413060bded", "not_provider_invoice": true}

Final image: sha256:25d4dec400ef4c7b89965bd6b62c542780521d5f036ef0304e97824f2da8ae8c. It adds the negative audio-track effect guard after paid v8 generation; reopening is verified separately from generation. Five new planner calls in this task (two successful two-call rounds and one failed measurement); zero new vision calls. Additional retained reservations CNY 6.052776. No pending call.

Final-image Browser reopen confirmed current v8, actual 3-second preview, both completed render records and preserved request/revision history. Current-clip scope with no selected clip remains disabled rather than widening to whole work. Screenshot: ../assets/p4-ux/repair-20261103/final-v8-reopen.png.
