---
evidence_id: EVD-20260924-S3-OBSERVATION-PRECHECK
date: 2026-09-24
code_fingerprint: 886bcaedb39445e36268279b8e47c1a7b024a2a334e540fb03f0850b5a6c732e
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: focused_observation_generation_pass_full_gates_pending
---
# Actual source observations bound to generation

WP-S3-INTEGRATION-001 remains active and Stage3 remains specified. Root was the
sole writer; two read-only reviewers retained inherited GPT-6 High. This is
engineering validation of actual local media/storage/Worker execution with
controlled HTTP responses, not real-model or subjective creation acceptance.

media.scene_scan.v1 returns decoded frame PTS/durations, pixel-change scores and
candidate source spans in their native timebase. It does not choose a narrative
or assert full semantic coverage. Host holds authorized prepared sources, extracts
actual PNG/WAV samples and validates exact descriptors, intervals and bytes before
creating the ticket bound to the full input. Observation responses cover exact
sample IDs; frame descriptions cannot include transcriptions. ModelRun, samples,
derived Evidence, receipt and request completion publish in one owned transaction.
No draft, Timeline or adopted/watched pointer changes during observation.

The creation object journal records new object files before writing them and
cleans only newly written unreferenced files after confirmed SQLite rollback.
Commit acknowledgement errors preserve committed objects; cancellation and Worker
or cleanup faults preserve separate original causes. Historical observation reads
bind actual objects/files, original input/output, audit/ledger and source grants
without demanding that the historical request remain active or at its old revision.

The single current generation input uses observation_refs, and plan source ranges
use span_id. Duplicate spans fail before ticket/reservation/send. Exact saved
model input/output bind the receipt list and plan; swapping another valid receipt
for the same source span fails before any render Worker starts. Editable ranges
remain separate from measured visual/audio/transcript coverage. Verbatim captions
must match the exact nonuncertain transcript and its source-time mapping into the
actual audible embedded or independent sound clip. Explicit anchors preserve
cross-track J-cuts and captions; editorial text has no dialogue anchor.

Passed on Windows: stage3:check; refreshed stage3:render:test; typecheck (72
contracts); architecture (313 source files); worker:python:lint and
worker:python:typecheck (28 files); git diff --check. The final portability
refinement to the sampling test passed stage3:sampling:test separately afterwards.
Observation tests use actual unequal black/white spans and real PNG/WAV bytes,
actual FFmpeg and SQLite; their Qwen-compatible HTTP responses are local fixtures.
They exercise descriptor/time/geometry rebinding, source/permission failures with
zero reservations or sends, exact response IDs, rejection of visual transcription,
mid-publication SQL failure, post-rename failure, no orphan objects, late response
cancellation, combined Worker/cancel root causes, audit tampering and reopen.
Generation tests add duplicate receipt zero-send rejection, old-interface rejection,
and valid-receipt substitution with zero Worker dispatch. Render tests produce
both actual encoded outputs and independent QC, retaining historical versions.

Original failures remain in the [ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md):
undefined ticket from external schema fragment codegen; Host directory capture;
transition-proof error priority; negative-test error-code matching; runtime export
of a type; missing standalone plan validator export; and an initial VFR expectation
of seven decoded frames versus six. Independent demux/decode reproduction found
the seventh encoded packet flagged discard by the MP4 edit list, with zero final
stts duration. Default decoded PTS were 2000,2100,2400,2700,3200,3800, ending at
3900; a diagnostic edit-list override exposed the tail. Production demux options
were not changed. The final test independently verifies all seven encoded packet
PTS, explicit discard flags, every default decoded PTS and actual tail duration,
then checks scan coverage. Its one-access-unit-per-packet assumption is specific
to this encoded fixture. Non-unit 1001/30000 AVI scanning is also checked.

Read-only review found and fixed unbound sample metadata, Worker errors hidden by
cancellation, and valid-receipt substitution. Review of the final code found no
remaining blocking defect in this batch. Fixes preceded reruns, original failures
were retained, and no checker was bypassed or production fallback introduced.

Current full repository gates remain pending. Trusted historical-learning model
extraction, recoverable profile registration, desktop single-version integration,
held-out exception/forgetting effects and actual-model workbench artifacts remain
unfinished. Approved history/reference plus two independent source sets, learning
scope/retention, exact design original, provider/model/data permissions and bounded
fees/counting are still missing. No private data, real model call, film/recording,
source commit/push/PR, package completion, merge or release is claimed. These scope
bindings refresh regression applicability only and do not promote acceptance.

- CAP-RENDER-001; scope_fingerprint: b82e90107abbf6a46ff24cbd872f3c3eac2088544b6eed71ed037f0b80210a04
- CAP-PRESET-001; scope_fingerprint: dae54180ea25c2e2ff61d403354d6426882dfaac95d84ec22273916613fdd954
- CAP-FND-001; scope_fingerprint: c5b2c58637d1ecc0f2964b82f071c4a54d1f844450012c37a97797f752a24621
- CAP-CA-GOV-001; scope_fingerprint: 40857a0a6a1095438d882001c139eaac8ccfa67b271f918641c1e7e87b63c5aa
- CAP-CA-CONTEXT-001; scope_fingerprint: 1e4bbd40db421d1b15187bb5090c148b291605bd7f7bdf90ab6a0aca1a97a926
- CAP-CA-SKILL-001; scope_fingerprint: 46ceb796e74c32ec30dedc08355481052fd988b285506082e5c6a1b93dd62f05
- CAP-CA-DURATION-001; scope_fingerprint: 638f1218216cfbae7da19f2c2b1580635e679c842657b804e805618e1b0f87e9
- CAP-CA-STORY-001; scope_fingerprint: 883f603cc31ff6965400500dda079a846960557ae0dbc3dac7dc7806e8cabe67
- CAP-CA-PERMISSION-001; scope_fingerprint: 15b2bcbafb415a4eb0321f3101e834501531cd4093a82e7c164ae551edd1fa69
- CAP-CA-PIPELINE-001; scope_fingerprint: 2a1141bcccca09e5f2c6daa81b417fcffb0d3185b54006c91c54afd4e731d9cc
- CAP-CA-FEEDBACK-001; scope_fingerprint: 35abe225ee50100de3d6c0cee96c5788456f3b0591f4b3025899c295387b1a90
- CAP-CA-PRODUCT-001; scope_fingerprint: f8b05ccc0159f59297223fa1e307da8403e5862e3cb3091921f426d69b699db1
- CAP-CA-PRODUCT-002; scope_fingerprint: d1abd859f579876bd20c86aea9c0477ebeb4b83b1745929df388867821c9a2b0
- CAP-CA-UX-001; scope_fingerprint: a3e6dff0a9dddd48ef6833f35add659d7c744a3f2d4078403bef50d0714009d2
- CAP-CA-EXIT-001; scope_fingerprint: bf816b5e048a7ccf753b96a6f77dbeeedaa2a310b2aed023995a3281f2235dc4
- CAP-CA-GOV-003; scope_fingerprint: 33eb92acf8555b0865735744f099ac09feeb683e02fa73a802e63419940eb49d
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 12c2e7e0efbe07baa7cb09ed48031fdfb5357ff62bf3733c791ee354a25c3fc9
- CAP-CA-RECON-001; scope_fingerprint: d3f9bf4d015778da8450ca4e4cb29517ca9369861c22c867efdc1a898ba3d55b
