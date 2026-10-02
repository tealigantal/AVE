---
evidence_id: EVD-20261002-S3-WEB-FINAL
work_package_id: WP-S3-WEB-001
date: 2026-10-02
code_fingerprint: d026308abfae5c3ba09c1d4c8b56540921c97acedf48d21dc7be74dfc7df2c7a
capability_ids: [CAP-S3-WEB-001]
acceptance_ids: [ACC-S3-WEB-001]
result: passed
---
# Direct browser Docker delivery

## Scope and actual runtime
User rejected the streamed Ubuntu desktop. The new runtime serves the existing AVE renderer directly from Node, using shared Host request handlers and browser file/confirmation/download adapters. Runtime image has no Electron executable, XFCE or Xvfb; UID 1000, ordinary Docker isolation, loopback endpoint and no Docker socket. Native Electron sender checks, exact Host authorization, stale-operation checks, transaction path and Worker ownership remain intact. Root Compose still starts configuration, exact model cache, Host/YAMNet and Whisper; persistent volumes and existing .env/native configuration remain.

Actual final image builds and Compose initialization/readiness passed. Actual CPU deployment requested no GPU and transcribed generated Windows SAPI speech with int8. CUDA/float32 deployment transcribed the same phrase and was restored as the current local .env selection. CUDA-visible device count was 1; CPU run count was 0. This CPU portability test withheld GPU on this NVIDIA host, rather than using a second physical machine. Static Compose defaults CPU; the Windows launcher probes hardware and saves the CUDA override, as explicitly documented.

## Actual browser and configured model journey
Browser at localhost:6080 displayed AVE HTML/DOM directly. It created /workspace/projects/浏览器容器验证-8dc412b8 (project 1f219794-c19a-4839-9044-2459cbbc4962), uploaded the 120747-byte encoded synthetic docker-verification.mp4, and showed the exact Host-owned authorization modal before sending. Approved scope contained only that synthetic media, request/timeline/evidence/frames/audio/transcript; no profile or private real-media submission. Actual configured Qwen3-VL-plus, local Whisper-small/YAMNet and Qwen3.7-max planner produced v1, with actual 3-second Preview, 320x180 decoded browser video and separate QC-green Master. This creative model execution used the preserved real configuration, not a substituted fixture response. Controlled model/native regressions remain separately identified.

The project, request, approved media, historical v1 and render bytes survived final image recreation and reopened from recent projects without regenerating the model result. Normal export invoked the browser save adapter and downloaded AVE-v1.mp4 into C:/Users/24179/Downloads. Windows file and container-export binding both have SHA256 657aeea0ab7196f43530df889048d4cea8b13f2e4fe047a9f3f7ee0694e2e1f6, 136515 bytes, 3 seconds, H264/AAC. The export artifact is /workspace/exports/2cfd54e0-637f-4d97-bc45-481e31c0773d.mp4. Browser automation's download helper initially canceled because of its Windows save-path handling; the actual workbench download dialog was submitted through the same browser's CDP DOM click and Chrome completed the normal download. No app authorization bypass, fake media or manual substitute for the downloaded file was used. This validates transport/decode/download, not subjective human listening or creative-quality acceptance.

Both existing vision/planner keys were privately compared against the unchanged native JSON and matched exactly. Values were withheld; .env remains Git/build ignored. Unrelated containers/native projects remain untouched.

## Current source checks
- Typecheck and architecture passed, including the new HTTP Host source.
- web-host.test.ts passed with actual isolated SQLite Host creation/close and HTTP: typed BigInt/bytes, static module boundary, Host/Origin/CSRF checks, live sender registration, cross-session/stale/replayed dialog denial, unowned upload/server path rejection and private download denial.
- Native Electron runtime smoke, full Stage3 suite and actual native desktop-workspace regression passed (controlled model responses and encoded synthetic media; separate from the actual configured-model browser run).
- Docker packaging passed on final image: CPU/GPU topology, no startup cycle, exact device policy, volumes, loopback/default isolation, actual mode0600 credential initialization, missing-key rejection and build/Git secret exclusion.
- `pnpm run check` first passed its prefix through Project API checks, then failed the old composition-root import-location assertion. Updated boundary tests verify shared Host construction and exact native channel/sender gating. Every remaining declared check step, from project-host:boundary through acceptance:foundation:synthetic, then ran in original sequence and passed. This is a recovered complete gate set, not a claim that the original command exited zero. Changed export copy received separate final renderer/native checks.
- `pnpm run acceptance:final:synthetic` passed; real media was not claimed.

