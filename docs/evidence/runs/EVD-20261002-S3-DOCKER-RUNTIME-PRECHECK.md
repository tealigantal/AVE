---
evidence_id: EVD-20261002-S3-DOCKER-RUNTIME-PRECHECK
work_package_id: WP-S3-DOCKER-001
date: 2026-10-02
code_fingerprint: fb48bbf3e799f13b9f20bd5cdb1d4de72727217442bbcbed621c19b73c603924
capability_ids: [CAP-S3-DOCKER-001]
acceptance_ids: [ACC-S3-DOCKER-001]
result: precheck
---
# Actual container runtime precheck

Both local images built successfully. The earlier image failed because Electron43 requires an explicit install step; fixed before the successful build. A second startup failed because model preparation referenced a missing desktop network; fixed with the independent setup service and a regression fixture. Fresh pinned Whisper-small cache downloaded successfully in45 seconds. Whisper serving health passed. Actual CUDA-configured transcription of a one-second synthetic silent PCM file returned HTTP200 with an empty string as expected for a transport/inference probe; no speech accuracy claim. Actual YAMNet acoustic inference returned its exact pinned model and structured description/uncertainty. No cloud model calls.

Docker packaging fixtures passed, including preserved upstream seccomp restrictions and the candidate namespace mask. The container's actual FFmpeg8.0.1/Python3.14/Pillow12.3.0 render_graph_media_correctness.py passed. Local typecheck, architecture, production compile and acceptance:final:synthetic passed. The first full check stopped at the Pillow12.3.0 assertion because PATH used system Python; the same test passed after selecting the existing isolated Worker interpreter. Full check must still be run on the final source with that interpreter.

Electron remains blocked by default Docker seccomp. Both normal setuid launch and the user namespace alternative failed with namespace EPERM/no usable sandbox. A narrowly argument-filtered candidate is prepared but not enabled. User authorization is pending under the supplied AGENTS rule forbidding unapproved permission expansion. No privileged mode, SYS_ADMIN, sandbox disabling, Docker/WSL restart or unrelated container change occurred. Browser audio, Host Preview/Master workflow, export and persistent reopen remain unverified; this package is not complete.

Logs are local temporary verification files; no credentials or private media are published. Existing capability statuses are historical and not newly promoted. Source applicability pins below cover unchanged application/contracts and new isolated packaging tests; they do not imply fresh human or Stage Exit acceptance.

- CAP-RENDER-001; scope_fingerprint: 6e5244ffa8e28552686585696a5602bf9def7902ad7491d9181aab5dbb201309
- CAP-PRESET-001; scope_fingerprint: deb3192d537b7cbae9eb9d880f32ad3591c32973a16574e937fec79d8f6ad8a8
- CAP-FND-001; scope_fingerprint: 3840bde78a53324a15702e871a1a67e773c0390d746646acc114bff90fbadca0
- CAP-CA-GOV-001; scope_fingerprint: 70db40a61b0552d6de09cd709573f4fe2c11d2123da965e55246fa3a34fdd3c9
- CAP-CA-CONTEXT-001; scope_fingerprint: 1753f8258cffa147cbb538b76f5866eaa15eb2fba6a38ca84d0b910be8ad13ad
- CAP-CA-SKILL-001; scope_fingerprint: 519a11b79d87a98946be6e045bc5f81784f7fd6575b4d9c01081bdede9250a95
- CAP-CA-DURATION-001; scope_fingerprint: 0ba67f9040ee6310b741fe794f34dd905e9af92f7d5a2fb1260fd3cb80150c4f
- CAP-CA-STORY-001; scope_fingerprint: 1929ae29b0897657d6461c0922b8d8551445c69c9074ec37231fef96289fdad4
- CAP-CA-PERMISSION-001; scope_fingerprint: 1ec6cd8f7091d988e1ecf8f124847cafb8a1449cec549418fd1227d7828e4e2f
- CAP-CA-PIPELINE-001; scope_fingerprint: 51a3db32ef1f27938d97b5a904bc67ccdc38f37721eda0c3f3a5ca7fa5019c69
- CAP-CA-FEEDBACK-001; scope_fingerprint: 7e7c4d2aa854fd1297b33c7526154e7e7f53f3cf357ae89ffff862c239166d8c
- CAP-CA-PRODUCT-001; scope_fingerprint: ca8ae2a8c16190c721cb0d9c24728f308446e563c66f7c66ca15cffa76808c5f
- CAP-CA-PRODUCT-002; scope_fingerprint: c8508fe4fe74c57d588b90321f14fd7c63221b572e17e3d9edfd69b8dc22db57
- CAP-CA-UX-001; scope_fingerprint: edcbec1e2108224d5327f78d206acbed9395853c0e6a73e52c72b3544c32653a
- CAP-CA-EXIT-001; scope_fingerprint: 4dedc4850a90e7353afbec98c96b7b62bbdf7c4c0e37f200071173a3cbd54d1f
- CAP-CA-GOV-003; scope_fingerprint: a356ece5dda1d8447080db4fdfe1959ac11d6eddeee13f568102f84673dd0906
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 42ec5fe8daac8a6c1ab87e014fd03f1065ced7515baa2d18ef3a828ea560cac3
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 945b6f6115d82310ee71fd7da48b9023e2ebcfb21b721aa5e8fee6ad91ad6b6e
- CAP-S3-SKILL-001; scope_fingerprint: fe5ef8e39bf8108b5ee910eb3c7f721f9ef83e4b738d6e25f64b5600f62b584f
