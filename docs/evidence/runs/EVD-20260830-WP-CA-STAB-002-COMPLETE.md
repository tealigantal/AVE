---
evidence_id: EVD-20260830-WP-CA-STAB-002-COMPLETE
date: 2026-08-30
work_package_id: WP-CA-STAB-002
repository_commit: codex/issue-11-minimum-evidence-story-candidates
code_fingerprint: 0fa3ca0a0910da85255cac1f36fc51523d8fa94c412f67492074135e7c312993
scope_fingerprint: 27123a7d669d39a1ba28af13a5fd105cbdec426d33e17da329db2705bea13690
scope_fingerprint: 9ce7ea170d4a9cbdbfeb74386d2282db161760ee2d7ac608d36526f867eae628
scope_fingerprint: b45671f20db95b39df3a0b7523e12180111344d01f2f12aeab0b37604a16fa0e
scope_fingerprint: 05ad8e1aec13d2f952aadcd6077774c80f083efc04370ee35c30eeca99289c47
scope_fingerprint: 1dbe39949559f60de930ad9849c3cffae6bc209966c336b52cca3e982ea94fe0
scope_fingerprint: 9f58cfa829f5c33e61f3881f64abf9ca86c54ef07e4f07db727849a359ced4c7
scope_fingerprint: 9cb478b2313051f1f3eb6c24738e8171a662d924d3b45ef1e9fa155dc87a3df2
scope_fingerprint: d2206851a5de07c868a1dc853fe290f560503eaddbc0f34f1d6cb8bd824ef514
scope_fingerprint: 0b12eb72d161340778952f260b72c87b7e8906d76bf87d1290b2b1dad0e99a2c
scope_fingerprint: d4d8128b296b00180202a3175ec08793a83fd10355810e2fcbe00eb88e9a7949
scope_fingerprint: 0f865d921d01dabb3ef2e23fab43139321d1b18e02591d26a981f160eb48d822
scope_fingerprint: 16b85535bd2ab0f2336e67953c15ceff834597588fdcfbaacc1c05aa107f94da
scope_fingerprint: 72dacec4782da9afce49b901f425d5216110df8dd1c8a30c952a51a45e53c747
scope_fingerprint: a073cf6dac539bc5113d2b1fa8b0f274294877268325954c777a19b94f55cb11
capability_ids: [CAP-CA-PRODUCT-001]
acceptance_ids: [ACC-CA-PRODUCT-001]
result: passed
---

# Issue #11 minimum-evidence Story candidate completion

The prior Product path rejected otherwise legal minimum inputs because it required two Beats with both the same role and the exact same duration. The Host now deterministically rotates approved Evidence across any exact-duration Beat group. It preserves each Beat's RationalTime duration, the Blueprint role allocation and order, the same evidence set, one Evidence reference per Beat, and the exact Duration feasibility target.

Focused `stage2-product-actions.test.ts` coverage performs the complete Material, Direction-selection and Story path for 30 seconds with four Evidence statements and 60 seconds with six. It proves two distinct comparable candidates, same Evidence-set bijection, positive exact per-Beat duration binding, unique non-overlapping Evidence, deterministic repeated reviews, reopen stability, and zero writes for one-less-than-minimum Evidence. The no-reorder closed path remains covered.

Executed: `pnpm run stage2-product-workspace:test`; `pnpm run typecheck`; `git diff --check`. This is synthetic Product-path evidence only: it makes no real-media, Electron human-acceptance, Stage Exit, or Release claim.
