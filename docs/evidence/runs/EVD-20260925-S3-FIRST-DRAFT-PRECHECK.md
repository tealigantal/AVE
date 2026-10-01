---
evidence_id: EVD-20260925-S3-FIRST-DRAFT-PRECHECK
date: 2026-09-25
code_fingerprint: e9e728e8bab55a53437618144f87a8284390e80cf9f667f02a3b084db9ff6155
repository_commit: 36bf33986cff202dd1a46ed8d4e3237382139e24
result: targeted_passed_full_gates_pending
---
# First actual cold-start draft and preserved failures

Same active WP-S3-INTEGRATION-001. Source evidence and compiled output remain private outside Git. Principle IDs are constrained to the authorized snapshot, source selection uses actual span/asset identity and current Timeline tick bounds, and verbatim caption alternatives use exact, non-uncertain transcript references whose endpoints fit that grid. Raw observations remain unchanged; no model item is filtered or fixed after receipt. The compiler and commit gates remain strict.

Targeted property test (including actual JSON Schema validation), stage3-generation-host test and typecheck exit 0. The Host test checks invented principle rejection with unchanged version and draft count. These are engineering tests, not model acceptance.

Actual local run host-integration-1790346030752: one configured qwen3-max planning call using the saved real observation from host-integration-1790345504424 produced three unequal cuts totaling 668/30 seconds. Preview and Master QC passed; reopening retains Timeline and render receipt. Output SHA256: 50bf491b72291579227c59c554f183fac30b442831abe4663e399f74ab680a83. The model incorrectly claimed 28.1 seconds in prose; authoritative duration is 22.2667 seconds. No caption is fabricated to fit unavailable exact alignment.

Original failed runs retained: 1790344268358 audio range, 1790344495327 source range, 1790344753460 audio range, 1790345504424 unsupported quote and 1790345822678 inexact time. Each has raw response, failed state and no wrong Timeline commit. The planner configuration change was explicit and newly authorized; no silent fallback, automatic candidate repair or same-input pass-seeking retry. Earlier acoustic semantic and SSE failures remain open.

Production UI validation is underway. This is not completion of C1-C9, independent-source personalization, or the full first-loop checkpoint. Only one independent real source is located; same-source slices cannot supply the held-out case. Recording session 01 failed odd dimensions and session 02 was stopped without finalization; neither is acceptance evidence.

Scope bindings for engineering regression; statuses unchanged:
- CAP-RENDER-001; scope_fingerprint: f1c18f0fb8eded323565a9702cdb05326a354a39df1a37c1e7a849b05c5795d9
- CAP-PRESET-001; scope_fingerprint: a9cf8335402860a067be6e21887aeabd926a5624bc487430a581694b60be394f
- CAP-FND-001; scope_fingerprint: e38d8c26281af9502ed5cf95f6cae99f99888578bf74edac4cfc4378ebca465f
- CAP-CA-GOV-001; scope_fingerprint: 7b2725463a8d338b8a811ae53ac85db4e6a131b911e8282ba14fc133e6fdbda3
- CAP-CA-CONTEXT-001; scope_fingerprint: 7f6d82da24a390e50a563fea06fe5d349f9565f87291e8effebeeed3708e423d
- CAP-CA-SKILL-001; scope_fingerprint: 1b21ee36fbb8d1b874723f2a00d0f2aba79f2589d45246f0956025929640a899
- CAP-CA-DURATION-001; scope_fingerprint: 05295b9b118a93858a9a2a73017937924abc0489a3d541a985dd87be94466b0e
- CAP-CA-STORY-001; scope_fingerprint: 4c5dba512f79dad5f541c9cb15b489fbb5118019de658df809ef0458ff848a23
- CAP-CA-PERMISSION-001; scope_fingerprint: 9ce62b04537f9f7509f1d1e94397a893148b51b07f043890cc5900091d42eb0f
- CAP-CA-PIPELINE-001; scope_fingerprint: c4abb8aaebeb5a7eedd984e867b184570b79fb903ffd7c8787599106e426342e
- CAP-CA-FEEDBACK-001; scope_fingerprint: bc3eb441395d2ccd724ba57ee4fe2a41f65430afd66d39b693872fd277343631
- CAP-CA-PRODUCT-001; scope_fingerprint: cb08b6371956d0bdd9c816dc1118af5f76551a5a49ca4186c23e314d6c23ec1b
- CAP-CA-PRODUCT-002; scope_fingerprint: 33da5f62e43e68bf272cd5e76a97af13c887bbdfb7b54e261c2ea2d0f131d0c6
- CAP-CA-UX-001; scope_fingerprint: 03f7697f367fbc0cad1a4cfd7fd2ffec52a0273ecf3daa22a969eb837e9823c2
- CAP-CA-EXIT-001; scope_fingerprint: 80e396fec384df9786ab06113e3b14b5abe7c8b7ff78ad401128c395077ccb56
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 9b5dda9d66429921f6110615dd9a9887b918bb8efbe4ee1bf27f8e28aa386445
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 8aa8d8eea51b1a35ec9b0055f901b673b8cc6d5cba48c451c8f1eaa3afe9e420
