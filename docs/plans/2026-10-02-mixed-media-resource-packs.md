# AVE mixed media and audio resource packs

Authority: living ExecPlan under PLANS.md, linked by the Stage3 manifest. Existing product, architecture and programme authorities retain ownership; this records the user-authorized five-package implementation and its evidence.

## Purpose / Big Picture

Enable video, JPEG/PNG/WebP and independent audio in one reversible work, a remotely fetched CC0/CC BY library (40 unique music tracks, 80 unique sounds), two-call automatic soundtrack planning, basic precision editing, and one Draft PR to main. Keep Host authority, exact RationalTime, current Command/Commit/render chain, visual baseline and the 64 immutable Skill definitions.

## Context and Orientation

Baseline: origin/main 145856f49b9bd2e0d08610a45156247e712ada4a contains merged PR29. Original checkout was clean. Implementation branch: codex/mixed-media-resource-packs. At this baseline Stage3 had no active package; historical direct-human acceptance debt remains open. Image Timeline/render and independent audio paths existed, but observation required video; import choosers omitted images and manual UI exposed three operations.

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
- [x] P4 precision editing.
- [x] P5 licensed real Browser/Electron journeys, independent code review and full local engineering verification.
- [ ] P5 final documentation publication, Draft PR attachment and exact final-head remote CI.

## Surprises & Discoveries

- Existing trim_source assigns source PTS difference directly to Timeline duration; manual adapter must perform exact conversion.
- Existing ripple_delete shifts only one track; work-level atomic interval adapter is required.
- Kenney distribution may use ZIP packs; per-item remote access must be verified before catalog publication.

## Decision Log

- 2026-10-02: Retain existing programme/architecture and fixed Skills. Catalog is data, no executable resource scripts. Original sites, no self-hosted CDN. CC0 and CC BY only; exact used sources retained locally for reproducibility, whole library stays remote.
- 2026-10-02: Mixed projects only; no audio-only work export, arbitrary crop, tracking or advanced anchor semantics. Historic requests have no implicit library grant.

## Outcomes & Retrospective

P1–P4 engineering integration and both actual P5 public-source production-model journeys passed. Full repository check7 and final synthetic4 passed; late Browser HTTP shutdown cleanup also passed focused type/HTTP and the real Browser reopen/offline journey. Final programme publication, Draft PR and exact final-head remote CI remain pending. Final human aesthetic/listening review remains a distinct gate.

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

2026-10-02: Automatic pack scope and <=12 metadata candidates now feed Call1 resource IDs, existing-material evidence and reasons. A narrow Host callback after the first settled measurement fetches only selected resources, prepares immutable material, captures actual probe and encoded audition, and stores measured object receipts. Call2 is reconstructed from the immutable root plus those receipts, with an expanded audio schema even for photo-only works; unselected candidates are removed. Receipt identity participates in the measured-query digest. Storage validates actual receipt/material/probe/sample objects at model-result registration and reopen. The compiler has a separate Host-verified decoded audio coverage branch rather than invented listening observations. The fixed 64 Skill definition source and catalog-data bytes remain unchanged; the catalog.ts routing adapter admits explicitly enabled library capability without changing any definition or digest. Existing model total timeout still includes both calls and the intermediate resource phase; no timeout is suppressed.

Initial controlled test exposed zero-valued base Timeline/authorization generations (valid existing state) and putObjectAndRegister's actual returned hash field. Those boundaries were corrected, not defaulted. Typecheck passed before the latest focused run; product entry, failure cases, export attribution and complete P3 verification remain in progress.

P3 independent review found protected retained-resource identity, manual replacement provenance, muted-music success and catalog-dependent historical workspace defects. Actual receipt reuse now binds span and clip asset; manual add/replace records the same actual probe/sample proof with origin=manual. New request UI explicitly authorizes automatic scope; final no-music/audible-music policies are checked. Export preserves used-only source/CC BY notices in sidecars with exclusive write and rollback. A missed browser upload extension list was changed to the existing shared format declaration. Controlled photo+music dual encode/reopen and manual-gain then protected AI continuation passed; strict schema generation and storage recursion failures were corrected and retained in test logs. Full Stage3 regression is in progress.

P3 final corrections (2026-10-03): manual resource evidence now resolves the selected parent's historical model lineage, never the newest unrelated model run. Exact apply retry retains its immutable pre-commit cancellation binding only after validating the existing manual execution receipt. Full Stage3 execution passed all preceding suites through product-loop/catalog, then exposed manual provenance and replay generation defects; those were fixed and the focused audio-pack suite passed. Soundtrack, planning/Skill policies, 82-contract check, typecheck and architecture passed on the corrected source. Final full check remains P5.

