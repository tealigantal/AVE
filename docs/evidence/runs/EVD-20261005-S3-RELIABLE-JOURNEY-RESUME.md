---
evidence_id: EVD-20261005-S3-RELIABLE-JOURNEY-RESUME
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-05
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 3294b0d8749f62efae084807a81e8fa0b44c016a92466886d4e846e0c7df0886
scope_fingerprint: df6206c5118021492dd21a5b6c0f3a40a51446ffbe98bde899e536b21cd27056
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# P3 current entry validation and independent mixed-media acceptance

This record continues the user's authorized P3 acceptance. It does not replace historical Evidence, user-owned P1/P2 acceptance, Stage Exit or Release. Colors remain unchanged; the existing P4 plan retains Apple simplicity and uses Jianying only for interactions and layout.

## Current implementation and engineering evidence

The current build adds local, field-specific entry validation for a nonempty request, explicitly selected material, provider/model, unexpired authorization and the data categories needed by the automatic chain. Imported material is not automatically authorized. Missing input expands and focuses the relevant controls without generating a persistent issue. Audio analysis requires transcript authorization; profile use requires the corresponding consent. Saved manual drafts explicitly state that playable output still needs production. First render QC failure exposes explicit retry. Required assertions retain genuine failures and consent boundaries.

Ten relevant engineering groups exited 0 in the preceding implementation run: typecheck, contracts:check, web:host:test, renderer:workbench:test, stage2-workspace-renderer:test, stage3:desktop-workspace:test, and Stage3 precision/render/learning/soundtrack tests. These controlled fixtures do not establish real editorial or listening acceptance. The exact retained log hashes and observed exit codes are in [resume ledger](../assets/reliable-journey/p3-20261005-resume-ledger.json). Earlier failing attempts remain retained.

This resumed run verified source/output/running-image provenance, build input 71b049b6f1b4d285f7309d331d1f85d93be728d4dfcc12480216a94c349d10f8. All AVE named volume identities and bind destinations/access modes remained intact; unrelated container identities remained identical. Literal bind-source comparison initially failed because Docker Desktop used C:/... and /run/desktop/mnt/host/c/... for the same folders. The ledger documents the narrow drive-alias normalization and exact remaining comparisons. No unrelated container, volume or user project was changed.

The earlier fixture allowed-path addition had accidentally targeted WP-S3-INTEGRATION-001. This resumed run removed it there and added tests/fixtures/stage3/electron-review.ts specifically to P3, then ran docs:start and generated synchronization. No implementation source was changed during this resumed UI run.

## Actual public UI observations

Only agent-created project P3独立验收-20261005-续验-189d976e, id 47c3f68b-aa03-4ab5-9e49-af86c88e0706, was submitted to the configured model. The existing project with nine private sources was preserved and not submitted.

After the user manually enabled the Edge ChatGPT extension's file-URL access, the browser reconnected as instance 4 and the public file chooser successfully imported moving-a.mp4, moving-b.mp4 and own-sky.png, 3/3 complete. These are self-owned synthetic fixtures under p3-20261005-inputs. Clicking the empty entry showed three local instructions (request, material selection, required categories), focused the request and opened no problem modal. Explicitly selected three assets and six data categories, then confirmed the actual ave-split/creation-v1 authorization. During generation an unsent Chinese correction remained editable and reached the confirmed saved state; [generation screenshot](../assets/reliable-journey/p3-20261005-ui-generating.png).

The first mixed-media generation failed before any draft committed, MODEL_OUTPUT_INVALID / CREATION_REFRAME_UNSUPPORTED. A second explicit continuation requesting native horizontal framing and reframe:null also failed, leaving v0, all material and confirmed input intact; [failure screenshot](../assets/reliable-journey/p3-20261005-ui-mixed-canvas-failure.png). Subsequent ffprobe verification found both videos are 96x64 while the image is 320x180. The operator had initially assumed the video fixture dimensions matched the image; that assumption was wrong and the second correction was therefore unsuitable.

Code-level cause: project-host.ts editorialExecutionRenderProfile requires explicit portrait framing on every picture when source dimensions differ, or when static_reframe is used. It then selects 1080x1920. Native preservation of these differently sized sources cannot pass this route. stage3-creative.ts advertises per-source static reframe modes, while the cross-shot all-picture requirement is enforced only at simulated-plan preflight. The UI describes an incompatible framing scheme without explaining the differing sizes, uniform portrait requirement or concrete recovery. Initial filesystem inspection preceded the finalized diagnostic objects. Subsequent read-only extraction from this test project's production-failure objects confirms that BOTH failed model outputs used reframe:null on every shot, and the actual cause was "each mixed-canvas picture requires explicit portrait framing". This is a Host mixed-canvas limitation, not evidence that the model ignored the user's correction. The concise extracted proof is [framing failures](../assets/reliable-journey/p3-20261005-framing-failures.json); full model/media payloads are not copied into this record.

