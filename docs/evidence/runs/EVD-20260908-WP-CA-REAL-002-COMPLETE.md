---
evidence_id: EVD-20260908-WP-CA-REAL-002-COMPLETE
date: 2026-09-08
work_package_id: WP-CA-REAL-002
repository_commit: 239073bfcf7f26a85c71bc43d5115c042107dc65-worktree
code_fingerprint: 9a15b455c0aba94e1171ae99e85fb584fa094683ce0a9614101d451e35a36d1e
scope_fingerprint: 8f7dadadba8923330f2afd837980aa98ca67306c9505d68d5dbb7634d7ec06cf
capability_ids: [CAP-CA-PIPELINE-001]
acceptance_ids: [ACC-CA-PIPE-001]
commands: ["pnpm run intelligence-pipeline:test", "pnpm run feedback-revision:test", "pnpm run intelligence-pipeline:real", "pnpm run typecheck", "pnpm run architecture", "pnpm docs:sync", "pnpm docs:check"]
result: passed
environment: "Windows Node 22 local checkout; authorized CC-BY real-media derivative and manifest remain repository-external"
artifacts: ["real Pipeline negative rebound and immutable-Original checks", "QC-passed 60-second Preview and Master with matching SHA-256 and semantic graph hash", "explicit rejected inward-trim feedback decision", "repository-external review manifest"]
remaining_risks: ["This repair does not constitute WP-CA-REAL-001 Product or direct-human acceptance.", "The scoped inward trim remains rejected for real rendering because it would introduce an unplanned black gap; no ripple behavior was added.", "No external media, local manifest or review artifact is tracked by Git."]
---

# Real Pipeline rebound-reason precedence repaired

The Host now identifies the committed execution row by execution identity and
Timeline authority, then applies its existing explicit source-identity,
semantic-graph and plan rebound checks in order. This restores the precise
source-identity rejection without weakening fail-closed rendering or allowing
any persistence before rejection.

The authorized real run reconstructed its render profile from immutable
Original probe geometry. It exercised unauthorized-Original, execution,
source-identity, semantic-graph and plan rebound rejections before producing
matching 60-second Preview and Master artifacts with QC `passed`. The real lane
records a previously verified explicit rejection of the one-second inward trim
and renders the unchanged accepted first cut, because accepting that trim would
leave a one-second black gap. The synthetic lane still executes the feedback
revision and verifies atomic failure recovery, retry, undo/redo and reopen.

This is repair evidence only. Electron Product flow, direct-human visual
acceptance and Stage Exit remain separate work under `WP-CA-REAL-001`.
