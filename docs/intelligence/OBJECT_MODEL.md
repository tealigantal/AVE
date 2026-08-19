# Product Intelligence Object Model

## Purpose and authority

This document turns the existing product-intelligence concepts into an
implementation blueprint. It defines target object meanings, ownership,
relationships and versioning; it is not a claim that the target contracts or
runtime are implemented. Current implementation status remains in
`docs/current/`, and JSON Schema becomes authoritative only when a governed
work package adds it under `contracts/schemas/` with generated bindings and
Evidence.

The target model extends rather than rewrites the current narrow contracts:

- `CreativeContractV1`, `StoryProposalV1` and `ApprovedStoryPlanV1` already
  exist under `contracts/schemas/editorial/`.
- `CreativeSkillOutputV1` is the existing execution-boundary, non-executing
  Preset-selection contract, not the Creative Skill knowledge definition here.
- `CommandEditIntent` is the current Host execution input and already contains
  audited Timeline Commands. The intelligence `EditIntent` below is a semantic
  proposal that must be compiled and validated before it can become that
  execution input.

Implementations must introduce additive schema versions or explicit adapters;
they must not change the meaning of persisted v1 objects in place.

## Shared conventions

Every top-level object has a stable domain ID, integer `schema_version`,
semantic `object_version`, lifecycle status, `created_at`, and provenance. A
published version is immutable and content-addressed; changes create a new
version linked by `supersedes_id`. Project-scoped versions are registered only
by Project Host. The first implementation slice uses a repository-shipped,
read-only Knowledge Catalog through a pure port; it is not a service or writer.
Project Host validates catalog records and pins the exact content-addressed
snapshot in the project object store before use. Network/shared catalog
publication is outside the slice and requires an ADR and separate Work Order.

References use IDs plus exact versions or digests, never mutable names.
Project time ranges use RationalTime/TimeRange; floating seconds are allowed
only as non-authoritative analysis statistics. Confidence is a calibrated
number in `[0,1]` with a stated basis and never means approval. All generated
objects carry model/tool version, policy version, input object refs and
unresolved assumptions. Unknown evidence, expired knowledge, invalid rights or
unsupported execution semantics fail closed.

## Ownership and persistence

| Object | Producer | Authority and persistence | Mutability |
| --- | --- | --- | --- |
| CreativeContract | interview/product feature, user edits | Project Host; project object store/SQLite reference | draft revisions; approved version immutable |
| MaterialEvidencePack | material/evidence features | Project Host; references persisted Evidence Graph facts | immutable snapshot |
| CreativeSkillDefinition / SkillEvaluation | curated authoring; retrieval/evaluation feature | read-only built-in Knowledge Catalog; Host pins definitions and registers project evaluations | published definition and evaluation immutable |
| StoryPlan / StoryBeat | story-planning feature and user approval | Project Host | candidates immutable; approval creates approved version |
| DecisionRecord | evaluator, user or deterministic policy | Project Host | append-only |
| StyleProfile | style analysis/retrieval | built-in catalog input; Project Host persists project profile/adaptation snapshot | immutable version |
| TrendPack | trend retrieval/compatibility | built-in catalog input; Project Host persists project pack snapshot | immutable and expiring |
| VideoPattern | research ingestion and review | built-in read-only catalog for first slice; Host persists selected project snapshot | immutable version; may be retired |
| EditIntent | edit-intent generator | Project Host validates and registers candidate/approved state | immutable proposal |

Features do not write SQLite and do not call one another directly. Project Host
orchestrates them, validates Contract Runtime boundaries and is the only
project-state writer. Model Gateway may generate candidates but owns none of
these objects.

## CreativeContract

Purpose: freeze what the creator is trying to make before creative planning.

Required target fields:

- `contract_id`, `schema_version`, `object_version`, `status` (`draft`,
  `review`, `approved`, `superseded`)
- `creator_goal`, `audience`, `platforms`, `target_duration`
- `requirements[]`: ID, `hard|preference`, statement and priority
- `voice_and_identity`: desired traits plus forbidden misrepresentation
- `privacy_policy_ref`, `rights_policy_ref`, `approval_policy`
- `protected_refs[]`, `allowed_transformations[]`, `forbidden_outcomes[]`
- provenance, approval actor/time and supersession link