The explicit third revision requesting uniform 9:16 contain framing for every video/image generated v1 with three shots (3s, 3s, 2s), editorial caption and both Preview/Master QC passed. The public player decoded 1080x1920, readyState 4, error null, played through to 8 seconds/end; [v1 screenshot](../assets/reliable-journey/p3-20261005-ui-v1.png). Audible listening is not claimed. This cannot retroactively make native mixed-canvas support accepted.

Public precision extended the last image to 3 seconds while explicitly protecting the first two shots and caption, committing v2. A read-only comparison of immutable snapshots proves both protected full clip structures and captions unchanged; [timeline assertion](../assets/reliable-journey/p3-20261005-protected-timeline.json). The saved-but-not-yet-rendered message appeared. The sidebar was still closed: early automation clicks had targeted the inert offscreen render button and did nothing. After explicitly opening Version History, the real render action entered pending state and completed dual QC. This targeting mistake is not claimed as a rendering failure; the indirect post-save next-step remains an interaction finding for P4.

Actual v2/v1 comparison decoded separate 9-second and 8-second players. Adopting v2 left the current v1 player intact. Public undo created v3 restoring v1, and redo created v4 restoring v2, both watchable with dual QC. Immutable full tracks compare equal for v3/v1 and v4/v2; [undo/redo assertion](../assets/reliable-journey/p3-20261005-undo-redo.json). Switching to v4 explicitly then displayed a 9-second player, while adopted v2 remained separately marked.

While current editing had reached v4, the public export panel explicitly selected and wrote v1. Host export 23acf587-86db-4132-a19a-7935fda3a245.mp4 is 1,082,429 bytes, SHA256 80b8ed7ef66593f2afa50c520f1474ff717557b2666a5cc4be4cd9d54fece52d, exactly the recorded v1 Master hash. ffprobe reports 8.000000 seconds, H.264 1080x1920 and AAC 48kHz stereo. Full ffmpeg decode exited 0. A copy is retained as [actual v1 Master](../assets/reliable-journey/p3-20261005-v1-master.mp4). No music resource was selected; attribution sidecars and genuine music listening are not accepted by this no-music case.

The browser download confirmation was clicked, but the download event timed out and reset the automation session. Reconnection found the truthful page status "download started; system save not confirmed". Downloads contains AVE-v1 (2).mp4.crdownload with the same complete byte length and SHA256 as the Master, but it has not become a finalized .mp4 at the last check. No rename, download protection bypass, duplicate download or claim of browser-save completion was made. Existing October 2/4 downloads were not overwritten.

After successful generation, precision, undo/redo and export, Problem History still showed the original unresolved MODEL_OUTPUT_INVALID issue, count 2, latest timestamp 14:19:15, well beyond 30 seconds and across unrelated success. The unresolved record was preserved. Confirmed unsent Chinese input and four versions were checked through browser refresh; final observations are retained in the current ledger.

## Remaining gates

P3 is blocked: the ordinary mixed-size first-cut path failed, and the complete public precision/protection/version/export/audio/learning/fault journey has not yet been accepted. Global docs:check also exits 1 on historical capability Evidence applicability mismatches (p3-20261005-docs-check-resume01.log). Historical fingerprints have not been edited to claim current validation. No docs:complete, P4 start, commit, push, merge or release has been performed.

Final docs:sync exited 0; final docs:check exited 1 on 28 other historical capability applicability entries. CAP-S3-RELIABLE-JOURNEY-001 and the latest Stage3 Evidence/source binding are no longer among the final errors after attaching this current-scoped record. Logs: p3-20261005-docs-sync-resume-final.log and p3-20261005-docs-check-resume-final.log. Scoped git diff --check exited 0. The formal P3 package is marked blocked, current Evidence attached and active Debt updated; no completion promotion was attempted.

The existing DOC-007 and WORKSPACE_DESIGN.md contain the integrated P4 priorities and bounded Jianying observation. Mixed-canvas execution and actionable failure recovery remain functional findings, not a claim that cosmetic P4 changes will fix them.
