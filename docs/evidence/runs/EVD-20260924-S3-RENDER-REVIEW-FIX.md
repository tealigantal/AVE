---
evidence_id: EVD-20260924-S3-RENDER-REVIEW-FIX
date: 2026-09-24
code_fingerprint: a93c2bdbf61aa7bbe210df824690be22ac2e7acfcaa3b390ca8b4aaff62e9359
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: shared_regression_pass_full_gates_pending
---
# Render source error transparency

Follow-up to [render precheck](EVD-20260924-S3-RENDER-PRECHECK.md), with the same
real-checkpoint limitations and active WP-S3-INTEGRATION-001.

The first full check on aff1a208281d5f58837cb0ac966a5e5d9b71eacb9fe4128011e8a509eea77bd8
failed in stage2-product-actions.test.ts:555. Concurrent source inspection now
correctly awaited all producers, but its AggregateError message hid the existing
SEMANTIC_RENDER_IMMUTABLE_ORIGINAL_REQUIRED code. Nested causes were retained;
the top-level boundary and existing specific-cause assertion regressed.

The code now includes each concrete source failure in the aggregate message,
while preserving all errors and the original cause. No test assertion, timeout
or checker changed. pnpm run stage2-product-workspace:test then exited 0,
including the failed exact-immutable-reference case and the full Stage2 Product
scoped-feedback/stale-recovery regression. git diff --check passed. The earlier
88-file allowed-path audit found no outside change; subsequent changes remain
inside the registered Host/Evidence/plan paths.

The immutable original failed log is retained outside Git as
ave-stage3-render-check-20260924.log; SHA-256
f63c31703efc3432bf34d53173a553e012453dd5dddb0de8c6a84c975048075f.
A first apply_patch attempt did not match the actual source line and made no
write; the corrected patch used the inspected source. The earlier publication
caller also used the wrong writeJsonFiles argument shape; correcting it to entry
tuples succeeded without modifying the publication tool.

Full current check and synthetic acceptance are next, not inherited from the
older material gates. No private media/model call, real acceptance, commit,
push, PR, merge, release or Stage3 completion is claimed. These bindings only
refresh regression applicability, without promoting capability status.

- CAP-RENDER-001; scope_fingerprint: c4eb93e013258ffc7b03f2093cbdede785c5d86bdb35316645aaa9c4d4a5b3e6
- CAP-PRESET-001; scope_fingerprint: 79bc6f7603f3e8d3f01685fb63ea19aa4caf4f4bd6596821107b57b52b1445b1
- CAP-FND-001; scope_fingerprint: 00972d3c8fc3798b42846457886d54f58651b5cd94a5896ee9e75101280fa541
- CAP-CA-CONTEXT-001; scope_fingerprint: 00cb65a54f6e32f371bb3d054da8b5b1ec77e0955aa7bf8b3b67aa6908f31053
- CAP-CA-SKILL-001; scope_fingerprint: a9fc48ac958dba15836c7e5929ae9b8a58fbfc5d95cb203ca7f68b17d44aad5a
- CAP-CA-DURATION-001; scope_fingerprint: 5d98f60493d2bc7c25904ceadfbc132e88cf6b0e9b35192621a25341894ae11c
- CAP-CA-STORY-001; scope_fingerprint: ea7256be34ab727d015a79888841f75b626235a12ff7af0d88b6fbb25eb39147
- CAP-CA-PERMISSION-001; scope_fingerprint: 7204ddbb7edd1a338f40463daed9073077454984d9cd5d901281b027a18505e9
- CAP-CA-PIPELINE-001; scope_fingerprint: 2460fb2b6c5ec610d399d600ec152d8c6bfe6a0484d79f51a6b04d14e7f6b54c
- CAP-CA-FEEDBACK-001; scope_fingerprint: 1fe4ee704d3000f3ad9a8696a75d90bd0695129dbeca3c17c7c12e69de05081d
- CAP-CA-PRODUCT-001; scope_fingerprint: 633f78197738d817c16bd89545d9a73346710406b2f793a1a7bc1e90ea79ee1c
- CAP-CA-PRODUCT-002; scope_fingerprint: 4dc8cabcc3c80ac1e88b3e201c1580cde749622cd6e5d731edfe21301524048a
- CAP-CA-UX-001; scope_fingerprint: e155f752a511522db0a8cab21cdbe61f750cfa83d28609b38e32fbf0e392bbfc
- CAP-CA-EXIT-001; scope_fingerprint: 11c813f5042721bd6b0389f7bbd60783bc88dac8a809ab2cabd21a41fc125909
