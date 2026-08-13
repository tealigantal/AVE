---
evidence_id: EVD-20260812-WP-ADV-001-REVISION-01-PRECHECK
date: 2026-08-12
work_package_id: WP-ADV-001
repository_commit: worktree-before-human-acceptance
code_fingerprint: 3dd7ef99741c7da8f67f17d6e047f454ba6e0bea8d8e2615bd015de7ae6b667b
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034]
commands: ["pnpm run acceptance:advanced:synthetic", "pnpm run acceptance:advanced:real", "ffprobe Master", "SHA-256 Preview and Master", "twelve-frame contact sheet inspection", "pnpm run check"]
result: advanced_real_media_revision_precheck_passed_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 AV media; retained review project outside repository; no media or absolute path committed"
artifacts: ["external 10.517-second revised advanced Preview/Master review bundle", "preview_sha256:f1a2f2a45db639768edf9ddf5ad5f0813c7fa0a10878ac8f4509aa14a7edcb79", "master_sha256:a8667339d98bb6a9dcb210a9409a05931a7be65363651bbad81783caedbe1e0a", "semantic_graph_hash:99d7d35992639db3b78d918bc5792027937f2fe012bd4b66d53dd203441bfb49", "timeline_version:1", "qc:passed", "duration:10.517s", "video:360x640_30fps_315_frames", "audio:AAC_48kHz_stereo", "caption_safe_y_ratio:0.68", "word_highlights:2s_each", "transitions:2", "audio_normalization:-14.00_LUFS_-2.79_dBTP", "ducking:applied", "reopen:passed"]
remaining_risks: ["The user has not yet accepted the revised subtitle position, duration, pacing, picture or audio result.", "The bounded showcase still does not complete every variant in the broad v1 advanced catalogue."]
---

# WP-ADV-001 revision 01 PRECHECK

The user rejected the first retained review cut because its caption sat too low and its 5.5-second duration was too short for inspection. The prior immutable PRECHECK remains historical evidence; this revision supersedes its review artifact without overwriting it.

The formal Edit Intent/IR/CommitPlan now produces a 10.517-second Timeline from the authorized six-second source by re-editing verified source ranges into three main segments, two explicit-overlap Cross Dissolves, a ten-second half-speed moving PiP, extended routed audio clips and a longer caption. The Caption style persists `safe_y_ratio: 0.68`; RenderGraph carries it to the Worker, and both white base text and yellow word highlights execute at the same safe-area y expression. Each highlighted phrase remains visible for approximately two seconds.

Preview and Master share semantic graph `99d7d35992639db3b78d918bc5792027937f2fe012bd4b66d53dd203441bfb49`; Master uses the verified Original. The final output contains 315 frames at 360 by 640 and 30 fps plus 48 kHz stereo AAC. QC, SHA-256 verification, -14.00 LUFS/-2.79 dBTP normalization, ducking, close/reopen and persisted plans/results passed. A twelve-frame contact sheet confirms the caption is visibly higher and the longer edit exposes both transitions and the moving PiP over multiple samples.

This remains PRECHECK, not creative acceptance. `WP-ADV-001` and `ACC-034` stay active until the user watches the revised Master.
