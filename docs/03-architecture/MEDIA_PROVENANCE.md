# Media Provenance

## Provenance classes

| Class | Meaning | Required record |
| --- | --- | --- |
| Original Media | creator-provided or licensed source | content identity, verified location, source/owner, rights, import time, stream facts |
| AI Enhanced Media | derived media that preserves or transforms a source | parent identity, operation/model, parameters or prompt reference, version, time, rights, quality review |
| AI Generated Media | synthesized media without a direct original frame/audio parent | model/provider, prompt or generation intent, seed/config when available, version, time, rights, disclosure policy |

Enhanced and Generated support is a future target unless current programme
Evidence says otherwise. This policy does not create an implementation claim.

## Provenance chain

Every derived asset has immutable content identity and parent/input references.
Project Host validates identity, trust, rights, policy, and current location
before registration. Timeline references asset identity, not an unverified path.
Render and delivery manifests pin exact source identities and transformations.

A Stage 2 Project-owned immutable Original snapshot retains the creator's exact
Original content identity and provenance class; it is an internal authorized
copy, not a derived source or a new rights claim. Its row also binds the mutable
import location that was explicitly reviewed and the exact rights-policy
decision. Material Pack, execution and execution-bound Render authority use the
snapshot identity rather than treating either filesystem path as identity.
Missing, writable, linked, replaced, corrupted or policy-rebound snapshots fail
closed and require explicit recovery authorization.

## Prompt and privacy handling

Prompt text may contain sensitive intent or personal data. Store only the
minimum required audit reference under the user's retention policy; do not put
secrets or local absolute paths in portable Evidence. External generation
requires explicit upload/processing permission and provider disclosure.

## Master rule

Original-backed Master may use only a verified Original identity where the
declared semantic requires it. Proxy, generated, enhanced, missing, or stale
media cannot masquerade as Original. Mixed-origin outputs expose the class and
source chain at review and delivery.
