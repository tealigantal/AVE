---
evidence_id: EVD-20261002-S3-DOCKER-COMPOSE-FINAL
work_package_id: WP-S3-DOCKER-001
date: 2026-10-02
code_fingerprint: 475c5ccd3063eaaf7e82173f0939eb49636a97564a46e1c3e6f347634d5cdd1e
capability_ids: [CAP-S3-DOCKER-001]
acceptance_ids: [ACC-S3-DOCKER-001]
result: passed
---
# Root Compose portable CPU and CUDA container acceptance

## Scope
User authorized CPU operation, available CUDA acceleration, all-service Compose startup and existing keys preserved in local .env. Root Compose owns image builds, credential materialization and pinned cache preparation. Portable default requests no GPU; launcher probes actual Docker/CTranslate2 CUDA and persists the GPU override choice. Static Compose itself cannot detect a host GPU before reservation. Current local .env selects CUDA. No commit/push/release was performed; no native model configuration or unrelated container was replaced.

## Actual runtime and media evidence
- Final desktop/Whisper images built. Actual root docker compose up -d --wait succeeded: configuration/cache exited 0, desktop and Whisper healthy. Actual final image recreation retained project volume, exported files and recent-project profile; fresh browser reopened the stored project.
- Actual CPU Compose removed all GPU reservations, became healthy with CPU/int8, and transcribed generated SAPI speech: Hello. This is a test of the Container Speech Recognition Service. Actual CUDA/float32 API transcribed the same phrase. Same Whisper-small immutable revision; no model substitution or hidden runtime retry. CPU portability was tested by withholding GPU devices on this NVIDIA-equipped host; another physical CPU-only host was not tested.
- Container production Host imported two encoded synthetic originals, measured/planned/committed the draft, rendered Preview and Master independently, passed QC, exported 63573 bytes, closed and reopened identical render bytes. Model replies for this creative workflow were controlled fixtures, not cloud-model or real-media acceptance. Final data survives container recreation at /workspace/projects/compose-acceptance-UfQFz5/project.
- Actual streamed AVE desktop opened that project, selected v1, displayed its rendered preview and used the normal export panel/native save dialog. UI reported export completed. /workspace/exports/compose-browser-export.mp4 exactly matches Host Master: SHA256 85ba638af42bc5e627bbab486554142f3bfe36bf795803accd3b68dbf7d9cd50, 63573 bytes, 2.5 seconds, H264/AAC. Windows export binding received both files.
- Actual Pulse output.monitor non-silent audio capture encoded successfully; after a browser gesture the browser AudioWorklet reported decoded level 50, buffer 30ms and underrun 0 during a generated tone. This proves audio transport/decoding, not subjective human listening acceptance. Browser screenshot evidence is linked below.
- Actual Renderer NoNewPrivs=1 and Seccomp=2; no --no-sandbox/privileged/SYS_ADMIN/docker.sock. Credential file mode 0600, UID 1000; desktop mount read-only. Both exact original cloud keys matched .env; Git ignores .env and build context excludes it. Keys are withheld in all evidence/log outputs.

## Checks
- node tests/integration/docker-packaging.test.mjs passed on final images: CPU/GPU topology and device policy, cache/config dependency ordering, invalid/missing inputs, actual private credential generation/mode, missing-key rejection, unchanged seccomp rules.
- pnpm run check passed with existing isolated Worker interpreter on PATH; local full gates covered application/architecture/contracts/media/Host. Final packaging additions were separately checked and final typecheck/architecture passed.
- pnpm run acceptance:final:synthetic passed; no new real media/human/Stage Exit claim.
- Final documentation synchronization/completion checks are recorded in the ExecPlan. Historical capability status is retained through unchanged-source scope pins; Docker becomes tested only.

[Browser rendered fixture](EVD-20261002-S3-DOCKER-BROWSER.png) and [normal export completed](EVD-20261002-S3-DOCKER-EXPORT.png).

- CAP-RENDER-001; scope_fingerprint: 810370388d64b1f9446619f0b34f0cd36c48020e23016ec4526f7a5f4c9af885
- CAP-PRESET-001; scope_fingerprint: d1e86e5833e24e1152eb1652bcbfbe91d19214867575c22a827bba329e39030d
- CAP-FND-001; scope_fingerprint: 8551b16f9b6b83c16cab041725b19d376d14f3ba7b61ea42cadce01dbeef748e
- CAP-CA-GOV-001; scope_fingerprint: 70db40a61b0552d6de09cd709573f4fe2c11d2123da965e55246fa3a34fdd3c9
- CAP-CA-CONTEXT-001; scope_fingerprint: 51d7dc068a671fe1fffb0f077fa3cd7fa8971d8d7b2a4729cb3a1f0320adc7cd
- CAP-CA-SKILL-001; scope_fingerprint: 519a11b79d87a98946be6e045bc5f81784f7fd6575b4d9c01081bdede9250a95
- CAP-CA-DURATION-001; scope_fingerprint: 0ba67f9040ee6310b741fe794f34dd905e9af92f7d5a2fb1260fd3cb80150c4f
- CAP-CA-STORY-001; scope_fingerprint: 708fcf196a02d71f20f4428130baee8e821d324b4039cee7c36a2b131266a195
- CAP-CA-PERMISSION-001; scope_fingerprint: 1ec6cd8f7091d988e1ecf8f124847cafb8a1449cec549418fd1227d7828e4e2f
- CAP-CA-PIPELINE-001; scope_fingerprint: 26996a682434f4130ad6ff1d24ee970f5037534300e3c3f64a7bc22e1fcf4dc3
- CAP-CA-FEEDBACK-001; scope_fingerprint: fa71ab05d693e79664c27cb6dfd353eda7f30cfd6e2cd481f352cc98abb10900
- CAP-CA-PRODUCT-001; scope_fingerprint: 8db32649d6b30fea10d37c6bf36b590a2d53b8eb793978b9d0424f9b49ba3096
- CAP-CA-PRODUCT-002; scope_fingerprint: 5560952b4c91d1fa1fc4105753da7f77e93f2e74da4bea5618c3ea6e321d3a7e
- CAP-CA-UX-001; scope_fingerprint: 0f30446c35bb180401aa76453efa2ebc0de6e8d6ea330d7f65f76c38e49a6960
- CAP-CA-EXIT-001; scope_fingerprint: 71f657903153b715a84e4c120e2b55a47231c127ea20671d9c65ea2b32eff76b
- CAP-CA-GOV-003; scope_fingerprint: a356ece5dda1d8447080db4fdfe1959ac11d6eddeee13f568102f84673dd0906
- CAP-CA-GOV-002; scope_fingerprint: 06f10f2e0bf842e8cc93002d3ac1b1190389a2e9f30e868aba2cbf89e2afafef
- CAP-CA-SEC-001; scope_fingerprint: 42ec5fe8daac8a6c1ab87e014fd03f1065ced7515baa2d18ef3a828ea560cac3
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 945b6f6115d82310ee71fd7da48b9023e2ebcfb21b721aa5e8fee6ad91ad6b6e
- CAP-S3-SKILL-001; scope_fingerprint: fe5ef8e39bf8108b5ee910eb3c7f721f9ef83e4b738d6e25f64b5600f62b584f
- CAP-S3-DOCKER-001; scope_fingerprint: f0fa9a94a2bf9c2ac47ffef517f7ee58041343b10fff73829e395165f7155c97
