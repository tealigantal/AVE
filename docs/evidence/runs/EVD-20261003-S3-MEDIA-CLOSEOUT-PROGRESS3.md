---
evidence_id: EVD-20261003-S3-MEDIA-CLOSEOUT-PROGRESS3
work_package_id: WP-S3-MEDIA-CLOSEOUT-001
capability_ids: [CAP-S3-MEDIA-CLOSEOUT-001]
acceptance_ids: [ACC-S3-MEDIA-CLOSEOUT-001]
date: 2026-10-03
code_fingerprint: 1e2e4d7d2561236fc0774f7467bd646d44414653c991aa5a105da9daaefd15d5
result: in_progress_real_journeys_and_final_checks_pending
---
# P5 fixed-root guidance and historical verification

Final synthetic acceptance passed after the legacy QC fix. The second full check stopped on two added test fields typed unknown; the test assertions were correctly typed and typecheck passed. Actual Host replacement/solo/offline regression passed. Real invalid returns remain failed and unchanged: independent voice incorrectly entered picture selection, and an unsupported verbatim caption was added despite the user requesting manual-only captions. New version-pinned guidance states that measured selection is picture only, audio has actual intended ranges and picture anchors, and explicit no-caption requests must be respected. No rejected response is repaired or resent automatically.

Independent read-only validation loaded two saved pre-change real v3 projects (Skill and non-Skill) and verified roots and all four derived physical inputs against recorded digests. Every comparison was exact; no Host recovery, model call, credentials read or project write occurred. The marked-root property test and typecheck passed. Full check and both actual journeys remain pending; capability statuses and human acceptance are unchanged.

## Applicability
- CAP-RENDER-001; scope_fingerprint: 79a70eb4cc332f871c9e22a9b9959b459a72b7f94d041286bdea08f8168989fa
- CAP-PRESET-001; scope_fingerprint: d52aa85e43a93b0fa570d3fb3351692692c8c5b918216b45f393dbe70a4cfca6
- CAP-FND-001; scope_fingerprint: ee3f643d08515c9e56a9f48f4c7d00ea6f5ce2a2a859e84514f54ef1006abd2a
- CAP-CA-GOV-001; scope_fingerprint: dee82ed1099499be6b827b6aeb53f532c3b0c4ab186a197b23a5400b4ea976f4
- CAP-CA-CONTEXT-001; scope_fingerprint: 829c3a93d17060db1250c83248adff634a9c1cb01266156359c6765f9375101d
- CAP-CA-SKILL-001; scope_fingerprint: ca32104ff1c6c781b4713f6ab29b5cacec1cbf50486c86d9fe107ceb422b5790
- CAP-CA-DURATION-001; scope_fingerprint: 2b0d25c4c80d12ecc06e7a54d6beb6b86161cec92d0b1b491dfad8f82cae427a
- CAP-CA-STORY-001; scope_fingerprint: da4f427df043093d454eb3603f956b6dbbc0002e7ef1ffd8cf3d944c49eb48da
- CAP-CA-PERMISSION-001; scope_fingerprint: 2f2f55da042be22e1d069ffec357ac42f52647ce7afcc71e5b8ea77573423dd2
- CAP-CA-PIPELINE-001; scope_fingerprint: 45624f282699df07f6bae22d0be79676fc9c1cec134bd9fa04937ee03dd4f42a
- CAP-CA-FEEDBACK-001; scope_fingerprint: 8d3af6a923fb346bbbbbb6d80897c4230f02eae092ce26254804e3b73cc8634e
- CAP-CA-PRODUCT-001; scope_fingerprint: 7cfaa00fbe229a2303454384655947fb9c5193d727c692b187f0da56a9659030
- CAP-CA-PRODUCT-002; scope_fingerprint: 0bdb7578e5507be3524b5d015741f6a6fbfba688ad9741dd1a93fe8c5f360018
- CAP-CA-UX-001; scope_fingerprint: c43f08515c40463b60da578b8fbad18dc54c92cf9f8f192bf2e3f25d624df7f0
- CAP-CA-EXIT-001; scope_fingerprint: 95907f4b329150b42f52fdbfc7134c444a0f2ceae47574c448a2a8cc3dd27e12
- CAP-CA-GOV-003; scope_fingerprint: 62c3aeacdbef7ff454a1a06f5764262eaf4bd783a88cd58435cb95931c9b7783
- CAP-CA-GOV-002; scope_fingerprint: b59d428fd30193f8bfa9f48312ebbaded43874ba42aa2b793e5ef359e7cfb0d0
- CAP-CA-SEC-001; scope_fingerprint: e75d54dc9116930d077f5715e24bfb1fc062ef4d7b15ffc6a5f16943e7488e88
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 032f813de0e2da2500de6acc6a66f9f460892b4029e9994913102e2a7b608e1c
- CAP-S3-SKILL-001; scope_fingerprint: eb6357cb9fd267838be9f2074b9f517e307c4fd15ea4ee7be900861f3b6ace4f
- CAP-S3-DOCKER-001; scope_fingerprint: e72e7f6f538b496c1b8008385982ed1989210c68ad705287867ba86407659e39
- CAP-S3-WEB-001; scope_fingerprint: d38ffd0f1223443dcce29d81b7d4f1b600b0eb29eef4576c99b7f9ed0aa5ac2b
- CAP-S3-DOCKER-CLEAN-001; scope_fingerprint: 93c9558e7f8fd696727294c0c42218ca5a73b454bacbdd07eacba5a8a0b3be27
- CAP-S3-MEDIA-001; scope_fingerprint: a7dabb6dfc49d5673b1f05f5a9b5bfe25afa5127cb316e128391a34a525870ba
- CAP-S3-AUDIO-PACK-001; scope_fingerprint: 8007a1b8576c5ef2c5eb2f282a0a692e93714fd79922d1308c136cc74d516d93
- CAP-S3-SOUNDTRACK-001; scope_fingerprint: 14e189ca4fed56a505286d5f845dae5eca7a8cdf3d987d11fe4bf1f2269247a0
- CAP-S3-PRECISION-001; scope_fingerprint: e24ef7bf4846009743de46a8d45c1fc1f585294bcac015be5dfb2e59ba457652
