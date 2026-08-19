# Test Strategy

## Evidence ladder

| Layer | Proves | Does not prove |
| --- | --- | --- |
| schema/contract | accepted and rejected data shapes, compatibility | runtime ownership or useful output |
| pure domain | deterministic rules, invariants, property ranges | persistence or media execution |
| Host integration | authority path, atomicity, version conflict, idempotency | encoded semantic correctness alone |
| storage/reopen | durable last-valid state, migration/recovery | subjective creative quality |
| Worker/backend | plan validation and media execution facts | project approval or ownership |
| synthetic acceptance | deterministic end-to-end regression | representative real-media quality |
| real-media acceptance | encoded output, identity, stream and observable semantics | subjective acceptance unless viewed |
| human evaluation | picture, audio, pacing, story, trust, usability | broad generalization beyond reviewed artifacts |

## Required dimensions

Every capability slice covers success, invalid input, stale/version conflict,
unsupported capability, zero-mutation failure, idempotent retry, persistence and
reopen, provenance, and architecture boundary. Media changes also cover Preview/
Master semantic equivalence, encoded probes, QC, source identity, and retained
artifact review.

## Fixture policy

Fixtures state origin, license, consent, expected content, stream facts, and
retention. Real media remains outside Git when required; repository Evidence
records hashes and non-sensitive provenance, never private absolute paths.

## Status and anti-gaming

Test names use the exact bounded behavior. A marker string, filter plan, mock,
or output-file existence check cannot substitute for observable semantics.
Passing tests may set `tested` only through governed matrices and Evidence;
`accepted` additionally requires its specified real-media or human gate.

## Current results

Do not copy live pass/fail lists here. Use programme matrices, generated
[`docs/current/VALIDATION.md`](../current/VALIDATION.md), and immutable Evidence.
