---
evidence_id: EVD-20260826-WP-AUDIO-CI-001-COMPLETE
date: 2026-08-26
work_package_id: WP-AUDIO-CI-001
repository_commit: worktree-bundle-media-provenance-complete
code_fingerprint: 120012cb4e44ae3e0b443528583f32ad618395f5a1beb046bb1f71e0a599310e
capability_ids: [CAP-AUDIO-001, CAP-RENDER-001]
acceptance_ids: [ACC-018]
commands: ["pnpm run basic-vlog-toolkit:test", "pnpm run timeline-render:test", "pnpm run workbench:host:test", "pnpm run stage2-product-workspace:test", "pnpm run worker:render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run render-graph:test", "pnpm run render-bundle:test", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "git diff --check", "node scripts/docs/fingerprint.mjs"]
result: passed
environment: "Windows local checkout; FFmpeg 7.1.1; synthetic 48 kHz Dialogue and Music; exact Project Host Bundle and media-identity replay fixtures"
artifacts: ["fixed-frame Ducking preserves all 179200 samples for the 112/30-second fixture and repeated same-plan encoded outputs remain byte-stable", "audio-enabled plans use worker-media@v3 and render.worker.r13 while unaffected legacy plans retain v2 and r12", "completed immutable Bundle replay validates object and content hashes canonical output paths source media identities exact graphs plans manifests and Worker provenance", "same-path same-length source replacement and forged or mismatched replay data fail before render or publication writes", "fresh import relink and proxy inspections never inherit a path-only completed Job while render-time inspections remain zero-persistence", "Stage 2 exact execution binding participates in publication identity and is revalidated on replay", "complete repository and synthetic final acceptance pass", "independent security and code reviews report no remaining P0 P1 or P2 finding"]
remaining_risks: ["Private real-media status is unchanged and no new real-media claim is made.", "The bounded ACC-018 slice does not promote arbitrary routing envelopes or a general professional audio bus.", "Exact-head remote security and check jobs plus a fresh review-thread audit remain required.", "No PR merge is authorized."]
---

# WP-AUDIO-CI-001 complete

Deterministic Ducking and the surrounding fail-closed media, Job, Worker and
immutable Bundle replay boundaries pass focused, complete-repository,
synthetic-acceptance and independent-review gates at the final source
fingerprint.