### P4 execution record (in progress)

2026-10-03: Added a contract-owned typed precision operation and Host adapter into the existing atomic manual Command/IR/Commit path. Product controls cover the named timeline, picture/audio/caption actions, source selection, waveform selection, gain/fades/repeat, audio-only solo, ducking and association. Actual held source probes and strict decoded-frame receipts certify sample/frame boundaries; image duration remains display time. Work-level ripple clips continuous music across the removed interval and shifts captions/gaps. The renderer sends typed intent rather than constructing the new commands. Existing lightweight manual form now uses the same typed boundary.

Read-only review found empty fades, old verbatim declarations, post-split associations, short/offset audio trim, gaps, routing-ID churn, muted-track solo, source replacement quotes, detached fades, speed mapping and concurrent registry drain defects. Those roots were corrected or explicitly rejected at the basic boundary; no hidden time rounding or successful partial edit is allowed. Manual static rotation has an explicit compatible plan branch so language continuation can retain its exact fields; fixed Skill data remain unchanged. Typecheck passes before the latest additions. Property, actual Host/render, UI and final regression are still pending; P4 is not complete.


P4 actual Host regression (2026-10-03): all named typed actions passed real source holds, atomic storage, protected rejection and undo/redo. Manual picture rotation, music gain and a cross-picture author caption survived AI continuation; Preview/Master actual encoding/QC and normal reopen passed with a controlled provider. Parent execution's measured render profile is retained, avoiding canvas drift. Authors' edited captions are editorial rather than invented transcripts; an explicit retention branch validates exact existing text/time. Frame scans reuse validated observation receipts with the actual ticket identity. Read-only review found five additional ripple/automation/route/solo/gap roots and copied grade identities; all corrected, with regression for exact ranges and unrelated protection. Black-frame QC stayed enabled: the too-small/dark transformed image fixture was replaced with a suitably exposed, correctly sized real encoded fixture, rather than relaxing the assertion. Full Stage3 suite and final package documentation checks remain in progress.


P4 final boundary audit: ordinary deletion/move/trim holes now persist as explicit gaps, with interval-bound black/static/silence QC. A compatible retain_manual_layout measurement keeps exact source identity, positions and work extent during local AI continuation; two planner calls remain unchanged. Actual deletion of a 3s photo/voice section, gap render, AI continuation and dual QC passed. Native fractions retain their old source representation. Protection cannot be removed through revision; the test performs ordinary deletion before protecting the photo, preserving the existing authorization state machine.

P4 engineering checkpoint complete: full Stage3 including actual Host/dual-QC/gap continuation, 83 contracts, typecheck, architecture and Worker lint/types passed; immutable EVD-20261003-S3-PRECISION-P4 records exact source bindings. Production-model browser/Electron verification remains P5.


### P5 execution record (in progress)

2026-10-03: P4 committed as 16d181c; P5 is the sole active package. Isolated browser and Electron real journeys use licensed NPS/USGS sources, actual Qwen vision/planner, local Whisper and YAMNet. Full files, source rights, model receipts, recordings and failure snapshots stay outside Git; reviewed UI screenshots and short recordings are authorized under docs/evidence/assets/mixed-media-p5. No private model configuration or full audio library is committed.

First browser run exposed a compiled-wire fixture omission; second/third exposed a real redirected Windows path boundary defect before the browser entry loaded. Root and target now both use canonical paths while lexical and origin/session/CSRF checks remain enforced. The first Electron run selected Champ de tournesol; its real MP3 has embedded MJPEG album art. Temporal classification now excludes only ffprobe's explicit attached_pic disposition, preserving actual audio samples and strict video validation. The original failed response, file identity, planning receipt and project failure object remain intact. Cover-art property regression, 83 contracts, typecheck, architecture and browser origin/session/private-path tests passed; both complete real journeys are running again. P5 completion, full repository verification and human acceptance are still pending.


P5 follow-up: Whole-repository checks caught eager Renderer window access and legacy Timeline-without-sequence QC; the actual waveform query is now loaded only at interaction, and legacy QC uses the existing RenderGraph clock rule. Both focused regressions passed. Independent review caught solo/association state lost on replacement and a remaining storage album-art predicate; actual Host replace-during-solo, restore, offline reopen and dual QC now pass. The controlled optional flag restore uses explicit false semantics without undefined Command values. Real model invalid returns remain failed: insufficient chosen capacity and omitted exchange_version. Version-pinned planning guidance fixes those exact input omissions without a third call, prompt retry or mutable historical proof. Unmarked historical v3 input/schema is preserved. Full and real checks are rerunning.

