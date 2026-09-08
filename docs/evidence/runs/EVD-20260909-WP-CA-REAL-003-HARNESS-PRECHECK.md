---
evidence_id: EVD-20260909-WP-CA-REAL-003-HARNESS-PRECHECK
date: 2026-09-09
work_package_id: WP-CA-REAL-003
repository_commit: worktree-exact-feedback-harness-precheck
code_fingerprint: fa7e8f9e98edb7b9c1a55ced7b532b62f79e01d78deaff0eba6b7a083471f121
capability_ids: [CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001, CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001, CAP-CA-GOV-003, CAP-CA-GOV-002, CAP-CA-SEC-001, CAP-CA-RECON-001]
acceptance_ids: [ACC-CA-PRODUCT-001]
commands: ["pnpm run stage2-product-workspace:real", "pnpm run desktop:boundary", "pnpm run electron:runtime:test", "pnpm run typecheck", "pnpm run architecture", "git diff --check"]
result: passed_precheck
environment: "Windows Node 22 and local FFmpeg; fresh authorized external Product fixture"
artifacts: ["fresh Product r16 full Electron review and reopen passed", "exact one-second feedback creation and rejection", "one-shot test-only confirmation denial and concurrent replay tests", "current production boundaries unchanged"]
remaining_risks: ["Full aggregate repository check remains to repeat after this final harness change.", "No new human, Stage Exit, integration or release acceptance is claimed."]
---

# Exact feedback harness precheck

User authorized the existing harness and matching boundary test paths. Fresh
Product r16 passed every current assertion: full 60-second playback, exact
feedback creation, local preview, rejection, unchanged Timeline, stale query
denial and reopen with stable current execution, workspace and stale history.
Only the two exact test confirmations are simulated; this is machine evidence,
not a direct human review. Scope bindings supplement prior executed production
regression evidence; no existing capability status is promoted.

Real r13 exposed a disabled-button click; r14 crossed a feedback rejection
commit during a polling read; r15 exposed an inverted Boolean observation.
The final harness waits for enabled controls, retries only the exact transient
read conflict within its deadline and correctly records preview absence.
All failed roots remain external and are not reused as passing evidence.

## Current precheck scopes

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
