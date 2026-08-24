---
evidence_id: EVD-20260823-WP-KF-002-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-registered-transform-automation
code_fingerprint: 0a600139df9fa262a3dde6027159b3cba019d33460bc1d9c79472fe36cf8fab1
capability_ids: [CAP-KF-001, CAP-XFORM-001]
acceptance_ids: [ACC-035]
commands: ["pnpm run timeline-core:test", "pnpm run render-graph:test", "pnpm run timeline-render:test", "pnpm run worker:render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run architecture", "pnpm run acceptance:transform-automation:real", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: machine_precheck_passed_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 H.264/AAC source; local Worker and FFmpeg/ffprobe; no copied media, network service, model call or AI invocation"
artifacts: ["External retained review root: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v9", "Preview SHA-256 6facf3be2642b65a640612a895135c31bf0243e1cf32d19d219be814e89987ae", "verified-Original Master SHA-256 6facf3be2642b65a640612a895135c31bf0243e1cf32d19d219be814e89987ae", "reopen Master SHA-256 6facf3be2642b65a640612a895135c31bf0243e1cf32d19d219be814e89987ae", "semantic graph SHA-256 68b16cc91711542e0e302fbc369d68999729789f9e9eeb37911d09057ea9a334", "QC passed", "Preview and Master start/middle/end geometry and luma measurements match", "isolated Worker encoded measurements for x, y, scale_x, scale_y, rotation, anchor_x, anchor_y and multiplicative opacity including an alpha-bearing source", "eight invalid Timeline commands left Timeline/version/command/event/render/manifest/bundle authority unchanged", "missing-source and Worker publication failure produced no render result, manifest or bundle", "close/reopen preserved all curve fields and deterministic rerender hash"]
remaining_risks: ["Human review of retained v9 Preview/Master is pending; ACC-035 and WP-KF-002 remain blocked/active.", "This bounded evidence does not complete CAP-KF-001, CAP-XFORM-001, ACC-001 or ACC-002.", "Track and non-transform automation, static original-size, 4K geometry automation, dynamic subject-aware reframe and unsupported composition combinations remain fail-closed."]
---

# WP-KF-002 Registered Transform Automation PRECHECK

The current implementation admits exactly eight numeric clip-target transform
paths through Timeline CommitPlan, one explicit RenderGraph automation decision
per curve, and the existing FFmpeg Worker. It rejects unknown interpolation,
wrong kinds, invalid tangents, Hermite overshoot, duplicate paths, non-visible
targets, unsafe raster/resource envelopes and source-geometry drift instead of
committing or silently normalizing them.

The retained v9 real-media run encoded both Preview and verified-Original
Master, measured three frames from each, passed QC, closed/reopened the project
and reproduced the Master byte-for-byte. Worker correctness separately isolates
all eight property effects and proves opacity multiplies an alpha-bearing
source rather than replacing its alpha.

This is machine PRECHECK only. The user has not yet accepted the retained
picture, motion, opacity and Preview/Master experience, so `ACC-035` remains
`blocked` and `WP-KF-002` remains `active`. No parent capability family or broad
advanced acceptance is promoted.
