---
evidence_id: EVD-20261004-S3-RELIABLE-JOURNEY-TESTING
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 704f29b49cee528272fe5211154688e9eebf1e4859506c815df424fb9ffa89fd
scope_fingerprint: e7c9af58a32b18d53f5f12b1e19ef1862d34e75a67bb7ce8236680b3bea76a5e
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# P3 agent testing, two actual bug fixes and bounded live recovery

The user's new instruction “你来做这个p3的测试” authorizes this testing round. Earlier skipped-check Evidence remains unchanged. This is a test result with explicit remaining coverage, not full P3 completion, subjective approval, Stage Exit or Release. P4 is not started. No commit/push/merge or user project deletion.

## Actual failures and current repairs

1. New-project form scope synchronization called saveUi, which synchronously called the whole workbench update, re-entering that same scope synchronization before its scope was assigned. The live page failed with Maximum call stack size exceeded and persisted RENDERER_OPERATION_FAILED. saveUi now refreshes only confirmed-input presentation; its existing debounced Host save remains authoritative. Actual reopen, typing, refresh and normal close then succeeded. ui-before-repair.png and the original issue history retain the first failure.
2. Actual public continuation was cancelled while running. The Host retained the cancellation and earlier playable/adopted v2, but the draining production's REQUEST_CANCELLED response was reported by both Renderer API/workbench as an error, creating a misleading issue. The current existing API/workbench classify an exact set of creation cancellation/revocation/supersession responses as control results, display their actual safe message and refresh Host state, without invoking failure reporting. Failed API responses remain ok:false; real failures retain their existing reporting path. Explicit cancel/revoke success displays the actual terminal wording, not generic success. No parallel player/script, alias or compatibility reader was added. Regression tests retain genuine injected failure assertions and additionally require cancellation/supersession not to append issues. The final live cancelled request returns “本次制作已取消。” without opening a new modal; the earlier issue still showed its original 20:06:40 timestamp/count 1 before being explicitly marked resolved. Historical records are not removed.

## Engineering results

All twelve bounded groups below exited 0. Logs are under ../assets/reliable-journey/. Earlier failing attempts remain available; reruns followed actual code/test-consumer corrections, not assertion weakening.

| Group | Final log | Scope |
| --- | --- | --- |
| typecheck | test-accepted-typecheck.log | Current TypeScript/contracts compilation |
| contracts:check | test-accepted-contracts.log | 88 schemas, 88 valid and 88 invalid examples |
| renderer:workbench:test | test-renderer-cancel-fix.log | Renderer architecture/current state boundary |
| web:host:test | test-accepted-web-host.log | Actual Host/session/origin/CSRF/dialog/upload/wire; injected save-stale denial retained |
| architecture | test-accepted-architecture.log | 1472 sources |
| workspace-issues.test.ts | test-workspace-issues.log | Actual SQLite/IPC, idempotence, revision/count, authorization, rollback, immutable history, cross-project isolation/reopen |
| stage3-render-host.test.ts | test-render-export.log | Actual encoded Master and production Main export/Host receipts, exact hashes, EEXIST protection, receipt-write rollback |
| stage3-desktop-workspace.test.ts | test-desktop-workspace-cancel-fix.log | Actual Electron/Host plus controlled codecs/model/native replies; UI races, cancellation journal regression and close/reopen |
| stage3:learning:test | test-learning.log | Trusted learning sources, scope/exception/correction/forget, held-out execution, real process-exit recovery with zero resend; isolated fixtures |
| stage3:precision:test | test-precision.log | Native grids, atomic actions, protection, undo/redo, manual-after-AI, actual dual encode/QC/reopen; controlled model |
| stage3:product:test | test-product-loop.log | Bounded pipeline, deduplication, revision reuse, duration rejection, composition lineage/local reopen; controlled model |
| stage3:soundtrack:test | test-soundtrack.log | Metadata-first selected-only acquisition/measurement, bounded calls, actual encode/QC/offline reopen; controlled fixtures |

The export route was physically renamed from project.creation.exports to project.creation.export-history to satisfy the existing prohibition on the obsolete lexical exports state. Renderer race test consumers now implement the current issue/history endpoints and close the actual “返回当前操作” action, rather than clicking a newly introduced unrelated first button. The Electron harness asserts the current truthful success wording exactly. The manifest's canonical P3 scenarios are C1/C2/C3/C4/C5/C6/C8/C9; its erroneous empty list was corrected without reducing acceptance.

docs:sync succeeded. test-docs-pre-closeout.log is exit 1: historical capability Evidence applicability mismatches plus P3's then-old Evidence/source fingerprint. This record binds P3's new exact source/scope; final docs:sync/docs:check logs record the remaining global historical applicability results. Those historical fingerprints are not relabelled as current without their own revalidation. No full pnpm check or broad 70-group suite was run.

## Public browser interaction

Only agent-created project P3自动验收-20261004-d65c374d (68c71d0d-97ae-46f5-8728-082fb3df96fb) was changed. Original user works and profile were not used for cloud submissions. Imported own sky-blue PNG and four-second H.264/AAC test video through the actual local chooser, 2/2 complete. Video actually decoded at 320x180, readyState 4/error null, advanced to 4.01 seconds/end. Audible listening is not claimed.