[Direct browser workbench](EVD-20261002-S3-WEB-BROWSER.png) and [actual export completed](EVD-20261002-S3-WEB-EXPORT.png). Final documentation completion/check is recorded in the ExecPlan. Historical capabilities retain their prior status and Evidence; current scope pins bind this adapter refactor and its regressions, without promoting human acceptance or unrelated programme scope.


- CAP-RENDER-001; scope_fingerprint: 09c9df40a25df317c1ccb2a2dee25569b2cbbae1753ef2d3d98c7c9333e3ca3a
- CAP-PRESET-001; scope_fingerprint: 03e74e7bd1c702e25a3a9cdd6e4f893e50ce1decb2463938c8d20315fe1fc19a
- CAP-FND-001; scope_fingerprint: 301eb798817b8a8a029eb01b1aeef57d9c7eee951aaf82d385d3b98851cf5774
- CAP-CA-GOV-001; scope_fingerprint: 70db40a61b0552d6de09cd709573f4fe2c11d2123da965e55246fa3a34fdd3c9
- CAP-CA-CONTEXT-001; scope_fingerprint: 8a3ad1608ed15fedcadee408fca41a15e73c4f153a76f9e824395e88f179eb1f
- CAP-CA-SKILL-001; scope_fingerprint: 94b49b81383f2de93e539b0ef7dcb94c502886ce464c522bbe4de42c14fe0ad9
- CAP-CA-DURATION-001; scope_fingerprint: 0ba67f9040ee6310b741fe794f34dd905e9af92f7d5a2fb1260fd3cb80150c4f
- CAP-CA-STORY-001; scope_fingerprint: ca37dc37179c09fe4f933cc8c9ab37607e056bff78f2f3d0808097baf0e18df1
- CAP-CA-PERMISSION-001; scope_fingerprint: 9efbc767d5612096e7288a3d2eeebf5971c6b719e976e74d039f984da63a24a1
- CAP-CA-PIPELINE-001; scope_fingerprint: 634fd86d3b0d829d61e5f8af59f48eec304c83c9db4bc98ba871fc59f4e096e2
- CAP-CA-FEEDBACK-001; scope_fingerprint: 942eec5b0661a3d14a909f9804cbdf7574374954890c1fd8f46d4b5bc5d4c636
- CAP-CA-PRODUCT-001; scope_fingerprint: 3e2cd1a23fddef9906b1f280659e64d3bbed09b6d7353a0d12114f9178447ed1
- CAP-CA-PRODUCT-002; scope_fingerprint: ec7822a632bbc066dec9e4c2470cc78c178a54f0254954840138a58b5c74a2e4
- CAP-CA-UX-001; scope_fingerprint: 273399ac105a2c36a18a4af90039bad6b197da6194756e9de1f14eac175721e6
- CAP-CA-EXIT-001; scope_fingerprint: 44539e616bc82de1526f63b8c0b8255492fa319f97be8017d29fa458c8f1e324
- CAP-CA-GOV-003; scope_fingerprint: 8da17ec3b7511fa0153be0d64543583ee5be47c72cbadd20df6c4f5b58cd55fa
- CAP-CA-GOV-002; scope_fingerprint: 6b2c375f5d37fb959d7b2b342d7ad20254f9c1e5633debb29fd751cac5917425
- CAP-CA-SEC-001; scope_fingerprint: 42ec5fe8daac8a6c1ab87e014fd03f1065ced7515baa2d18ef3a828ea560cac3
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: ccacf0b06db884999f15a1c78e940da77137aeb109c8fc56698fdee60b019eaf
- CAP-S3-SKILL-001; scope_fingerprint: fe5ef8e39bf8108b5ee910eb3c7f721f9ef83e4b738d6e25f64b5600f62b584f
- CAP-S3-DOCKER-001; scope_fingerprint: 4b8fc8d2856c0e7606149513ed1dd1fb7cf036c16aabd729e077fe737ad23d4a
- CAP-S3-WEB-001; scope_fingerprint: 44abbf8f6df4e388969f64282d65c5a4ea7ad86e5821a80d937e7fc30ceb7b72
