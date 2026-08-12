---
evidence_id: EVD-20260812-WP-ADV-001-PRECHECK
date: 2026-08-12
work_package_id: WP-ADV-001
repository_commit: worktree-before-human-acceptance
code_fingerprint: a33c68f7dfe357ceae47aa4cb1f9c6cc3649bbd3c65e246e3b57dd5765d951db
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034]
commands: ["pnpm run acceptance:advanced:synthetic", "pnpm run acceptance:advanced:real", "pnpm run worker:render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run typecheck", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "ffprobe Master", "SHA-256 Preview and Master", "six-frame contact sheet inspection", "pnpm run check"]
result: advanced_real_media_precheck_passed_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 AV media; retained review project outside repository; no media or absolute path committed"
artifacts: ["external 5.5-second advanced Preview/Master review bundle", "preview_sha256:4f4d84f2024d292fc0265745dfceb9618c38c60e54cac253367389a216a29edc", "master_sha256:700a8d3323c8b327a5c09277a7c105509edbe15769b88bec260270e7b04355a9", "semantic_graph_hash:e29164e900115df96525aad0797713281b4ea387ab58d73f16dacfa8880c614b", "timeline_version:1", "qc:passed", "duration:5.5s", "video:360x640_30fps_165_frames", "audio:AAC_48kHz_stereo", "audio_normalization:-14.03_LUFS_-3.10_dBTP", "ducking:applied", "reopen:passed"]
remaining_risks: ["The user has not yet accepted the creative picture, pacing, text or audio result.", "This showcase does not complete every variant in the broad v1 advanced catalogue: nested/compound/adjustment execution, ellipse/feather masks, animated tracking size, non-dissolve transitions, optical flow/change-pitch, full HDR/10-bit/color-space pipeline, arbitrary GraphicScene assets and professional DAW effects remain governed blockers."]
---

# WP-ADV-001 advanced real-media PRECHECK

The formal Project Host imported and verified authorized real AV media, then committed one atomic Edit Intent/IR/CommitPlan containing overlapping transition clips, an animated PiP track, a tracked mosaic, a two-stage preserve-pitch speed map, two static color grades, word-timed Chinese text and two routed audio tracks. The final committed state validates as a whole, while invalid legacy transition representations remain blocked before Worker execution.

Preview and Master resolved from the same target-neutral semantic graph. Master used the persisted verified Original. The Worker executed a Bézier x curve plus linear y curve, per-frame PiP placement, corrected rectangular tracking position, a one-second two-input Cross Dissolve with explicit overlap, 2/3-speed then 1x remap with synchronized audio, warm/cool grade contrast, word-level yellow highlight, Dialogue/Music side-chain ducking, music boundary fades and Master two-pass loudness normalization.

The retained encoded output is 360 by 640, 30 fps, 165 frames and 5.5 seconds with 48 kHz stereo AAC. QC passed; Master measured -14.03 LUFS and -3.10 dBTP. Close/reopen preserved Timeline version 1, both automation curves, two render results, ExecutionPlans, output manifests and semantic identity. A six-frame contact sheet shows the PiP moving from upper left toward lower right, the main-shot change and separate word highlights without black frames or subtitle overflow.

This PRECHECK is not human creative acceptance. `ACC-034` and `WP-ADV-001` remain active until the user watches the retained Master. It also does not promote every original advanced family acceptance: only the explicitly listed bounded operations are executable in this showcase, and the remaining catalogue variants stay fail-closed.

The final aggregate `pnpm run check` passed without skipped or weakened assertions. The final real-media lane additionally asserts the actual Worker filter graph contains the declared Cross Dissolve, per-frame overlay, tracked crop, color, word-highlight, side-chain and fade operations. One pre-existing Basic Vlog signal sample missed its recovery threshold during an earlier aggregate attempt; an unchanged focused rerun and the final unchanged aggregate run both passed. The test and threshold were not modified.
