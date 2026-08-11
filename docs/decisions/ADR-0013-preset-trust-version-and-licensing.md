# ADR-0013 Preset Trust, Version and Licensing

## Status

Accepted safe default for WP-PRESET-001; external marketplace enablement remains deferred.

## Context

Preset definitions can reference assets and licenses and may eventually arrive from a marketplace. The repository does not define a signing root, key rotation, revocation service, network retrieval policy, license allowlist, legal interpretation or UI approval actor. Silently inventing those rules would change the security and legal model.

## Considered Options

1. Trust all definitions that pass Schema validation. Schema validity does not establish provenance, integrity, licensing or execution safety.
2. Implement an ad hoc local signature or license allowlist. This would create an unsupported trust and legal policy.
3. Execute only immutable built-in definitions by default; permit project-local definitions only when their exact digest is explicitly trusted by Host-authoritative context; quarantine all other external definitions and fail closed on uncertain license or asset state.

## Decision

Adopt option 3. Every definition is pinned by `(preset_id, preset_version, definition_digest)`. The same exact ID/version cannot be rebound to different content. Registry changes never alter an already applied Timeline. Migration is an explicit old-pin to new-pin operation that produces a new selection, application record and Timeline Commit.

Built-in definitions are repository-audited. Project-local definitions require an exact trusted digest supplied by Project Host authority. Marketplace definitions default to `quarantined`. Unknown, pending, expired or revoked license state; missing or mismatched asset identity; revoked definition; unavailable exact version; or absent approved migration all block a new application.

Trust digests and license statuses are explicit Host-session policy inputs for each new application; this package does not invent a persisted approval actor or legal-policy database. The resulting policy decisions are stored immutably in the application record, so reopening can audit what authorized the historical Commit. A later application must receive the policy again and never inherits approval merely from an older record.

Definitions cannot fetch assets or code at runtime. Asset references are content addressed. Revoked definitions cannot be newly applied. Whether historical renders must be disabled after later revocation remains a future product/legal decision; existing immutable Timeline history is not silently rewritten.

## Rationale

This provides a complete fail-closed interface without pretending that an external marketplace trust root or legal policy exists. Exact hashes make approvals and audit records deterministic.

## Consequences

External marketplace installation and execution remain unavailable. Users can continue to render previously committed Timeline semantics unless another explicit project policy blocks delivery. Legal review is still required before choosing a license allowlist or redistribution policy.

## Migration

The existing built-in Basic Vlog definition is registered with a stable exact version and computed definition digest. Future versions coexist. No automatic upgrade occurs on project open.

## Rollback

Disable new generic applications and retain expanded historical Timeline state and immutable application records. Do not delete audit objects or rewrite version pins.

## Date

2026-08-11
