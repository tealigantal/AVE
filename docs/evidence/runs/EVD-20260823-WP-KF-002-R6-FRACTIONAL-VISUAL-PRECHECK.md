---
evidence_id: EVD-20260823-WP-KF-002-R6-FRACTIONAL-VISUAL-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-registered-transform-automation-r6
code_fingerprint: fb1d3b3ff08033f0fea4f9e284851743bb1589fa45151da63d9c1426423acc0e
capability_ids: [CAP-KF-001, CAP-XFORM-001]
acceptance_ids: [ACC-035]
commands: ["pnpm run acceptance:transform-automation:real with fresh run-20260823-v38", "FFplay byte-identical v36 Master for two complete twelve-second playback cycles", "pnpm run worker:render-correctness:test", "pnpm run worker:render-graph:test", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run timeline-render:test", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: fractional_position_machine_and_agent_visual_precheck_passed_user_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 H.264/AAC source; local Worker, FFmpeg/ffprobe, FFplay and Windows Computer Use observation; no copied media, network service, model call or AI media generation"
artifacts: ["Rejected and diagnostic roots retained unchanged: run-20260823-v32 half-pixel review, run-20260823-v33 incomplete generic-equation performance probe, run-20260823-v34 and v35 rejected premultiply translation probes", "Final replacement review root: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v38", "Preview SHA-256 f0232151397e294767f068bfe8fd30aed31671c2d4357c7e094c8488d2426ced", "verified-Original Master SHA-256 f0232151397e294767f068bfe8fd30aed31671c2d4357c7e094c8488d2426ced", "reopen Master SHA-256 f0232151397e294767f068bfe8fd30aed31671c2d4357c7e094c8488d2426ced", "semantic graph SHA-256 3807a678390ff3c44d84f0d11241d013e64f795823231655a35714dcdfa43578", "Preview and Master each contain 1439 frames at r_frame_rate 120/1, time_base 1/15360 and constant timestamp step 128", "four-second descent contains 476 unique frames; its 408-frame motion core has zero adjacent and zero two-frame repeats", "four-second ascent contains 475 unique frames; its 408-frame motion core has zero adjacent and zero two-frame repeats", "R5 v32 contained only 459/458 distinct moving frames and 21/22 adjacent repeats; R6 reduces those edge repeats to 4/5", "luma-weighted center has zero reverse steps over one quarter pixel in descent and ascent; top/bottom/top hold ranges remain below one tenth pixel", "maximum descent frame step fell from R5 1.1162 pixels to R6 0.7734; maximum ascent magnitude fell from 1.0272 to 0.7419", "safe opaque in-canvas sources dispatch to profile-frame fractional translation", "encoded opaque-source plus alpha-mask regression proves derived-alpha placement dispatches to 2x before moving to the expected final geometry", "encoded resource-legal edge-crossing regression proves the 2x fallback succeeds rather than blocking or using integer placement", "alpha-bearing source compilation also retains the bounded 2x path", "Preview and Master checkpoints and frame timing match", "QC passed", "agent observed the byte-identical v36 Master through two complete FFplay cycles including top hold, descent, bottom hold, ascent and final hold without visible twitch or stepped jumps", "eight invalid Timeline commands left Timeline/version/command/event/render/manifest/bundle authority unchanged", "missing-source and Worker publication failure produced no render result, manifest or bundle", "close/reopen preserved all curve fields and deterministic rerender hash", "Worker media correctness separately covers combined and per-property position, independent scale, rotation, anchor and multiplicative opacity"]
remaining_risks: ["User review of retained v38 Preview/Master is pending; ACC-035 and WP-KF-002 remain blocked/active.", "The current-fingerprint aggregate pnpm run check passed docs, fingerprint, type, architecture, contracts, storage, boundaries, Worker protocol/media correctness and the new fractional/fallback tests, then twice stopped at the unrelated existing Basic Vlog ducking recovery amplitude assertion; its isolated command passed once and later reproduced the same nondeterminism. The out-of-scope test was not weakened or edited.", "This position-only visual sample intentionally keeps scale, rotation, anchor and opacity constant; their execution evidence is machine media correctness, not human acceptance in this artifact.", "This bounded Evidence does not complete CAP-KF-001, CAP-XFORM-001, ACC-001 or ACC-002.", "Track and non-transform automation, static original-size, 4K geometry automation, dynamic subject-aware reframe and unsupported composition combinations remain fail-closed."]
---

# WP-KF-002 Registered Transform Automation R6 Fractional Visual PRECHECK

The user rejected R5 v32 because bounded 2x placement still exposed a visible
half-pixel cadence. R6 keeps the authoritative 120 fps clock but replaces the
safe opaque, in-canvas position-only lane with per-frame linear fractional
translation. Edge-crossing and possible-alpha inputs retain the resource-gated
2x/Lanczos path, and dynamic multi-property transforms retain the original RGBA
path.

The generic per-pixel equation prototype was rejected as too slow for a real
tool. Premultiply/unpremultiply perspective prototypes were also rejected by
the existing quarter-pixel trajectory gate because their edge conversions
created centroid reversals. The retained implementation evaluates the curve
once per profile frame and linearly resamples all opaque planes together.

Retained v38 is a twelve-second position-only smoothness review. Its descent and
ascent have 476 and 475 distinct decoded frames out of 480, versus 459 and 458
in R5. Both 408-frame movement cores have zero adjacent and zero two-frame
repeats, and neither direction has a reverse step over one quarter pixel.
Preview, verified-Original Master and reopen Master are byte-identical. The
agent played the byte-identical v36 Master through two complete cycles before
the pixel-format and derived-alpha dispatch guards were added; v38 retained the same media hash.

This is an agent visual PRECHECK, not user acceptance. `ACC-035` remains
`blocked` and `WP-KF-002` remains `active` until the user reviews and accepts
the retained v38 artifact.
