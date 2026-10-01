# ADR-0032: Render frame boundaries and immutable historical receipts

Status: selected for the authorized Stage3 repair; implementation and final
regression are in progress. Acceptance remains in the existing C1-C9 matrices
and Evidence.

Date: 2026-09-27.

## Context

The real held-out B request committed an exact 18-second Timeline, but both
encoded targets failed the existing AV_SYNC QC gate. Independent reproduction
of its saved graph produced 537 video frames / 17.866667 seconds against an
18-second audio stream. Concatenating clips in their source timebases lost
duration at individual boundaries. A single final-frame extension cannot repair
those internal cut positions.

The existing source and semantic manifest remain correct and immutable. A new
encoder execution identity must prevent reuse of Worker jobs that completed
encoding but subsequently failed QC. At the same time, already registered and
verified successful works must remain readable after this repair. This changes
execution compatibility, so a new ADR is required rather than rewriting the
historical single-current-version decision or old Evidence.

## Considered Options

1. Relax QC or append all missing frames at the end: rejected because this hides
   wrong internal boundaries and leaves audio/video correspondence incorrect.
2. Keep the old execution identity: rejected because completed Worker jobs could
   reuse the defective encoding despite changed compiler behavior.
3. Invalidate or rewrite every old successful artifact: rejected because existing
   projects, source mappings and accepted encoded bytes are immutable history.
4. Use one new execution identity with strict historical receipt verification:
   selected.

## Decision

New work uses `worker-media@v6` and `ave-worker-host-r16`. The Worker accepts only
the current execution identity. Host and Worker independently derive the exact
plan and cache identities before dispatch. Per-clip output sampling and concat
boundaries use ceil(absolute Timeline boundary × target fps). Each clip or gap
owns the difference between its end and start boundaries, with the sampling
phase aligned to that global grid. The total stays ceil(total duration × fps);
source PTS and RationalTime remain authoritative. The repair must preserve already promised
cross-rate and fractional-time behavior rather than silently rounding each clip
independently or introducing an undocumented narrower input contract.

Already registered successful v5/r15 receipts have a separate, narrow historical
verification purpose: revalidate their saved graph, semantic identity, original
execution provenance, current permissions and source identities, stored output
bytes and QC bindings. Reading them does not convert them to v6, run an old
encoder, create a current cache entry or rewrite their metadata. The Renderer
cannot select a legacy producer. Unknown or inconsistent provenance fails.

A committed draft whose old encoding failed may receive a new current execution
attempt under the existing authorized request. The generation decision, Timeline
and original plan bindings remain unchanged. Any adapter transition must prove
that the complete plan payload differs only in the explicitly versioned encoder
identity; this is not permission to ignore other plan, source or profile drift.
The previous failed attempt remains a distinct audit fact.

## Rationale

The separation preserves one current producer while allowing truthful playback
and review of immutable prior successful works. It repairs the actual timing
boundary instead of changing content selection, inventing audio or disguising a
QC failure as success.

## Consequences

New execution plans and cache keys differ even when the semantic manifest is the
same. Preview and Master still share that manifest and each retain their own
execution plan. Historical verification does not authorize new production on an
old adapter. Exact output frame counts, internal source/cut correspondence,
audio duration, historical byte identity and failure closure require regression
coverage in addition to the real B same-draft rerender.

## Migration

No database or project-history rewrite is permitted. Keep old receipts and failed
jobs unchanged. Publish the current encoder identity with its synchronized Host,
Worker, storage validation and tests. Current implementation details belong to
the runtime and architecture documents; executed results belong to Evidence.

## Rollback

Retain all committed Timelines and encoded objects. A code rollback may diagnose
or open its explicitly supported historical receipts, but must not relabel v6
artifacts as v5 or reuse v6 jobs under an older cache identity. If the current
producer fails, end the affected run with its cause and require an explicit new
attempt after a substantive repair.
