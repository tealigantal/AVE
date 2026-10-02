# AVE mixed media and audio resource packs

Authority: living ExecPlan under PLANS.md, linked by the Stage3 manifest. Existing product, architecture and programme authorities retain ownership; this records the user-authorized five-package implementation and its evidence.

## Purpose / Big Picture

Enable video, JPEG/PNG/WebP and independent audio in one reversible work, a remotely fetched CC0/CC BY library (40 unique music tracks, 80 unique sounds), two-call automatic soundtrack planning, basic precision editing, and one Draft PR to main. Keep Host authority, exact RationalTime, current Command/Commit/render chain, visual baseline and the 64 immutable Skill definitions.

## Context and Orientation

Baseline: origin/main 145856f49b9bd2e0d08610a45156247e712ada4a contains merged PR29. Original checkout was clean. Implementation branch: codex/mixed-media-resource-packs. Stage3 has no active package; historical direct-human acceptance debt remains open. Existing image Timeline/render and independent audio paths are present, but observation currently requires video; import choosers omit images. Manual UI exposes only three operations.

## Plan of Work

1. WP-S3-MEDIA-001: shared formats, typed observation/selection, static image duration and independent audio including sound effects. Real mixed-source create/revise/render/reopen.
2. WP-S3-AUDIO-PACK-001: verified declarative catalog, Host bounded download/cache/persist adapter, library UI. Selected sources survive offline reopen; audition cache is disposable.
3. WP-S3-SOUNDTRACK-001: explicit pack authorization, <=12 candidates in planning Call1, selected source verification and measurement receipt, exact-source Call2, audible reversible mix and attribution export.
4. WP-S3-PRECISION-001: typed Host manual adapter for timeline, static framing, audio and captions. Exact source-grid conversion and atomic work-level ripple; one action, one undo/version.
5. WP-S3-MEDIA-CLOSEOUT-001: real browser/Electron journeys, independent read-only review, documentation, final checks and exact-head Draft PR/remote CI.

## Concrete Steps

Register packages in the existing Stage3 manifest and matrices; run pnpm docs:start -- WP-S3-MEDIA-001. Work only in the active allowed paths. Each verified package gets immutable EVD, matrix status and current fingerprints before docs:complete, docs:sync and docs:check. Commit per package. Fetch, push final branch, create a Draft PR to main and attach it to this chat. Do not merge, release or deploy.

## Validation and Acceptance

Extend existing Stage3 observation/generation/manual/render tests and Worker media correctness. Check image orientation/alpha/geometry, 44.1k/48k audio grids, true mixed-source render, preservation and reopen. Test remote failures, hash/license/auth rejection, cancellation and stale responses without partial commit. Final commands: contracts:check, typecheck, architecture, docs:check, check, acceptance:final:synthetic. Actual licensed media and configured model/browser/Electron evidence remain separate from synthetic checks and human listening acceptance.

## Idempotence and Recovery

Content-addressed selected audio reuses immutable sources. Clean only unused audition cache, never project originals or historical references. Source, authorization, version or protected-object failure leaves the previous work unchanged. Retry is an explicit new operation after reporting the cause. Package completion is never inferred from scaffolding. Preserve old video objects/hashes and historical Evidence.

## Interfaces and Dependencies

Contracts own mixed-media observations, resource authorization and manual actions. Host probes/fetches/prepares/commits; Renderer sees safe opaque references; Worker receives verified local source identities. Still-image display duration is Timeline time, not invented source duration. Separate Preview/Master graphs/plans share the semantic manifest. No global project database or new cloud service.

## Artifacts and Notes

Sources checked during planning: ChatCut library and music/SFX docs (chatcut.io/docs/library, chatcut.io/docs/music-and-sound-effects); Kdenlive online resources; OpenGameArt per-item attachments; Kenney CC0 support/assets; ccMixter public query API. OGA with-me-0 exact with_me_3.mp3 GET works; ccMixter metadata works but actual GET returned 403 here. Freesound/Jamendo free API commercial restrictions exclude them as required providers; Pixabay has no verified public audio API; FreePD is closed. Catalog license and actual decode must be verified item by item. Work downloads stay outside the repository; no library audio in Git.

## Progress

- [x] User approved complete plan, commit/push and Draft PR; scope choices fixed.
- [x] Refreshed remote main, confirmed PR29 merged, created clean implementation branch.
- [x] P1 mixed media engineering integration; EVD-20261002-S3-MEDIA-P1.
- [ ] P2 catalog and remote resource product entry.
- [ ] P3 automatic soundtrack.
- [ ] P4 precision editing.
- [ ] P5 real journeys, review, docs and PR.

## Surprises & Discoveries

- Existing trim_source assigns source PTS difference directly to Timeline duration; manual adapter must perform exact conversion.
- Existing ripple_delete shifts only one track; work-level atomic interval adapter is required.
- Kenney distribution may use ZIP packs; per-item remote access must be verified before catalog publication.

## Decision Log

- 2026-10-02: Retain existing programme/architecture and fixed Skills. Catalog is data, no executable resource scripts. Original sites, no self-hosted CDN. CC0 and CC BY only; exact used sources retained locally for reproducibility, whole library stays remote.
- 2026-10-02: Mixed projects only; no audio-only work export, arbitrary crop, tracking or advanced anchor semantics. Historic requests have no implicit library grant.

## Outcomes & Retrospective

Implementation in progress. No new capability or real acceptance is claimed yet. Final human listening/review remains a distinct gate.

### P1 execution record

2026-10-02: Shared native/browser media formats, typed still/audio observation, static-duration planning, image revision/preservation and sfx routing connected. Actual odd-size transparent photo + video + 44.1k independent voice/music passed Host extraction, protected language revision, Preview/Master encoding/QC and reopen with a controlled provider. JPEG EXIF, PNG/WebP alpha, exclusive output and animated-image rejection passed Worker tests. Expected photo freezes are bounded to Host-declared static intervals rather than disabling freeze QC. Scoped regression is in progress; production-model browser/Electron and human review remain P5.

Resource research audited 40 distinct OpenGameArt CC0 tracks and 80 Kenney CC0 sounds by GET, decode and SHA256; work files stay outside Git. Kenney supports exact compressed-member HTTP Range, avoiding whole-pack local storage. Subjective use tags require curated review; unmeasured BPM, loop points and vocal status are not invented.

P1 required Stage3 suite passed (including controlled native Desktop journey). Contracts/typecheck/architecture and Worker lint/typecheck passed. Scope Evidence refresh does not advance unrelated packages or human acceptance. Per-package commit follows docs:complete/sync/check.
