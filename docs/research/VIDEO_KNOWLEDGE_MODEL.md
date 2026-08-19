# Video Knowledge Model

## Purpose

AVE learns reusable editing principles from permitted reference videos by
storing reviewed observations and patterns, not recipes or copied expression.
This document defines the target Video Pattern knowledge contract. It does not
authorize scraping, media download, model training or current implementation.

## Knowledge levels

1. `VideoObservation`: a time-coded measurable fact from one source, such as a
   cut, subtitle interval or question in the opening.
2. `VideoInference`: a reviewable interpretation, such as “the question
   establishes unresolved conflict”. It cites observations and states
   uncertainty.
3. `VideoPattern`: a reusable claim supported by multiple reviewed sources and
   counterexamples. It is compatible knowledge for retrieval, not causality.

Observed performance metrics are contextual evidence only. Popularity does
not prove that a pattern caused the result or that it is suitable for AVE.

## VideoPattern target schema

| Field | Required meaning |
| --- | --- |
| `pattern_id`, `schema_version`, `pattern_version`, `definition_digest` | immutable identity |
| `status` | `draft`, `reviewed`, `published`, `deprecated`, `retired` |
| `claim` | bounded, falsifiable pattern statement |
| `source_video_refs[]` | permitted source identity, access date, rights and observation refs |
| `hook_pattern` | opening window in RationalTime, hook kind, setup/payoff refs and uncertainty |
| `pacing` | shot-duration distribution, cut density, silence/hold distribution and segment-specific pace |
| `shot_patterns[]` | shot role, framing/movement language, sequence position and recurrence |
| `subtitle_pattern` | coverage, density, words/characters per interval, placement, emphasis and timing behavior |
| `narrative_structure` | ordered roles, reveal/turn/payoff relations and duration proportions |
| `audio_music_pattern` | speech/music/silence roles and structural changes, without copying protected audio |
| `audience_context` | platform, region/language, audience, content type and duration class |
| `applicable_contexts[]`, `incompatible_contexts[]` | explicit retrieval filters |
| `counterexamples[]`, `risks[]` | known failure and authenticity/copying risks |
| `confidence` | value, basis, source diversity and reviewer agreement |
| `provenance` | analyzer/model/tool versions, policy, authors/reviewers and timestamps |
| `review_after`, `expires_at` | mandatory re-review/expiry when facts are time-sensitive |

All source time references use source timebase plus integer PTS or shared
RationalTime definitions. Aggregates may use decimal statistics but retain the
exact sample refs from which they were computed.

## Example shape

```json
{
  "pattern_id": "video-pattern.fast-hook-conflict",
  "schema_version": 1,
  "pattern_version": 1,
  "status": "reviewed",
  "claim": "A clearly evidenced conflict or question can establish the opening promise for a short personal Vlog.",
  "source_video_refs": ["video-observation-set:travel-a:v2"],
  "hook_pattern": {
    "window": { "start": { "value": 0, "timescale": 30 }, "duration": { "value": 90, "timescale": 30 } },
    "kinds": ["conflict", "question"]
  },
  "pacing": { "median_shot_duration_ms": 1800, "scope": "opening" },
  "applicable_contexts": ["short personal vlog"],
  "incompatible_contexts": ["observational documentary requiring an unhurried opening"],
  "risks": ["manufactured conflict can damage creator authenticity"],
  "confidence": { "value": 0.72, "basis": "reviewed observations; no causal claim" }
}
```

The implementation schema must be stricter than this abbreviated example:
unknown fields fail, refs are typed, rights are explicit, and provenance is
required.

## Ingestion and review pipeline

```text
permitted source selection
  -> source identity, rights and access record
  -> time-coded automated observations
  -> observation validation and human annotation
  -> bounded inferences
  -> cross-source pattern candidate
  -> counterexample and compatibility review
  -> immutable published VideoPattern
```

Automated analysis runs through a Worker job and returns candidates. Project
Host validates project-scoped results; a future knowledge-registry publication
workflow validates catalog results. Neither Worker nor Model Gateway publishes
knowledge directly.

## Quality gates

A pattern cannot be published unless it has:

- permitted sources and explicit rights/use status;
- observation/inference separation and time-coded evidence;
- more than one supporting source, or an explicit `single_source` limitation;
- counterexamples and incompatible contexts;
- confidence basis, source-diversity note and reviewer identity;
- no copied dialogue, music, shot sequence or protected creative expression;
- a review/expiration policy appropriate to its stability.

Conflicting evidence lowers confidence or creates competing pattern versions;
it is not silently averaged away. Revocation or rights failure prevents new
selection but does not rewrite historical project snapshots.

## Retrieval boundary

Video Patterns can support Creative Skill evaluation, Style Profile extraction
and Trend Pattern aggregation. Retrieval returns exact version/digest, match
dimensions, conflicts, evidence basis and risks. A pattern never emits Edit
Intent or Timeline Commands. Project Host pins every selected pattern in the
Creative Context Bundle so later catalog changes cannot alter a past decision.

## Implementation targets

`WO-RESEARCH-001` owns the first governed slice: JSON Schemas for observation,
inference and pattern records; generated bindings; a pure validator/aggregator;
a repository-shipped read-only catalog port whose selected records Project
Host pins in the project object store; fixtures with supporting and
counterexample sources; and tests for rights, provenance, exact time, version pinning and
invalid publication. Real external research ingestion requires separate source
authorization and acceptance evidence.
