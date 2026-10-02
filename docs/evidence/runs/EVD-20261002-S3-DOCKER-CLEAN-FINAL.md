---
evidence_id: EVD-20261002-S3-DOCKER-CLEAN-FINAL
work_package_id: WP-S3-DOCKER-002
date: 2026-10-02
code_fingerprint: 430efb0d7ffe1bdc0462ca133138c76821aff5afefc94f911cceba30e84f1ca9
capability_ids: [CAP-S3-DOCKER-CLEAN-001]
acceptance_ids: [ACC-S3-DOCKER-CLEAN-001]
result: passed
---
# Two-service Docker cleanup and bilingual entry

## Outcome and scope
Only desktop and whisper are declared in root Compose. Configuration is generated atomically inside desktop, then supplemental groups are cleared and UID/GID drops to 1000 before Host startup; raw key/template environment variables are removed. Whisper checks required pinned snapshot files, downloads only missing/incomplete cache and serves the same revision. Removed unused GUI launcher/seccomp resources; preserved historical ADRs/Evidence, native Electron, every volume name, cloud configuration and other applications.

README.md / README.zh-CN.md contain matching product introduction, actual synthetic-workbench screenshot, three-step Docker Desktop setup, usage, CPU/GPU, persistence, troubleshooting, architecture, development and truthful license/status boundaries. Structural references are in the ExecPlan. No new license, private-media cloud request, model switch, creative-quality acceptance or Stage Exit is claimed.

## Actual runtime validation
Docker Desktop desktop-linux successfully built/recreated the final images and reached readiness repeatedly with exactly two healthy containers. Host/Worker process UID/GID is 1000. Runtime config is UID1000/mode0600; raw vision/planner keys and template are absent from Host process environment. No Electron executable, XFCE or Xvfb exists. Private values remain withheld; Docker administrators can still inspect initial environment metadata.

The retained synthetic project 1f219794-c19a-4839-9044-2459cbbc4962 passes SQLite integrity_check=ok. Actual authenticated HTTP recent-project navigation reopened it, read the persisted timeline/media and closed normally without model invocation. Existing 136515-byte Master SHA256 remains 657aeea0ab7196f43530df889048d4cea8b13f2e4fe047a9f3f7ee0694e2e1f6. Project/export/cache volumes and Windows binds are preserved. Unrelated container IDs remained unchanged.

Actual CPU/int8 startup of the final pinned Whisper cache passed with network disabled and no GPU reservation; graceful shutdown passed. Main deployment remains CUDA/float32 and healthy. Cold/partial cache/download-error branches were exercised using a controlled downloader, not a new clean-host model download. Same-host CPU isolation does not claim a second physical-machine test. Earlier configured-model browser creation/export remains separately documented in WEB-FINAL.

## Checks and retained failures
- Final node tests/integration/docker-packaging.test.mjs passed: exact two-service topology/dependency, volumes/loopback, real private config initialization and privilege/credential cleanup, device failure policy, complete/cold/partial/incomplete/download-error cache branches, missing-key rejection, GUI absence and secret exclusion.
- First pnpm run check passed through worker:render-graph:test then failed the required Pillow12.3.0 assertion because system Python has 11.2.1. Selected the existing isolated Worker via PATH and AVE_PYTHON; the original failing item passed once. Fresh full pnpm run check then exited 0, through foundation synthetic acceptance and Worker cancellation. No assertion reduction, skip or dependency installation.
- pnpm run acceptance:final:synthetic exited 0; real media was not claimed.
- pnpm run ci:workflow:test and the exact CI machine-path guard passed. Initial PR security failure was the existing immutable WEB-FINAL download path: added only that exact evidence-file exclusion and pinned normalized SHA256 22c9c0129908f05bb8e59b07e8ef0da99776fee8be56f8120986bdd7a33279b9; original eight exclusions/hashes remain intact. Other source and new Evidence are scanned. Historical Evidence was not rewritten.
- README local links, staged whitespace and actual configured-key publication scans passed; .env is not staged. Two independent read-only reviews (runtime/README, then immutable CI exception) found no blocker.

