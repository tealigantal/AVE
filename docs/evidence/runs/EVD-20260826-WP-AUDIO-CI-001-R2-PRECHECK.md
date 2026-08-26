---
evidence_id: EVD-20260826-WP-AUDIO-CI-001-R2-PRECHECK
date: 2026-08-26
work_package_id: WP-AUDIO-CI-001
repository_commit: worktree-bundle-media-provenance-precheck
code_fingerprint: 120012cb4e44ae3e0b443528583f32ad618395f5a1beb046bb1f71e0a599310e
capability_ids: [CAP-AUDIO-001, CAP-RENDER-001]
acceptance_ids: [ACC-018]
commands: ["pnpm run basic-vlog-toolkit:test", "pnpm run timeline-render:test", "pnpm run workbench:host:test", "pnpm run stage2-product-workspace:test", "pnpm run worker:render-graph:test", "pnpm run worker:render-correctness:test", "pnpm run render-graph:test", "pnpm run render-bundle:test", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; FFmpeg 7.1.1; synthetic 48 kHz Dialogue and Music; exact Project Host Bundle and media-identity replay fixtures"
artifacts: ["both exact-duration sidechain inputs are normalized to equal 1024-sample frames and repeated same-plan outputs remain byte-stable", "audio-enabled execution plans use worker-media@v3 with render.worker.r13 while v2 and render.worker.r12 remain valid only for non-audio legacy plans", "completed immutable Bundle reuse verifies object hash identity plans source references manifests output paths media hashes and exact Worker provenance before returning", "same-path same-length imports create fresh media inspection Jobs and a replaced original fails closed before render submission or publication", "Job metrics fallback accepts only a canonical Worker rerun whose outputs exactly match stored output references", "Stage 2 bound and unbound Bundle publication identities remain distinct and binding provenance is revalidated on replay", "focused Worker Host contract type architecture and Stage 2 integration gates pass", "independent security and code reviews report no remaining P0 P1 or P2 finding"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Exact-head remote security and check jobs plus a fresh review-thread audit remain required.", "The bounded ACC-018 slice does not claim arbitrary routing envelopes or a general professional audio bus.", "Private real-media status is unchanged and no new real-media claim is made.", "No PR merge is authorized."]
---

# WP-AUDIO-CI-001 R2 precheck

The final source fingerprint closes deterministic Ducking execution together
with fail-closed media identity, Worker provenance, Job replay and immutable
Bundle reuse boundaries. Focused Worker, Host, contract, architecture and Stage
2 gates pass before the completed-state repository gates.
