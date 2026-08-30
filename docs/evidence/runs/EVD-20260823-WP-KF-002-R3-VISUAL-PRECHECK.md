---
evidence_id: EVD-20260823-WP-KF-002-R3-VISUAL-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-registered-transform-automation-r3
code_fingerprint: 03d33cc126894f1c77a69357eed19a8ab3b9b614378264d6306d07eb264eb501
capability_ids: [CAP-KF-001, CAP-XFORM-001]
acceptance_ids: [ACC-035]
commands: ["pnpm run worker:render-correctness:test", "pnpm run typecheck", "pnpm run acceptance:transform-automation:real", "FFplay retained v15 Master for two complete ten-second loops with half-second visual checkpoints", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: machine_precheck_and_agent_visual_review_passed_user_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 H.264/AAC source; local Worker, FFmpeg/ffprobe and FFplay; no copied media, network service, model call or AI media generation"
artifacts: ["Superseded rejected review roots retained unchanged: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v9 and run-20260823-v12", "Replacement review root: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v15", "Preview SHA-256 a79717d61a03a6eb258aed6c12a330edcf793f5aba29d1fda7d5a9d090ff6e86", "verified-Original Master SHA-256 a79717d61a03a6eb258aed6c12a330edcf793f5aba29d1fda7d5a9d090ff6e86", "reopen Master SHA-256 a79717d61a03a6eb258aed6c12a330edcf793f5aba29d1fda7d5a9d090ff6e86", "semantic graph SHA-256 017407f59bc2ab75b3ad83f1e880abfaeec5ee24bfe6dc39cdfc819746371b71", "Preview and Master each contain 300 frames at r_frame_rate 30/1, time_base 1/15360 and constant timestamp step 512", "top hold y range 0 px; descent y 79 to 254.5 with no reverse step over 2 px; bottom hold y range 0 px; ascent y 254.5 to 82 with no reverse step over 2 px; final top hold y range 1 px", "Preview/Master checkpoints share start center [280.5,79.5], bottom center [355.5,254] and returned center [280.5,79.5]", "QC passed", "agent visual review inspected two complete FFplay loops and found stable holds, continuous descent and ascent, coherent rotation/scale/opacity and no visible vertical twitch", "eight invalid Timeline commands left Timeline/version/command/event/render/manifest/bundle authority unchanged", "missing-source and Worker publication failure produced no render result, manifest or bundle", "close/reopen preserved all curve fields and deterministic rerender hash"]
remaining_risks: ["User review of retained v15 Preview/Master is pending; ACC-035 and WP-KF-002 remain blocked/active.", "This bounded Evidence does not complete CAP-KF-001, CAP-XFORM-001, ACC-001 or ACC-002.", "Track and non-transform automation, static original-size, 4K geometry automation, dynamic subject-aware reframe and unsupported composition combinations remain fail-closed."]
---

# WP-KF-002 Registered Transform Automation R3 Visual PRECHECK

The user rejected retained v12 because motion still appeared to twitch, the
review was too short, and it showed descent without a return ascent. The v15
fixture therefore runs for ten seconds: one-second top hold, three-second
zero-slope eased descent, one-second bottom hold, three-second zero-slope eased
ascent and two-second final top hold. All eight registered transform properties
remain active through both directions.

Preview, verified-Original Master and reopen Master are byte-identical and
contain exactly 300 equally spaced 30 fps frames. Phase trajectory measurements
reject holds wider than two pixels and any reverse step over two pixels during
descent or ascent. The agent then visually inspected two complete FFplay loops;
both holds remained stable and both directions appeared continuous without the
previous vertical twitch.

This is an agent visual PRECHECK, not user acceptance. `ACC-035` remains
`blocked` and `WP-KF-002` remains `active` until the user reviews and accepts
the retained v15 artifact.
