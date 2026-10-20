# Animated GIF and WebP media ExecPlan

Authority: task-scoped execution plan for `WP-S3-ANIMATED-MEDIA-001`. Product and stable architecture authorities retain ownership. Generated status is updated only by programme tooling.

## Outcome

Use actual byte identity to import GIF and animated WebP as finite-duration video-like Timeline sources while retaining original immutable source identity and alpha. Derive one animation play with source frame timing. Timeline clip duration determines repeated playback. Validate actual preview/master rendering, persistence and cleanup.

## Execution order

1. Inspect source identity, probe, import, derivative-cache, timeline and renderer entry points; preserve the current JPEG fix.
2. Implement byte-based animated-image classification and controlled FFmpeg derivation to a lossless alpha-capable internal video representation with exact finite frame timing and duration.
3. Connect Host import and renderer source access to the derived object without changing the SHA256 original reference.
4. Add adversarial and real-media cases for static/animated/extensionless/equal and unequal timing, alpha, unsupported/corrupt input, and ordinary MP4/JPEG/PNG/WebP regressions.
5. Exercise actual product import, preview, timeline placement/edit, master export, reopen and cache cleanup in the existing development container. Do not remove volumes or user originals.
6. Write immutable EVD evidence, complete/sync/check the package, report exact tested boundaries and current container state.

## Progress

- [x] Package registered and started.
- [x] Probe and derivative behavior implemented; byte signatures classify extensionless sources, decoded durations are finite, and FFV1/BGRA retains alpha.
- [x] Host and renderer end-to-end path implemented; temporary derivatives use worker/job workspaces while imported originals retain their SHA256 identity.
- [x] Real media and regression checks passed on the local execution environment: `pnpm run stage3:mixed-media:test`, including static JPEG/PNG/WebP/GIF and MP4 compatibility, suffixless JPEG/GIF/WebP, unequal frame delays, alpha, actual Worker extraction/scene scan, Host preview/timeline/Preview+Master render, and reopen.
- [x] Rebuild the existing development container without removing volumes; both services healthy. In-container GIF smoke confirmed 70/130/210ms delays, 410ms one-play duration, exact 0/70/200/410ms PTS, and BGRA.
- [x] Write Evidence and reconcile the package capability/acceptance matrices; `docs:complete` and `docs:sync` passed. `docs:check` reports only the repository's pre-existing historical evidence-applicability findings for unrelated capabilities; the new capability and latest programme fingerprint match.

## Known constraints

The actual Host and Worker end-to-end tests passed on the local execution environment. The development container has not yet been rebuilt, so its installed FFmpeg codec/container support remains unverified. The implementation rejects non-positive frame delays and timings that cannot be represented on the millisecond grid.

