---
evidence_id: EVD-20260909-WP-CA-REAL-003-COMPLETE
date: 2026-09-09
work_package_id: WP-CA-REAL-003
repository_commit: worktree-real-product-complete-uncommitted
code_fingerprint: fa7e8f9e98edb7b9c1a55ced7b532b62f79e01d78deaff0eba6b7a083471f121
capability_ids: [CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001, CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001, CAP-CA-GOV-003, CAP-CA-GOV-002, CAP-CA-SEC-001, CAP-CA-RECON-001]
acceptance_ids: [ACC-CA-PRODUCT-001]
commands: ["pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run stage2-product-workspace:real", "pnpm run render-graph:test", "git diff --check"]
result: passed
environment: "Windows Node 22 and local FFmpeg; fresh authorized external Product fixture"
artifacts: ["fresh Product r16 full Electron review and reopen passed", "exact one-second feedback creation and rejection", "one-shot test-only confirmation denial and concurrent replay tests", "current production boundaries unchanged"]
remaining_risks: ["Direct human full-output inspection and fresh Pipeline reconciliation remain in WP-CA-REAL-001.", "No Stage Exit, integration, release, commit or publication is claimed."]
---

# Copied Product immutable Original and exact audio completion

Authority: immutable executed Evidence for WP-CA-REAL-003, indexed by the
programme matrices and generated document index. Existing historical Evidence
cannot represent this new fingerprint; its contents and scope index remain unchanged.

## Executed final validation

The final source fingerprint passed pnpm run check (exit 0), final synthetic
acceptance (exit 0), and fresh authorized Product r16 (exit 0). The aggregate
includes contracts, typecheck, architecture, encoded Worker media correctness,
bundle provenance rejection, Timeline, Product actions, and Electron checks.
The render-graph property gate and diff whitespace check also passed. An
independent read-only reviewer found no completion blocker and checked the
external r16 review, immutable Original and encoded output metadata.

The new same-track regression checks audible contiguous clips, deliberate gap
and final tail silence. An isolated old-filter sensitivity run failed at 2.1
seconds with zero tone amplitude; the checkout was not changed by that test.
Current-only worker-media@v5 / ave-worker-host-r15 identity rejects the old
version and prevents old output cache reuse. Generated contracts are clean.

## Bound real artifacts

The copied fixture obtained its own Host-owned immutable Original through an
exact permission, then selected the verified audible source interval 2..62
seconds and rebuilt the disposable canonical tracks through Host Commands.
Production open, permission, QC and write boundaries were not relaxed.

- Original SHA-256: 60a2244d40c28ad7a6c9da1e37d24ecb163696bd3118ca8e3b451cc1f0f3592c
- Execution: product-execution-d55326994d4c78b4ed819693; Timeline version: 5.
- Semantic manifest SHA-256: 9dfb2278ea5ada37da3164a63c98b08fba975a04363e06a464a50ecf56b860a9
- Preview plan: plan-preview-546ed3421d9cf675bb1a4449
- Master plan: plan-master-25d8fbfffcefd90440720db0
- Each target: 60.000000 seconds, 1800 frames, 48000 Hz stereo; QC passed with no issues.
- Preview and Master byte SHA-256: 5c3c93bb7831abb5c5b69cda5f1c96a5827399f57db13daedd0bd17ab8da254a
- Feedback: product-feedback-intent-d211570c-45b8-4c90-825d-28393fc66bea, rejected.
- Reopen workspace digest: 3f3a02e52d2f5fdf93dd68423567ccd22f0f953c3b26d70a4696415455277679

The exact creation and rejection confirmations occurred once each in the
isolated harness. Effect preview cleared; rendered media remained; old query
and ambiguous identity attempts failed without writes. Project, Timeline,
execution, rejection and all eight stale intent IDs survived reopen unchanged.
Actual dialog Proxy denial tests cover mismatched fields, identity rebounds
and concurrent duplicate rejection. Production native confirmation is unchanged.

