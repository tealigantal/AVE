---
evidence_id: EVD-20260825-WP-CA-MERGE-001-COMPLETE
date: 2026-08-25
work_package_id: WP-CA-MERGE-001
repository_commit: worktree-stage2-merge-gates-complete
code_fingerprint: 47dde9be2ea0bec13681993400808ad94f7b67bbae70cfe3fe34a612f270ec64
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run docs:fingerprint:test", "pnpm run ci:workflow:test", "pnpm run stage2:check", "pnpm run docs:sync", "pnpm run docs:sync -- --check", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "git diff --check"]
result: passed_complete
environment: "Windows local checkout; deterministic CI-compatible Stage 2 lane; no private real media or deployment"
artifacts: ["fingerprint v3 includes scripts, tsconfig variants, pnpm workspace, dependency-cruiser, pyproject and uv lock inputs", "fingerprint regressions mutate every new input category", "default check invokes all eight deterministic Stage 2 suites", "private real-media pipeline remains separate as intelligence-pipeline:real", "Story migration regression no longer assumes migration 26 is globally latest", "both programme matrices and current state bind the repaired exact fingerprint", "non-blocking Electron harness placement debt DEBT-CA-STAGE2-002"]
remaining_risks: ["GitHub Actions security and check jobs must still pass on the pushed final SHA before merge.", "DEBT-CA-STAGE2-002 remains active for a later dedicated E2E harness package.", "No branch merge is authorized by this Evidence."]
---

# WP-CA-MERGE-001 completion

The branch-review merge gates are closed locally without changing Stage 2
product behavior. The default repository check now owns every deterministic
Stage 2 suite, the expanded fingerprint covers governance programs and critical
root build/architecture configuration, and both programme registries bind the
same exact source fingerprint. External GitHub Actions remains a separate
required merge condition and will be observed on the pushed final SHA.
