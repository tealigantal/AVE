---
evidence_id: EVD-20260812-WP-ADV-002-PRECHECK
date: 2026-08-12
work_package_id: WP-ADV-002
repository_commit: worktree-before-human-acceptance
code_fingerprint: fd5e8440a9049fba4ddc5d9b1070723060ae2cb5330159645b9aa32c7b7926d9
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034]
commands: ["pnpm run acceptance:advanced:families:real", "pnpm run acceptance:advanced:synthetic", "pnpm run timeline-core:test", "pnpm run render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run typecheck", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "ffprobe all eleven Masters", "SHA-256 all eleven Masters", "pnpm run check"]
result: eleven_real_media_outputs_machine_verified_human_review_pending
environment: "Windows local checkout; authorized repository-external CC BY 3.0 AV derivatives and local narration; retained review suite outside repository; no media or absolute path committed"
artifacts: ["ACC-001:f8a4546ec74ee4d835e15ad363c61172e42e62b70af535eede7cafee3db0bb3b", "ACC-002:b0761ad60632d1344d309494f2e9ce44ac17c11461ef3e111c4398b23935e1e0", "ACC-003:bda17cdd9ec8b90eee740b757e10b965bbaa415d5a47abedf7e02473ae9088bb", "ACC-004:9044d0c3ac7dce06825036a440aba22990cb85d5d7e59596239443543555c327", "ACC-005:82cc22c68ef36221f61fb66527e0a87f30389475c275662d7a0416a0d8636bb8", "ACC-006:4645e92eb5cff7c147ca7db7c3905a5d0c4e26f23c472774c2bf3c334bde3719", "ACC-007:70685a042f9e09193c9d456836581c0b205962efdb296a3c3458b31b342bb1bd", "ACC-008:c379b4db0fecaf41bb327b52fb4f43d555d19f992d28fd6edc1f99c94cee91e8", "ACC-009:1b1485c9e2168c394bd342c1e0a481e81b2adab3f9aef17af87c09afe8c8cee5", "ACC-010:6832dda556124f574276c7a3fea662066a6f69807101ccaa899cfbbcd317b45d", "ACC-011:ace60e7de052931049a1548beed50d3a2f85962d5b9710f20e8ddfd010ff8b68", "all:360x640_H264_AAC48k", "preview_master_semantic_identity:passed", "verified_original:passed", "reopen:passed"]
remaining_risks: ["The user has not yet watched or accepted the eleven retained outputs.", "The subject composite uses a bounded rectangular alpha region rather than an inferred per-pixel person segmentation matte.", "The graphic package uses a bounded typed semantic sidecar and timed text bake rather than the complete arbitrary GraphicScene asset catalogue.", "The color case proves a hash-pinned LUT plus Rec.709 SDR grade; it does not claim a native HDR camera fixture.", "Nested, adjustment and compound structures preserve typed provenance and execute resolved source/effect clips; general recursive flattening and range-targeted adjustment semantics remain active debt."]
---

# WP-ADV-002 PRECHECK

The formal Project Host created eleven independent projects and committed every retained case through Edit Intent, Edit IR, simulation, validation and CommitPlan. Each case rendered Preview and a verified-Original Master from the same target-neutral semantic graph, passed Worker execution and QC, then survived close/reopen with Timeline version and render records intact.

The retained root contains `ACC-001.mp4` through `ACC-011.mp4`, `INDEX.md`, a hash-rich aggregate JSON report and the eleven project directories. Every root video is 360 by 640 H.264 with 48 kHz AAC. Durations range from 6 to 18 seconds; the remap case is 9.983 seconds and the transition family is 11 seconds.

Machine assertions cover three-layer compositing and Bézier expressions, blurred-background vertical reframe, four explicit-overlap transition filters, speed/freeze/reverse A/V remap, corrected tracking mosaic, bounded alpha subject composite, mutually exclusive word highlighting, timed graphic semantics, hash-pinned LUT plus SDR grade, Dialogue/Music/SFX routing with side-chain compression and loudness normalization, and persisted Nested/Adjustment/Compound structures. Negative validation covers invalid tangent and sequence cycles; existing aggregate tests retain handle, LUT, tracking, source and resolver blocker coverage.

This is PRECHECK, not human acceptance. The broad capability statuses remain blocked and `WP-ADV-002` remains active until the user reports the outcome. The bounded representations and remaining risks above are deliberately not promoted into claims of complete arbitrary segmentation, GraphicScene, native HDR or recursive nesting support.
