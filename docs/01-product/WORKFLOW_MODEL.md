# Workflow Model

## User behavior to system capability

| User behavior | Required system capability | Authoritative artifact | Approval boundary |
| --- | --- | --- | --- |
| imports or relinks media | identity, probe, provenance, proxy mapping | media records owned by Project Host | source/privacy policy |
| corrects an AI observation | evidence correction and invalidation | Evidence Graph / Material Evidence Pack version | user-authored correction |
| states creative intent | contract assembly and conflict detection | Creative Contract | contract approval |
| explores alternatives | candidate generation and comparable evaluation | Direction Cards and Skill Evaluations | selection, not execution |
| approves a story | narrative planning with evidence coverage | Story Plan and Decision Record | exact-version approval |
| requests an edit | semantic planning and capability resolution | future Edit Intent -> Host adapter -> current CommandEditIntent / CommandEditIR | policy-bound commit approval |
| accepts a change | atomic Timeline mutation and recovery | Command, CommitPlan, Timeline version | Project Host commit |
| watches output | same-semantic render and QC | Semantic Render Manifest, target-specific Preview/Master ExecutionPlans, Render Bundle | review only |
| gives feedback | observation/goal diagnosis and local patching | Feedback Diagnosis, patch Decision Record | scoped patch approval |
| delivers a video | rights, privacy, provenance, QC, Master | delivery record | explicit final approval |

## Ownership rule

Creator World and Creative World may influence a change; only Project Host can
authorize a project-state transition. Timeline World never infers product
consent. Render World never repairs unsupported semantics by omission. Outcome
Learning may inform future candidates but cannot rewrite prior artifacts.

## Status rule

This table defines the desired workflow contract. It does not prove every row
is implemented. Use the programme matrices, generated current state, Evidence,
and retained media review for capability claims.
