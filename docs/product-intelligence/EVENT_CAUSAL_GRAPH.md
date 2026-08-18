# Event Causal Graph

## Purpose, authority and status

The Event Causal Graph explains how AVE moves from "what happened" to "why it
may matter" while preserving uncertainty. It is a derived, versioned narrative
relation view over the existing Evidence Graph and Event objects. It is not a
second evidence store, a new project state authority or an implemented causal
model.

Canonical object ownership and persistence remain defined by the
[Product Intelligence Object Model](../intelligence/OBJECT_MODEL.md) and
[Video Understanding Model](VIDEO_UNDERSTANDING_MODEL.md). Project Host is the
only authority that may register a project-scoped graph snapshot.

## Compatibility with the current Event contract

The existing persisted `EventV1` contract and every historical record keep
their current fields, status semantics and meaning. DOC-001 does not add fields
to that schema in place. Graph nodes reference exact Event IDs/versions/digests.
The preferred future protocol is an additive, independently versioned
`EventRelation` plus `EventCausalGraphSnapshot`; an additive `EventV2` is an
alternative only if a governed Work Order proves the need. Either route needs
explicit v1 adapters/status mapping, generated bindings, migration/round-trip
tests and immutable Evidence before it becomes authoritative.

## Conceptual event and relation view

The minimum conceptual event view contains the DOC-001 fields plus authority
metadata:

```yaml
event_id: stable project-scoped ID
event_ref: exact existing Event ID, version and digest
participants: exact person/entity refs or explicit unknown refs
time_range: RationalTime range in source/project chronology
cause: edge refs with observed/reported/inferred classification
effect: edge refs with observed/reported/inferred classification
emotion_change: optional candidate transition with alternatives
story_role: optional proposed function in an exact Story Plan candidate
confidence: calibrated value with basis
evidence_refs: exact reviewed Evidence Graph refs
context_scope: project, scene or conversation boundary
relation_status: candidate | reviewed | disputed | approved_for_plan | superseded
provenance: producer/tool/model/policy/input digests and reviewer
```

`cause`, `effect`, `emotion_change` and `story_role` describe relation or
narrative-view fields; they are not additions to current `EventV1`. They must
never be stored as bare facts without evidence, confidence and review state.

## Edge model

| Edge | Meaning | Minimum evidence | Common failure |
| --- | --- | --- | --- |
| `temporal_before` | one event precedes another in a declared chronology | two bounded event ranges and chronology basis | presentation order mistaken for real order |
| `enables` | A creates a condition needed for B | state change plus explicit link | coincidental sequence |
| `causes` | A materially produces B | observed/reported mechanism or strong reviewed inference | post hoc causality |
| `responds_to` | B is a reaction to A | participant/context continuity and bounded delay | unrelated reaction shot |
| `contrasts_with` | A and B create meaningful difference | shared comparison dimension | superficial visual similarity |
| `escalates` / `resolves` | event changes tension/state | before/after state evidence | emotion classifier overclaim |
| `reveals` | event changes audience knowledge | prior knowledge state and new evidence | editor-only assumption |
| `unknown_relation` | relation is unresolved | conflicting or insufficient evidence | false certainty |

Edges are directional, versioned and evidence-bound. Multiple competing edges
may coexist. A reviewer may approve an edge for one Story Plan candidate without
declaring universal causal truth.

## Example

```text
Event A: Friend arrives late
  evidence: arrival image, timestamp and dialogue reference
  state change: absent -> present

Event B: Group complains
  evidence: speaker-linked complaint after arrival
  relation: responds_to(A), confidence 0.88

Event C: Everyone laughs
  evidence: multi-person laughter after the complaint
  relation candidates:
    - resolves(B), confidence 0.72
    - unrelated shared joke, confidence 0.28

Proposed Story Meaning:
  "Friendship intimacy" is a reviewed narrative interpretation, not a fact.
  The Story Plan may use it only while retaining the alternative and context.
```

If the complaint audio is from another time or the laughter lacks participant
continuity, the causal chain must be disputed or removed. Temporal proximity is
insufficient on its own.

## Graph construction

1. Project Host assembles an exact Material Evidence Pack.
2. Worker/Model Gateway may propose Event nodes and relation candidates.
3. Contract validation checks IDs, RationalTime, evidence existence, privacy,
   participant scope and producer provenance.
4. Deterministic rules reject cycles that claim impossible chronology, missing
   refs, unsupported confidence basis or cross-project leakage.
5. Human review resolves material factuality, sensitive representation and
   subjective story meaning.
6. Project Host registers an immutable graph snapshot and links it to candidate
   Direction Cards or Story Plans.

The graph is a content-addressed artifact; its nodes do not become new SQLite
tables exposed as public module contracts. Schema and persistence design require
a governed Work Order.

## Causal confidence

Confidence must state its basis: direct observation, participant report,
multi-source agreement, temporal/context inference or editorial hypothesis.
Confidence is reduced by missing intervals, montage/reordering, ambiguous
identity, contradictory testimony, reused audio, weak context or model-only
emotion labels.

No global numeric threshold turns inference into fact. Policies may require a
minimum level for Story Plan approval, but the original uncertainty and rejected
alternatives remain auditable.

## Story integration

The graph may support Story Beat roles such as setup, trigger, escalation,
reversal, payoff or resolution. A `story_role` is bound to an exact Story Plan
candidate and cannot rewrite the Event. Different candidates may assign
different functions to the same evidence.

```text
Evidence Graph facts
  -> Event Causal Graph candidate relations
  -> Direction Card / Story Plan alternatives
  -> Decision Records and user approval
```

It does not emit Timeline Commands, RenderGraph nodes or edit operations.

## Invalidation and correction

A media fingerprint, evidence review, participant correction, chronology change
or relation-policy change creates a successor graph snapshot and stales every
dependent unapproved candidate. Approved historical decisions retain their
exact pinned snapshot for audit. Rejected/disputed relations are preserved with
reason; they are not silently deleted from history.

## Failure and safety rules

- Never infer sensitive relationships or identity from appearance alone.
- Never use source adjacency as sole causal proof.
- Never fill missing events with generated fiction while describing real media.
- Never let a graph candidate modify Timeline, project stage or approval state.
- When causality is weak, show alternatives or ask a material question.
- When evidence is insufficient, planning must degrade or block explicitly.

## Work Order implications

The first slice should support reviewed `temporal_before`, `responds_to` and
`unknown_relation` edges for one project, with exact evidence/time refs,
contradictory candidates, correction/invalidation, persistence/reopen and zero
Timeline mutation. Creative usefulness and causal accuracy require authorized
real-media human review in addition to contract and property tests.
