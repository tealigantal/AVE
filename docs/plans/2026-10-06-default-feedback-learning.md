# Default feedback learning implementation

## Goal

Reconcile product documentation with the existing local profile runtime and make newly created profiles learn by default within a deliberately narrow, visible scope. Preserve opt-out, exact provider/source binding, deletion, expiry, and the current Host/Profile Repository ownership boundary.

## Baseline

- Generated current state has no active package; start `WP-S3-LEARNING-DEFAULT-001` before implementation.
- `ProfileRepository` currently initializes `consent: null`, so background learning is not active for a fresh user.
- The profile UI already exposes learning consent but is in the creation/profile workspace, not a global help affordance.
- `USER_CREATIVE_PROFILE.md` falsely says cross-project profile is not implemented; AI privacy policy says learning is off by default.
- Existing code and EVD-20261005-S3-RELIABLE-JOURNEY-DIRECT establish one explicitly scoped learning run, not universal/default-on behavior or human preference transfer acceptance.

## Decisions for this work

- New-user default preference is on; it does not authorize historical import or widen already configured consent.
- Automatic learning concerns submitted feedback for the active project, the provider already authorized for the current creation request, and a 30-day retention horizon.
- The front end states what is active and gives a persistent opt-out. Turning back on requires exact scope review.
- Existing per-source/data/provider checks, generation binding, local profile storage, and Host/model boundaries remain in force.

## Execution log

Started the registered `WP-S3-LEARNING-DEFAULT-001` with `pnpm docs:start -- WP-S3-LEARNING-DEFAULT-001`.

Implementation is recorded in `EVD-20261006-S3-LEARNING-DEFAULT-IMPLEMENTATION`. Focused TypeScript, profile, product-loop, desktop authorization, renderer boundary, contract and architecture checks passed. `pnpm docs:sync` passed. `pnpm docs:check` did not pass: it reports Stage3 Evidence applicability and current fingerprint mismatches, consistent with the pre-existing DOC-008 debt. The front-end toggle still needs user interaction acceptance. The package is left blocked; no completion or human acceptance is claimed.
