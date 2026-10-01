# Creative Skill System

## Purpose, authority and status

The Creative Skill System structures reusable editorial judgment as explainable,
versioned knowledge. A Skill is not a template, model prompt, executable plugin
or shortcut around AVE's editing architecture.

Canonical target fields and lifecycle remain in
[Creative Skill Library](../intelligence/CREATIVE_SKILL_LIBRARY.md) and the
[Product Intelligence Object Model](../intelligence/OBJECT_MODEL.md). The
implemented execution boundary remains
[Preset and Skill Interface](../specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md).
This taxonomy extends those documents; it is not a second Skill schema and does
not claim the listed skills are implemented.

## What a Creative Skill is

A `CreativeSkillDefinition` is an immutable knowledge unit describing:

- purpose and desired audience/story effect;
- applicable and incompatible contexts;
- required evidence and sufficiency threshold;
- explainable reasoning and parameter rules;
- conflicts, precedence and failure cases;
- expected evaluation dimensions and counterexamples;
- exact provenance, reviewer, trust, license and version/digest;
- allowed output kinds limited to creative proposals.

Selection produces a `SkillEvaluation` bound to exact Contract, Evidence Pack,
context and definition versions. It explains applicable/conflicting status,
parameter choices, confidence, risk and alternatives. It does not execute.

## Skill is not template

A template prescribes a fixed arrangement. A Skill evaluates context and
chooses or rejects a strategy. The same Skill can recommend different Story
Beats or Edit Intents because the evidence, audience, duration, creator profile
and current Timeline differ. If its required evidence is absent, it must fail
or propose a safer alternative rather than fill slots with unrelated footage.

## Skill taxonomy

### Story Skills

Examples:

- Hook: establish a concrete promise or unresolved question early without
  manufacturing a fact.
- Three-act structure: test whether setup, development and resolution fit the
  actual material and duration; never force every Vlog into three acts.
- Emotional arc: sequence evidenced state transitions while preserving
  uncertainty and creator identity.
- Causal payoff: connect setup and resolution only when the Event Causal Graph
  supports the relationship.

Story Skills propose Direction/Story/Decision artifacts. Stage3 main draft planning is covered by the exact request authorization; optional user adoption remains distinct.

### Editing Skills

Examples:

- J-cut and L-cut: preserve dialogue/context across a visual boundary when
  source handles and audio continuity support it.
- Reaction emphasis: hold or select an evidenced reaction without misassigning
  its cause.
- Rhythm control: adjust shot duration and silence against an approved duration
  blueprint and user pacing preference.
- Continuity repair: choose a supported insert/cutaway or return a blocker when
  no honest repair exists.

Creative Skill Definitions output semantic proposals. Executable effects must
map through request-authorized Edit Intent, the Host-owned adapter, `CommandEditIntent`,
`CommandEditIR`, Timeline Command, and Semantic Render Manifest semantics.

### Platform Skills

Examples:

- YouTube retention framing;
- TikTok opening compression;
- Bilibili narrative context and audience-language adaptation.

Platform practices are time-, region- and audience-dependent. Claims require
versioned source evidence, observation windows and expiry; they should integrate
with Trend/Video Pattern knowledge rather than become permanent causal rules.
Platform optimization never outranks creator identity, factuality or protected
material.

### Commercial Skills

Examples:

- sponsor integration that preserves story coherence;
- CTA placement after adequate value/context;
- product-claim coverage and evidence checks;
- disclosure placement and duration.

Commercial Skills require an approved Creative/Sponsor Contract, claim evidence,
rights/disclosure policy and explicit approval. They cannot invent endorsement,
change user identity or hide advertising.

## Evaluation and composition

Skill evaluation runs after hard Contract, evidence, rights/privacy and trust
filters. For each candidate it records expected benefit, required capability,
confidence, risks, conflicts and alternative strategies.

