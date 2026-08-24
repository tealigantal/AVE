# WP-CA-INT-002 Duration Blueprint feasibility

This is the governed promotion of candidate `WO-INT-002`. Current Contracts,
source, tests and Evidence outrank the candidate document if they conflict.

## Goal

Implement an immutable versioned Duration Blueprint and deterministic
feasibility/allocation policy for 30-second through 30-minute plans. Short-form
profiles are independent constraints, not truncated long-form templates.

## Authority and compatibility

Project Host validates and pins an exact Blueprint against the current
approved Creative Contract and sufficient Material Evidence Pack. Contract
schemas remain the cross-language authority. Project Storage persists
content-addressed Blueprint and feasibility objects additively; no existing
Story, Timeline or rendering contract is replaced.

The Blueprint records total budget, acceptable variance, beat-count/density
bounds, per-role budgets, emotional curve and ending reserve. Allocation is
pure and deterministic. Missing evidence, contradictory budgets, stale refs or
impossible reserve constraints return explicit blockers.

## Acceptance

`ACC-CA-INT-002-DURATION` covers all documented duration boundaries,
deterministic allocation, exact content/version identity, idempotent retry,
reopen, migration preservation and zero Story/Timeline mutation.

Story generation, fixed templates, invented material, model invocation,
automatic duration approval, Timeline Commands and rendering are non-goals.
