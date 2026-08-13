---
evidence_id: EVD-20260813-WP-ADV-002-TOOL-REGISTRY-PRECHECK
date: 2026-08-13
work_package_id: WP-ADV-002
repository_commit: worktree-tool-usability-registry
code_fingerprint: 6831b85967b8e4120326f2fa73c24d40cebc499fd9b9c42f4568d382682cfc6d
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011]
commands: ["pnpm run acceptance:advanced:tools:real", "pnpm run acceptance:advanced:synthetic", "pnpm run acceptance:tool-usability", "pnpm run typecheck", "pnpm run worker:python:lint", "pnpm run docs:sync", "pnpm run docs:check", "git diff --check"]
result: bounded_advanced_tools_encoded_and_tool_usability_tests_passed
environment: "Windows local checkout; generated local AV fixture for advanced tool review plus generated synthetic media; no user media, network service, or AI invocation"
artifacts: ["Advanced Preview/Master: committed PiP X/Y animation, non-linear corrected rectangular mosaic trajectory, segmented constant-speed preserve-pitch remap, two explicit-overlap Cross Dissolves, basic Rec.709 grades, word-highlight captions, fades and loudness; QC passed and project reopened", "Static Reframe: 9:16 geometry and mode-specific pixels", "Clip fades: pixel and audio-amplitude ramps plus invalid-duration blocks", "Master loudness: target and true-peak metrics plus no-audio behavior", "Ducking: measurable reduction, measurable during-dialogue music floor, recovery, no-dialogue/no-music and invalid-input outcomes", "Time remap: encoded freeze/reverse frames and reverse audio", "Caption: encoded timed word-highlight route", "Structural objects: cycle and CommitPlan failure closure", "Transition: resolver blocker and no successful publication"]
remaining_risks: ["This Evidence does not accept or expose full CAP-TL/CAP-KF/CAP-XFORM/CAP-COMP/CAP-TIME/CAP-TRANS/CAP-COLOR/CAP-MASK/CAP-TEXT/CAP-AUDIO families.", "No automatic subject tracking, segmentation, true Luma Matte, continuous Speed Ramp, Optical Flow, full GraphicScene, HDR, recursive nested rendering, or adjustment-clip rendering is established.", "The deleted eleven-family driver was not rerun because its full-family claims were intentionally withdrawn."]
---

# WP-ADV-002 Tool Usability Registry PRECHECK

The misleading `advanced-family-real-acceptance` driver was physically removed. It had used broad-family labels and FFmpeg plan strings as though they were proof that every advanced capability was available. Valid domain validation, reopen, zero-publication, and encoded-media regression tests remain.

The new registry names only bounded tools and records their concrete input, encoded effect, persistence, and failure behavior. The focused suite passed. Ducking now uses `-30 dB`, `8:1`, `20 ms` attack, `350 ms` release, and a `12 dB` maximum reduction; its acceptance requires both measurable attenuation and a nonzero during-dialogue music floor, so a configuration that makes music disappear cannot pass.

This is machine tool verification only. It neither calls nor exposes any AI tool. It supports acceptance of the bounded tools in the Tool Usability Registry; it does not assert that every original ACC-001 through ACC-011 professional-family assertion is complete or remove their remaining debt.
