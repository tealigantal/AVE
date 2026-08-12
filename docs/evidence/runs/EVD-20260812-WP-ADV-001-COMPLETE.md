---
evidence_id: EVD-20260812-WP-ADV-001-COMPLETE
date: 2026-08-12
work_package_id: WP-ADV-001
repository_commit: da855127723f322418ccea8325744cf9052a1877-plus-governance-closure
code_fingerprint: 2c1f544efa0fb4407659032022918513dd049120358001e16dbfd382e3e2a945
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034]
commands: ["pnpm run acceptance:advanced:synthetic", "pnpm run acceptance:advanced:real", "ffprobe Master", "silencedetect Master", "SHA-256 Preview and Master", "twelve-frame contact sheet and three caption-window frames", "pnpm run check", "user human review"]
result: bounded_advanced_showcase_accepted
environment: "Windows local checkout; authorized repository-external CC BY 3.0 AV media; retained review project outside repository; no media or absolute path committed"
artifacts: ["user-accepted external 10.600-second v19 Preview/Master review bundle", "preview_sha256:449ade3558b7b520d74ab62a66f2ea5bec5ef4c6ac630e3fc51b4da465c98e5c", "master_sha256:d9c9fd523ce64bfeedb0c24a762127fca2d0e50a66d431d189662aa4b3f8a5ea", "semantic_graph_hash:e3532831a69eb3172e15d8af772957078f33fe54b2139f283a41f3c1aba629af", "timeline_version:1", "qc:passed", "duration:10.600s", "video:360x640_30fps_315_frames", "audio:AAC_48kHz_stereo", "audio_producers:1", "ducking:disabled", "silence_over_1s:none", "caption_base_and_highlights:mutually_exclusive", "audio_normalization:-14.18_LUFS_-1.57_dBTP", "reopen:passed", "human_review:accepted"]
remaining_risks: ["This acceptance is bounded to the combined v19 showcase and does not satisfy every assertion in ACC-001 through ACC-011.", "Nested/compound/adjustment execution, remaining automation and transform properties, ellipse/feather/segmentation masks, non-dissolve transition families, change-pitch/optical-flow, full HDR/10-bit color, arbitrary GraphicScene and professional independent-audio effects remain governed blockers.", "The authorized source has one already-mixed audio stream; independent Dialogue/Music ducking was explicitly disabled and not claimed for v19."]
---

# WP-ADV-001 COMPLETE

The user explicitly reported `人工验收通过` for the retained v19 Master after rejecting earlier revisions for low/short captions, overlapping caption layers and duplicated audio. Human acceptance applies to v19 with Master SHA-256 `d9c9fd523ce64bfeedb0c24a762127fca2d0e50a66d431d189662aa4b3f8a5ea` and the timecoded edit sheet delivered alongside it.

The accepted Timeline uses the formal Project Host to commit three graded main-video segments, two explicit-overlap Cross Dissolves, a ten-second Bézier/linear moving PiP, a corrected moving rectangular mosaic, bounded preserve-pitch time semantics, mutually exclusive safe-area base/word captions and one continuous audio producer with boundary fades and Master normalization. Preview and Master share semantic graph `e3532831a69eb3172e15d8af772957078f33fe54b2139f283a41f3c1aba629af`; Master uses the verified Original.

Machine validation passed before review: 360 by 640 at 30 fps and 315 frames, 48 kHz stereo AAC, no silence interval longer than one second, -14.18 LUFS and -1.57 dBTP, QC pass, object/output hashes, close/reopen persistence, focused synthetic and real lanes, and the aggregate repository check. Caption-window frames show white base text outside highlight intervals and only one yellow phrase inside each highlight interval.

`ACC-034` is accepted and `WP-ADV-001` may close. This Evidence does not upgrade the original broad-family `ACC-001` through `ACC-011`; they retain their current blocked status because the accepted showcase intentionally covers bounded executable subsets rather than every original assertion. Capability-family statuses and active Debt remain unchanged.
