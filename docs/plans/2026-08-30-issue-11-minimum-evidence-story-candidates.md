# ExecPlan: Issue #11 minimum-evidence Story candidates

## Objective

Generate two genuinely distinct, valid Product Story candidates for every minimum legal, sufficient and plannable 30s/60s Material Evidence input without making same-role/equal-duration swaps a hidden prerequisite.

## Progress

- [x] Rebuild the current merged #16 baseline and create the dedicated Issue #11 branch.
- [x] Locate the same-role/exact-duration candidate-differentiation guard in Project Host Story generation.
- [x] Register/start WP-CA-STAB-002 and record the 30s/60s minimum-input guard failure.
- [x] Implement deterministic valid differentiation and focused recovery/failure closure tests.
- [ ] Validate, record Evidence, publish, merge and clean the branch.

## Validation and recovery

All changes remain in the Work Package allowlist. Regressions use synthetic Product fixtures with current authority and no real-media claim. If a gate fails, preserve the failing evidence and repair only the owned Host/test scope. A rejected or truly insufficient path must not persist approvals, packs, artifacts or Timeline changes.

## Discoveries

- Material-stage generation rejected 30s/60s minimum inputs when Duration beat budgets lacked two same-role, exactly equal-duration positions; both current minimum Blueprints instead retain equal-duration Hook/Ending positions across roles.
- Story-stage exact duration validation permits a deterministic Evidence rotation across those equal-duration positions while retaining role allocation/order and all current evidence bindings.

## Decision log

- Chosen: rotate the ordered approved Evidence within the first deterministic exact-duration group, regardless of role. The rotation changes candidate Evidence order while every target Beat still receives an Evidence range of exactly its duration.

## Outcome and retrospective

Pending.
