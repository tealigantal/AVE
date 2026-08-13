---
evidence_id: EVD-20260812-WP-FND-001-REAL-MEDIA-PRECHECK
date: 2026-08-12
work_package_id: WP-FND-001
repository_commit: worktree-before-human-acceptance
code_fingerprint: 285ea4f42d74ecbde0f0c966481f188658fd8bfc45a0e64e8488c5af6154db2f
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033]
commands: ["pnpm run acceptance:foundation:real", "ffprobe encoded Preview and Master", "SHA-256 encoded Preview and Master", "visual frame inspection at start/middle/end", "project close and reopen assertions"]
result: real_media_machine_precheck_passed_human_acceptance_pending
environment: "Windows local checkout; authorized repository-external manifest and review project; no media or local absolute path committed"
artifacts: ["external v4 review bundle with Preview, Master, QC and reopened project", "manifest_sha256:f23935f43b911d13575b839211ddcd43a2f0dc893a2b104a791ac40e9e04ab72", "verified_original_asset_id:asset:sha256:a2190676133690f1d698b45fc07fef4b2449c855e6d49d659708918c7450f02a", "semantic_graph_hash:05ddb7838020e6b9679b927cb6073a97cbdef54c0ba1e0dd22c24f8055efe309", "preview_sha256:e531345dfec1a3f9455dbdb0b4c209c9658a1a80d8c338b587c2d45d4e72aee4", "master_sha256:e531345dfec1a3f9455dbdb0b4c209c9658a1a80d8c338b587c2d45d4e72aee4"]
remaining_risks: ["User accepted the picture output but must still accept v4 audio before ACC-033, CAP-FND-001 and WP-FND-001 can be accepted/completed.", "No Proxy was supplied, so Preview and Master both use the verified Original and are byte-identical."]
---

# WP-FND-001 authorized real-media PRECHECK

The formal Foundation lane imported an attributed repository-external six-second H.264/AAC Original, copied it to a new location, asked Project Host to relink it, and verified that streamed content identity remained the same Asset ID. The unified edit path committed Timeline version 1. Preview and Master then rendered from the persisted relinked Original, published two Render Results plus their content-addressed outputs and ExecutionPlans, passed QC with no issues, closed, and reopened at the same Timeline version.

Both targets carry the same target-neutral semantic graph hash and verified Original object reference. Because the manifest intentionally contains no Proxy, both targets use the Original and their encoded hashes are identical. Both outputs contain 48 kHz stereo AAC; machine analysis reports approximately -15.6 dB mean, -0.5 dB peak and no silence interval of at least one second below -50 dB.

The first attempted source contained real narration followed by more than three seconds of source silence. QC correctly blocked that attempt with `SILENCE`; the assertion was not weakened and the blocked output was not promoted. The user accepted start, middle and end picture output, then correctly questioned the video-only intermediate candidate. The final v4 review bundle restores continuous music from the same attributed work and now awaits user audio acceptance. Until that review, ACC-033 remains pending human acceptance, CAP-FND-001 remains `implemented_pending_real_media_acceptance`, WP-FND-001 remains active, and `docs:complete` is not run.
