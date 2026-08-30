# ADR-0027: Machine-defined impact-scoped Evidence applicability

## Status

Accepted for implementation by WP-CA-GOV-003.

## Context

The repository fingerprint correctly identifies the entire checkout, but using it as the only Evidence applicability key means unrelated governance edits invalidate every capability's Evidence. That is both noisy and unable to express which implementation boundary a result actually covered.

## Considered options

1. Keep one global fingerprint. It is simple but over-invalidates and cannot distinguish unrelated governance changes.
2. Use only a programme-scoped fingerprint. This improves separation between programmes but is too broad for independently owned capability and package boundaries.
3. Use capability/work-package impact scopes owned by programme metadata, with a repository fingerprint retained separately. This makes applicability auditable and prevents a caller from declaring its own exemption.
4. Rewrite historical Evidence after migration. This would falsely imply fresh execution. Instead, preserve immutable historical records and create an explicit applicability-index-only baseline that records old repository identity and current scope identity.

## Decision

Retain the repository fingerprint for whole-checkout identity. Introduce a machine-defined impact-scope model sourced from governed programme metadata. New Evidence carries the actual scope fingerprint. Applicability is computed by tooling, never asserted by callers. Scope declarations themselves are part of their scope identity and reject empty, all-excluded, or broad bypass definitions.

Legacy Evidence remains immutable. A legacy applicability index may link its Evidence ID, migration-era repository fingerprint and current scope fingerprint, marked `applicability_index_only`; it is not a test rerun or acceptance promotion.

The same package adds fail-closed checks for multiple current Contract majors in one schema family and for deleted-interface references in current authority documents. Archive, immutable Evidence and historical ADRs are deliberately outside the current-authority scan.

## Consequences

Evidence applicability becomes precise and deterministic, but scope metadata and its tests are now governance-critical. This decision changes neither Stage 2 product behavior nor its real-media/direct-human exit requirements.