## Limits and handoff

This proves a complete-duration encoded output and automated playback start
(the recorded playback observation was 0.165173 seconds), not human viewing
of all 60 seconds. The precheck's phrase "full 60-second playback" means the
60-second file was exercised; it must not be read as full-duration viewing.
Previous failed roots remain external and are not passing evidence. No private
media or local review paths are recorded here. Scope evidence supplements
regression coverage without promoting any capability to human acceptance.

Resolve DEBT-CA-REAL-003-HARNESS and complete only this repair. Restore
WP-CA-REAL-001 for final current Pipeline reconciliation and direct human
Preview/Master acceptance; DEBT-CA-STAGE2-003 remains active.

## Current executed regression scopes


CAP-RENDER-001
scope_fingerprint: 7d321a34b4f6ce186a4957040340e78c6513c5afbc556a921b1b630f160ff594

CAP-PRESET-001
scope_fingerprint: 6d6f3ebef0899f7b31f0c997074f43afa990dad8a447ff314d0ceae81d4088f5

CAP-FND-001
scope_fingerprint: 2db313367e0e125b38488ca213b338ec71f5192691ad59ff4117f6c7d46ea4f8

CAP-CA-GOV-001
scope_fingerprint: 38829c82e73b2c53f19b7e22b9700b87f507d83098d123cad55c0acf350a6d99

CAP-CA-CONTEXT-001
scope_fingerprint: 847a96b134119fd2611744b95ef9dd51e878f83c482affd8d0b0a01b5d217ed7

CAP-CA-SKILL-001
scope_fingerprint: c4c2246648602e8e82e9dd9ec7c496c67705a980403e14ce74b60e96ffcbb4ba

CAP-CA-DURATION-001
scope_fingerprint: c4d2b2e7daae9a7a2602293e88b4d6bcb32f7d7119648671b628ea7bfe8b5790

CAP-CA-STORY-001
scope_fingerprint: 1789091965d43485f97b1f518968b6ddc5d3115ee8962f7417c4d05b23b10127

CAP-CA-PERMISSION-001
scope_fingerprint: 040de822438cce652a97e847ff649686f6005ec8a2735bd2e61ba1f8a7d099bc

CAP-CA-PIPELINE-001
scope_fingerprint: a1ac135708507b6a5942c8d63a43b8b641fd8ed413bd04616f0c9fbe09bf582f

CAP-CA-FEEDBACK-001
scope_fingerprint: ee57b2a9f6474c91da8db9a3bd635d7bf12f54d3825a37343cbd60edd18d86fa

CAP-CA-PRODUCT-001
scope_fingerprint: 4553702b1124d6509a4b0ee76a27e1dd078a9c835acfed4bebe3ffa3a05d37ea

CAP-CA-PRODUCT-002
scope_fingerprint: b2f3a1357eca4e89121a1a05822c1fb28a089ced6282115a6cc2f43f06d4d4f9

CAP-CA-UX-001
scope_fingerprint: 22e23289ac7436bb25395766f3fb881f6518f004d5d85fe957cb9ba7aa3c5864

CAP-CA-EXIT-001
scope_fingerprint: 68fb848370e756ad8aba77910b30ac0a24551fcd994224ec2fec24bf1a160e24

CAP-CA-GOV-003
scope_fingerprint: 329c1bd8717727ecd823d56b9427444e35896a6612d3b44673f46a983370dd4f

CAP-CA-GOV-002
scope_fingerprint: 62daa1348ef15ecdedc1a82e2d5c4937f441c16ab21cd81b8236937ae09424e7

CAP-CA-SEC-001
scope_fingerprint: abb2879f1424e3dfdcc096630fdf4e6f8b3c011484ddb354d9317f0d54e93000

CAP-CA-RECON-001
scope_fingerprint: b80185844ceb5e740f2065ae8b5710a8345ae1d017c342f2c303415f4900e683
