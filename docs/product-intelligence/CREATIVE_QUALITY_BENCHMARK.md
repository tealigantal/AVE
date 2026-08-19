# Creative Quality Benchmark

## Purpose, authority and status

This document defines how AVE should evaluate whether a video and its editing
process are useful, coherent, technically valid and acceptable to its creator.
It extends [Product Metrics](../product/PRODUCT_METRICS.md), the
[Quality Evaluation Pipeline](../pipeline/QUALITY_EVALUATION_PIPELINE.md) and
the existing editing-execution QC/acceptance authorities. It does not create a
second `QualityReport`, capability matrix or acceptance status system.

Benchmark results are evaluation evidence, not execution or publication
permission. Current capability status remains in `docs/program/` and
`docs/current/`; future creative benchmark scores cannot promote a capability.

## Quality model

AVE evaluates four distinct dimensions:

```text
Story Quality
  + Editing Quality
  + User Satisfaction
  + Technical Quality
  -> evidence-backed review, never one magic score
```

Hard gates run before weighted creative comparison. Invalid sources,
rights/privacy failures, unsupported semantics, failed QC, factual fabrication
or user rejection cannot be averaged away by a high aesthetic score.

## Story quality

| Signal | Question | Evidence |
| --- | --- | --- |
| coherence | Can the viewer follow people, events, time and causality? | beat/evidence coverage, continuity review, causal contradictions |
| emotional progression | Do evidenced state changes develop rather than jump arbitrarily? | reviewed emotional transitions, alternatives, human rubric |
| narrative completeness | Does the promised setup receive adequate development/payoff for the chosen form? | Story Plan roles, ending reserve, missing-beat diagnostics |
| factual fidelity | Does the story preserve what the material supports? | exact Evidence refs, contradiction and correction rate |
| creator identity | Does the result represent the creator as approved? | Contract/profile conflicts and human identity review |

Completeness is relative to the approved form and duration. A short observational
Vlog does not fail for lacking a conventional three-act structure when the
Creative Contract chose another form.

## Editing quality

| Signal | Question | Evidence |
| --- | --- | --- |
| pacing | Do shot, dialogue, pause and music durations serve the approved intent? | duration/rhythm measurements plus human review |
| shot selection | Does each shot provide the intended evidence, reaction or continuity? | decision/evidence refs and reviewer comparison |
| transition quality | Is the change motivated, technically correct and supported? | source handles, semantic execution and visual review |
| continuity | Are screen direction, action, audio, time and identity intelligible? | automated diagnostics plus human review |
| audio relationship | Are dialogue, music, silence and effects purposeful and intelligible? | loudness/true-peak/ducking facts and listening review |
| information design | Are captions/graphics readable, timely and non-misleading? | safe-area/timing checks and comprehension review |

A bounded tool passing its named test does not establish the full professional
quality of its family.

## User satisfaction

Required product signals include:

- modification rounds and time to first useful cut;
- suggestion/patch acceptance and rejection rate by context;
- user override rate and whether overrides repair basic errors;
- approval latency and explanation/evidence use;
- publish/delivery decision and stated reason;
- final qualitative rating of story, picture, sound and identity fit.

These signals need interpretation. Fewer modification rounds may mean good
alignment or user abandonment. A publish decision may reflect a deadline. An
acceptance rate must be segmented by project type, duration, creator experience,
model/Skill version and synthetic versus human-reviewed evaluation.

## Technical quality

Technical gates include:

- valid contracts, RationalTime, media identity and source ranges;
- atomic Edit IR/CommitPlan with correct base version and protected refs;
- target-specific Preview/Master RenderGraphs with equal target-neutral
  semantic payload/hash, one ExecutionPlan per graph and explicit resolver
  decisions;
- verified-Original Master, successful decode and output identity;
- audio loudness, true peak, clipping, silence and A/V sync;
- caption bounds, missing font/asset/LUT/backend diagnostics;
- render persistence, reopen/recovery and no silent semantic omission.

Technical success is necessary but not sufficient. AVE does not use
"successfully exported" as its final product metric. The final outcome is a
QC-valid, evidence-faithful work the creator explicitly chooses to deliver.

## Benchmark unit

A benchmark case should pin:

- case ID/version, rights and representative cohort;
- approved Creative Contract, source/evidence snapshot and base Timeline;
- expected story/editing questions, not a single prescribed cut;
- capability snapshot and allowed/blocked semantics;
- baseline(s), candidate versions and evaluator blinding where practical;
- automated measurements and exact tool/policy versions;
- human-review rubric, reviewer context and disagreement protocol;
- result distribution, confidence, failure examples and retained artifacts;
- privacy/retention policy and Evidence record.

Cases should include positive examples, near misses, counterexamples, ambiguous
material and explicit insufficiency. A benchmark that rewards output generation
but never tests refusal/blocking will train unsafe behavior.

## Review protocol

1. Validate source identity, rights, Contract and benchmark version.
2. Run deterministic contract, execution and technical QC gates.
3. Present comparable outputs without hiding blockers or fallbacks.
4. Collect human story/editing/identity and audio-visual review separately.
5. Record disagreement, reasons and unresolved uncertainty.
6. Aggregate only within compatible segments and rubric versions.
7. Publish an immutable result snapshot; never overwrite prior baselines.

Creator identity, sensitive representation, factuality, subjective story quality
and final delivery always require human review. Automated critique may assist but
cannot substitute for these decisions.

## Thresholds and regression

Thresholds are versioned by use case. Technical blockers are pass/fail. Creative
dimensions are distributions and comparative judgments, with minimum safeguards
for factuality and identity. A new model/Skill/editor version must not regress
hard gates, failure closure or representative human-reviewed cases even if its
average engagement proxy improves.

Benchmark improvement should report effect size, confidence, subgroup results,
counterexamples and changed cost/latency. Popularity or retention data is
contextual evidence, not proof of creative quality or causality.

## Failure and anti-gaming rules

- Never optimize acceptance rate by hiding alternatives or asking fewer
  meaningful approval questions.
- Never reduce modification rounds by silently committing broader changes.
- Never mark absent human review as a passing subjective score.
- Never average QC/rights/privacy/factual blockers into a composite score.
- Never reuse private media outside its declared benchmark consent.
- Never claim general capability from one montage, fixture or reviewed Master.

## Work Order implications

The first benchmark slice should cover two evidence-bound story candidates and
one scoped edit comparison on authorized media, with technical QC, a blinded
human rubric, disagreement recording and immutable results. It should validate
the evaluation system only; affected editing and intelligence capabilities need
their own governed real-media and user-facing acceptance.
