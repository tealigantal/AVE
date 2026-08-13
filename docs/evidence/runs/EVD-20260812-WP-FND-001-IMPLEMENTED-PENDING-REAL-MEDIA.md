---
evidence_id: EVD-20260812-WP-FND-001-IMPLEMENTED-PENDING-REAL-MEDIA
date: 2026-08-12
work_package_id: WP-FND-001
repository_commit: worktree-before-publication
code_fingerprint: b111e36185ca06fdcc462c4728728bfd74e864c9a82031e8ae8ebb14b5439c5c
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033]
commands: ["pnpm install --frozen-lockfile", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run architecture", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run acceptance:final:synthetic", "pnpm run acceptance:foundation:synthetic", "pnpm run acceptance:foundation:real", "pnpm run check"]
result: implemented_pending_real_media_acceptance
environment: "Windows local checkout; AVE_REAL_MEDIA_MANIFEST unset; no authorized real media, local path or temporary output committed"
artifacts: ["migration:0020_media_authority.sql", "ADR-0015 persistent Worker and explicit Job recovery", "ADR-0016 unified edit and content authority", "ACC-028 through ACC-032 synthetic Foundation acceptance passed", "full pnpm run check passed", "acceptance:foundation:real failed closed with FOUNDATION_REAL_MEDIA_MANIFEST_REQUIRED"]
remaining_risks: ["ACC-033 requires authorized repository-external real media and human inspection before COMPLETE Evidence and docs:complete.", "WP-FND-001 remains active and CAP-FND-001 is not accepted.", "CAP-TL/KF/XFORM/COMP/TIME/TRANS/COLOR/MASK/TEXT/AUDIO remain blocked with existing debts and scope."]
---

# WP-FND-001 implemented pending real-media acceptance

The complete repository-verifiable Foundation hardening is implemented under one work package and one ExecPlan. Exact RationalTime arithmetic and explicit conversion rounding are normalized; ProxyMap rejects overlap, gaps and range extrapolation; Assembly derives its timebase from persisted stream facts rather than 30 fps.

Media identity is streamed content identity with separate verified Original/Proxy locations, stream facts, proxy relations, relink and durable dependency staleness. Project Host validates Worker candidates and Master resolves a currently verified persisted Original; caller paths and Proxy candidates are not authority. Migration 0020 adds media asset, relation and dependency tables.

Worker Client owns one process generation, performs one handshake, routes concurrent request/job identities, reports progress, waits for cancel/timeout convergence and restarts only declared-idempotent work. Direct consumers close the persistent lifecycle, and Windows shutdown uses process-tree termination. Non-idempotent crash/reopen paths become blocked.

Manual, Model, Assembly, Rough Cut and Preset compatibility paths translate to typed Edit Intent/Edit IR and the one Project Host prepare/simulate/validate/CommitPlan transaction. Each successful edit persists Edit IR provenance atomically; protected-reference, lock, precondition and version failures leave Timeline authority unchanged.

Pending migrations create a consistent backup and run per-migration transactions with fault restoration. Object publication adds file and directory durability, cleanup and full streamed hash auditing; project locks include an owner token; reopen recovers committed Timeline and RUNNING Job classifications. Preview and Master continue to share one semantic graph.

All required repository commands except the real lane passed, including the full aggregate `pnpm run check`. `pnpm run acceptance:foundation:real` was executed, not skipped, and failed closed because `AVE_REAL_MEDIA_MANIFEST` is unset. Therefore ACC-028 through ACC-032 are tested, ACC-033 is blocked, CAP-FND-001 remains `implemented_pending_real_media_acceptance`, WP-FND-001 remains active, and no `docs:complete` was run. Existing advanced capability statuses are unchanged.
