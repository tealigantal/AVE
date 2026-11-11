# ADR-0056: Resource-bounded render execution identity

Date: 2026-11-10. Status: selected for implementation; validation is incomplete.
This decision is not evidence of a completed low-resource user journey or P5.

## Context

A real creation Preview attempted a 3120×4160 canvas with 26 separately opened
clip inputs. Its FFmpeg process was killed by the Docker VM's out-of-memory
killer. A smaller Preview alone cannot bound Master rendering, and source
graphs, timebase, permission, QC and registered output identities must remain
authoritative. Existing `RenderRange` participates in cache identity but is not
an implemented bounded execution range.

## Decision

New Render production uses one current identity, `worker-media@v8` with
`ave-worker-host-r18`; the Worker must not execute predecessor identities.
The Host selects an explicit versioned execution policy and puts it in each
target-specific ExecutionPlan and canonical cache-key payload. The Worker
independently verifies the complete plan, policy, semantic hash and cache key.
The standard policy retains the existing executor. The bounded-linear policy
selects a separately checked executor with one-input processing, single-thread
media operations, lossless rawvideo in NUT plus PCM intermediates, and one final
encode. FFV1 is not used for this strategy: an isolated six-frame 3120×4160
test exhausted a 768 MiB container even with one encoder thread. Rawvideo
increases temporary disk use, which must be checked before execution. The
bounded policy also fixes x264 to one thread, no B-frames, `rc-lookahead=4`,
and `sync-lookahead=0`: default 40-frame lookahead exhausted the same memory
budget during a 66-frame 3120×4160 test. The existing CRF, output dimensions
and frame rate remain unchanged. These choices belong to the signed bounded
policy and are not silently applied to the standard executor.
The completed picture and continuous PCM are encoded in separate processes,
then stream-copied into the final MP4. A single process encoding both streams
exhausted the 768 MiB budget on high-resolution inputs despite the bounded
lookahead; separate encoding retains the same CRF and avoids a second lossy
generation. The temporary video and audio files require additional disk space,
checked again before muxing.
The policy is part of output provenance; the Worker must not silently choose
an algorithm from an unsigned environment setting.

Preview and Master remain separate target-specific graphs and plans derived
from one committed Timeline and one target-neutral Semantic Render Manifest.
Master retains authorized original inputs and its selected output profile.
No unsupported semantics may be silently discarded or reported successful.
Completed bundles retain both verified targets, their plans, output manifests
and QC, and remain an atomic Host-owned publication.

For a failed predecessor generation, a new v8 attempt may retain the generation
binding only when deriving its predecessor plan ID proves that the complete
canonical cache payload differs solely in encoder identity and the new policy
field. Profile, source and semantic drift remain forbidden. Historical v5/r15,
v6/r16 and v7/r17 successful outputs are immutable read-only receipts: verify
their saved plan, source/permission identity, provenance, QC and actual bytes;
never run an old producer or register an old result as newly produced.

## Scope and remaining work

The bounded-linear implementation currently covers only contiguous single
video-track, frame-aligned 30 fps clips, including clips with no audio and
per-clip embedded-audio gain. It rejects transitions, subtitles, independent
audio tracks and other effects rather than discarding them. It remains blocked
from production while its full semantics and resource bounds are unverified.
Long clips are divided on the global output frame grid into blocks of at most
300 frames; audio is decoded and resampled once for each original clip and
divided at the corresponding global sample positions. These execution blocks
are not durable checkpoints. Synthetic frame/PCM comparisons against the
unblocked executor cover specific tested inputs, not arbitrary timeline
semantics or the full application memory budget.
Its temporary intermediates do not survive restart. The
complete authorized low-resource programme still requires bounded execution of
the other supported semantics, durable checked checkpoints, resource-aware
model scheduling, verified low-resolution proxies and their Stage3 identity
bindings, and a formally recorded adaptation for a failed saved draft whose
Preview profile or source changes. Such adaptation cannot be treated as the
encoder-only predecessor rule above.

This decision does not claim the real 26-clip project, a 2 GiB combined budget,
or an amd64/arm64 end-to-end journey has passed. The existing programme and its
Evidence own those verification results. Old decisions and receipts are not
rewritten. No deployment, purchase or increase in permissions follows from this
ADR.

## Consequences and recovery

The policy creates a distinct plan and cache identity even when the semantic
manifest is unchanged. Insufficient storage, unsupported graphs, cancellation,
and malformed or rebound plans must fail explicitly. Failed temporary work
cannot become a published render. A rollback keeps existing project data and
immutable receipts; a different producer must never relabel v8 results or reuse
their execution identity.