Lifecycle: interview creates a draft; deterministic validation and user review
produce an approved immutable version. Any material change creates a new
version and invalidates dependent candidate plans. Existing
`creative-contract.v1` is the current minimum subset; expansion requires a new
schema version and a v1-to-vNext reader, not mutation of v1 history.

## MaterialEvidencePack

Purpose: provide a bounded, reproducible view of material facts for one
planning run without copying evidence payloads.

Required target fields:

- `pack_id`, version/status and `project_id`
- `contract_ref` and `timeline_version` when a Timeline already exists
- `evidence_refs[]`: Evidence ID, type, asset ID, exact RationalTime range,
  review status and content digest
- `moment_refs[]`, `event_refs[]`, `coverage_matrix_ref`
- `sufficiency`: covered, missing and conflicting requirement IDs
- `availability`: Original/Proxy identity and permission state without paths
- `policy_snapshot`, `input_fingerprint`, provenance and expiration/staleness

Lifecycle: Project Host assembles a snapshot only from persisted approved
evidence. New analysis never rewrites a pack; it creates a successor. Missing
hard requirements produce an insufficient pack and block Story Plan approval.

## CreativeSkillDefinition and SkillEvaluation

Purpose: represent reusable, explainable creative decision knowledge rather
than a fixed Timeline template. `CreativeSkill` is the product term;
`CreativeSkillDefinition` is the unambiguous target contract name.

Required target fields:

- `skill_id`, `skill_version`, `definition_digest`, `status`
- `goal`, `applicable_contexts[]`, `incompatible_contexts[]`
- `required_evidence[]` and sufficiency thresholds
- `parameters[]` with types, ranges and defaults
- `reasoning_rules[]`: condition, recommendation, evidence binding and reason
- `conflict_rules[]`: other skill/dimension, precedence and resolution policy
- `failure_cases[]`, `evaluation_criteria[]`, `known_counterexamples[]`
- `output_kinds[]` limited to Direction/Story/Decision/EditIntent proposals
- provenance, reviewer, license/trust and supersession metadata

Lifecycle: draft -> reviewed -> published -> deprecated/retired. Published
versions are immutable. Selection yields a `SkillEvaluation` containing the
exact definition ref, context/input fingerprint, applicable/conflicting result,
required/available evidence, parameter values, score, confidence, reason,
risks, alternatives and evaluator/policy provenance. It does not execute the
definition. If a later stage uses existing Presets, a separate
compiler produces the already-defined `CreativeSkillOutputV1` with exact
Preset pins. Skill definitions may not contain commands, graph nodes, model
calls, shell, backend strings or downloadable executable code.

## DirectionCard, StoryPlan and StoryBeat

Purpose: express an evidence-bound creative direction, narrative candidate and
approved form. A `DirectionCard` is a required persisted pre-plan proposal: stable
ID/version, title/thesis, Contract/Evidence refs, selected Skill Evaluations,
optional Style/Trend refs, expected benefit, risks, confidence, alternatives
and status. It cannot be executed. Selecting one exact Direction Card is
recorded by a Decision Record and provides required input to Story Plan
generation.

`StoryPlan` fields:

- `plan_id`, version, `candidate|approved|rejected|superseded`
- refs to Creative Contract, Material Evidence Pack, selected Skill
  Evaluations, Style Profile, Trend Pack and Duration Blueprint
- `thesis`, `audience_promise`, `beats[]`, duration budget and emotional curve
- aggregate coverage, risks, alternatives and evaluation score breakdown
- approval/rejection actor, time and reason; provenance and input fingerprint

`StoryPlan` is a logical aggregate, not a third wire contract. Candidate state
is serialized as `StoryProposalV2`; approval serializes a new immutable
`ApprovedStoryPlanV2` that references the proposal digest and copies the frozen
beat payload needed for standalone recovery. Rejection remains on the proposal
plus a Decision Record. Existing v1 proposal/approved-plan records remain
readable through adapters.

`StoryBeat` fields:

- `beat_id`, `role`, `purpose`, `target_duration` and ordering constraints
- `evidence_refs[]`, alternative evidence refs and coverage requirement IDs
- entry/exit narrative state, desired emotion and continuity constraints
- confidence, reason, risks and unresolved assumptions

Every beat needs approved evidence before plan approval. The existing
`StoryProposalV1` and `ApprovedStoryPlanV1` remain valid narrow representations;
the target implementation must add versioned schemas/adapters and preserve
existing persisted plans.

## DecisionRecord

