# WP-CA-TRUTH-001 Single-version source and document truth reconciliation

## Outcome

Make current source, contracts, tests, architecture, specifications, Work
Orders and programme truth describe one Stage 2 development baseline with no
AVE-owned old-version migration or compatibility route.

## Required behavior

- The accepted single-current-version ADR and current runtime identities agree
  exactly, including the one Render adapter and Worker release identity.
- Preset selection accepts only an exact current definition; no API migrates
  an older pin, and the Basic Vlog compiler is a direct current adapter rather
  than a compatibility facade.
- Contract tooling validates current identity and roundtrip only; names and
  documentation do not imply support for old payloads.
- Current specifications and candidate Work Orders target the atomic current
  project-format baseline, never deleted database migration paths or reads of
  older AVE-owned project data.
- Historical ADR, completed package and Evidence records remain immutable and
  are interpreted through ADR-0025; generated documents remain generated.
- Every retained version field protects current schema identity, concurrency,
  immutable references, staleness, cache identity or audit rather than an old
  version compatibility route.

## Non-goals

No history rewrite, external interchange removal, capability expansion,
real-media acceptance or merge.

## Validation

Run Preset, RenderGraph, Worker, Timeline render, contract identity/roundtrip,
type, architecture and complete documentation gates. Close only after focused
searches and independent read-only source/governance review find no unresolved
current-truth issue.
