---
evidence_id: EVD-20260823-WP-KF-002-R5-120FPS-VISUAL-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-registered-transform-automation-r5
code_fingerprint: 55c5c0f4ca146134001d09946f78f4ed44b4b00c757399ea3ed9a990069e749b
capability_ids: [CAP-KF-001, CAP-XFORM-001]
acceptance_ids: [ACC-035]
commands: ["pnpm run acceptance:transform-automation:real with fresh run-20260823-v32", "FFplay byte-identical retained v30 Master through a complete twelve-second playback cycle", "pnpm run worker:render-correctness:test", "pnpm run worker:render-graph:test", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run timeline-render:test", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: 120fps_position_smoothness_machine_and_agent_visual_precheck_passed_user_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 H.264/AAC source; local Worker, FFmpeg/ffprobe and FFplay; no copied media, network service, model call or AI media generation"
artifacts: ["Rejected review roots retained unchanged: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v17 at 30 fps and run-20260823-v19 at 60 fps", "Final replacement review root: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v32", "Preview SHA-256 39ea799414a179405b05241937f86d5586055cc90cc7ced720c04ae2acbc6b2f", "verified-Original Master SHA-256 39ea799414a179405b05241937f86d5586055cc90cc7ced720c04ae2acbc6b2f", "reopen Master SHA-256 39ea799414a179405b05241937f86d5586055cc90cc7ced720c04ae2acbc6b2f", "semantic graph SHA-256 3807a678390ff3c44d84f0d11241d013e64f795823231655a35714dcdfa43578", "Preview and Master each contain 1439 frames at r_frame_rate 120/1, time_base 1/15360 and constant timestamp step 128; this is at most one absent final stationary boundary frame from the nominal 1440", "four-second descent contains 459 unique frames; its 408-frame motion core has zero adjacent and zero two-frame repeats", "four-second ascent contains 458 unique frames; its 408-frame motion core has zero adjacent and zero two-frame repeats", "remaining identical decoded frames are confined to the declared 0.3-second zero-velocity Bezier edge windows", "luma-weighted center has zero reverse steps over one quarter pixel in descent and ascent; top/bottom/top hold ranges are each below one quarter pixel", "Preview and Master checkpoints and frame timing match", "QC passed", "agent played the byte-identical v30 Master through the complete top/down/bottom/up/top cycle without the prior reverse twitch or stepped motion-core cadence", "large-source pure-position and maximum-scale-envelope regressions prove doubled source content over the per-axis or pixel-area budget blocks with AUTOMATION_POSITION_SUPERSAMPLE_RESOURCE_LIMIT", "eight invalid Timeline commands left Timeline/version/command/event/render/manifest/bundle authority unchanged", "missing-source and Worker publication failure produced no render result, manifest or bundle", "close/reopen preserved all curve fields and deterministic rerender hash", "Worker media correctness separately covers combined and per-property position, independent scale, rotation, anchor and multiplicative opacity"]
remaining_risks: ["User review of retained v32 Preview/Master is pending; ACC-035 and WP-KF-002 remain blocked/active.", "This position-only visual sample intentionally keeps scale, rotation, anchor and opacity constant; their execution evidence is machine media correctness, not human acceptance in this artifact.", "This bounded Evidence does not complete CAP-KF-001, CAP-XFORM-001, ACC-001 or ACC-002.", "Track and non-transform automation, static original-size, 4K geometry automation, dynamic subject-aware reframe and unsupported composition combinations remain fail-closed."]
---

# WP-KF-002 Registered Transform Automation R5 120 fps Visual PRECHECK

The user rejected the retained 30 fps v17 and 60 fps v19 reviews because motion
still looked visibly stepped. Inspection found two execution defects rather
than a display-only test issue. `RenderProfile.fps` existed in the graph but
Worker still inherited or hard-coded 30 fps for visual clocks and evaluated
dynamic transforms before the final output-rate conversion. After that was
fixed, FFmpeg overlay's integer coordinate placement still produced repeated
positions at a lower observable cadence.

R5 makes target profile cadence drive sources, held frames, gaps, canvases,
transition normalization and dynamic transform evaluation. The safe
position-only lane re-probes the source, proves both doubled canvas and doubled
transformed content fit the existing per-axis/area budget, places on a bounded
2x canvas and downsamples with Lanczos, preserving half-pixel movement without
changing scale, rotation, anchor or alpha semantics. Over-budget inputs block
explicitly. Dynamic multi-property transforms stay on the original RGBA path
and remain covered by combined and isolated Worker media tests.

Retained v32 is a twelve-second position-only smoothness review: top hold,
four-second zero-slope descent, bottom hold, four-second zero-slope ascent and
final top hold. Both 408-frame movement cores have zero adjacent repeats and
zero two-frame repeats, so neither a 60 fps nor 30 fps-equivalent cadence
remains in the visible-motion core. Identical edge frames occur only where the
declared Bezier velocity approaches zero. Preview, verified-Original Master and
reopen Master are byte-identical. The agent played the byte-identical v30
Master through the complete cycle without seeing the earlier twitch or stepped
motion core.

This is an agent visual PRECHECK, not user acceptance. `ACC-035` remains
`blocked` and `WP-KF-002` remains `active` until the user reviews and accepts
the retained v32 artifact.
