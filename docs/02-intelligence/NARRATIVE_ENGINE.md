# Narrative Engine

## Capability boundary

The Narrative Engine is the capability that organizes evidenced moments into
candidate stories. This document defines what it must understand; it does not
select a model, prompt architecture, training method, or deployment topology.

## Narrative concepts

- **Character**: an evidenced participant with identity uncertainty and
  representation constraints.
- **Event**: a time- and source-bound occurrence, distinct from its meaning.
- **Goal**: what a character or creator seeks in the story context.
- **Conflict**: incompatible goals, constraints, expectations, or outcomes;
  it may not be invented merely to increase drama.
- **Emotional change**: an interpreted change supported by observable cues and
  expressed with uncertainty.
- **Turning point**: an event that changes available goals, knowledge, stakes,
  or direction.
- **Story function**: the role a beat serves, such as context, setup, evidence,
  escalation, contrast, reveal, reflection, or resolution.

## Required behavior

The engine proposes at least two materially different candidates when evidence
allows. Each beat has a stable identity, story function, duration budget,
source-moment references, reason, confidence, alternatives, and unresolved
assumptions. Causal relations are interpretations over immutable observations,
not edits to source facts.

## Approval and execution

A candidate becomes an approved Story Plan only through a version-bound user
action. Approval freezes the cited contract and evidence versions. A separate
Host-owned compiler may produce bounded semantic Edit Intent; the Narrative
Engine never produces Timeline Commands or marks unsupported edits as done.

## Evaluation

Evaluate evidence coverage, factual fidelity, causal coherence, character
continuity, emotional legibility, beat function, pacing feasibility,
alternative usefulness, and creator-intent fit. “More dramatic” is not a
universal improvement.
