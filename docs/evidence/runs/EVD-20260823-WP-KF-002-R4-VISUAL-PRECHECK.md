---
evidence_id: EVD-20260823-WP-KF-002-R4-VISUAL-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-registered-transform-automation-r4
code_fingerprint: 7d41f2f5bef0cbc2d549ddffd858639c56f726cf03c67f14648790cfb947586c
capability_ids: [CAP-KF-001, CAP-XFORM-001]
acceptance_ids: [ACC-035]
commands: ["pnpm run worker:render-correctness:test", "pnpm run typecheck", "pnpm run acceptance:transform-automation:real", "FFplay byte-identical retained v16 Master for two complete ten-second loops", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: strengthened_machine_precheck_and_agent_visual_review_passed_user_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 H.264/AAC source; local Worker, FFmpeg/ffprobe and FFplay; no copied media, network service, model call or AI media generation"
artifacts: ["Superseded rejected review roots retained unchanged: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v9 and run-20260823-v12", "Final replacement review root: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v17", "Preview SHA-256 a79717d61a03a6eb258aed6c12a330edcf793f5aba29d1fda7d5a9d090ff6e86", "verified-Original Master SHA-256 a79717d61a03a6eb258aed6c12a330edcf793f5aba29d1fda7d5a9d090ff6e86", "reopen Master SHA-256 a79717d61a03a6eb258aed6c12a330edcf793f5aba29d1fda7d5a9d090ff6e86", "semantic graph SHA-256 017407f59bc2ab75b3ad83f1e880abfaeec5ee24bfe6dc39cdfc819746371b71", "Preview and Master each contain 300 frames at r_frame_rate 30/1, time_base 1/15360 and constant timestamp step 512", "descent and ascent each contain zero adjacent decoded-frame duplicates", "luma-weighted center has zero reverse steps over one quarter pixel in descent and ascent; top/bottom/top hold ranges are each below one quarter pixel", "Preview/Master checkpoints share start center [280.5,79.5], bottom center [355.5,254] and returned center [280.5,79.5]", "QC passed", "agent visually inspected two complete loops of retained v16; v16 and final v17 Master are byte-identical", "eight invalid Timeline commands left Timeline/version/command/event/render/manifest/bundle authority unchanged", "missing-source and Worker publication failure produced no render result, manifest or bundle", "close/reopen preserved all curve fields and deterministic rerender hash"]
remaining_risks: ["User review of retained v17 Preview/Master is pending; ACC-035 and WP-KF-002 remain blocked/active.", "This bounded Evidence does not complete CAP-KF-001, CAP-XFORM-001, ACC-001 or ACC-002.", "Track and non-transform automation, static original-size, 4K geometry automation, dynamic subject-aware reframe and unsupported composition combinations remain fail-closed."]
---

# WP-KF-002 Registered Transform Automation R4 Visual PRECHECK

Independent review found that R3's two-pixel bounding-box threshold could hide
sub-pixel reverse steps and did not audit adjacent decoded-frame duplication in
the moving phases. R4 replaces that gate with decoded luma-weighted centers,
rejects any reverse step over one quarter pixel, and rejects any adjacent
duplicate frame during descent or ascent. The machine-readable review artifact
records both results.

Retained v17 runs for ten seconds: top hold, zero-slope eased descent, bottom
hold, zero-slope eased ascent and final top hold. It has zero quarter-pixel
reverse steps and zero adjacent decoded-frame duplicates in both moving phases.
Preview, verified-Original Master and reopen Master are byte-identical. The v17
Master is also byte-identical to v16, which the agent visually inspected for two
complete loops without seeing the previous twitch.

This is an agent visual PRECHECK, not user acceptance. `ACC-035` remains
`blocked` and `WP-KF-002` remains `active` until the user reviews and accepts
the retained v17 artifact.
