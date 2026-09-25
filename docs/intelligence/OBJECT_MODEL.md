# Product Intelligence Object Model

## Purpose and authority

This document turns the existing product-intelligence concepts into an
implementation blueprint. It defines target object meanings, ownership,
relationships and versioning; it is not a claim that the target contracts or
runtime are implemented. Current implementation status remains in
`docs/current/`, and JSON Schema becomes authoritative only when a governed
work package adds it under `contracts/schemas/` with generated bindings and
Evidence.

The target model uses one current contract per logical object:

- `CreativeContractV2`, `StoryProposalV2` and `ApprovedStoryPlanV2` are the
  current Editorial contracts under `contracts/schemas/editorial/`.
- `CreativeSkillOutputV1` is the existing execution-boundary, non-executing
  Preset-selection contract, not the Creative Skill knowledge definition here.
- `CommandEditIntent` is the current Host execution input and already contains
  audited Timeline Commands. The intelligence `EditIntent` below is a semantic
  proposal that must be compiled and validated before it can become that
  execution input.

During development, a replacement schema supersedes and removes its older
schema family, generated bindings and runtime path. No old-version reader,
writer or adapter is retained.

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

Purpose: version what the creator is trying to make. Stage3 请求保存目标和约束，不要求先完成访谈/审批才能开始；不明确的非必需审美字段保持未知。

Required target fields:

- `contract_id`, `schema_version`, `object_version`, `status` (`draft`,
  `review`, `approved`, `superseded`)
- `creator_goal`, `audience`, `platforms`, `target_duration`
- `requirements[]`: ID, `hard|preference`, statement and priority
- `voice_and_identity`: desired traits plus forbidden misrepresentation
- `privacy_policy_ref`, `rights_policy_ref`, `approval_policy`
- `protected_refs[]`, `allowed_transformations[]`, `forbidden_outcomes[]`
- provenance, approval actor/time and supersession link

当前 Stage2 lifecycle: interview creates a draft; deterministic validation and user review produce an approved immutable version. Stage3 用请求授权与修订引用替换强制前置人审；实施时同步当前合同，不把 inferred fields 写成用户明确批准。 Any material change creates a new
version and invalidates dependent candidate plans. Runtime input, persistence,
generated bindings and validators use only the current Creative Contract schema;
older schema families are not accepted or adapted.

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

当前 Stage2 lifecycle: Project Host assembles a snapshot only from persisted approved evidence. Stage3 将来源/范围校验、policy-qualified 可用观察与真正 human-reviewed 分别记录；不强制读素材报告，不伪造人审，不将模型情绪/因果推测当事实。详见 Material Understanding Pipeline。 New analysis never rewrites a pack; it creates a successor. Missing
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
approved form. 当前 Stage2 的 `DirectionCard` 是必需 pre-plan proposal；Stage3 将其作为内部可选比较对象，不是用户必选入口。它保留 stable
ID/version, title/thesis, Contract/Evidence refs, selected Skill Evaluations,
optional Style/Trend refs, expected benefit, risks, confidence, alternatives
and status. It cannot be executed. Stage2 的 exact Direction selection 由 Decision Record 记录并作为必需输入；Stage3 主 Story 直接使用请求目标和获准上下文，保留内部选择依据，不伪造用户选择。

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
plus a Decision Record. These current schemas are the only accepted Story wire
representations.

`StoryBeat` fields:

- `beat_id`, `role`, `purpose`, `target_duration` and ordering constraints
- `evidence_refs[]`, alternative evidence refs and coverage requirement IDs
- entry/exit narrative state, desired emotion and continuity constraints
- confidence, reason, risks and unresolved assumptions

Every beat needs approved evidence before plan approval. Older Story schema
families are not valid runtime input and are not preserved through adapters.

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

Purpose: translate a request-authorized creative decision into semantic, reviewable
editing operations without granting Timeline authority.

Required target fields:

- `intent_id`, version, `base_timeline_version`, status
- refs to request authorization/revision, planned Story, Decision Records, evidence and Creative Contract
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
  -> MaterialEvidencePack -> StoryPlan -> DecisionRecord -> EditIntent
       optional DirectionCard feeds StoryPlan; RequestAuthorization/IntentRevision bind every candidate
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
invalidates an uncommitted Edit Intent until it is re-resolved and Host validates the current request scope again. A scope/protection expansion asks the user; ordinary revisions do not require per-object approval.

## Implementation order

Stage3 共同请求/版本对象由 S3-01 定稿，反馈原则与用户档案分别由 S3-02/03 消费，S3-04/05 接真实生成/工作台，S3-06 自第一接缝起验证。保留当前 Skill/Material/Command 合同能力，不重启旧 WO-INT 初始化顺序，不将 Trend 全部实现设为前置。每步须有正式包、允许范围、失败测试和 Evidence；Schema 存在不证明产品能力。

## Stage3 对象接缝（目标，非正式 Schema）

以下为 S3-01 共同定稿的逻辑对象语义，版本/digest 采用现有约定；不在本轮添加 Schema 或伪称它们已实现。实施时为每个家族确定唯一当前 `$id`/schema_version 并同步消费者。

| 逻辑对象 | 关键内容 / 来源 | 唯一所有者 / 持久化 / 失效 |
| --- | --- | --- |
| RequestAuthorization | 原始用户动作、actor、项目/素材、数据/模型范围、预算、保护、有效期和撤销代次 | Host，项目对象/引用；撤销或越界使未提交工作失效，不能由模型签发 |
| IntentRevision | request ID、revision、原话、目标对象/版本、变更及保留要求、base Timeline | Host，append-only successor；请求改变不覆盖旧原话 |
| FeedbackObservation | 用户原文、例子/播放版本、asset/source PTS、选择/手动 diff、原因来源 | Host 原始项目事件；模型归因独立关联，非事实替代 |
| EditingPrinciple | 适用情境、取舍、例外、支持/反证、hypothesis/explicit 来源状态 | 项目原则由 Host；跨项目可复用版本由用户档案所有者登记；不含可执行代码 |
| ProfileSnapshot | profile version/digest、选中原则、来源 refs、consent/deletion generation、排除和用途 | 用户档案所有者提供，Host 固定最小获准运行快照；删除后禁止新用 |
| DraftVersion | parent/base、请求 revision、CommandEditIR、保护集、已提交 Timeline、所用上下文 | Host 原子提交；旧版本不可变，采用不是改写历史 |
| Workspace projection | latest request、已保存草稿、adopted version、viewed version、watchable binding、输入状态 | Host 投影；Renderer 的面板/播放位置不成为项目事实 |

读取持久化和跨界输入时验证版本和引用。未知版本失败，不补空对象。执行幂等键绑定 request/revision/base/计划摘要；学习幂等键绑定 project/event/digest。派生索引/摘要不得提升 observation 为 explicit approval。

`StoryProposalV2` / `ApprovedStoryPlanV2` 是当前代码合同事实；Stage3 新草稿授权不能通过伪造 ApprovedStoryPlanV2 来兼容。替换范围包括 Contract/Story/Intent/Permission、workspace/IPC、存储读写、生成绑定与实际测试。正常编辑仍须产出当前 CommandEditIntent → CommandEditIR → CommitPlan。项目版本历史与协议兼容不是一回事。
