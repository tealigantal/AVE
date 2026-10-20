# ADR-0047: animated GIF and WebP media

Status: accepted for the user-authorized implementation; capability acceptance is recorded separately in Stage3 Evidence. Date: 2026-10-15.

## Context

Project originals are immutable SHA256 objects and may have no extension. Static image support already rejects animation. Treating animated GIF or WebP as a still silently loses frames, timing, and possibly transparency. Animation therefore needs a finite, alpha-preserving video representation that fits the existing Host-owned import, Timeline, RenderGraph, and Worker boundaries.

## Decision

Classify GIF and WebP from file bytes, decode every displayed frame and its presentation delay, and define one source play as the sum of its decoded frame durations. Preserve the original SHA256 object and its identity. For worker probing and analysis, derive a temporary lossless FFV1 Matroska stream with BGRA pixels and millisecond presentation timestamps; do not store it beside or in place of the original. The project Host retains the original media identity. Render jobs create any needed normalized derivative inside the job workspace, which is removed by the existing job cleanup lifecycle.

The derivative contains one play only. Rendering repeats it only when the committed Timeline clip is longer than that one play, using the clip duration to govern the repeat. Both Preview and Master consume the same alpha-bearing source semantics through their existing render paths. Browser thumbnails are PNG when the source has alpha.

Reject corrupt images, non-positive frame delays, timestamp sequences that cannot be represented on the selected millisecond grid, cancellation, or a backend that cannot produce/read the required alpha-capable lossless stream. Never silently flatten alpha or substitute only the first frame.

## Consequences

The existing FFmpeg/Pillow stack is reused, and original identity, project storage, and timeline contracts remain unchanged. Analysis and render derivatives are temporary rather than new durable project assets; they can be recomputed from the immutable original. The millisecond timestamp grid is the supported boundary. Loop metadata does not create an infinite source duration; one decoded sequence is the unit of source time.

## Alternatives rejected

- Treat animation as a still: loses content and transparency after the first frame.
- Store an unbounded repeating stream: has no finite source duration for Timeline and analysis.
- Replace the original with an encoded video: breaks immutable source identity and provenance.
- Flatten to RGB: changes compositing semantics.

## Rollback

Disable animated GIF/WebP classification and return to the prior explicit unsupported-animation error. Immutable originals need no migration or cleanup. Existing static-image behavior remains in place.