P5 identity checkpoint: real music named audio-music collided with the Host track. Deterministic physical ID allocation now preserves original semantic names/planning audit and all associations/anchors. Property and actual Host protected continuation/manual/offline reopen passed. Browser evaluator reads persisted render objects. The obsolete Renderer manual-route assertion now checks the typed precision boundary. Full and real final checks remain pending; failed attempts remain preserved.

P5 fade checkpoint: both real initial drafts passed two-call planning, dual QC/decode/playback; lowering music exposed silence inside an intentional ending fade. QC now verifies source identity/digital zero and every overlapping nonzero contributor before interval-bound allowance. Actual PCM regression retains blocking middle/voice failures. Retained actual v1/v2 projects are normally reopened for explicit new rendering and continuation; original responses remain unchanged. Extra-track grade reuse and stale projection assertions are corrected. Full required checks and complete journeys remain pending.


P5 author/DOM checkpoint: both real surfaces now hold six rendered versions including original-site SFX and an actual music replacement. Their explicit feedback failed with preserved raw returns: author source refs incorrectly entered observation validation, and browser final included invalid decoration fields/empty author evidence. Manual retention now requires the exact existing author object; its empty prior list is legal only in the explicit manual branch. Model schema appends transcript constraints, keeping ordinary caption evidence mandatory. New v3 task guidance preserves v1/v2 historical tasks. Controlled Electron DOM regressions exercise apply after cancellation with project/request/clip changes, frozen input, hidden-panel cleanup, late preview and visible failure. The original proxy path now normalizes Path-or-string before byte probing; actual Worker media protocol passed. Complete feedback/export/offline journeys and final full verification remain pending.


P5 continuation checkpoint: native production-model v7 completed its exact two calls, retained manual photo/caption/voice/SFX and requested gain, dual QC and playback. Browser failures retained per-source color and reused-resource receipt errors; version-pinned v4 now exposes actual color availability and excludes existing resources from new selection while projecting their measured spans. A further real failure copied full 62-second music capacity into a 12-second work. Host now supplies exact committed independent-audio templates, including source range, shot-relative offset, role, gain and fades; source/time properties and actual soundtrack Host regression passed. The fixed Skill payload and old planning-extension task bytes remain unchanged. Native offline encode produced new jobs after normal close/reopen, but the harness numeric-counter evaluator failed; the current harness installs and verifies fetch denial and reads an explicit stdout sentinel before recording completion. No prior failed journey is promoted. QC actual-source fade regression passed; complete real journeys, final full checks and PR remain pending.


P5 real closeout checkpoint: browser revision6/v7 and Electron revision3/v7 production-model continuation completed their exact two physical calls, final gain -24 dB with unchanged measured music ranges and all manual photo/voice/SFX/author-caption state. Each surface completed actual thumbnail/waveform audition, playback, three exact exports, cache cleanup, normal reopen and a new random offline render operation creating four jobs, double QC/decode and zero Host fetch attempts. The isolation is a Host fetch denial, not OS network blocking. Failures and successful v1/manual/v7 histories remain intact. Browser shutdown exposed lingering HTTP/SSE requests after durable Host drain; the bounded server connection cleanup follows https://nodejs.org/api/http.html#servercloseallconnections and the incomplete-body HTTP regression passes. A discarded test close-order attempt has its own failed result, never converted to acceptance. Reviewed public screenshots/short recording, two unchanged Masters and credits are attached under docs/evidence/assets/mixed-media-p5; all source paths were resolved to their actual Windows storage identities before inspection. Main has no configured GitHub branch protection (read-only API returned Branch not protected); governance still requires exact final-head CI security/check status. Full repository and final synthetic checks, PR creation/attachment and final remote CI are still pending.

2026-10-03 final publication: P5 allowed paths explicitly include the existing contract navigation and controlled desktop workbench integration test, required by the approved cross-caller/documentation and async ownership verification scope. The 64 definition source/catalog-data files are byte-identical to main; the permitted P3 catalog.ts diff is only the typed audio-library candidate router. No fixed definition or Skill digest changed.

2026-10-03 remote CI1: security passed; Linux check correctly rejected the catalog identity before Stage2 because Git had normalized the reviewed CRLF catalog to LF (local 4cb5e936… versus Git blob abbe58ac…). Preserve the existing version, exact reviewed digest, request permissions and project history by pinning only the content-addressed pack/review assets with .gitattributes -text. P5 explicitly owns this necessary checkout boundary and exact catalog path. No permissive checksum normalization, hash rewrite, resource substitution or altered runtime is introduced. Revalidate staged/checkout byte identity and controlled pack Host behavior, then publish a fresh immutable Evidence and rerun remote CI.
