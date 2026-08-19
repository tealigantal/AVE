# Creative Intelligence Runtime

## Scope and invariant

This is the target orchestration blueprint for turning creator intent and
material evidence into an approved Edit Intent. It introduces no autonomous
agent and gives no subsystem direct Timeline authority. Project Host
orchestrates feature boundaries; Model Gateway only returns contract-validated
candidates; Project Storage is written only by Project Host.

```text
User Goal
  -> Interview / Creative Contract
  -> Evidence Retrieval / Material Evidence Pack
  -> Knowledge Retrieval / Skill + Style + Trend context
  -> Story Candidate Generation
  -> Deterministic Evaluation and Ranking
  -> User Approval / Story Plan + Decision Records
  -> Edit Intent Generation
  -> Host Resolve / Edit IR / Preconditions / Compile / Simulate / Validate
  -> Timeline Command / CommitPlan
  -> RenderGraph / QC / Review
```

No stage before the final Project Host commit may mutate Timeline. Candidate
objects remain comparable, rejectable and reproducible.

## Run identity and state

Project Host creates a logical `CreativeRun` identity containing project ID, purpose,
base Timeline version, approved Creative Contract ref, policy snapshot and an
idempotency key derived from exact input refs. Stage outputs are immutable
objects linked to this run. A retry with the same inputs may reuse validated
outputs; changed inputs create a new run. Model prompts, raw provider replies
and private paths are not domain objects; only validated candidates and audit
metadata cross the Model Gateway boundary.

This is an orchestration record, not a new stateful Intelligence service.
Runtime states are `assembling`, `blocked`, `candidates_ready`,
`awaiting_approval`, `approved`, `intent_ready`, `committed`, `rejected` and
`superseded`. Recovery resumes from the last registered immutable output. It
never infers that a model call or Worker process completed merely because a
job had started.

## Stage contract

For every row, “owner” identifies orchestration/persistence authority. Candidate
producer and deterministic validator remain separate: Worker produces media
analysis candidates, Model Gateway produces creative candidates, Contracts/Core
validate them, Project Host persists accepted artifacts, and the user or an
explicit policy is the approval actor.

| Stage | Input | Output | Owner | Validation | Failure handling |
| --- | --- | --- | --- | --- | --- |
| Interview | user goal, project policy, optional prior contract | Creative Contract draft/revision | Project Host orchestrates interview feature | required hard constraints, privacy/rights/approval policy, no contradictory approved fields | return precise questions or conflicts; no downstream run |
| Contract approval | reviewed draft and user action | approved immutable Creative Contract | Project Host | actor, version, unchanged digest, all hard fields resolved | keep draft; record rejection/override reason |
| Evidence production | registered media identities and authorized analysis request | Observation/Interpretation/Moment/Event candidates | Project Host schedules Worker analysis and validates through evidence features | source identity, RationalTime, analyzer provenance, review status and privacy policy | failed/invalid job creates no accepted Evidence; cancellation/recovery follows Job policy |
| Evidence retrieval | approved contract, project evidence index, current media identities | Material Evidence Pack | Project Host orchestrates material/evidence features | refs exist, are approved, match assets/time ranges, cover requirements, have valid availability | insufficient/conflicting pack plus missing-requirement diagnostics; block approval |
| Knowledge retrieval | contract, evidence pack, catalog snapshot | Skill Evaluations, optional Style Profile and Trend Pack refs | Project Host orchestrates read-only retrieval features | exact version/digest, trust/rights, applicability, expiry, evidence sufficiency, compatibility | omit optional advice with reason; block only required or unsafe knowledge |
| Direction generation | validated context bundle | two or more Direction Cards | Model Gateway through story feature | typed output, evidence refs, hard constraints, risks and alternatives | discard invalid cards; if fewer than two remain, return blocker |
| Direction selection | comparable Direction Cards and user action | selected exact Direction Card plus Decision Record | user action through Project Host | digest/version, current Contract/Evidence refs and actor | stale/rejected selection remains auditable; no Story Plan |
| Candidate generation | selected Direction Card, validated context bundle and duration policy | two or more Story Plan candidates | Model Gateway through story feature | Contract schema, direction ref, evidence refs, beat coverage, no invented facts, input fingerprint | retry bounded transient failure; persist invalid-output diagnostic; never accept partial candidate |
| Evaluation | candidates, hard constraints, evaluation policy | score breakdown, risks and Decision Records | deterministic evaluator; Model Gateway may supply non-authoritative critique | hard constraints first, comparable score dimensions, calibrated confidence, alternative retention | disqualify failing candidate; if none remain, return blocker and missing inputs |
| Approval | ranked candidates and comparison view | approved Story Plan and approval Decision Record | user action through Project Host | candidate digest/version, coverage, actor/time, current contract/evidence refs | stale or rejected candidate remains auditable; no Edit Intent |
| Edit Intent generation | approved plan, decisions, current Timeline snapshot, capability snapshot | semantic Edit Intent candidate | edit-intent feature; model may propose typed values | registered operation kinds, RationalTime, targets/evidence, protected refs, capability requirements | unsupported/ambiguous operation becomes proposal or blocker; no commands |
| Commit approval | reviewed intent and user action/policy | approved Edit Intent | Project Host | unchanged digest, current base version, approval policy | reject or supersede; Timeline unchanged |
| Execution adaptation | approved intent, current Timeline, media/capability facts | existing execution Edit IR/Command intent and CommitPlan | Project Host plus pure core compiler | Contract Runtime, resolve, preconditions, capability routing, compile, simulate, validate | any failure records diagnostics and zero Timeline/event/artifact mutation |
| Render and QC | committed Timeline | target-specific Preview/Master RenderGraphs, their ExecutionPlans, outputs and QC | existing Project Host/Worker path | equal target-neutral semantic manifest/payload/hash, source identity, ExecutionPlan, output/QC checks | explicit blocker bundle; never label missing output successful |
| Delivery approval | QC-passing bundle, rights/privacy gates and user action | delivery-ready/approved record | Project Host | exact render/timeline/QC refs and current gates | keep last valid delivery state; never publish automatically |

