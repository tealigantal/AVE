---
evidence_id: EVD-20261003-S3-MEDIA-CLOSEOUT-CI1
work_package_id: WP-S3-MEDIA-CLOSEOUT-001
capability_ids: [CAP-S3-MEDIA-CLOSEOUT-001]
acceptance_ids: [ACC-S3-MEDIA-CLOSEOUT-001]
date: 2026-10-03
code_fingerprint: c00b18ad65f1cf818aa7e8d4774e6884b0c573f5c52bcd4f8e0697daa368fc6f
result: passed_checkout_identity_pending_remote_ci
---
# Exact reviewed catalog survives Git checkout

[CI1](https://github.com/tealigantal/AVE/actions/runs/37111613556) on e8410b58370f6734f420b2dc55db0b53a577937d passed security but check rejected the catalog before Stage2: Git had normalized reviewed CRLF bytes (4cb5e936…) to LF (abbe58ac…). Failure is preserved, not retried unchanged or waived.

The narrow .gitattributes boundary pins the exact reviewed catalog and hashed export sidecars. Runtime digest, version, download/content identities, previous requests and real project evidence remain unchanged. No checksum normalization or permissive identity branch was added. Explicit P5 allowed paths cover these packaging files. Attributes SHA256: add23991fe36e1dfa8a30eb2af7e366c1b2bc4f58a9b22c8a6520414a15e55d1. Catalog index and isolated checkout have identical 384715 bytes, SHA256 4cb5e9360787b6e644cfde679d159e5ec36e27badecb49aeb4a83fa3a15273ac. All 13 committed review file identities match the published manifest. Fixed catalog-source.md/catalog.v1.json/public.ts are byte-identical to main; only P3 typed routing catalog.ts differs.

Actual controlled Host pack regression passed download/range/hash/errors, request grant, audition, atomic music/SFX, dedup/cache cleanup and offline reopen/dual render; log SHA256 d570a22030c9841ee2a389621c2ac44c48fa2b588d5c326e288ab68a7c282fbe. Prior [actual Browser/Electron engineering evidence](EVD-20261003-S3-MEDIA-CLOSEOUT-ENGINEERING.md) remains applicable to unchanged runtime/media. New exact-head remote CI and final P5 publication still required. No Stage Exit or human acceptance promotion.

## Applicability
- CAP-RENDER-001; scope_fingerprint: dcff541fb7e48776f9bdf51999f71ea69628429f38b7cb55e86cd1cfc6f0984c
- CAP-PRESET-001; scope_fingerprint: 728fb6000bf8d399a4891b2a606b3602fe47f3d7457a9edc18e6cd350154dc7c
- CAP-FND-001; scope_fingerprint: 588cef672c79f8a2c875b9469145f8fad1ae478934adfa03549f6204d947a5d2
- CAP-CA-GOV-001; scope_fingerprint: eea690497108abd6e3c64ad6f72eaac890da2ea8d61de5466a07f3b14626f538
- CAP-CA-CONTEXT-001; scope_fingerprint: 8bc3a941a547f1afad6a419223df4916cd8bbe302d2364015254671716698ac6
- CAP-CA-SKILL-001; scope_fingerprint: 1da26512aad901b565f2a2aa5f2631e51918b58a059076bf449732f86250542f
- CAP-CA-DURATION-001; scope_fingerprint: c49ab2fe432db5b3d40cc2ef9962c4b5aeec219eef0b4bac8e736f46034b6d6b
- CAP-CA-STORY-001; scope_fingerprint: 286d7459eac2628d7422367e38c33f1c84ab98f8e8fd3b8662f5b944f20bd94e
- CAP-CA-PERMISSION-001; scope_fingerprint: 20d505548ae006a3c062374591083b7b63963b9f2456a352731f0dc275c2adb6
- CAP-CA-PIPELINE-001; scope_fingerprint: a774163a47afe8db31a542e9337f5c301361cd49975a0925346b93e6068b935a
- CAP-CA-FEEDBACK-001; scope_fingerprint: f184b3c053800e3f46cfc323ab3b581734216b875d8ac8054b4b036696193b13
- CAP-CA-PRODUCT-001; scope_fingerprint: 28f8bf2054e1ff293a383b5ed5a765d9734eb39b6642440c740b4ac19e4e282a
- CAP-CA-PRODUCT-002; scope_fingerprint: 005f6cae0a9ec0ea2300b0d545f5cc35c3c3dba148161d539177827903abe525
- CAP-CA-UX-001; scope_fingerprint: c0878b0195fa737f42aea66efb396fbf1c9f00d6bb8f0561126ffe97f0c4915d
- CAP-CA-EXIT-001; scope_fingerprint: 1554d6d4ba98b4505567d3a0b0a621fbc4bada783877b28eab980b4b8a68281f
- CAP-CA-GOV-003; scope_fingerprint: 1dc11fd58a6f098f1133ba18709d28350bc844daeb35ca22741656443893ad4d
- CAP-CA-GOV-002; scope_fingerprint: 1a55b172c2f72cd42d0d13b4064cadf3e0354392226d7a3e2250e029e83ac742
- CAP-CA-SEC-001; scope_fingerprint: 130db6a48e8929a92ec1519640d714af427b62e0c2a0cd5a122a9c9453d163a9
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 8b1c9713bfe515847cdd38094bc747b4f5d01d3b29b09a79af394e7672bfea49
- CAP-S3-SKILL-001; scope_fingerprint: baa30a6aa8b50923aed075c504c3f12119071182958db8063990a566d7e64b44
- CAP-S3-DOCKER-001; scope_fingerprint: 22c1ee47030da200497af708a2a2a3b50d2febc72a11d0f75112cf5730e06d4b
- CAP-S3-WEB-001; scope_fingerprint: d052f69b80e8f13f96a0f15913e8b31660165163089fdcd6d827700b09aa16d0
- CAP-S3-DOCKER-CLEAN-001; scope_fingerprint: 4b59cd6112531fa7d56f1f4d5e8b519f40700361a0b950b2879bc520afc88c9b
- CAP-S3-MEDIA-001; scope_fingerprint: 8f54898328758a8f7f7aa85d390686ed4930eb48742143ecae8209d4a62532e2
- CAP-S3-AUDIO-PACK-001; scope_fingerprint: 47b2495e7cab5291aa83780474441c8ccca23d554ce883262050bf8ad2158839
- CAP-S3-SOUNDTRACK-001; scope_fingerprint: 594674e1f2fd35d76d6fb7109ceb326b54b0401e2b0ad820b793bced6c4cef6a
- CAP-S3-PRECISION-001; scope_fingerprint: 96a9c001f45b63a247a267f1169fb81bda2b1b5fa09a7cd3ccf64d7b2d46a28c
