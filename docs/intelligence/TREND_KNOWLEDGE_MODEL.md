# Trend Knowledge Model

## Purpose and boundary

Trend knowledge is optional, expiring advice about observed audience or format
behavior. It cannot change the Creative Contract, outrank material evidence or
creator identity, or directly create Edit Intent. Private project media is not
uploaded for comparison by default.

## TrendSignal

A Trend Signal is one source-qualified observation.

Required fields:

- `signal_id`, `schema_version`, source type and immutable source identity
- platform, region, language, audience and content category
- `observed_at`, source measurement window and `fetched_at`
- metric/observation kind, normalized value and original unit/definition
- sample size or explicit unknown, sampling method and known bias
- rights/license, authenticity/bot-risk assessment and provenance
- confidence with basis and `expires_at`

Signals from different metric definitions are not merged merely because their
names are similar. Missing timestamp, source, rights or expiry makes a signal
ineligible for a Trend Pattern.

## TrendPattern

A Trend Pattern is a reviewed aggregation or bounded claim over compatible
signals.

Unlike a reviewed `VideoPattern`, which is reusable creative knowledge and may
remain stable, a `TrendPattern` is an explicitly time-sensitive aggregation of
current Signals. A Video Pattern may help interpret a Trend Pattern, but the
two retain separate identities, evidence bases and expiration policies.

Required fields:

- `pattern_id`, version/digest, status and claim
- exact `signal_refs[]`, aggregation/policy version and observation window
- platform/region/audience/content/duration scope
- direction (`emerging`, `stable`, `declining`, `uncertain`)
- confidence, freshness score and source-diversity basis
- compatible/incompatible Creative Contract and material dimensions
- counterexamples, authenticity risk, copying risk and expected expiration

Aggregation must preserve contradictory signals. A popularity correlation is
not represented as a causal editing rule.

## TrendPack

A Trend Pack is the project/run-specific immutable selection used by creative
planning.

Required fields:

- `pack_id`, version/status and project/run refs
- approved Creative Contract and Material Evidence Pack refs
- exact Trend Pattern versions/digests with match scores and reasons
- `retrieved_at`, shared expiration and catalog snapshot identity
- compatibility result per pattern: `compatible`, `adaptable`, `conflicting`
- suggested principle, risks, rejected alternatives and unresolved questions
- policy/tool provenance and creator approval requirement

The pack expires at the earliest relevant pattern/source expiration. It may be
empty with an explicit reason; an empty pack does not block planning unless a
user-approved contract explicitly requires current trend context.

## Retrieval and expiration

```text
source adapters -> validated TrendSignals -> reviewed TrendPatterns
approved contract + evidence pack + catalog snapshot
  -> trust/rights/freshness filter
  -> compatibility evaluation
  -> ranked immutable TrendPack
```

Project Host supplies the bounded query and registers the returned pack.
Adapters and Model Gateway do not write project state. Retrieval is
deterministic for the same query, catalog snapshot and policy version.

Freshness is evaluated at use time, not only ingestion time. Expired patterns
are withheld; near-expiry patterns are labeled with their remaining window.
Re-fetch creates new Signals/Patterns/Pack versions. Historical decisions keep
their pinned versions and provenance.

## Compatibility contract

Evaluation covers platform, region/language, audience, content type, target
duration, creator voice, evidence availability, privacy/rights and executable
capabilities. Each dimension returns status, reason and evidence refs. One hard
conflict disqualifies a pattern. Adaptation must state what principle changes;
it cannot silently transform a trend into a different claim.

## Failure behavior

- unavailable or unlicensed source: reject Signal;
- incomparable metrics or insufficient source diversity: retain candidate as
  uncertain, do not publish a strong Pattern;
- expired Pattern: exclude from new packs;
- creator/material conflict: record rejected alternative;
- provider outage: return `trend_unavailable` and continue without Trend Pack
  unless the contract explicitly requires it;
- invalid generated summary: discard it while retaining validated raw Signals.

No trend failure modifies Timeline or an approved Story Plan.

## Implementation target

The first governed Trend Retrieval slice adds additive knowledge schemas,
generated bindings, deterministic filters/compatibility scoring, a repository-
shipped read-only catalog port and Project Host content-addressed project
snapshots. Tests cover timestamp/expiry,
metric incompatibility, rights, exact version pins, contradictory signals,
empty-pack degradation and stale-pack rejection. Live platform connectors,
scraping, paid data and background refresh require separate work packages and
explicit source/legal review.
