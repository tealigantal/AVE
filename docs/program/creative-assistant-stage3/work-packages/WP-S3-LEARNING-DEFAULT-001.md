# WP-S3-LEARNING-DEFAULT-001 — Default-on scoped feedback learning

Make creator feedback learning active by default for newly authorized work, while retaining an immediate user-facing opt-out. The default scope is the current project, explicit feedback only, the exact provider already selected for that creation request, and 30 days. Do not scan/import historical projects, infer permission for manual edits/selections, or change existing users' saved consent. Profile principles remain local and auditable; any learning model call uses the authorized provider and only the bounded feedback-learning payload.

The workbench must expose the effective state and a clear enable/disable control in its help/profile guidance. Turning learning off prevents subsequent learning sends and retrieval of profile preferences. Re-enabling does not restore revoked consent or forgotten sources; a fresh scoped authorization is required. Existing profile scope selection, retention, source exclusion, correction, and forgetting remain authoritative.

Correct stale current documentation against source and executed checks. Update product privacy authority and add an ADR because the default policy changes. Never edit historical Evidence or generated current documents by hand.

## Acceptance

- A new profile defaults to learning enabled, but effective learning is restricted to the current request's explicit feedback, current project, already-authorized provider, and 30-day retention.
- Turning learning off from the user-facing control persists across restart and blocks subsequent model dispatch and profile use; turning it back on requires a fresh review of the exact scope.
- Existing explicit disabled, revoked, expired, or narrower consent is never widened by migration or by opening a project.
- No historical scan, selection/manual-diff learning, provider substitution, or successful-looking fallback is introduced.
- User Profile documentation accurately describes the current local implementation and its tested/accepted boundary.

## Required validation

Run the focused profile storage/Host, desktop authorization, renderer workbench checks, typecheck, architecture, contracts:check, docs:sync, and docs:check. Record exact results in a new immutable EVD record; do not claim human acceptance or Stage Exit.

## Execution record — 2026-10-06

- Implemented default feedback authorization in the creation consent panel and a profile help/control entry. New null-consent profiles bind only feedback, the current project, the exact current provider and 30-day retention. Existing consent is not widened. User-facing disable persists through the existing Profile Repository.
- Corrected `USER_CREATIVE_PROFILE.md`, `CREATIVE_MEMORY_ARCHITECTURE.md`, `AI_PRIVACY_MODEL.md`, and the Stage3 plan; added ADR-0043.
- Passed: `pnpm run typecheck`; `pnpm run stage3:profile:test`; `pnpm run stage3:learning:test`; `pnpm run stage3:product:test`; `pnpm run stage3:desktop:test`; `pnpm run renderer:workbench:test`; `pnpm run contracts:check`; `pnpm run architecture`.
- `pnpm docs:sync` passed. `pnpm docs:check` remains blocked by pre-existing Stage3 Evidence applicability/current-fingerprint mismatches (including the recorded DOC-008 shared validation debt); it did not pass for this work. See EVD-20261006-S3-LEARNING-DEFAULT-IMPLEMENTATION.
- Front-end human operation/acceptance has not been performed. The feature is implemented, not human-accepted; the work package remains blocked until the repository documentation gate is reconciled.
