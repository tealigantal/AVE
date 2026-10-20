# WP-S3-ANIMATED-MEDIA-001: Animated GIF and WebP media

Authority: active Stage3 implementation Work Order. The programme manifest owns paths and dependencies; the dedicated [ExecPlan](../../../plans/2026-10-15-animated-media.md) owns execution order and evidence. This package extends media support without reopening or changing the completed static-media package or any P4 package.

## User outcome

Import GIF and animated WebP using byte-content detection even when originals are extensionless SHA256 objects. Preserve the original object and its hash. Convert animation to a project-managed derived video asset using the existing FFmpeg and cache/cleanup facilities; do not write conversion output into the immutable original store. A single-play animation lasts one complete decoded loop. Timeline repetition follows clip duration and must not make an infinite source loop. Preserve per-frame timing and alpha through conversion and compositing; fail with a specific reason if the installed backend cannot faithfully decode or encode the source semantics.

## Acceptance

- Probe and import single-frame GIF, multi-frame GIF, animated WebP, and extensionless copies by actual bytes; keep static JPEG, PNG, WebP and MP4 behavior unchanged.
- Derive duration from actual frame presentation timing, including unequal frame durations. One play is finite; looping/repeating is controlled by the Timeline clip duration.
- Preserve alpha in the internal derived format and through Preview/Master composition. Do not silently flatten to an opaque background or substitute the first frame.
- Reach real import, preview, Timeline edit, export, close/reopen, and derived-cache cleanup paths with generated real media and unchanged original SHA256 identity.
- Unsupported, corrupt, zero-duration, or unfaithfully representable inputs fail closed with no partial import or leaked derived output.
- Report media/backend limits precisely. This Work Order does not claim P4, Stage Exit, or project completion.

## Scope and exclusions

Reuse existing media probes, FFmpeg, Host import/commit authority, Timeline/RenderGraph, and derived asset cleanup. No new transcoder, arbitrary model calls, cloud services, global permission changes, project-original migration, or unrelated refactors. Keep JPEG suffixless demuxer regression and current still-image animation rejection regression, replacing only the latter with explicit animated-media coverage.