The existing configured ave-split/creation-v1 service, through the public authorization flow, generated a four-second single-image v1 with Preview/Master QC passed. Only the test image/request/frame data were authorized; no profile/audio/transcription learning. Manual public precision changed image duration to five seconds and produced independent v2/dual QC. v2 did not seize playback from v1. Actual comparison decoded 5-second and 4-second players independently; adopting v2 retained v1 viewing until explicit “观看此版”.

Fixed-version export was repeated after current editing/viewing had moved to v2: selecting v1 still wrote/downloaded the four-second v1, not the five-second latest edit. Actual browser download observation returned C:/Users/24179/Downloads/AVE-v1 (1).mp4. It is 5850 bytes, SHA256 3ea0aba6619ab15178bbc82a3b377e9e1429c7f03b8677c174ae30eef32970f3, matches both Host exports exactly and fully decodes with ffmpeg exit 0. No audio/credit sidecar was expected for this explicitly silent/no-music image case. The original October 2 Downloads/AVE-v1.mp4 is unrelated and was not overwritten. Host files: ffed0249-d7f9-4742-8457-5c26e3b7de82.mp4 and ec0c8e1e-0c25-4332-9c8d-16edca075ab3.mp4 under the existing Docker exports bind. Receipt history survived browser refresh. Two early download-observer failures were automation targeting mistakes: the first action opened a second confirmation, and a subsequent global same-name selector was ambiguous. Clicking the actual confirmation through AX then yielded the verified download; those mistakes are not app export failures.

An actual configured-model continuation requested a subtitle while preserving manual five-second duration. During production, the input remained editable and confirmed saved. It was then explicitly cancelled. Timeline v3 had committed the subtitle by the cancellation boundary; it is not claimed that cancellation rolled back an already committed version. Playable/adopted v2 remained intact and its picture kept showing. No late output was adopted or playback stolen. The discovered misleading cancellation issue was repaired as above.

Confirmed unsent input, v1/v2 history, adopted v2 and issue revisions survived actual normal close, AVE restart and reopen. The original recursion issue persisted across unrelated successful saves and refresh beyond 30 seconds, then explicitly resolved while retaining history. The final replacement also reopened the same project, recovered unsent input and decoded v2, and verified the cancelled-request control response without adding another issue. The earlier ui-input-during-production.png capture was after v1 had already completed; it does NOT prove concurrent typing. ui-confirmed-input-during-generation.png is the actual concurrent-input capture.

## Running build and preservation

Final product build input: 7978849a45263788e5c936b71327f04107a7c9459295d2e75bdf4b54f2816da6. Desktop image sha256:83615e035d05372d4122e5c60f580c833c15856e503114e2508c017a17d7f497; Whisper sha256:8f644f1b7222cb5b0d73bc85fe15d29d9776ce8647702019eebf359797d225a9. test-final-build-identity.json verifies source/output provenance and current runtime. test-build-cancel-fix.log/test-container-cancel-fix.log bind the final replacement. Earlier recursion-repaired build 5b607ef6 and its tests are retained; the second repair changes only the current creation response consumers, with fresh affected consumer/Electron/Web checks and live cancellation/reopen verification.

Normal close preceded every replacement. Desktop SIGTERM exited 143 without forced kill. Both replacements used the existing Compose/GPU configuration, only desktop/whisper, preserving five named volumes and original read-only materials/read-write exports binds. test-final-preservation.log and test-runtime-final.json verify all mount sets and six unrelated service identities/images/states. During the restart test, trying to restart Whisper before Desktop was back failed because Whisper shares Desktop's network namespace; existing Compose up restored Desktop then Whisper. A raw mount-array comparison initially rejected ordering only; sorted exact mount-set comparison passed. No data move, volume removal, orphan removal or Docker Desktop restart.

## Remaining P3 acceptance

| Step | Current result and limit |
| --- | --- |
| WIN-04 | Bounded real configured-service creation, continuation, concurrent unsent typing and cancel observed; full multi-source mixed-media editorial/revision journey not accepted |
| WIN-05 | Live image precision/compare/adopt and independent viewing passed; protection/undo/redo/manual continuation tested with controlled engineering fixtures; full multi-shot real UI chain remains partial |
| WIN-06 | Isolated learning/exception/forget/held-out and soundtrack engineering passed; public real listening/licensing/credits and isolated real-model learned-profile/held-out chain not-run |
| WIN-07 | Actual fixed v1 download/hash/full decode passed for silent image; soundtrack/audio/attribution attachments and listening not-run |
| WIN-08 | Actual refresh, normal close, AVE restart/reopen and final replacement recovery passed for this bounded project; controlled storage/learning fault cases passed; full mixed-media Host/Worker/SSE failure journey not accepted |
| WIN-09 | Original unresolved failure retained beyond 30 seconds and unrelated success; refresh/reopen/history/explicit resolution passed; new fixed cancellation control did not append failure |

C1–C9 detailed representative coverage and C3/C5/C6/C8 subjective judgment are not invented from synthetic codecs, QC or screenshots. P3 remains blocked on the remaining representative public journey and global evidence applicability; no docs:complete or P4 promotion. Actual test assets/screenshots and the isolated project/download are retained for review.
