---
evidence_id: EVD-20260927-S3-COMPARISON-FINISH-PRECHECK
date: 2026-09-27
code_fingerprint: 8cb279cb18a4b6de538027c029acda7f503fbbe688934fb563d50114c1cbba0d
repository_commit: c44182d38ce289db17b621cfe7ff33cf8e21c897
result: comparison_lifecycle_regression_passed_full_gates_pending
---
# Stage3 comparison exit completion regression binding

The full check #05 failed in the engineering Electron workspace test at comparison exit. That fixture waited a fixed 250 milliseconds after Escape before requiring media release. The production comparison owns decoded layers until its actual Web Animation finishes, and then releases them. The original failed run did not capture animation playState/currentTime, so its exact scheduling delay cannot be reconstructed. Its log and failure remain intact. No production code change or speculative leak repair is claimed.

The repaired controlled Electron fixture pauses the real exit animation past the old wall-clock expectation, asserts that decoded layers are retained while it is unfinished, then observes its real finish event and asserts complete media release. This tests the actual lifecycle boundary rather than extending a sleep or removing the release assertion. The targeted stage3:desktop-workspace:test passes. Its actual Chromium receipt reports 180ms configured duration, 195.7ms observed natural completion after resume, hidden=true and zero remaining media; zero active animations is also asserted. Separately, the already captured real C motion phase-motion-review-1790512402577 verifies natural timed open/button-close/Escape-close, intermediate frames, focus and reduced motion; it is not replaced by the controlled animation test.

Production temporal coverage, profile query persistence and their bounded passing regressions remain as recorded in EVD-20260927-S3-TEMPORAL-PROFILE-PRECHECK. No production build is changed by this fixture correction. Real B continues on its captured new qwen3.7 authorization; its result and the remaining B/D/A journeys are still pending. The passing final-synthetic-05 slice does not override the full-check-05 failure. A new complete frozen-source check remains required.

WP-S3-INTEGRATION-001 stays active. This Evidence binds regression applicability only; capabilities and C1-C9 statuses are not promoted, and final human review remains pending. Private logs, media, model contexts and databases remain in the approved local review directory.

Scope bindings:
- CAP-RENDER-001; scope_fingerprint: 7eaf5b2a6891d8de483dc76a3f02c536361fce1ad80ab0833f73b0dcd03df3d1
- CAP-PRESET-001; scope_fingerprint: 17b228e32fa8f3a5f81438758d85564d5648648d98d505ae8bfeda60672f01cf
- CAP-FND-001; scope_fingerprint: ac7a883b61a1af201405431367d7508ca53833272aeb4a6899c87421265418bb
- CAP-CA-GOV-001; scope_fingerprint: 21f8bf1866f5554f644845269d5e693108203145f1c7f67028d3fbac493bb1c3
- CAP-CA-CONTEXT-001; scope_fingerprint: 7b9c3a8a1935fb5e84e401c9ce13679989df966ea89e1e17fcc824c2759f0272
- CAP-CA-SKILL-001; scope_fingerprint: e45815c982be001a8dc25390d8eb5dacd36e49fbb94f292465ef1d6c74cf3512
- CAP-CA-DURATION-001; scope_fingerprint: 09e7d312805a2a8ba130575f8b68c941628a10e870d6d0661353749475b33963
- CAP-CA-STORY-001; scope_fingerprint: 4507bb0a8a212a783b6d89b746772fb633617d68af0bc04355c7831c2eff63d4
- CAP-CA-PERMISSION-001; scope_fingerprint: ce139f8bb7b81ac0a45bb5b2a047c8fbfd2682d81aa85bc50306cb6ced28aa76
- CAP-CA-PIPELINE-001; scope_fingerprint: 0e55481afadf39085d4ad26a9aaacd260d449218c6789c3e5f08d6babdf49fba
- CAP-CA-FEEDBACK-001; scope_fingerprint: d0e4eba1ba32a2533543e6e82dcd823dadb0e2048eb35e04207df4bd7f817577
- CAP-CA-PRODUCT-001; scope_fingerprint: 72411abe50268b0df59458611dc684500385ef84c2b5031c6577dcac7a4fe793
- CAP-CA-PRODUCT-002; scope_fingerprint: 6ba61e952442a2e08f87f796bcfb907588d4aa079ea07f719eb4f2032bc7c69f
- CAP-CA-UX-001; scope_fingerprint: 27637c64fa206bbd414beb222a2800deb0ea02fb70436d306f0f3b0a6d775162
- CAP-CA-EXIT-001; scope_fingerprint: b1f7d9d50096ce23faccbc64f1395634e166e678c13904effd5e610d951c9f07
- CAP-CA-GOV-003; scope_fingerprint: a871d2d6ecd048736afa8839fe71701135089a196ea821776cd2668b09066a11
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 04898c67bee00774ee952ccc8a06a893ca5e21842371e908cd75a38441ebf2db
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
