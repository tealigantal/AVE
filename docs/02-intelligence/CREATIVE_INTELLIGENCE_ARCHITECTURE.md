# Creative Intelligence Architecture

## Purpose

Creative Intelligence converts creator intent and media evidence into ranked,
explainable, reversible proposals. It owns no Timeline, database, render, or
approval authority.

## Reasoning chain

```text
Media Understanding
  -> Evidence Graph
  -> Narrative Understanding
  -> Creative Decision
  -> semantic Edit Intent
  -> future Project Host adapter
  -> current CommandEditIntent
  -> current CommandEditIR
```

Project Host then applies the existing `Resolve/Preconditions -> CommandEditIR
-> Simulate -> Validate -> CommitPlan -> Commit` path. The semantic-to-command
adapter is a future implementation boundary, not a current capability claim.
Target-specific Preview/Master RenderGraphs are derived only from the committed
Timeline and must share the same target-neutral semantic payload/hash.

## Observation, interpretation, and decision

| Layer | Meaning | Example | May do | Must not do |
| --- | --- | --- | --- | --- |
| Observation | time/source-bound media fact or uncertain detection | “speaker pauses from t1 to t2” | cite source, confidence, method | assert story meaning |
| Interpretation | a contestable explanation built from observations | “the pause may signal hesitation” | list alternatives and uncertainty | become approval or Timeline change |
| Decision | a chosen creative action serving an approved goal | “hold the pause before the reveal” | cite intent, evidence, trade-off | bypass user/policy approval or execution checks |

Mixing these layers is a correctness defect. User corrections to observations
invalidate dependent interpretations and decisions. A high-confidence
interpretation is still not a fact or permission.

## Outputs

The intelligence layer produces versioned Creative Contracts, Material
Evidence Packs, Skill Evaluations, Direction Cards, Story Plans, Decision
Records, and semantic Edit Intent candidates. Contract names and fields become
authoritative only through a governed Work Order and schema promotion.

## Failure closure

Missing evidence, conflict with creator intent, unsupported execution,
staleness, or weak confidence yields alternatives, a question, or an explicit
blocker. No failure path creates commands, advances Timeline version, or
publishes an authoritative artifact.
