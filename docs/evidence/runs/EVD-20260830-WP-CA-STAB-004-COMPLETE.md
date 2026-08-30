---
evidence_id: EVD-20260830-WP-CA-STAB-004-COMPLETE
date: 2026-08-30
work_package_id: WP-CA-STAB-004
repository_commit: codex/issue-15-exact-feedback-rational-time
code_fingerprint: 96a993f35ee68bec797b74615720df32da77a8b079bdb3e5fd623a7982277db0
scope_fingerprint: 896782b504dc6f2da72234386e58bbefe6c0dbbaf72074e0450738b557e3ce5e
scope_fingerprint: 1034d4a1677b9b5c6e9e3179097e7c34e38ecb89a1a510626ebd8e9be3cd5e99
scope_fingerprint: 00ed922601a9712a59ef0f89230abebdf18911f57de39db053cda75f795b63d6
scope_fingerprint: 38829c82e73b2c53f19b7e22b9700b87f507d83098d123cad55c0acf350a6d99
scope_fingerprint: 6a79d15c8134c71f60e173948a8cc4c5799d7c5fd9e5e2464375881d21ceba46
scope_fingerprint: f0c557e270859f11b0bd552c735016698c89fcc7b2eb95d2b9a6c601c4208993
scope_fingerprint: 59ddb7f5f55e935164495cce91e53d5e04d3b8900307d6b8d94bc5ffe8b3bb45
scope_fingerprint: 3feea8a8cacc7853abbcd7c84682fbcc6d5cd24a295a45394b92a3f64cd335c9
scope_fingerprint: 55b497a047e7bf8f8b0a5ff2862542d45487ea02d508a3f364f7fadd05dd94f1
scope_fingerprint: 52989aa1bc8efab4644015151213ecfb29e30eb4d9708f6a8599bc4e5afff2a3
scope_fingerprint: 6d411298a8b0cc3557990e4d8b096d2149ca25fbeb66ac26243b08646915be69
scope_fingerprint: 2de7eb7e57997ead93140d630cbf905b9aa95dc5c7371eb5acf6aa8761829b62
scope_fingerprint: 4ab867ca69269a52241a1e33945d21a8d3319c8246e54a7bf3e877d3263febc0
scope_fingerprint: 7dd79fccbe09146f7b1d019567cc678e34baf6a2c65914edce5a29f730641138
scope_fingerprint: a16859c93c41495038fa1af3fd67b9609aa77d0c04fb55920a8febdf563dbf43
capability_ids: [CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
result: passed
---

# Issue #15 exact feedback RationalTime closure

The Stage 2 desktop accepts a positive decimal or fraction as exact RationalTime and rejects any duration that cannot be converted to integral source PTS. Native confirmation displays the exact duration, PTS delta and resulting source range before a feedback artifact is created.

Feedback Diagnosis records the declared trim duration; the derived local Edit Intent repeats it. Project Host independently recomputes it against the current clip before persistence, and the Edit IR compiler requires Diagnosis, Intent, range and final command to agree. Forged, negative, zero, non-integral and full-removal requests retain zero authoritative writes.

Executed: `pnpm run stage2-workspace-renderer:test`; `pnpm run feedback-revision:test`; `pnpm run stage2-product-workspace:test`; `pnpm run typecheck`; `pnpm run architecture`; `pnpm run contracts:check`; `pnpm run contracts:identity`; `pnpm run contracts:clean`; `pnpm run acceptance:final:synthetic`; `git diff --check`. The Product integration command completed after its long-running action process exited; this remains synthetic-only validation and makes no real-media, human-acceptance, Stage Exit or Release claim.