## Context bundle

Candidate generation receives a bounded `CreativeContextBundle`, not direct
database or filesystem access. It contains exact refs/digests for the approved
Creative Contract, Material Evidence Pack, selected Skill Evaluations, optional
Style Profile and Trend Pack, Duration Blueprint, policy version and capability
snapshot. Project Host resolves the referenced content, removes unauthorized
fields and enforces a size budget before calling Model Gateway.

Knowledge retrieval is deterministic for a fixed catalog snapshot and query:

1. filter by trust, rights, status and expiration;
2. filter by Creative Contract and material applicability;
3. compute compatibility and evidence sufficiency;
4. rank with an explicit policy version;
5. return exact refs, scores, reasons, conflicts and rejected alternatives.

Retrieval never silently upgrades a version and never downloads runtime code.

## Candidate and evaluation rules

Generation may explore alternatives, but every factual claim and Story Beat
must bind to evidence. Evaluation runs hard gates before ranking:

- approved Creative Contract and evidence sufficiency;
- privacy, rights and protected-reference constraints;
- beat evidence and duration feasibility;
- Skill conflict rules and Style/Trend compatibility;
- current executable capability or an explicit non-executable proposal status.

Ranking records dimension scores, weights, policy version and rejected reasons.
Model self-evaluation may be one signal but cannot satisfy deterministic gates.
The user can compare candidates without creating Timeline versions.

## Approval and execution boundary

Approval is a Project Host use-case command over an exact object digest and current
base version. Contract, Story, Commit and Delivery are distinct approval gates.
Approval creates a Decision Record and status transition; it does
not execute edits. The semantic Edit Intent then passes through a Host-owned
adapter into the existing authoritative path:

```text
semantic Edit Intent
  -> contract validation
  -> resolve targets/evidence/capabilities
  -> preconditions and protected ranges
  -> compile to ordinary Timeline Commands
  -> simulate and validate in memory
  -> atomic CommitPlan through Project Host
```

If the Timeline version changed, the intent is stale. Re-resolution creates a
new intent version and requires renewed approval when targets, effects or
protected ranges changed. Rebase is never a blind version-number replacement.

## Failure taxonomy

- `INPUT_STALE`: referenced contract, evidence, knowledge or Timeline changed.
- `EVIDENCE_INSUFFICIENT`: hard requirement or beat lacks approved evidence.
- `KNOWLEDGE_UNAVAILABLE`: exact version, trust, rights or expiration invalid.
- `CANDIDATE_INVALID`: output fails schema or contains unknown evidence.
- `NO_COMPATIBLE_CANDIDATE`: every candidate fails a hard gate.
- `APPROVAL_REQUIRED` / `APPROVAL_STALE`: no valid user/policy approval.
- `INTENT_UNSUPPORTED`: semantic operation cannot map without loss.
- `EXECUTION_BLOCKED`: existing resolver/Preview/Master path cannot execute.
- `TRANSIENT_PROVIDER_FAILURE`: retryable model/provider error.

Only the last category is retried automatically, with bounded attempts and the
same idempotency identity. All others require new evidence, changed input,
explicit approval or implemented capability.

## Observability and privacy

Every stage records start/end time, input/output refs, status, policy and
tool/model versions, token/resource budget where relevant, diagnostics and
correlation ID. Logs redact private media paths and content. External retrieval
receives only the minimum authorized metadata; private project media is not
uploaded for style or trend matching by default.

## Implementation slices

The first vertical slice is one approved Creative Contract plus persisted
evidence producing two explainable Story Plan candidates, one approved plan,
one semantic Edit Intent and a fail-closed Host adaptation attempt. Style and
Trend inputs are optional in that slice. Later slices add versioned knowledge
retrieval, richer planning and local feedback patches. Each slice must test
stale input, missing evidence, invalid model output and zero Timeline mutation
on failure.
