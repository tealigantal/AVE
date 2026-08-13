---
evidence_id: EVD-20260812-WP-FND-001-ALL-TOOLS-REAL-PRECHECK
date: 2026-08-12
work_package_id: WP-FND-001
repository_commit: worktree-before-human-acceptance
code_fingerprint: 219c0cb455d7701e703ee60ce875fd20922adad79dd06a74435655a638920898
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033]
commands: ["pnpm run acceptance:basic-vlog:real-review", "pnpm run acceptance:real", "pnpm run acceptance:foundation:real", "pnpm run check", "ffprobe Preview and Master", "SHA-256 Preview and Master", "project SQLite integrity and reopen assertions"]
result: all_registered_tests_and_real_multi_tool_precheck_passed_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 media and review project; no media or local absolute path committed"
artifacts: ["external 12.1-second all-tools review bundle", "preview_sha256:138628c8efa2c0a0a852124d3e7ac8cddf11edf12d8f6b82924a60e33c279d68", "master_sha256:9f7600a44e8e9e1c45cd1a9174c89b9a97d241a780aaeaee7bc2b2fced38df20", "semantic_graph_hash:3395786959e32cf8bffa8044a53bedfdc36d651b1b5b92b04daf1def48681a63", "timeline_version:2", "qc:passed", "audio_normalization:-14.37_LUFS_-1.27_dBTP", "ducking:applied", "verified_preset_semantic_links:16", "three Original and two typed Proxy locations after reopen"]
remaining_risks: ["The user must review the final encoded Preview/Master before ACC-033 and WP-FND-001 can complete.", "Advanced nested sequences, dynamic automation, tracked masks, two-input transitions, full color/graphics and professional audio remain explicit blockers and were tested for fail-closed behavior, not rendered as supported tools."]
---

# WP-FND-001 all-tools real-media PRECHECK

A fresh external project ran the repository's established Basic Vlog real-review path over two attributed six-second video excerpts, one narration-bearing Original, a separate real music excerpt and a Chinese subtitle fixture. Project Host imported and fingerprinted three Originals, Worker generated two Proxy candidates with ProxyMaps, Host persisted the typed Proxy relations, and the unified edit path committed ordinary Timeline Commands and one built-in Preset application to Timeline version 2.

The encoded output exercises two-shot assembly, trim and placement, 9:16 blurred-background reframe, contain reframe, video head/tail fades, music head/tail fades, Chinese caption, Dialogue/Music routing, ducking with recovery and Master loudness normalization. Preview uses verified Proxy sources while Master uses verified Originals. Both share one target-neutral semantic graph and persist distinct target plans, cache identities and output hashes. The formal render links all 16 declared Preset semantics to actual plan nodes.

QC passed. Master measured -14.37 LUFS and -1.27 dBTP against the -14 LUFS/-1 dBTP policy. Close/reopen preserved schema 20, Timeline version 2, two Render Results, four render manifests, one completed Bundle, three Original locations, two typed Proxy locations and the Preset provenance. Unavailable Preset version and missing aspect ratio produced explicit blockers and zero Commands.

The full repository `pnpm run check` covers every registered tool, boundary, protocol, recovery and editing test. Separate P0 and Foundation real lanes passed. This does not relabel blocked advanced capability families as implemented: their fail-closed tests passed, but they do not appear as executable effects in the review movie. The final encoded Preview/Master now await user acceptance.
