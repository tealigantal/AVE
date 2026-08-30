---
evidence_id: EVD-20260830-WP-CA-STAB-001-COMPLETE
date: 2026-08-30
work_package_id: WP-CA-STAB-001
repository_commit: codex/issue-16-host-clock-expiry-uncommitted
code_fingerprint: 15f34c3a1d8075e171ecadc406fb0671fcd450d5829d9e47588ab937473ac37b
scope_fingerprint: 127b717643c5a13dde0558a68f76a42bc1e130894da8814c9e534af6e54c0765
scope_fingerprint: 2ea31a1cbcba9f559cd1966b9ddb5c3f46e53ece77327b75118b3689249d2f06
scope_fingerprint: 366b2651af2d5678e90ac2d2822e4ae9f3a45c819ce04a15bd9307e3197573de
scope_fingerprint: ad9a2a7920a8c0c0599eea2fc8cda7ffc53e792aceda2858d2887fc05e50e878
scope_fingerprint: 2326fc3022b5c42e13f680328ea87df0497245ea57d8fe8910d8c56392f3fdbd
scope_fingerprint: cc45aafaa5f0ddd62e99ddbffc1c330ad52dab71fe6c8a60d28020222bed5ee6
scope_fingerprint: 4ec687f0c45d91949ca3b549faf5c8289a171a0c091fda39238c54e4ae5207cd
scope_fingerprint: e799f5b389a7cafb38dca9a55b195fe5f411c11a11c520de11bd20eab1304b1b
scope_fingerprint: f03314d8c6b722601b5657bb1fddb394ef6c683e26bf949da3dfe7fc7ea963fe
scope_fingerprint: e2b3cc0a6bdd31fbf1eaff0aa3f722284acd7ecdddbd0b098f94f6024a788099
scope_fingerprint: ff3b36517fc3bfffae598954cebfc11348356f9a96f106a306c7bedcb4985630
scope_fingerprint: 1454d80df384a88ae7cc8fc95a83d56c5671953d81a9da9fc5fca4931d6bae2c
scope_fingerprint: a2d49ad02921875a5a84d628288429b382733837e47dbfcf94f01efd13d2ee29
scope_fingerprint: 4f40f911d19483e96ede5c6c47d08f7f85a8ae45dedd414f20e5a4d3f249b126
capability_ids: [CAP-CA-CONTEXT-001]
acceptance_ids: [ACC-CA-INT-000-EVIDENCE]
result: passed
---

# Issue #16 Project Host clock expiry completion

The deterministic failing regression used a Project Host clock on 2026-08-23 with a 2026-08-24 pack expiry while the machine wall clock was already later; creation was incorrectly rejected from `Date.now()`. The Host now uses its injected clock for assembly and one dynamic lifecycle projection applies the same `expiry <= now` rule.

Executed: `pnpm run creative-context:test`; `pnpm run typecheck`; `pnpm run architecture`; `pnpm run docs:sync`; `pnpm run docs:check`; `pnpm run docs:architecture:test`; `pnpm run docs:fingerprint:test`; `pnpm run check` (exit 0); `pnpm run acceptance:final:synthetic`; `git diff --check`.

The focused lifecycle fixture proves a Host earlier than the wall clock, one millisecond before expiry, equality at expiry, workspace projection, zero partial writes after expired assembly, and a reopened Host later than the wall clock. No real-media, Stage Exit or Release claim is made.
