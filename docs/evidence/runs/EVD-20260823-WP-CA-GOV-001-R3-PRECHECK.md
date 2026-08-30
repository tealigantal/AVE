---
evidence_id: EVD-20260823-WP-CA-GOV-001-R3-PRECHECK
date: 2026-08-23
work_package_id: WP-CA-GOV-001
repository_commit: worktree-before-completion-commit
code_fingerprint: e09d2ce7e5bfcec7507d49382e5db584be100a4da9fab0750d48628bae6872e7
capability_ids: [CAP-CA-GOV-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-CA-GOV-001]
commands: ["pnpm run docs:sync", "pnpm run docs:architecture:test", "pnpm run docs:fingerprint:test", "pnpm run docs:check"]
result: r3_precheck_passed_pending_current-evidence_recheck
environment: "Windows local checkout plus temporary Git-backed two-programme fixtures; no network, model, production service or media processing"
artifacts: ["docs:complete current-fingerprint Evidence validator", "real capability/acceptance/EVD fixture", "missing and malformed Evidence zero-write fixtures", "programme/directory/registry zero-write fixtures"]
remaining_risks: ["The first R3 docs:check correctly rejected the superseded R2 fingerprint and is rerun after this PRECHECK becomes current.", "No Stage 2 application capability is implemented by this governance repair."]
---

# WP-CA-GOV-001 R3 PRECHECK

R3 closes the independent-review finding that `docs:complete` could succeed for an empty owned matrix and nonexistent Evidence. Completion now rejects missing ownership, stale programme fingerprint, missing Evidence file, mismatched Evidence ID, wrong Work Package, wrong current code fingerprint, and missing capability or acceptance binding before any governed/generated write.

The valid transition fixture now owns a real capability and acceptance and supplies a real current-fingerprint `EVD-TEST.md`. Negative fixtures exercise missing, wrong-ID, wrong-package, wrong-fingerprint and unbound Evidence plus incomplete ownership, and compare every registry/manifest/matrix/STATE/current/index/Evidence file byte-for-byte before and after rejection.

Executable fixtures additionally cover duplicate Programme ID, duplicate programme directory, unknown registry selection and registry/active mismatch. The initial R3 `docs:check` failed only because the R2 Evidence fingerprint was superseded by these test changes.
