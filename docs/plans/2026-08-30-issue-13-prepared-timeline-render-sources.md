# ExecPlan: Issue #13 prepared Timeline render sources

## Objective

Resolve immutable, authorized Render Sources for every Asset used by the prepared semantic-execution Timeline before any execution commit, independently of the Story Evidence binding.

## Progress

- [x] Rebuild the merged #11 baseline and create the dedicated Issue #13 branch.
- [x] Locate the Evidence-only source collection in `prepareEditorialIntentExecutionInternal`.
- [x] Register/start WP-CA-STAB-003 and establish the canonical two-Asset reproduction boundary.
- [x] Prove the canonical topology excludes an unbound Asset B: the empty output track is compiled only from approved Story Evidence, and every prepared Timeline Asset already has one immutable Render Source before commit.
- [x] Validate and record Evidence; publish, merge and clean the branch after remote checks pass.

## Discovery

The current preflight constructs `assetTimescales` from `intent.evidence_refs`, then builds RenderGraphs from `prepared.timeline`. The canonical first-cut compiler admits only `select_evidence` operations, requires the sole enabled output track to be empty and neutral, and creates each output clip from exactly one approved Story Evidence reference. The feedback compiler is lineage-bound and only performs a local trim. Therefore no supported canonical compilation can introduce an Asset B that is absent from Story Evidence.

## Decision log

No production repair: adding one would be unreachable under current topology. The regression calls the canonical preflight and asserts the prepared Timeline Asset set equals the resolved immutable Render Source set before execution commit. Existing missing-source and atomic execution closure remain covered by the Product path.

## Outcome and retrospective

Pending.