Local logs remain at %TEMP%/ave-docker-clean-check.log (initial failure), ave-docker-clean-check-pinned.log (exit0), ave-docker-clean-pinned-worker.log, ave-docker-clean-final-synthetic.log and startup logs; private values are not published. Remote CI is attached to draft PR #29 and is not inferred from local success. Final documentation completion/sync/check and final-head PR status are recorded in the ExecPlan/PR. Existing accepted/tested capabilities retain prior status; the pins below attach current regression applicability, without fresh private-media or direct-human acceptance.

- CAP-RENDER-001; scope_fingerprint: 9521529e65ce8f8cfa583fcf9cdb758f842a505c92ca02175a4e1e1e4b1f302d
- CAP-PRESET-001; scope_fingerprint: 4673ba730cd36c6625162f062ed147077043dad6639a6ce970b36e2c0f8d5475
- CAP-FND-001; scope_fingerprint: b07f799bd8f6e0b0b4a2e11e9fe6d77199bd09107fbf5cbf92f4302418c054b2
- CAP-CA-GOV-001; scope_fingerprint: 4f1d2a2364ae575d4525e2ac28e4b0387015c1347856a91b895b18afbd0f57e0
- CAP-CA-CONTEXT-001; scope_fingerprint: 03f987e1a8460cece09bca86e5b29936798249558e5cc44114ac70725715b661
- CAP-CA-SKILL-001; scope_fingerprint: 0e4472320fe251f2db47229ab286581cfdbc632aea34394e449d8120b52ebd97
- CAP-CA-DURATION-001; scope_fingerprint: 0ba67f9040ee6310b741fe794f34dd905e9af92f7d5a2fb1260fd3cb80150c4f
- CAP-CA-STORY-001; scope_fingerprint: be5b62f409beef534450c3e2d0676ecc73ebae612b7552478f20eaa8545ac389
- CAP-CA-PERMISSION-001; scope_fingerprint: 9efbc767d5612096e7288a3d2eeebf5971c6b719e976e74d039f984da63a24a1
- CAP-CA-PIPELINE-001; scope_fingerprint: c7cf71036dfa2fbc7f41a62b5ac18df1dbdbbc86cd5d2fb12dc8a7beb6b2a631
- CAP-CA-FEEDBACK-001; scope_fingerprint: 0876022380b8765ee8951246d81cf623c0a6f47cb16ba054c58d38462e0323f8
- CAP-CA-PRODUCT-001; scope_fingerprint: 07d790b7990259914cdc2a56ec5520460b4db973283940763c3eaf91cfe64865
- CAP-CA-PRODUCT-002; scope_fingerprint: 69f0b1f796a876a5411383950112c7562f47b104f16cb5a612c5efd39acef346
- CAP-CA-UX-001; scope_fingerprint: 80d0bf9c0a1a07ea827f6951428fd5d018a92a932df0b7c8818ec0980728a20e
- CAP-CA-EXIT-001; scope_fingerprint: ea383ce27eed8aae811d116e31e4caedd9f06aeeff36449543179d41dfb4b400
- CAP-CA-GOV-003; scope_fingerprint: 62c3aeacdbef7ff454a1a06f5764262eaf4bd783a88cd58435cb95931c9b7783
- CAP-CA-GOV-002; scope_fingerprint: c9cbb3e24ac6390ff1a636c2f7630d230acc58dc22ed18139b75087f3387e979
- CAP-CA-SEC-001; scope_fingerprint: 42ec5fe8daac8a6c1ab87e014fd03f1065ced7515baa2d18ef3a828ea560cac3
- CAP-CA-RECON-001; scope_fingerprint: 966daf3871bfd7ece095b1049d8aad072f2a2d2aefb4c160cd3e2d2e1b39b594
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 2278ace15745c5a6e103cc0b5284c4fda6d25b1b3b6b262cb9ea377f7210ec81
- CAP-S3-SKILL-001; scope_fingerprint: fe5ef8e39bf8108b5ee910eb3c7f721f9ef83e4b738d6e25f64b5600f62b584f
- CAP-S3-DOCKER-001; scope_fingerprint: c48a9d6c890a331cac00a3a80c148fff06bad96dc1d734f0401a94681b0c9b05
- CAP-S3-WEB-001; scope_fingerprint: da94cdb87811f465495eb28ce6e1c2e87adfc2c9e3403c05881675bbcd7c1667
- CAP-S3-DOCKER-CLEAN-001; scope_fingerprint: e30609caa7e8e1baaf69c02de9b5cb21bce0311b6a58d36cd8fe579fd43d07c6
