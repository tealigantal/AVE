# WP-CA-MERGE-028 Positive Story Beat duration closure

## Outcome

Reject every Story Proposal whose individual beat duration is not strictly
positive, even when the remaining beats still sum exactly to the feasible
target, and prevent such a legacy or externally supplied candidate from
crossing the Story approval hard gate.

## Scope

- Treat strictly positive RationalTime as a Story Beat domain invariant while
  preserving zero as a valid value for generic RationalTime uses.
- Enforce the invariant in deterministic Story evaluation and repeat it in the
  Story approval hard gate for defense against persisted or caller-supplied
  candidates that did not pass the current evaluator.
- Preserve exact integer RationalTime arithmetic and existing total-duration,
  evidence, coverage, continuity and explicit-user approval rules.
- Add core regressions for `0 + target` evaluation and approval rejection.
- Add a Project Host regression proving an invalid proposal performs no object,
  artifact, edge or event writes.
- Reconcile the shared editing and creative-assistant fingerprint and Evidence
  without changing capability or acceptance status.

## Non-goals

- No change to the RationalTime schema or to zero-valued time semantics outside
  Story Beat duration.
- No Story Proposal, Approved Story Plan, SQLite schema or storage change.
- No Project Host, permission, desktop, Renderer, Worker or public API change.
- No new dependency, migration, capability claim, private real-media claim or
  PR merge authorization.

## Design decision

The invariant belongs to the Story domain because a zero-length beat cannot be
rendered as a meaningful narrative unit, while a zero RationalTime remains
valid in other contexts such as positions and offsets. One shared Story-only
positive-duration helper validates safe integer/timescale semantics and the
strictly positive numerator. Evaluation invokes it before producing a
candidate; approval invokes it again before constructing a Decision or Plan.
This is defense in depth inside the existing Story evaluator/approval boundary
and does not change stable architecture or require an ADR.

## Validation

Run Story intelligence property and Host suites, the Stage 2 Product workspace
suite, contract drift checks, typecheck, architecture and documentation gates,
the complete repository check, synthetic final acceptance, allowed-path audit,
independent review, and exact-head remote CI/review verification.
