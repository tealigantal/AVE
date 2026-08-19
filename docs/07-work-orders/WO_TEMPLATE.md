# Work Order Template

Copy this template into the appropriate governed work-order location. Replace
every bracketed instruction with repository facts. Do not start implementation
until the Work Order is promoted and active.

## Header

- **ID:** `WO-<DOMAIN>-<NNN>`
- **Title:** [one bounded outcome]
- **Lifecycle:** draft / reviewed / ready / active / blocked / completed
- **Owner:** [person or team]
- **Last reviewed:** YYYY-MM-DD
- **Normative sources:** [product, architecture, object, ADR, programme links]

## Objective

[One independently verifiable system outcome. A folder, schema, interface, or
test alone is not an outcome.]

## User Outcome

[What a user can newly accomplish or what material failure is prevented.]

## Allowed Files

- `[exhaustive narrow path/**]`

Generated files may change only through their generator.

## Forbidden Files

- `[explicit path/**]`
- `docs/archive/**`
- [adjacent modules not owned by this Work Order]

Stop if an essential change falls outside the list.

## Input Contract

For each input provide exact schema/object version, identity, authority,
producer, validation, persistence, rights/privacy/trust, and stale rules.

## Output Contract

For each output provide exact schema/object version, owner, authoritative or
derived status, idempotency identity, persistence, compatibility, provenance,
and failure semantics.

## Implementation Steps

1. [Vertical slice ordered by authority path.]
2. [Contract/codegen if needed, pure domain, Project Host, persistence, Worker,
   UI—only the layers actually required.]
3. [Success and fail-closed integration.]

State the point before which Timeline and project events must remain unchanged.

## Tests

- **Contract:** [positive, negative, compatibility, generated clean]
- **Domain:** [invariants/property tests]
- **Host:** [authority, version, idempotency, zero-mutation failure]
- **Storage:** [atomicity, migration, reopen, recovery]
- **Media/runtime:** [encoded output, objective probes, semantic parity]
- **Architecture/security:** [forbidden dependency, input/permission abuse]
- **Repository commands:** [exact verified commands]

## Fixture

[Origin, license/consent, content identity, expected behavior, privacy,
retention, external location policy, and cleanup.]

## Stop Conditions

- required edit is outside allowed paths;
- product intent, public API, security, persistence, cost, or provider decision
  is unresolved;
- input authority or licensed fixture is unavailable;
- unsupported capability would need silent approximation;
- failure cannot guarantee zero unauthorized mutation;
- required real-media or human acceptance cannot be performed.

## Definition of Done

- user outcome is observable on the formal authority path;
- success, failure, version conflict, retry, persistence, reopen, provenance,
  and rollback pass;
- Preview/Master and QC gates pass where media is involved;
- required human review accepts the exact retained artifact;
- `EVD-*` pins current fingerprint, commands, outputs, and remaining risk;
- capability/acceptance/programme/docs state matches the bounded result;
- no unresolved blocking review finding;
- generated docs are synchronized and the diff stays inside allowed paths.

## Dependencies and Non-goals

[Name upstream package IDs and Evidence, plus tempting adjacent capabilities
that remain explicitly unimplemented.]

## Rollback, Retry, and Migration

[Additive migration, backup/reopen behavior, idempotency identity, cleanup of
unpublished artifacts, and return to last committed state.]
