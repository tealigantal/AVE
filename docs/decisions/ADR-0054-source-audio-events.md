# ADR-0054 — Source-bound audio observations

Date: 2026-11-08. Status: implementation in progress; not enabled for the existing deployment.

## Context

ADR-0052 deliberately rejects ambient or generic source-audio requirements when no interval-bound non-silence evidence exists. The existing v1 audio observation has a free-text description of a sample and does not locate semantic sound events. Nonzero PCM does not identify ambient sound, and a model's classification is not a fact guaranteed by schema validation.

## Decision

Define an independently versioned audio observation output. An event carries a model-assessed category, description, uncertainty, and exact source RationalTime within its authorized sampled WAV. Event identities derive from the immutable observation and sample, not from model-supplied IDs. Independently verify the sample's source and content identities and measure the exact PCM frame interval. An ambient requirement may only be considered with both an explicitly ambient, non-uncertain model observation and a nonzero exact-interval signal, bound to the request and selected, active Timeline source interval. Time maps, speed changes, audio fades, audio automation and other unverified processing cannot establish participation. The result establishes only source participation: mixing can cancel signals, and QC can miss silence shorter than its detection window. Without rendered event-interval evidence it does not prove a nonzero final event, ambient sound, perceptual audibility, or subjective fulfillment. Uncertain, silent, unknown, unsupported, unavailable, or unbound events remain insufficient; audio is never automatically inserted.

Existing v1 observations, proof reconstruction, and existing authorizations remain unchanged. A changed sound system prompt changes the deployment identity, so an event-capable provider cannot silently replace the authorized v1 route. Host can register explicitly selected distinct deployments, include the selected observation mode in the authorization review, and resolve each existing request by its complete frozen deployment. The current product does not register or offer this selection, and the deployed local YAMNet service returns only v1 descriptions: nonzero input is explicitly uncertain, so it does not supply a v2 ambient event. The capability therefore remains disabled in the normal product flow. New evidence must use a newly authorized observation; do not retrofit a v1 result into a v2 event.

## Consequences and verification

Controlled tests cover malformed, wrong-source, out-of-range and off-grid events; silence and non-ambient signals; model uncertainty; source authorization and digests; full event coverage and active routing; old-v1 replay; provider proof and deployment pinning. Stored v2 event and PCM projections are reconstructed from the bound observation on planning result registration and draft reopening. Controlled tests cannot establish that a model's category is correct, and the Host does not reliably detect a model's incorrect `not_requested` interpretation. This positive-evidence design does not verify negative requirements such as "must be silent"; it is not a complete audio-intent contract. Verify a new authorized real workflow separately before any product acceptance claim.
