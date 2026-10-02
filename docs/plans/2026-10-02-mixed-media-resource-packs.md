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

Sources checked during planning: ChatCut library and music/SFX docs (chatcut.io/docs/library, chatcut.io/docs/music-and-sound-effects); Kdenlive online resources; OpenGameArt per-item attachments; Kenney CC0 support/assets; ccMixter public query API. OGA with-me-0 exact with_me_3.mp3 GET works; ccMixter metadata works but actual GET returned 403 here. Freesound/Jamendo free API commercial restrictions exclude them as required providers; Pixabay has no verified public audio API; FreePD is closed. Catalog license and actual decode must be verified item by item. Work downloads stay outside the repository; no complete library audio in Git. Two small CC0 wire fixtures are retained solely for reproducible downloader/Host tests.

## Progress

- [x] User approved complete plan, commit/push and Draft PR; scope choices fixed.
- [x] Refreshed remote main, confirmed PR29 merged, created clean implementation branch.
- [x] P1 mixed media engineering integration; EVD-20261002-S3-MEDIA-P1.
- [x] P2 catalog and remote resource product entry; EVD-20261002-S3-AUDIO-PACK-P2.
- [x] P3 automatic soundtrack engineering integration; EVD-20261002-S3-SOUNDTRACK-P3.
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

### P2 execution record (in progress)

2026-10-02: Fixed metadata-only 40-music/80-SFX pack, explicit manual request scope and exact resource material receipts integrated. Host enforces reviewed catalog digest, original-site HTTPS, bounded response/range/length/encoding/hash, real stream probe, cancellation, exclusive output cleanup and a 64 MiB audition-only cache. Selected content uses existing project originals and immutable material preparation; it is reused before cache/network. Renderer exposes category/use/search, measured waveform, source/license, bounded audition, add/replace and cache cleanup through Host APIs. Two CC0 encoded test fixtures (not a distributed library) reproduce exact downloaded bytes and compressed member response; other research work remains outside Git.

Actual tests passed music+SFX atomic drafts, audition without registration, duplicate reuse, cache cleanup, offline audition, offline reopen and Preview/Master QC. A read-only review found lifecycle, offline priority, failed writes, propagated cancellation and finite duration checks; all were corrected. Five replacement SFX waveforms were recomputed at the declared 8000Hz analysis rate. Container vs decoded start discrepancy (Vorbis 128-sample priming) is handled by the measured interval intersection. Full library strict decoded-PTS/Worker sample audit is running; malformed OGG gaps fail explicitly and require reviewed catalog replacements, never timestamp invention. An initial full-network audit timed out after seven resources with the 45-second bound; reason/log preserved, bound raised to 180 seconds for large original-site files. Package is not complete while this audit/regression remains.

P2 Electron regression found the compiled application omitted the new metadata resource directory and failed before startup. The approved delivery scope now explicitly includes the existing Docker build and Electron runtime fixture; they copy resources/audio alongside existing packages, with no new build system. Library display length is labeled display_length_seconds and is never authoritative source or Timeline time.


P2 final catalog: 40 music / 80 SFX / 120 independent content hashes, pack digest 4cb5e9360787b6e644cfde679d159e5ec36e27badecb49aeb4a83fa3a15273ac. Six music uses contain warm 8, quiet 17, daily 10, upbeat 12, city 15, travel 9 candidates. Nine broken-PTS OGG tracks and fifteen broken/unusable sound members were excluded; ten large original tracks were replaced with verified smaller alternatives to keep on-demand retrieval practical. Elevator Music 2 retains its actual completed strict proof. Two later-completed removed originals were not called failures; eight unfinished removed downloads are recorded as cancelled/unmeasured. The old running report's dynamic pack_digest was invalid and is never used as whole-catalog proof. Final audit joins each exact ID/hash to complete decoded PTS and actual unchanged Worker audition receipts, pinned to the final catalog digest in resources/audio/*.audit.json. All 120 final sources passed those checks; no timestamps were repaired.

P2 independent review corrections: cancel now waits for actual operation drain before clear/new audition; applying a lost-response retry reconstructs deterministic commands from the explicitly selected historical Timeline, then returns the existing atomic manual receipt. A retry creates no new version. Resource material stores its full source/license snapshot with metadata_digest so project provenance survives catalog updates. Required scoped regression is being rerun after these fixes; no human or production-model acceptance is inferred.

P2 required final Stage3 regression, contracts (81), typecheck and architecture all passed. Package engineering checkpoint complete; full production-model product journeys remain P5.


### P3 execution record (in progress)

2026-10-02: Automatic pack scope and <=12 metadata candidates now feed Call1 resource IDs, existing-material evidence and reasons. A narrow Host callback after the first settled measurement fetches only selected resources, prepares immutable material, captures actual probe and encoded audition, and stores measured object receipts. Call2 is reconstructed from the immutable root plus those receipts, with an expanded audio schema even for photo-only works; unselected candidates are removed. Receipt identity participates in the measured-query digest. Storage validates actual receipt/material/probe/sample objects at model-result registration and reopen. The compiler has a separate Host-verified decoded audio coverage branch rather than invented listening observations. The fixed 64 Skill source/catalog bytes remain unchanged; only typed routing admits explicitly enabled library capability. Existing model total timeout still includes both calls and the intermediate resource phase; no timeout is suppressed.

Initial controlled test exposed zero-valued base Timeline/authorization generations (valid existing state) and putObjectAndRegister's actual returned hash field. Those boundaries were corrected, not defaulted. Typecheck passed before the latest focused run; product entry, failure cases, export attribution and complete P3 verification remain in progress.

P3 independent review found protected retained-resource identity, manual replacement provenance, muted-music success and catalog-dependent historical workspace defects. Actual receipt reuse now binds span and clip asset; manual add/replace records the same actual probe/sample proof with origin=manual. New request UI explicitly authorizes automatic scope; final no-music/audible-music policies are checked. Export preserves used-only source/CC BY notices in sidecars with exclusive write and rollback. A missed browser upload extension list was changed to the existing shared format declaration. Controlled photo+music dual encode/reopen and manual-gain then protected AI continuation passed; strict schema generation and storage recursion failures were corrected and retained in test logs. Full Stage3 regression is in progress.

P3 final corrections (2026-10-03): manual resource evidence now resolves the selected parent's historical model lineage, never the newest unrelated model run. Exact apply retry retains its immutable pre-commit cancellation binding only after validating the existing manual execution receipt. Full Stage3 execution passed all preceding suites through product-loop/catalog, then exposed manual provenance and replay generation defects; those were fixed and the focused audio-pack suite passed. Soundtrack, planning/Skill policies, 82-contract check, typecheck and architecture passed on the corrected source. Final full check remains P5.
