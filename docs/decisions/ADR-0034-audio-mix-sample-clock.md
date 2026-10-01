# ADR-0034: audio mix output sample clock

Date: 2026-09-30. Status: accepted implementation decision; validation is
recorded in the active Stage3 ExecPlan and immutable Evidence.

## Context

PR27 CI36690243877 on Ubuntu24.04/FFmpeg6.1 fails the actual Host manual-draft
encoding with AV_SYNC. The caption-only work has75frames and2.5seconds of audio;
adding a2.5second independent PCM track to the embedded AAC sources yields only
1.5seconds of encoded audio. The same source passes on Windows/FFmpeg7.1.

An isolated reproduction of the actual Host graph finds that the inner amix
continues to output real samples after its first clip ends, but FFmpeg6.1 emits
NOPTS frames. The outer mix and final trim then lose those samples. Reclocking
the mix restores the full sample extent and both actual source tones at the tail;
padding silence or weakening duration QC would not repair the content.

## Decision

After every amix, the adapter explicitly sets its internal timebase to1/48000
and timestamps consecutive output samples with N/SR/TB. Source placement and
Timeline delays remain inputs to the mix; the output clock does not alter
source ranges, RationalTime, semantic selection, gain or silence placement.
The sample rate is the existing normalized48kHz audio execution rate.

New production uses only worker-media@v7 and ave-worker-host-r17. This changes
plan and cache identities while preserving the Semantic Render Manifest.
Host and Worker independently validate that identity before dispatch; no
Renderer-selected legacy encoding path is added.

Already successful v5/r15 and v6/r16 works remain immutable historical receipts.
Their strict graph, source, permission, plan, QC and byte verification follows
ADR-0032. A saved v6 repair of a v5 generation retains both identities truthfully.
Current encoding may satisfy a predecessor generation only when the entire
cache payload differs solely in the known encoder version. No other drift or
reverse migration is accepted, and old plans cannot register new bundles.

## Consequences and verification

The regression must check the actual encoded duration and PTS, decoded samples
and both source tones after the former1.5second failure boundary, plus delayed
source placement. QC keeps its existing threshold and gains exact duration,
delta and sample-bound diagnostics. The failed CI and reproduction/bootstrap
failures remain failures. Current-source local gates, new remote CI and a new
formal-app real-media encode/play/export/reopen run are required for delivery.

This decision belongs to the existing architecture ADR layer because the new
cache/producer identity and supported historical verification extend ADR-0032;
historical ADR-0032 is not rewritten as the current decision.