Multiple Skills may be composed only when their goals and required effects are
compatible. Composition produces an ordered set of evaluations and Decision
Records, not a merged executable blob. Conflict policy is explicit. For example,
an aggressive platform-opening Skill may conflict with a confirmed slow,
observational creator profile; AVE presents the trade-off or applies a bounded
project override under the current explicit request, asking again only when scope or protection changes.

## Knowledge and execution boundary

```text
CreativeSkillDefinition
  -> context/evidence retrieval
  -> SkillEvaluation
  -> Direction Card / Story Plan / Decision Record / semantic Edit Intent
  -> Host request authorization check
  -> Project Host adaptation
  -> CommandEditIntent / CommandEditIR / ordinary Timeline Commands / CommitPlan
```

If a later adapter selects existing Presets, it must emit the already-defined
typed `CreativeSkillOutputV1` with exact Preset pins. A Skill definition or
evaluation may never contain raw Timeline Commands, RenderGraph nodes, shell,
FFmpeg/MLT strings, model calls, network downloads or executable code.

Unsupported or unaccepted editing families remain explicit blockers. A good
strategy description does not prove that AVE can render it.

## Skill learning and governance

User feedback creates provenance-bearing evaluation evidence, not an in-place
Skill rewrite. A reviewed new definition version may incorporate repeated,
segmented results and counterexamples. Old versions remain reproducible; retired
or revoked versions cannot enter new selections but remain pinned historically.

Marketplace/untrusted Skills are quarantined. Licensing covers both the
definition and referenced assets/knowledge. Platform and commercial Skills need
source freshness and legal review appropriate to their claims.

## Quality and failure rules

- Missing evidence, incompatible context or expired knowledge returns
  `not_applicable`/`blocked`, not a low-quality forced recommendation.
- Unknown capability remains a non-executable proposal.
- Deterministic validation checks types, refs, versions and prohibited payloads.
- User rejection leaves the prior Story/Timeline intact and records the reason.
- Model confidence cannot promote, publish, execute or change trust status.
- Skill benchmark scores cannot override technical QC or human delivery review.

## Work Order implications

## Stage3 current integration boundary

WP-S3-SKILL-001 补全现有 Stage3 Planning，采用用户提供的 64 单元源；不会依据上面的 taxonomy 示例另造内容。
本地 Level 1 使用结构化 metadata 粗筛最多 12 个候选，不调用模型、不生成 Story 或剪辑决定。Level 2 将候选完整正文送入 Call 1，模型此时才正式选择、评价与提交测量；Call 2 用 Host exact receipt 完成决定。正常为两个物理 Planner calls，绝不整库发送。
当前唯一 SkillEvaluationV2 全部分支 schema_version=2。applicable + decision_only/no_change 合法，只有 edit_proposed 要求 evidence/capability/实际字段 skill_effects。评估始终保留 audit，无需变化不能强造变化。
不适用、证据不足、执行能力不足与 failure 分开。catalog.v1.json 是原文一次性显式映射，正文不缩水；治理仅授权本地 Runtime，未获再发行许可证，不伪造评审人或日期。
优先级严格采用源第 12 节；现行 Host 的授权 Profile 过滤、protected 校验及提交事务继续有效。
无 Connector、自动 Trend 更新、云端知识服务或 Marketplace；参见 [ADR-0035](../decisions/ADR-0035-stage3-skill-demand-loading.md)。

## Stage2 Work Order boundary

The following Stage2 initialization scope uses the same current V2 evaluation contract; it does not limit the Stage3 supplied Catalog integration above.

Start with one Story Skill and one Editing Skill over repository-shipped,
reviewed definitions. Prove exact version pins, deterministic evaluation,
missing-evidence rejection, conflict explanation, malicious-payload rejection,
persistence/reopen and zero Timeline mutation. Platform/Commercial catalogs need
separate freshness, rights and legal acceptance; execution capability remains
owned by the affected editing work packages and `WO-PIPE-001`.
