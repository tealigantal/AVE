---
evidence_id: EVD-20260910-PR26-CLOSEOUT-VERIFIED
date: 2026-09-10
code_fingerprint: 165dfc26cd27487cbdab459033373c19e4f0b9baca1aeb9024d3eaad4248c5ee
repository_commit: 2098acc6a28431e6d3bca559374cceb67b8c6a19
result: bounded_repairs_verified_remote_integration_pending
---
# PR26 three-fix verification

Execution Evidence for the [existing closeout plan](../../plans/2026-08-28-stage2-single-version-merge-readiness.md). This new immutable record supplies the executed outcome after [precheck](EVD-20260910-PR26-CLOSEOUT-PRECHECK.md); it does not rewrite historical Evidence or complete an implementation package. Repository commit above is the starting head; the code fingerprint identifies the tested patched source. Final pushed head and merge result are verified on [PR26](https://github.com/tealigantal/AVE/pull/26).

## Repairs and regression coverage

- Host operation IDs use the existing deterministic digest of structured beat_id/evidence_id identity. Distinct pairs a-b/c and a/b-c now generate distinct operations with preserved target refs; retry preserves the same result.
- The shared material runner tests missing required material through a helper. If removal leaves zero Evidence, it asserts the existing Host nonempty rejection and continues the legitimate positive run. Nonempty incomplete packs still prove missing coverage. Regression validates the broad valid manifest shape and proves empty-pack rejection writes nothing.
- ROLE_BUDGET sums exact BigInt ticks on the existing common timescale and cross-multiplies minimum/maximum bounds. Mixed-timescale fixtures pass at exact bounds and reject one-tick violations at scale 10^15 while full candidate duration remains exactly 120 seconds. No broader time-system change.

## Executed validation

Windows, Node 22.16.0, pnpm 11.19.0; PYTHONUTF8=1 is process-local for the repository's existing Unicode-path Python tests.

- node --import tsx tests/integration/stage2-material-case.test.ts: exit 0.
- node --expose-gc --import tsx tests/integration/stage2-product-actions.test.ts: exit 0; also passed within full check.
- pnpm run typecheck: exit 0.
- pnpm run check: exit 0, through foundation ACC-028..032 and Worker cancellation. Local log SHA-256: cae02527a0aac2995ec80908d5e7b26796bde572e4bc8a51e73fad634f95f73b.
- pnpm run acceptance:final:synthetic: exit 0; real media not claimed.
- pnpm run docs:sync and pnpm run docs:check: exit 0 before full check; final Evidence publication gets the same documentation gates.
- Independent read-only review of the narrow diff found no remaining blocker. Earlier regression fixture ordering/ID-assumption failures were corrected, with original assertion strength retained.

Final-head remote CI, review and allowed merge conditions are still to be checked before merge. No check disabled, assertion relaxed, branch protection bypassed or force-push authorized.

## Preserved acceptance boundary

[EVD-20260909-DOC-005-REAL60-HUMAN-ACCEPTED](EVD-20260909-DOC-005-REAL60-HUMAN-ACCEPTED.md) remains unchanged for the delivered A60/B60/A59 hashes. This patch does not regenerate those films or claim new human acceptance. Six independent originals/two-minute main-case and formal Stage2 Stage Exit remain incomplete (REAL-001/EXIT-002). Capability statuses and existing debts remain unchanged; no new nonblocking task or package is started. After actual merge verification, stop.

## Existing scope applicability

These current-source automated checks refresh technical applicability only, not Stage Exit or human acceptance.

- CAP-RENDER-001; scope_id: editing-execution-v1.CAP-RENDER-001; scope_fingerprint: 9b2239895504b296a3653a41c8e707138437001c8ebc726f1a4cba84eea19a46
- CAP-PRESET-001; scope_id: editing-execution-v1.CAP-PRESET-001; scope_fingerprint: 51fcd52333ebe9794b0668465beef10cae83d192efc7e296c2633f16332c61ba
- CAP-FND-001; scope_id: editing-execution-v1.CAP-FND-001; scope_fingerprint: 7f8344d98fdba65cbfd9920457e515d0f14eb149292a742d7902ac6e0beffcd5
- CAP-CA-CONTEXT-001; scope_id: creative-assistant-v1.CAP-CA-CONTEXT-001; scope_fingerprint: a736e2edab3f24eca51a323e13b003e8f0b6e3fec56253b27fbc4401ace98793
- CAP-CA-SKILL-001; scope_id: creative-assistant-v1.CAP-CA-SKILL-001; scope_fingerprint: c1a7ef162bfac6d25da1d0fa19b00ed36ed3192bf73d9faa6c708abe45b1f655
- CAP-CA-DURATION-001; scope_id: creative-assistant-v1.CAP-CA-DURATION-001; scope_fingerprint: d2bdcc62a69ce571a67c2e1cdab7199cd525fab38f1b0e0730ba03aecd9e378e
- CAP-CA-STORY-001; scope_id: creative-assistant-v1.CAP-CA-STORY-001; scope_fingerprint: 9a1a3010602922b8cac76ba6fff7fe8c63749caf2cfb68f003d00a4eeb114ff1
- CAP-CA-PERMISSION-001; scope_id: creative-assistant-v1.CAP-CA-PERMISSION-001; scope_fingerprint: 6a48cd6747889a994ca9c1e727783b8796bbffa53c4ab4e4028a003332878a50
- CAP-CA-PIPELINE-001; scope_id: creative-assistant-v1.CAP-CA-PIPELINE-001; scope_fingerprint: 68238888ab909a5b7f03118327eff31af7a2d9ab3d00e6f5f328e51719f1a77e
- CAP-CA-FEEDBACK-001; scope_id: creative-assistant-v1.CAP-CA-FEEDBACK-001; scope_fingerprint: b91326383d05fbdcb7316dabe73ed97237ba49c25f92bdc4249449a9166c2faf
- CAP-CA-PRODUCT-001; scope_id: creative-assistant-v1.CAP-CA-PRODUCT-001; scope_fingerprint: 48c09194ed262dbee4341c89fcd2c17e82df433dfcec840b171769c5d6c8914f
- CAP-CA-PRODUCT-002; scope_id: creative-assistant-v1.CAP-CA-PRODUCT-002; scope_fingerprint: 94f195d1c6acf7c41099f5651c363e1eaf814fdbafae6ba1581a1c21a2a81e20
- CAP-CA-UX-001; scope_id: creative-assistant-v1.CAP-CA-UX-001; scope_fingerprint: ce13abe18aec42da6297ceab0064c1786dfb3c3d1b087e4008aee875b953743f
- CAP-CA-EXIT-001; scope_id: creative-assistant-v1.CAP-CA-EXIT-001; scope_fingerprint: 7af7fe8eb3f1bd8fea3b4f8764fa5d66bd367bf757208f29fc8aecf9944628dc
- CAP-CA-RECON-001; scope_id: creative-assistant-v1.CAP-CA-RECON-001; scope_fingerprint: d3f9bf4d015778da8450ca4e4cb29517ca9369861c22c867efdc1a898ba3d55b
