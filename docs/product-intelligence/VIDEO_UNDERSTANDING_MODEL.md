# Video Understanding Model

## Purpose, authority and status

This document defines the semantic levels AVE uses to understand source media
without collapsing detection into story claims. The Evidence Graph remains the
factual foundation; this is an extension view over the canonical
[Video Knowledge Model](../research/VIDEO_KNOWLEDGE_MODEL.md),
[Material Understanding Pipeline](../pipeline/MATERIAL_UNDERSTANDING_PIPELINE.md)
and [Product Intelligence Object Model](../intelligence/OBJECT_MODEL.md). It is
a target specification, not evidence of model accuracy or implementation.

## Understanding hierarchy

```text
Pixel
  -> Frame
  -> Shot
  -> Moment
  -> Event
  -> Relationship
  -> Story Beat
  -> Narrative Structure
```

Higher levels are derived views with increasing interpretation risk. They never
erase or rewrite the lower-level evidence that supports them.

| Level | Meaning | Minimum provenance | Typical uncertainty | Downstream use |
| --- | --- | --- | --- | --- |
| Pixel | decoded visual/audio samples | asset/stream identity, PTS/timebase, decoder/tool version | decode/color/audio interpretation | measurable media facts only |
| Frame | one time-addressed visual state | exact RationalTime/PTS and source frame identity | blur, occlusion, sampling | object/action candidates |
| Shot | continuous camera/edit unit | bounded source range and boundary evidence | hard cuts, motion or flash false positives | coverage and shot-language analysis |
| Moment | narratively useful bounded occurrence | observation refs, people/objects and exact range | moment boundary and salience | candidate beat material |
| Event | a state change involving participants | moment/evidence refs, before/after state and confidence | cause, intent and omitted context | causal/temporal reasoning |
| Relationship | repeated or contextual relation among entities/events | multiple evidence refs and context scope | identity, social meaning and bias | character continuity and interaction arcs |
| Story Beat | a proposed narrative function | approved evidence plus Creative Contract/Story candidate refs | editorial relevance and audience effect | Story Plan candidate |
| Narrative Structure | ordered beat system and thesis | approved Story Plan, alternatives and decision records | overall interpretation | planning and review, never raw fact |

## Evidence Graph foundation

Evidence Graph stores source-addressable facts and reviewed interpretations.
Every node used by product intelligence must retain stable asset identity,
RationalTime/TimeRange, producer and version, confidence basis, review state and
content digest. Observation and Interpretation are separate objects.

Understanding stages may query a bounded `MaterialEvidencePack`; they do not
receive unrestricted database, original-file or filesystem access. Project Host
assembles and registers the pack from persisted evidence. Worker and Model
Gateway return candidates only.

The graph must support:

- contradiction rather than last-write-wins replacement;
- missing and insufficient evidence as first-class outcomes;
- links from derived meaning back to exact media/time evidence;
- staleness when media identity, analysis version or reviewed labels change;
- privacy, rights and upload policy at every retrieval boundary.

## Temporal reasoning

Temporal reasoning distinguishes source order, project chronology and Timeline
presentation order. It must record which order is asserted and why. Required
relations include `before`, `after`, `during`, `overlaps`, `contains`,
`continues`, `repeats` and `unknown_order`.

Source adjacency is not automatically story causality. A montage may reorder
events; a reaction shot may be recorded later; missing footage may hide an
intermediate cause. Any inferred chronology carries evidence, confidence and an
alternative when ambiguity affects the edit.

## Event and relationship reasoning

Event reasoning asks what changed, who participated, what state preceded and
followed it, and whether cause/effect is observed, reported or inferred. The
derived relation view is defined in
[Event Causal Graph](EVENT_CAUSAL_GRAPH.md).

Relationship reasoning aggregates only within an explicit project/context
scope. It may represent interaction frequency, support/conflict, conversational
turns or recurring roles, but must not infer sensitive identity or social status
without authorized evidence. Corrections are versioned and invalidate dependent
candidate stories.

## Emotional transition

Emotion is a candidate interpretation, not an objective face label. A useful
record includes subject ref, before/after candidate state, observable cues,
context, confidence, alternative explanation, sensitivity policy and reviewer
state. A facial-expression classifier alone cannot establish motivation,
relationship meaning or narrative truth.

Creative planning may use an emotional transition only when the expected story
effect remains compatible with creator identity and the approved Creative
Contract. Low confidence yields a comparison or question, not an assertive edit.

## Character development

Character development is a project-scoped narrative view over evidenced actions,
speech, decisions and relationships. It tracks continuity, role in the Story
Plan, changing goals/states, protected representation and unresolved conflicts.
It is not a biometric identity system or a permanent personal profile.

The system must expose when an apparent arc is caused by missing coverage,
selective ordering or uncertain identity linking. It may propose alternative
arcs but cannot force footage into a predetermined character template.

## From understanding to story

```text
registered media
  -> Worker observation candidates
  -> Project Host validation and Evidence Graph registration
  -> reviewed Material Evidence Pack
  -> temporal/event/relationship candidate views
  -> Direction Cards and Story Plan candidates
  -> explicit user approval
```

No higher-level object can authorize Timeline mutation. A Story Beat requires
approved evidence; a Story Plan requires beat coverage and approval; editing
still uses semantic Edit Intent, Edit IR and Project Host Commit.

## Failure and degradation rules

- Decode or source-identity failure produces no accepted observation.
- Unknown participant identity remains unknown; nearest-face or name guessing
  is forbidden.
- Conflicting event order, emotion or relationship meaning remains visible.
- Missing context weakens or blocks causal/narrative claims.
- Unsupported analysis capability returns `unavailable`, not empty success.
- Changing evidence stales dependent packs, plans and uncommitted intents.
- Privacy/rights denial removes unauthorized inputs and explains the resulting
  limit; it never silently uploads or substitutes material.

## Work Order implications

Implementation should progress from source-addressable observation candidates,
to reviewed Moment/Event records, to bounded temporal and relationship queries,
and only then to Story Beat evaluation. Each slice needs contract fixtures,
real authorized media, review/correction, staleness, contradiction, privacy and
zero-Timeline-mutation evidence. Accuracy claims require human-reviewed datasets;
schema and synthetic tests prove only the boundary.
