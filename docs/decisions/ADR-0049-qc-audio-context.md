# ADR-0049: Source-bound QC audio context

- Status: Accepted; implemented and verified within the limits below
- Date: 2026-11-05

## Context

During the [P5 preflight](../program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-ACCEPTANCE-001.md#运行检查点),
the committed mixed-media draft used silent video sources while an authorized,
non-silent WAV did not participate in its render. The Host supplied that WAV as
QC source evidence nevertheless, so both target reports blocked output silence
that the actual rendered sources could explain. A further isolated case showed
that a graph source whose audio is muted must not be treated as an active
contribution to another track's silence decision. The failed render and its
receipts remain historical facts.

The solution must preserve the existing gate for detected unplanned output
silence when participating sources are non-silent. Source content, permission,
track participation and intended fades must be established by trusted facts,
not by a Renderer or caller-provided label. This gate is not a proof that every
contribution in a mix is present.

## Decision

For current creation QC, Host supplies a versioned audio context containing the
actual target RenderGraph and its ExecutionPlan, together with the exact
Host-verified Original identities and source evidence for that graph. Preview
and Master each use their own graph, plan and corresponding source selection;
they continue to share the committed Timeline's target-neutral Semantic Render
Manifest. Original/Proxy selection and immutable Original authority retain the
existing boundaries in [ADR-0024](ADR-0024-stage2-immutable-original-snapshot-authority.md) and the
render timing and audio-clock decisions in [ADR-0032](ADR-0032-render-frame-boundaries-and-historical-receipts.md)
and [ADR-0034](ADR-0034-audio-mix-sample-clock.md).

Worker validates the graph/plan and binds source and audio nodes to source
identities, track state and the executable clip intervals before relying on the
context. Source byte identity and actual audio-stream facts remain verified
against the Original. Participation accounts for enabled clips and tracks,
mute and solo. A declared fade alone does not prove that an entire
output-silence interval is expected, so long fades can remain blocked. Identity
mismatch, inconsistent participation,
missing evidence or an explanation that cannot be proven fails closed or
retains the silence blocker. Non-participating authorized media cannot change
the source-silence decision. For a detected unplanned output-silence interval,
non-silent participating sources do not qualify for the strict-zero exception.
This decision does not lower the existing QC thresholds.

The current detector uses `silencedetect` at -50 dB with a minimum duration of
one second. Its existing planned-interval allowance admits up to 50 ms of
boundary drift; even with the active-clip checks, partial audio loss inside that
allowance can go undetected. It measures the mixed output rather than each
contribution: a remaining audible overlapping track can mask a missing track.
Consequently a passing report cannot prove sample-accurate continuity or
independent preservation of each participating track. These are current
measurement limits, not claims that those losses are expected or harmless.

For an Original at unit speed, with matching semantic and executable bounds and
no speed or time-map node, measurement covers the selected clip's complete
source range. Complex or unsupported mappings fall back to the complete
Original; a selected proxy cannot be treated as silent merely because its
Original is silent. This does not claim exact inference for arbitrary output
subintervals, time maps, effects or overlaps.

## Compatibility and verification

Legacy QC requests without the new context continue through their existing
context-free protocol and validation; they do not acquire new context claims or
get reinterpreted as evidence for a new render. Existing render and QC receipts
are not rewritten. New context must match its own target graph, plan, source
set and current authority before it can affect a new QC decision.

Verification must cover unrelated authorized sources, muted/soloed and disabled
tracks, overlapping active clips, actual fades, identity or graph/plan mismatch,
missing and stale evidence, strict digital silence, and lost non-silent audio.
It must also exercise both targets and the legacy no-context path. Synthetic
tests alone do not establish the formal P5 media journey; frozen-build results,
real-source reruns and remaining limitations belong in the linked checkpoint
and current Evidence.