Purpose: make ranking, rejection, approval and edit reasoning auditable.

Required fields: `decision_id`, version, `decision_type`, subject refs,
candidate refs, selected/rejected alternatives, evidence refs, constraints,
reason, confidence with basis, evaluator/policy/model version, actor,
`proposed|approved|rejected|overridden`, created/decided times and supersession
link. An override adds a new record; it never edits the prior explanation.

Decision Records explain why a proposal exists. They are not Timeline
Commands, approval is explicit, and low confidence or missing evidence yields
an unresolved or blocked decision.

## StyleProfile and StyleCompatibilityReport

Purpose: describe transferable creative dimensions without copying protected
expression. Required fields are specified in `STYLE_KNOWLEDGE_MODEL.md` and
include pacing, shot language, subtitle, music, color and narrative style,
each with evidence and confidence. Compatibility is a separate
`StyleCompatibilityReport` bound to exact Creative Contract, Evidence Pack and
Profile versions; it records per-dimension compatible/adaptable/conflicting/
unknown outcomes, reasons, required capabilities and rejected dimensions. The
profile also carries
profile scope, source rights, creator adaptation rules, risks, provenance and
review status.

## TrendPack

Purpose: provide optional, time-bounded trend advice. Required fields are
specified in `TREND_KNOWLEDGE_MODEL.md`: exact Trend Pattern refs, platform,
region/audience, observation window, retrieval time, expiration, confidence,
compatibility, risks and provenance. Expiration or incompatibility prevents
selection; a Trend Pack never changes the Creative Contract.

## VideoPattern

Purpose: store reviewed, reusable observations from excellent videos. Required
fields are specified in `../research/VIDEO_KNOWLEDGE_MODEL.md`: hook, pacing,
shot, subtitle and narrative features; audience/context; examples and
counterexamples; confidence, rights, provenance and review state. Source
performance may support context but does not prove quality or causality.

## EditIntent

Purpose: translate an approved creative decision into semantic, reviewable
editing operations without granting Timeline authority.

Required target fields:

- `intent_id`, version, `base_timeline_version`, status
- refs to approved Story Plan, Decision Records, evidence and Creative Contract
- `operations[]`: registered semantic operation kind, target refs, RationalTime
  range, typed parameters and expected effect
- preconditions, protected refs, required capabilities and unsupported policy
- reason, alternatives, risk, confidence, actor and provenance

The object cannot contain Timeline Commands, RenderGraph nodes or backend
strings. A Host-owned compiler resolves it against the current Timeline and
capability snapshot. Only after Contract validation, preconditions,
compilation, simulation and validation may Project Host create the existing
command-bearing `CommandEditIntent`, `CommandEditIR`, and CommitPlan. Any failure produces
diagnostics and zero Timeline mutation.

## Relationship and invalidation graph

```text
CreativeContract
  -> MaterialEvidencePack -> DirectionCard -> StoryPlan -> DecisionRecord -> EditIntent
                 |              ^             ^
                 +-> CreativeSkill evaluations+
                 +-> VideoPattern -> StyleProfile
                 +-> TrendPattern -> TrendPack

EditIntent -> Host adapter -> CommandEditIntent -> CommandEditIR
           -> Timeline Command/CommitPlan -> committed Timeline
           -> Semantic Render Manifest
                -> Preview RenderGraph -> Preview ExecutionPlan
                -> Master RenderGraph  -> Master ExecutionPlan
           -> QC
```

A successor Creative Contract stales dependent packs, plans and uncommitted
intents. Evidence changes stale packs and every derived candidate. Knowledge
updates do not retroactively change pinned decisions. A Timeline version change
invalidates an uncommitted Edit Intent until it is re-resolved and re-reviewed.

## Minimum contract implementation order

1. Add shared provenance/version/reference definitions and additive editorial
   schemas; generate bindings and round-trip tests.
2. Implement Creative Skill definition and evaluation contracts, distinct
   from `CreativeSkillOutputV1`.
3. Implement evidence-pack and Story Plan adapters around current editorial v1.
4. Implement Video Pattern, Style and Trend contracts, built-in catalogs and
   project snapshot persistence.
5. Implement Edit Intent and the Host-owned adapter to the existing
   `CommandEditIntent` / `CommandEditIR` path.

Each step requires its own governed work package, allowed paths, failure tests
and Evidence. Schema presence alone does not implement product intelligence.
