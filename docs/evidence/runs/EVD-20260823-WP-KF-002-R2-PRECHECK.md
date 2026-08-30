---
evidence_id: EVD-20260823-WP-KF-002-R2-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-registered-transform-automation-r2
code_fingerprint: 047845f32871bc8a3741b94bc9662594e748004d12584ebed869d28ddfb5fb6b
capability_ids: [CAP-KF-001, CAP-XFORM-001]
acceptance_ids: [ACC-035]
commands: ["ffprobe per-frame PTS and framemd5 diagnostics on retained v9", "ffmpeg bbox trajectory diagnostics on retained v9", "pnpm run worker:render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run acceptance:transform-automation:real", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: machine_precheck_passed_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 H.264/AAC source; local Worker and FFmpeg/ffprobe; no copied media, network service, model call or AI invocation"
artifacts: ["Superseded rejected review root retained unchanged: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v9", "Replacement review root: C:/Users/24179/Videos/AVE-TEST/transform-automation/run-20260823-v12", "Preview SHA-256 7c31356ecc5fdd1a071c8f026e635a7d98c36eac93202310cc4b16c7c5020a3a", "verified-Original Master SHA-256 7c31356ecc5fdd1a071c8f026e635a7d98c36eac93202310cc4b16c7c5020a3a", "reopen Master SHA-256 7c31356ecc5fdd1a071c8f026e635a7d98c36eac93202310cc4b16c7c5020a3a", "semantic graph SHA-256 3f99b8557a8e5af23dc5737afe7b5ad83f8aa28fb4d91615de621c097645cbd9", "Preview and Master each contain 120 frames at r_frame_rate 30/1, time_base 1/15360 and constant timestamp step 512", "Preview and Master geometry centers are start [188,133.5], middle [289.5,177], end [392.5,213.5]", "QC passed", "isolated rotating Worker output contains 60 frames with no adjacent decoded-frame duplicate", "eight invalid Timeline commands left Timeline/version/command/event/render/manifest/bundle authority unchanged", "missing-source and Worker publication failure produced no render result, manifest or bundle", "close/reopen preserved all curve fields and deterministic rerender hash"]
remaining_risks: ["Renewed human review of retained v12 Preview/Master is pending; ACC-035 and WP-KF-002 remain blocked/active.", "This bounded evidence does not complete CAP-KF-001, CAP-XFORM-001, ACC-001 or ACC-002.", "Track and non-transform automation, static original-size, 4K geometry automation, dynamic subject-aware reframe and unsupported composition combinations remain fail-closed."]
---

# WP-KF-002 Registered Transform Automation R2 PRECHECK

Human review rejected v9 for visible vertical jitter. Diagnostics confirmed
that the encoded file exposed evenly spaced 30 fps timestamps, but the Worker
created its rotation pivot from an independent FFmpeg `color` source whose
implicit frame rate was 25 fps. Scale, anchor and rotation could therefore
advance on a different clock from the 30 fps canvas. The v9 review fixture also
combined a large moving-anchor range with insufficient y travel, causing the
content center to reverse vertically while the review question promised smooth
one-direction movement.

R2 derives the transparent pivot surface from the transformed clip stream, so
it shares exact timestamps and cadence. Worker correctness now rejects adjacent
decoded-frame duplication in an isolated continuous rotation. The real lane
declares 30 fps, proves 120 equal timestamp steps in both Preview and Master,
and requires start, middle and end geometry to move strictly right and down.

The retained v12 Preview, verified-Original Master and reopen Master are
byte-identical, QC-passed replacement review artifacts. This remains machine
PRECHECK only: renewed human review is authoritative, so `ACC-035` stays
`blocked` and `WP-KF-002` stays `active`.
