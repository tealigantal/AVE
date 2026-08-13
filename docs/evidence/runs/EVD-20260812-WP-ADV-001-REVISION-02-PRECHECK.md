---
evidence_id: EVD-20260812-WP-ADV-001-REVISION-02-PRECHECK
date: 2026-08-12
work_package_id: WP-ADV-001
repository_commit: worktree-before-human-acceptance
code_fingerprint: 2c1f544efa0fb4407659032022918513dd049120358001e16dbfd382e3e2a945
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034]
commands: ["pnpm run acceptance:advanced:synthetic", "pnpm run acceptance:advanced:real", "ffprobe Master", "silencedetect Master", "SHA-256 Preview and Master", "twelve-frame contact sheet and three caption-window frames", "pnpm run check"]
result: advanced_real_media_revision_02_precheck_passed_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 AV media; retained review project outside repository; no media or absolute path committed"
artifacts: ["external 10.600-second revised advanced Preview/Master review bundle", "preview_sha256:449ade3558b7b520d74ab62a66f2ea5bec5ef4c6ac630e3fc51b4da465c98e5c", "master_sha256:d9c9fd523ce64bfeedb0c24a762127fca2d0e50a66d431d189662aa4b3f8a5ea", "semantic_graph_hash:e3532831a69eb3172e15d8af772957078f33fe54b2139f283a41f3c1aba629af", "timeline_version:1", "qc:passed", "duration:10.600s", "video:360x640_30fps_315_frames", "audio:AAC_48kHz_stereo", "audio_producers:1", "ducking:disabled", "silence_over_1s:none", "caption_base_and_highlights:mutually_exclusive", "audio_normalization:-14.18_LUFS_-1.57_dBTP", "reopen:passed"]
remaining_risks: ["The user has not yet accepted the revised captions, audio continuity, pacing or picture.", "The authorized source has one already-mixed audio stream, so this review cannot honestly demonstrate independent Dialogue/Music ducking."]
---

# WP-ADV-001 revision 02 PRECHECK

The user rejected revision 01 because the white base caption and yellow word highlight occupied the same line simultaneously and because copies of the same mixed source audio were assigned to video, Dialogue and Music paths. Revision 01 remains immutable historical Evidence; revision 02 supersedes it for human review.

The caption executor now makes the base sentence and every word-highlight window mutually exclusive. At 1.0 seconds only the white full sentence is present; at 2.5 seconds only yellow `高级剪辑` is present; at 7.5 seconds only yellow `真实流程` is present. All use the same persisted 0.68 safe-area height. The contact sheet and dedicated frames show no white/yellow overlap.

The Timeline contains one audio track and one audio clip. Main-video and PiP embedded audio are muted. The one authorized mixed stream is preserve-pitch time-mapped across the complete 10.5-second Timeline, faded at both boundaries, normalized, and encoded as 48 kHz stereo AAC. There are no Dialogue/Music buses and no `sidechaincompress`; `ducking_status` is explicitly `disabled`. FFmpeg `silencedetect` found no interval longer than one second. Master measured -14.18 LUFS and -1.57 dBTP, and QC passed.

The external edit sheet maps every claimed tool to an exact timecode and expected visible or audible result. This remains PRECHECK, not creative acceptance; `WP-ADV-001` and `ACC-034` stay active.
