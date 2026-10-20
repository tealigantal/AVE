# ADR-0043 — Default scoped feedback learning

## Status / Date

Accepted 2026-10-06 by the user's explicit request to make background self-learning default-on and add a front-end on/off control. Implementation and focused verification are recorded by `WP-S3-LEARNING-DEFAULT-001`; this ADR does not claim human acceptance or release.

## Context

The local Profile Repository and Host-owned learning path already support consent-bound feedback extraction, local preference storage, contextual query, expiry, correction and forgetting. A fresh profile previously had `consent: null`, so background feedback learning did not run. Documentation still described cross-project profiles as unimplemented and all learning as off by default.

## Considered options

1. Keep learning opt-in and only clarify the existing control. This does not fulfill the requested default-on behavior.
2. Enable learning for all project history and data categories. This unnecessarily widens the data boundary and is not required for the requested behavior.
3. Default on only for explicitly submitted feedback in the current request/project, through its already-authorized provider, with a 30-day profile retention and a visible opt-out. Broader sources and signal types remain separately configured.

## Decision

Choose option 3. The creation confirmation shows a separate `feedback` authorization category, checked by default for new/unconfigured profiles. The Host may initialize a fresh profile's consent only after this category reaches the real feedback-learning path. It binds the current project, `feedback` data type, exact creation provider, and a 30-day retention deadline. The learning call remains separate from ordinary creation model calls and must honor that permit.

Existing disabled, expired, excluded, or narrower profile consent is never widened by opening a project, restarting, or migrating. Disabling learning persists through the existing profile consent owner and blocks subsequent learning sends and profile retrieval. Re-enabling uses the existing exact-scope review. Historical references, manual diffs, adoption/selection, raw media, shared model training and product analytics are outside the default.

## Consequences

- The profile consent record remains the sole source and scope authority; no second preference store or renderer-owned setting is introduced.
- Request authorization visibly covers feedback transfer to the same provider. Unchecked feedback prevents the Host from starting automatic learning.
- New default scope is narrowed to one project and expires after 30 days. Further projects require explicit scope selection.
- Existing profile schema and data remain readable; only null consent is eligible for the new default.
- Documentation must distinguish local preference learning from model-weight training and synthetic tested evidence from human acceptance.

## Migration

No bulk migration or historical scan. Existing consent records are preserved byte-for-byte until an explicit user action or a newly authorized first feedback event for a profile whose consent is null. Generated contract bindings are refreshed from the source schema when the request authorization enum changes.

## Rollback

Disable learning through the Profile view. Code rollback restores the prior off-by-default behavior; already learned profile records remain subject to the existing inspect/forget controls and are not silently deleted. No project Timeline or source media is changed.
