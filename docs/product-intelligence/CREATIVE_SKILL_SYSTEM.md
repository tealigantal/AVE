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

Story Skills propose Direction/Story/Decision artifacts. Story Plan approval
remains human and exact-version bound.

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
map through approved Edit Intent, the Host-owned adapter, `CommandEditIntent`,
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
project override only with approval.

## Knowledge and execution boundary

```text
CreativeSkillDefinition
  -> context/evidence retrieval
  -> SkillEvaluation
  -> Direction Card / Story Plan / Decision Record / semantic Edit Intent
  -> user approval
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

Start with one Story Skill and one Editing Skill over repository-shipped,
reviewed definitions. Prove exact version pins, deterministic evaluation,
missing-evidence rejection, conflict explanation, malicious-payload rejection,
persistence/reopen and zero Timeline mutation. Platform/Commercial catalogs need
separate freshness, rights and legal acceptance; execution capability remains
owned by the affected editing work packages and `WO-PIPE-001`.
