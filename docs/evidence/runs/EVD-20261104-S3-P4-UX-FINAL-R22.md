---
evidence_id: EVD-20261104-S3-P4-UX-FINAL-R22
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-04
repository_commit: 39e0aadcc8282b15c3a6bd5302a91a8fd1529471
code_fingerprint: 8c25bdf719bd65f986bbffab66de8ff5a814031ae0125e58a882cec95a4269aa
scope_fingerprint: 9bcd6f03cd27f8043428b4030e0765e51b8c5375b87fcab712f5d712bbfa6030
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: passed
interaction_record: docs/evidence/assets/p4-ux/verification-20261104/r22-interaction-record.json
interaction_record_sha256: 9317e62de03f2032da19c658f584da9b1ba395aab684bd70236917d05ccdfc1c
interaction_receipt: docs/evidence/assets/p4-ux/verification-20261104/r22-interaction-receipt.json
interaction_receipt_sha256: 03b8dafacea517599d6c5d0b2a2f62b146910758ae1d43a585b02ea4f320903c
---

# P4 current Browser acceptance and original annotation recovery

This record closes the active P4 package only. It does not close Stage2 real-media gates, historical applicability debts, P5, Stage Exit or Release. The current source is the dirty implementation on the recorded base commit, bound by code/build-input/diff/runtime identities in the immutable interaction receipt. Standard R22 desktop and Whisper images use build input 8333373a97765b947b9db01b93c21b32f2d90f1e272c7fbf86e81a28db991338. Both runtime source/output provenance checks pass.

## Repairs and preservation

The reported combined-annotation error had three causes: agreeing whole-work grayscale and valid anchors were treated as conflicting; a failed request revision incorrectly invalidated its retained latest draft; and several failed batches could match the same revision context. The repair retains genuine local/global conflicts, current Timeline/draft identity and product permissions. A revision now atomically records its exact annotation operation in the existing storage event; ordinary revisions explicitly bind null. Historical records are unchanged and ambiguous legacy ownership fails visibly. The original R16 project recovers on R17 to v5 with actual gray output and unchanged decoded audio.

Real operation checks also repaired typed copy-drag negotiation over occupied clips, native replacement at an existing transition overlap, audio-track solo incorrectly invoking global video-excluding solo, optional-sidecar restoration for manually inserted clips, render failure masking by a secondary preview load, and sorted-track signatures rebuilding focused nodes. Existing global solo semantics, locks, source/time validation, Host authority, atomic commits and recovery history remain. Current mounted/Host/storage/property regressions cover exact ownership, rollback/reopen, missing-sidecar roundtrip, private metadata projection, global solo compatibility, retained video and focus/permission recovery.

## Current R22 observations

Fresh WIN09: invalid import fails with MEDIA_SOURCE_REQUIRED; after33.191seconds and an unrelated successful import the same issue remains queryable. Closing its hint does not delete it. Reselecting the correct failed source succeeds with two assets and Timeline v0. Recording73.2seconds.

Fresh WIN10: actual authorized synthetic video/image/audio and built-in Contemplation/Joth/CC0 produce v1; new input survives production, navigation and reload. Three local effect edits create v2/v3/v4 while v1 remains viewed; v4 renders. Queue body edit/removal/clear and exact point relocation pass. One global request plus two annotations binds operation391788a6-2bb0-41b0-9afb-4d41e6903d04 and resolves once to draft:a27988c8-336c-4504-b99c-3265d643a8d4, Timeline v5, render-8b55dcbb999a456ce22d54ca. Independent Preview/Master QC pass. All90 decoded frames are grayscale at640x360/3seconds, and decoded PCM is byte-identical to v1. Output SHA256 eb1b78b7530bb199d7c7c96eab7f7d0b5f52e5746fde69d0fb17d5f9508a3fd4. Actual MP4, audio manifest and credits downloads succeed; comparison/source alignment, historical anchor jump, nine pages, close/reopen and final unsent-draft reload pass. Seven viewports retain text, focus and selection; reduced-motion preference is exercised. Source video seek/mute/fullscreen, audio play and image zoom/reset succeed. Recording715seconds.

Supplemental R22: transition Delete/undo/redo/undo creates v56..59, with actual dual QC and full8.033333second v59 playback. Audio-track solo/cancel creates v60/v61, buttons switch correctly and v61 dual rendering succeeds; no v60-render claim. Native audition explicitly plays the verified15second audio; duplicate import preserves four unique assets. Earlier scripts that timed out on hidden navigation, a disabled control during restore/render, duplicate text locators or a prepared-but-paused native audio player remain recorded as automation failures, not product passes.

[Operation coverage](../assets/p4-ux/verification-20261104/r22-operation-coverage.json) names all24 OP rows and their actual build scope. Earlier R13/R14/R16/R17/R18/R20 recordings remain supplementary evidence for unchanged paths, not a claim that every gesture was repeated in R22. In particular the R14 v71 dual-QC/playback snapshot substantiates caption styling after its earlier timeout. R18 black output, R19 missing-sidecar rejection and R20 transition-drop rejection are retained and linked to subsequent repairs. Current frozen-source full engineering checks cover the preserved paths.

## Verification and limits

[Hashed final verification](../assets/p4-ux/verification-20261104/r22-final-verification.json): frozen R22 pnpm run check, pnpm run acceptance:final:synthetic and pnpm run render-graph:test exit0. Full check includes the package's required Host, timeline, annotation, recycle, renderer, model, contracts, architecture and Docker download tests. Current interaction receipt validation passes; independent agent review actually inspected seven recording frames and independently decoded output video/audio. Documentation completion/sync/check are recorded in the owning plan. R21's mixed-source aggregate is intermediate only.

Conservative cumulative reservations CNY56.740812/70,102 wires,zero pending; R22 adds8 wires/CNY4.835472. This is a retained upper bound, not a provider invoice. All12 baseline project identities/Timeline counts and seven baseline exports remain; all22 pre-R22 projects and13 pre-R22 exports are retained. Only the authorized supplemental project advances v55→v61; two fresh test projects and three downloaded export files are added. No volumes/data/history are deleted.

Screen recordings contain no audio track; technical PCM checks are not human listening or aesthetic approval. Browser upload-input selection is not a native OS picker. Native IME was not driven; composition protection has engineering coverage.125/150percent checks use equivalent viewports. Optional human feedback does not block P4. P5 remains pending; no main merge or release is claimed.

Capability scope identities: CAP-S3-P4-DEMO-INTEGRATION-001 scope_fingerprint: 9bcd6f03cd27f8043428b4030e0765e51b8c5375b87fcab712f5d712bbfa6030; CAP-S3-RELIABLE-UX-001 scope_fingerprint: c61bf8dc654044b98e85d943d02cc81eff45c5f1ef459aa2d69dd445f822f571.

At package closeout the three temporary output/playwright write allowances are retired from the completed manifest. Source/test coverage is unchanged; original files are retained and exact artifacts remain hashed by the interaction receipt and operation ledger. [Scope closeout](../assets/p4-ux/verification-20261104/r22-scope-closeout.json) records the two final implementation scope identities. No checker, historical Evidence or runtime source is modified.
