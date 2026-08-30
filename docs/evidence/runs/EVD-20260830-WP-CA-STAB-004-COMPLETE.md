---
evidence_id: EVD-20260830-WP-CA-STAB-004-COMPLETE
date: 2026-08-30
work_package_id: WP-CA-STAB-004
repository_commit: codex/issue-15-exact-feedback-rational-time
code_fingerprint: 4fa7daf9f25e01802bdbfe98c5110733c32e7e847d411ce63f1bcf0461071222
scope_fingerprint: 629616f83d581193fd15753e15e34723d248dd1ed4cfb27f65fffa05c953d559
scope_fingerprint: f6b88b93e169978ba64a710f060f5035d00370cc1caa18830893c8022ba7d5fa
scope_fingerprint: a4ac31955731054863a7b54ecd5424b2e3b0cde4b5a4b791e306fd2c4d0d28eb
scope_fingerprint: 38829c82e73b2c53f19b7e22b9700b87f507d83098d123cad55c0acf350a6d99
scope_fingerprint: f3543032f472e499b6c126cbb640450504781b2521ef185cb04480888097249f
scope_fingerprint: 842402e22e7d9d808175a60ab896d005f719ad646db68f5a5e99ec4d88466978
scope_fingerprint: 59ddb7f5f55e935164495cce91e53d5e04d3b8900307d6b8d94bc5ffe8b3bb45
scope_fingerprint: 7e4c0531fcdb0d696a8c507adc66884d6c4f4130368b73513d1a0bcb6631684a
scope_fingerprint: 55b497a047e7bf8f8b0a5ff2862542d45487ea02d508a3f364f7fadd05dd94f1
scope_fingerprint: d3efd9d67630cd718298c65712fb184566afe394469ca59ccb537a358f9eda37
scope_fingerprint: 11db4b7b5c10eec17db9943cceba06c8c98b6336234920f51175e7d699474c45
scope_fingerprint: a5282be466c63db8d84977a84299cfbc14b183957e75554c80ff2e2a8eda82f2
scope_fingerprint: 6fa85f3f7ea4898f4d3b795dc8190b558c2bddb5aa9a0997b0cade829f342be0
scope_fingerprint: e04bfeb50d1f685e8a1312af08af33e9ee99f86ccdd3e027fe4f71cec43454be
scope_fingerprint: fd1977cfccfff14b79103abe52e5804cfb519ecd51982ff390fbae9fd7f7e49e
capability_ids: [CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
result: passed
---

# Issue #15 exact feedback RationalTime closure

The Stage 2 desktop accepts a positive decimal or fraction as exact RationalTime and rejects any duration that cannot be converted to integral source PTS. Native confirmation displays the exact duration, PTS delta and resulting source range before a feedback artifact is created.

Feedback Diagnosis records the declared trim duration; the derived local Edit Intent repeats it. Project Host independently recomputes it against the current clip before persistence, and the Edit IR compiler requires Diagnosis, Intent, range and final command to agree. Forged, negative, zero (including a zero fraction denominator), non-integral and full-removal requests retain zero authoritative writes.

Executed: `pnpm run stage2-workspace-renderer:test`; `pnpm run feedback-revision:test`; `pnpm run stage2-product-workspace:test`; `pnpm run typecheck`; `pnpm run architecture`; `node tests/architecture/desktop-boundary.mjs`; `pnpm run contracts:check`; `pnpm run contracts:identity`; `pnpm run contracts:clean`; `pnpm run acceptance:final:synthetic`; `git diff --check`. The Product integration command completed after its long-running action process exited; this remains synthetic-only validation and makes no real-media, human-acceptance, Stage Exit or Release claim.
