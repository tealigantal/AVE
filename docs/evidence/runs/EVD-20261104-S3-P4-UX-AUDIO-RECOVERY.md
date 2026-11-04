---
evidence_id: EVD-20261104-S3-P4-UX-AUDIO-RECOVERY
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-04
repository_commit: 39e0aadcc8282b15c3a6bd5302a91a8fd1529471
code_fingerprint: 8c25bdf719bd65f986bbffab66de8ff5a814031ae0125e58a882cec95a4269aa
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
scope_classification: historical-revalidation-debt
result: blocked
---

# Audio solo recovery checkpoint

R17 repaired original and fresh two-annotation journeys resolve to v5 with dual QC, exact grayscale video and unchanged decoded PCM. R18 confirms native occupied-clip media insertion and video/image/audio move, trim, split, delete, undo, track lock and mute. R18 full check exits0. These remain prior-build evidence.

R18 v47 audio-track solo incorrectly selected the global Track.solo path and excluded video, causing genuine BLACK_FRAME/FREEZE_FRAME QC failures. Keep global semantics and checks. Extend the existing PrecisionEditV1 solo with optional validated track_id, selecting every audio clip through the existing gain/routing/restoration mechanism. Renderer calls Host precision and displays a readonly Host-bound selected state. Hidden recovery metadata remains private; forged display state is rejected. Historical global solo cancellation remains explicit. A prior empty globally soloed track is rejected with a corrective instruction. The render-and-watch path refreshes on failure but loads a preview only after success with matching project/request/draft/render identity, preserving the QC root cause.

Focused multi-clip, switching, gain/restoration, source/duration/caption preservation, protection, readonly projection and both graph tests pass. Mounted tests pass8/8; typecheck, contracts and actual Electron renderer-races engineering test pass. This is not paid model or final runtime acceptance. R19 current-build Browser verification and final receipts remain outstanding; P4 debt stays active. No P5/main merge/release. Reservations remain CNY51.905340/70; zero new calls during repair. Changed historical scopes remain UNVERIFIED in [scope review](../assets/p4-ux/verification-20261104/track-audio-reviewed-scopes-r19.json).

R19 actual Browser call cancels historical global solo to v48, then precision solo rejects a valid P4 manually inserted clip lacking optional semantic_sidecar; no v49 or model call. Preserve r19-operations.webm, r19-solo-host.json and r19-host-diagnostic.log. R20 supports absent sidecars using private reversible bookkeeping with empty evidence/labels, restoring absence on cancellation unless later edits added metadata. The actual all-manual regression fails before repair and passes afterward, with exact clip restoration. Typecheck passes; readonly review finds no blocker. The R19 aggregate began before this repair and is not a frozen R20 receipt; run the final aggregate against frozen R20 source. [Changed scopes](../assets/p4-ux/verification-20261104/manual-solo-reviewed-scopes-r20.json) remain UNVERIFIED.

R20 actual audio solo and restoration succeed at v49/v50 with independent Preview/Master QC. All251 decoded frames match v45/49/50 exactly; RMS confirms both isolated SFX clips, suppressed unrelated audio and restored tail audio. Native transition insertion commits v54 after correctly rejecting a crossing overlay; replacement drops arrive as copy on the existing marker but the UI rejects the overlap. R21 target resolution recognizes exact current markers and existing overlapping cut pairs, retains the original plain-cut tolerance, and rejects unknown marker IDs without geometric fallback. Existing Host replacement/locks/duration/ripple checks remain unchanged. Mounted red/green and readonly review support this narrow repair; current R21 native replacement/Delete/undo/render and formal WIN09/WIN10 remain required. [Changed scopes](../assets/p4-ux/verification-20261104/transition-reviewed-scopes-r21.json) remain UNVERIFIED.

R21 native replacement commits v55, but display-sorted and authoritative-order signatures repeatedly replace focused lane nodes. R22 shares the authoritative-order signature, refreshes track controls in place across permission/pending changes, and retains semantic solo/global state dependencies. Mounted unordered-track focus regression fails before repair and passes afterward (8/8), including repeated updates and authority recovery. Actual current-build Delete/undo/render and final journeys remain required. [Changed scopes](../assets/p4-ux/verification-20261104/focus-reviewed-scopes-r22.json) remain UNVERIFIED.
