---
evidence_id: EVD-20260826-WP-AUDIO-CI-001-PRECHECK
date: 2026-08-26
work_package_id: WP-AUDIO-CI-001
repository_commit: worktree-deterministic-ducking-tail-precheck
code_fingerprint: ab735716a96047438e5849e2b37934d32496ebb3236756e15fe651e92809322a
capability_ids: [CAP-AUDIO-001, CAP-RENDER-001]
acceptance_ids: [ACC-018]
commands: ["audio-only compiled-filter diagnostic: 10 baseline runs, 20 single-thread runs and 30 fixed-frame runs", "pnpm run basic-vlog-toolkit:test", "five isolated basic_vlog_toolkit_acceptance.py stress runs", "pnpm run acceptance:tool-usability", "pnpm run worker:render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run worker:qc:test", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run render-bundle:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; FFmpeg 7.1.1; synthetic 48 kHz Dialogue and Music; repository-external temporary diagnostics are not committed"
artifacts: ["same graph plan and cache identity produced encoded outputs of 71841 bytes SHA-256 431A4F87832F2B81468E3C0655E580D054F9B67545CF9690B878697F69E62672 and 59763 bytes SHA-256 4D0C9457133660D95D777EDAD5D5C14309B319B8A693FE1B457C407643772D11", "bad encoded output measured approximately -91 dB in the full-band 3.3-second window while the good output measured approximately -36.1 dB", "audio-only baseline produced correct PCM SHA-256 4482FF4CF3E397E0DCB6BFEDF541DD03ADE3F92B79AE1D978BEC41440F93FB4C and early-silent PCM SHA-256 0964EE38DC1EC0A8B354D888830B8C3763BDE20E0FD036DCBBA7D1F30DFE757B from the same filter graph", "filter_complex_threads=1 still produced three PCM hashes and did not close the defect", "both exact-duration compressor inputs now use asetnsamples n=1024 p=0", "30 consecutive audio-only fixed-frame runs produced one correct PCM hash", "five permanent-test invocations each rendered one initial plus four repeated exact-plan outputs and checked fixed 3.0 3.3 and 3.6-second recovery windows", "focused Worker tool-usability static and architecture gates pass"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Exact-head remote security and check jobs plus a fresh review-thread audit remain required.", "The synthetic proof does not promote the bounded ducking slice into a general professional audio bus or envelope capability.", "Private real-media status is unchanged and no new real-media claim is made.", "No PR merge is authorized."]
---

# WP-AUDIO-CI-001 precheck

The same-plan early-silent Music tail is independently reproduced as a real
encoded-output defect. Equal non-padding sample frames on both compressor inputs
close the observed FIFO-boundary nondeterminism without relaxing output checks.
