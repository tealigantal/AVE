---
evidence_id: EVD-20260909-WP-CA-REAL-001-UNUSED-CLEANUP-PASS
work_package_id: WP-CA-REAL-001
code_fingerprint: 7e133bb66f242b08a9fd9b53b5d3bedf7d38e0cfc9e5f65ffcd671cf9861333b
date: 2026-09-09
---
# Unused compatibility cleanup, current consumers preserved

## Changes

Removed both obsolete single-source real-entry branches, the hidden Pipeline real-mode fixture path, the unreferenced Evidence applicability-index migration generator and the root historical-blueprint redirect. Real entries require the shared material case. The old Product preparation was removed, but its current automated Electron playback, feedback rejection and reopen checks were extracted into one helper and connected to real and synthetic material cases. Expectations use the actual case goal, Evidence count and encoded duration. Current native numeric input and its one-second suggestion remain unchanged. A case without that UI-test precondition is explicitly blocked, never treated as accepted.

Current Job reuse still needs metrics reconstruction, canonical Stage2 structure still uses flat keyframe fields, and docs:check still reads the Evidence applicability index. Those consumers, automation curves, external adapters, synthetic approval/rejection/atomicity/undo/reopen tests, native harness and historical Evidence/archive were preserved. No production code changes were made by this cleanup. Prior uncommitted Host/UI repairs remain intact. No external project or compatibility links were deleted by this repository task.

Physical deletion exposed scopeFingerprint trying to stat unstaged deleted files. It now excludes Git-reported worktree deletions; a regression checks fingerprint change on deletion and equality after staging. It still fails on Git discovery errors and empty scopes.

## Actual validation

- intelligence-pipeline:test passed, including all three real-entry single-source-manifest rejection tests. Rejection produces only the blocker report, no project or movie.
- typecheck and docs:fingerprint:test passed.
- pnpm run check passed with process-local PYTHONUTF8=1 and TEMP/TMP under the user-designated external test root. This includes Stage2 Product actions, Electron runtime, current metrics/job recovery, core Timeline, adapters, Worker media/audio/render, storage and final foundation recovery checks.
- acceptance:final:synthetic passed.
- Six-source synthetic material encoding completed with baseline A/B and accepted revised outputs, plus separate pending-human project preparation. A trial native fraction input failed because the current input is numeric; the trial was reverted. The retained current native UI helper then passed independently against the generated revised project: Preview duration 119 seconds, explicit feedback.create then feedback.reject confirmations, rejected status, reopen Timeline 2 and current render binding. This is automated interaction, not human acceptance.
- Initial full-check attempt failed at Python GBK decoding of FFmpeg output containing the user-selected Unicode directory. UTF-8 process environment resolved that test-run issue without changing application code.
- Read-only independent review found no remaining blocking cleanup issue after active native coverage was preserved. git diff --check passed.

## Gate boundary

No commit/push/merge or acceptance promotion. REAL-001 remains blocked by missing authorized multi-source real-media/direct-human acceptance; EXIT-002 is still pending its dependency and both existing debts remain active. docs:complete is not invoked because this engineering cleanup does not fulfill Stage Exit. Final generated docs and allowed-path audit are checked separately after publishing this record. Existing accepted/tested scope records below record regression applicability, not a new creative acceptance.

- CAP-RENDER-001; scope_id: editing-execution-v1.CAP-RENDER-001; scope_fingerprint: d60c809c2d63521105c39af5725093e54e65a51b51cf2cd1d7214706425e9a38
- CAP-PRESET-001; scope_id: editing-execution-v1.CAP-PRESET-001; scope_fingerprint: bb5cb27c0f90a5f244c0a4e5a9887f4d7daec3bb81cd006049f45082de3378ad
- CAP-FND-001; scope_id: editing-execution-v1.CAP-FND-001; scope_fingerprint: a996165bc595393983dfae775f500ba943f12a1ff6b6d1aa86a7d2f87af24f24
- CAP-CA-GOV-001; scope_id: creative-assistant-v1.CAP-CA-GOV-001; scope_fingerprint: b7a95f322b1c6a4c8b19d86ef1170c5649a32ea36896b8c44667cda3f3f79f98
- CAP-CA-CONTEXT-001; scope_id: creative-assistant-v1.CAP-CA-CONTEXT-001; scope_fingerprint: 1eb73e1443957403e7336c84793a1bf794a9efc1ea800edc1aa50d78c0743fff
- CAP-CA-SKILL-001; scope_id: creative-assistant-v1.CAP-CA-SKILL-001; scope_fingerprint: e72ea291d8eb2a6b523921cfc7fa6293f0e48700ba6a2ab546a42af012eee027
- CAP-CA-DURATION-001; scope_id: creative-assistant-v1.CAP-CA-DURATION-001; scope_fingerprint: e45e91ff642ab8b09dbda63bf08e29cb2d236ae5c63f8cd1b8734a1b37474ae3
- CAP-CA-STORY-001; scope_id: creative-assistant-v1.CAP-CA-STORY-001; scope_fingerprint: 50c32f1e2c65245bb025d1b71cc4c9097567095e766e49cae4c35c9dd8c195e1
- CAP-CA-PERMISSION-001; scope_id: creative-assistant-v1.CAP-CA-PERMISSION-001; scope_fingerprint: 13eef4a28ef09e67e641e93712db22fcb807fb0ae745f9199216fee7650abef9
- CAP-CA-PIPELINE-001; scope_id: creative-assistant-v1.CAP-CA-PIPELINE-001; scope_fingerprint: be8381c2266cd18a0b0989cd4a1774db2458830ee96b49ffa840324f58e39c2e
- CAP-CA-FEEDBACK-001; scope_id: creative-assistant-v1.CAP-CA-FEEDBACK-001; scope_fingerprint: 7cdfa04c557fde80007a901ebeec003f31e00abbcbe0da43b4ce466f92c5bbeb
- CAP-CA-PRODUCT-001; scope_id: creative-assistant-v1.CAP-CA-PRODUCT-001; scope_fingerprint: a8108c84db2ab8148195b2f136597b3d8fbf25f5348438af56f3e3cf28557784
- CAP-CA-PRODUCT-002; scope_id: creative-assistant-v1.CAP-CA-PRODUCT-002; scope_fingerprint: ab44b17bbc43fb3847e8d81b88de388cee84817d0b895f3262bd3d7a1e4385e3
- CAP-CA-UX-001; scope_id: creative-assistant-v1.CAP-CA-UX-001; scope_fingerprint: d0f3ca9577e0f488df8303151bb3a156d47e891ac7c4d9780758089474791b73
- CAP-CA-EXIT-001; scope_id: creative-assistant-v1.CAP-CA-EXIT-001; scope_fingerprint: ba07a5dcaa4f2362ed946060167bf829bf8f1923a62072f3438f7e66f9804c8e
- CAP-CA-GOV-003; scope_id: creative-assistant-v1.CAP-CA-GOV-003; scope_fingerprint: 33eb92acf8555b0865735744f099ac09feeb683e02fa73a802e63419940eb49d
- CAP-CA-GOV-002; scope_id: creative-assistant-v1.CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_id: creative-assistant-v1.CAP-CA-SEC-001; scope_fingerprint: abb2879f1424e3dfdcc096630fdf4e6f8b3c011484ddb354d9317f0d54e93000
- CAP-CA-RECON-001; scope_id: creative-assistant-v1.CAP-CA-RECON-001; scope_fingerprint: d0e03348969e73ffd0bb675bc8e950ad4c91014bc1725c01f3e869819b15b104
