# Workflow Model

## User behavior to system capability

| User behavior | Required system capability | Authoritative artifact | Approval boundary |
| --- | --- | --- | --- |
| imports or relinks media | identity, probe, provenance, proxy mapping | media records owned by Project Host | source/privacy policy |
| corrects an AI observation | evidence correction and invalidation | Evidence Graph / Material Evidence Pack version | user-authored correction |
| states creative intent | contract assembly and conflict detection | Creative Contract | request authorization within declared scope |
| explores alternatives | candidate generation and comparable evaluation | Direction Cards and Skill Evaluations | optional exploration; no forced selection |
| approves a story | narrative planning with evidence coverage | Story Plan and Decision Record | optional exact selection; main draft uses request authorization |
| requests an edit | semantic planning and capability resolution | future Edit Intent -> Host adapter -> current CommandEditIntent / CommandEditIR | request-bound reversible draft, renewed consent only outside scope |
| accepts a change | atomic Timeline mutation and recovery | Command, CommitPlan, Timeline version | Project Host commit |
| watches output | same-semantic render and QC | Semantic Render Manifest, target-specific Preview/Master ExecutionPlans, Render Bundle | review only |
| gives feedback | observation/goal diagnosis and local patching | Feedback Diagnosis, patch Decision Record | request-authorized draft; adopted version separate |
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

Stage3 默认主初稿无需先选择 Direction/Story；本表的“approves a story”是可选用户行为。可观察主流程以 [User Experience Flow](../product/USER_EXPERIENCE_FLOW.md) 为准；保留当前 Stage2 合同事实，不伪造批准。
