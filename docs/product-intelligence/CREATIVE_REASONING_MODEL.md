# Creative Reasoning Model

## Purpose, authority and status

This document defines how AVE should move from observed material and creator
intent to an explainable editing proposal. It extends the canonical
[Product Intelligence Object Model](../intelligence/OBJECT_MODEL.md),
[Creative Intelligence Runtime](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md)
and [Editing Reasoning System](../intelligence/EDITING_REASONING_SYSTEM.md). It
does not create new contracts and is not evidence of implementation.

Creative reasoning is advisory until the user approves an exact version and
Project Host adapts it through the existing execution path. In this document,
`Creative Action Plan` means a non-persisted UI/reasoning grouping of proposed
semantic decisions. It is not a domain object, versioned artifact or additional
approval gate. It is also not an AVE `ExecutionPlan`, which is the authoritative
render-execution contract.

## Difference from traditional editing AI

A traditional automation path often collapses recognition and action:

```text
Input Video -> Pattern Detection -> Editing Action
```

AVE keeps intent, evidence, narrative judgment and execution authority separate:

```text
User Intent / Creative Contract
  -> Creative Understanding
  -> Narrative Reasoning
  -> Decision Record
  -> semantic Edit Intent
  -> Host adapter -> CommandEditIntent -> CommandEditIR
  -> Timeline Command / CommitPlan -> committed Timeline
  -> Semantic Render Manifest
       -> Preview RenderGraph / Preview ExecutionPlan
       -> Master RenderGraph / Master ExecutionPlan
  -> QC / human review
```

The difference is not that AVE makes more edits. It is that every proposed edit
states what it is trying to achieve, which evidence supports it, what competing
choice was rejected, what could be wrong and who must approve it.

## Reasoning pipeline

```text
Observation
  -> Interpretation
  -> Narrative Meaning
  -> Creative Intent
  -> Edit Decision
  -> Creative Action Plan
  -> semantic Edit Intent
```

| Stage | Question | Required input | Output | Failure behavior |
| --- | --- | --- | --- | --- |
| Observation | What is present? | approved Evidence Graph facts with asset and RationalTime refs | factual observation refs | unknown or unverified facts remain unknown |
| Interpretation | What might it mean? | observations, context and uncertainty | candidate interpretation with confidence and alternatives | disagreement is preserved; no fact is rewritten |
| Narrative Meaning | Why does it matter to this story? | approved Creative Contract, candidate event/relationship context and Story Plan state | proposed story function | insufficient causal/context evidence blocks strong claims |
| Creative Intent | What audience effect is sought? | story function, creator voice, constraints and selected skills | explicit desired effect and protected constraints | identity or hard-contract conflict disqualifies intent |
| Edit Decision | What should change? | current Timeline/capability snapshot and alternatives | Decision Record with expected effect | unsupported semantics remain proposal/blocker |
| Creative Action Plan | Which decisions belong together in the review UI? | exact Decision Records and base versions | non-persisted ordered presentation | stale or mutually conflicting decisions require revision |
| Semantic Edit Intent | What may enter engineering validation? | approved Story Plan, exact Decision Records, current Timeline/capability snapshot and required refs | canonical semantic Edit Intent candidate | no Timeline Commands, graph nodes or backend strings allowed |

## Reasoning record

Every proposed decision should be representable by the canonical
`DecisionRecord` and semantic `EditIntent` target objects. At minimum the
reasoning view must expose:

- exact Creative Contract, Material Evidence Pack, Story Plan and base Timeline
  refs;
- observation and interpretation refs, kept distinct;
- narrative function and desired audience effect;
- proposed operation, affected range and expected result;
- confidence with basis, unresolved assumptions and counterevidence;
- at least one viable alternative or a reason none exists;
- protected refs, required capability and approval class;
- model/tool, policy and selected Creative Skill versions.

Confidence is uncertainty, never consent. A high score cannot approve a story,
commit a Timeline or authorize delivery.

## Worked example

Bad shortcut:

```text
Person smiling -> delete previous shot
```

Evidence-bound reasoning:

```text
Observation:
  Person smiles after the conversation; evidence E-42 at an exact source range.
Interpretation:
  Candidate emotional release; alternative is polite acknowledgement.
Narrative Meaning:
  If the prior conversation is retained, the reaction can close a tension beat.
Creative Intent:
  Increase the felt release without changing the factual sequence.
Edit Decision:
  Extend the reaction shot by a bounded amount and lower background music.
Creative Action Plan:
  Preserve dialogue context, extend only the evidenced reaction, compare audio
  balance, and keep the original cut as an alternative.
Execution handoff:
  Create a semantic Edit Intent; the Host adapter creates CommandEditIntent,
  then Project Host resolves CommandEditIR against current media, protected
  ranges and supported audio/trim capabilities before any CommitPlan exists.
```

If the smile cannot be causally linked to the conversation, the narrative claim
must be weakened or presented as an alternative. The system may still propose a
pacing change, but cannot manufacture emotional causality.

## Ranking and conflict resolution

Hard constraints run before aesthetic ranking. Candidate reasoning is rejected
when it conflicts with creator identity, protected material, rights/privacy,
approved facts, story approval, source availability or execution invariants.
Among valid candidates, ranking may consider coherence, expected emotional
progression, duration feasibility, novelty, edit cost and user profile fit.

When skills, profile preferences or trend advice conflict, precedence is:

1. user decision and approved Creative Contract;
2. source evidence, rights, privacy and protected references;
3. approved Story Plan and current project decisions;
4. executable capability and fail-closed engineering rules;
5. current contextual feedback;
6. user-profile preferences with confidence/recency;
7. Skill, style and trend advice.

## Execution and invalidation boundary

Reasoning never mutates Timeline or project state directly. Project Host must
validate exact refs, resolve semantic targets, check preconditions and protected
ranges, compile ordinary Timeline Commands, simulate, validate and atomically
commit. Any failure produces diagnostics and zero Timeline mutation.

A changed Creative Contract, Evidence Pack, approved Story Plan, base Timeline,
capability snapshot or protected range stales dependent uncommitted reasoning.
Re-resolution creates a new version and renews approval when expected effects
change; it never replaces only a version number.

## Work Order implications

A governed implementation slice should first prove one decision chain from
Observation through an approved semantic Edit Intent, including alternative,
stale-input, unsupported-capability and zero-mutation cases. It depends on
`WO-INT-000`, `WO-INT-001`, `WO-INT-003` and then `WO-PIPE-001`; synthetic
reasoning tests alone cannot accept creative usefulness or editing capability.
