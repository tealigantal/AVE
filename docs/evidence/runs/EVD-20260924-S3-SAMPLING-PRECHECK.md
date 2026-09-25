---
evidence_id: EVD-20260924-S3-SAMPLING-PRECHECK
date: 2026-09-24
code_fingerprint: 8217d6d39b53ed239c6e2af2865656bbe42f516d60004ec295c394efbcdea169
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: focused_sampling_and_multimodal_transport_pass_full_gates_pending
---
# Actual source sampling and bounded media transport

WP-S3-INTEGRATION-001 and its [ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md) remain active. Root alone wrote source. Both existing reviewers retained inherited settings and performed read-only review. No package, candidate or real checkpoint is completed.

The Worker now extracts actual source-bound PNG frames and PCM16 WAV ranges. Exact decoded PTS, timebase, frame index, source/sample hash and sample geometry accompany each result. Sparse frames prove only the reported display interval; they do not prove complete scene coverage or dialogue. Audio checks original timestamp alignment before timebase conversion and decoded continuous sample counts afterwards. Unrepresentable source times and unspecified HDR conversion fail explicitly. Exclusive output creation does not overwrite existing files; failure/cancellation removes this batch's outputs. Combined operation and cleanup failures retain each concrete reason and traceback through the Worker protocol.

ModelInput has one current context/media envelope, with Host and existing callers migrated. Host derives frames/audio permission from actual attachments. Explicit media blocks, exact-model/media counting, serialized byte limits, token bounds, wire digest and HTTP body share the same prepared input. Qwen audio uses Data URLs; unsupported audio transports fail before dispatch. Counter/model declarations in tests are fixtures, not provider billing evidence. Official format references consulted: [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html#select_002c-aselect) and [Qwen audio](https://help.aliyun.com/en/model-studio/qwen-omni).

Passed on Windows: pnpm run stage3:check (including new stage3:sampling:test), typecheck (68 contracts), architecture (311 sources), worker:python:lint, worker:python:typecheck (27 files), worker:media:test, worker:analysis:test, platform:foundation:test and model-gateway:test. Sampling uses real encoded nonzero-PTS VFR video, 1001/30000 AVI, PCM WAV and off-grid 44100 Hz MKV. It asserts exact samples, missing/partial coverage, source and byte-budget failure, post-write rollback, collision preservation, cancellation after an actual sample, combined unlink/workspace faults, real PNG/WAV wire identity, unsupported counting/provider rejection and zero Host call reservations/sends without media permission. The actual media bytes are local synthetic fixtures; HTTP only captures input and supplies controlled responses. No real model call or private media upload occurred.

Original failures retained: duplicate adapter local content declaration; standalone validator export registration missing; new negative test initially expected submit rejection instead of inspecting explicit Worker status; validated-result type narrowing; Ruff BaseExceptionGroup builtin import and Mypy list annotation. These code/test-caller corrections preceded reruns. Read-only review additionally found and fixed lost exception-group leaf errors, audio timebase quantization before original-source validation, and Qwen bare-base64 format. Both reviewers found no remaining blocking defect after fixes. No assertion/checker was weakened, and no provider fallback was introduced.

Full current repository gates remain pending. Host observation/receipt/Evidence atomic publication, authorized learning/correction, approved workbench and held-out real-project use remain unfinished. Real materials, learning scope, exact design original, provider/data permissions and fee budget remain unanswered. No film/recording, source commit/push, PR, merge or release is claimed. The following bindings refresh regression applicability only; prior acceptance bounds and Stage3 specified status remain unchanged.

- CAP-RENDER-001; scope_fingerprint: 372777e3b5497d6dee1c2e8d66e1e4081f2a2aa45e755da86ef38fdeda47bf67
- CAP-PRESET-001; scope_fingerprint: 8b75c82e1d76358c0659888c4d8712929c3c42499c0e01dfe3b670f76e3bce34
- CAP-FND-001; scope_fingerprint: 9e1149b9cd175ea51515c5f721801d42b9e84d841185e7216900dd826be19227
- CAP-CA-GOV-001; scope_fingerprint: 12589c884fbc555ce6e6cb2e3f4c92c13ab3bb399e11562bcdc7f8bb07610e10
- CAP-CA-CONTEXT-001; scope_fingerprint: b53e665f5d082f70fc41ed69b7cab51e873526f9105da756bcc83387f5b12214
- CAP-CA-SKILL-001; scope_fingerprint: 69990e0b196352f6747a0ada38fd252771dfe8da0de435aaa84b4857c5823805
- CAP-CA-DURATION-001; scope_fingerprint: 3dd084fcfb9dc5090693bdadd335fd7c97c71fa790c7c4dcc602560b98b3f7e8
- CAP-CA-STORY-001; scope_fingerprint: e82fb82741890fd1e7f1e6a1b212b2ef9c0b8fd35d4543d2ca443c256c4190a0
- CAP-CA-PERMISSION-001; scope_fingerprint: 95283dc3079f0ec324ac139c37416bdd83578130b0a012ae143bac756dcc35a3
- CAP-CA-PIPELINE-001; scope_fingerprint: fdd5e30b3809fadb07bff8b355a87d3d5e611478d20be770da3d3d1ef72a99dd
- CAP-CA-FEEDBACK-001; scope_fingerprint: 41c7eac3051260af8b741d20d16ac8a92eed35a58e6a0e3a393773010a766495
- CAP-CA-PRODUCT-001; scope_fingerprint: 19afba50f13842a997e01429cbd9bbbb244e6a97a01280c3eb205155b7c6116d
- CAP-CA-PRODUCT-002; scope_fingerprint: bdb22769872057541fa7f7227d226db53b57e1e4ea5596b5cbabe4872b71bc8d
- CAP-CA-UX-001; scope_fingerprint: 876269558e09c4ed0e786d5394c0afa979660c703c8e4ab47c3ea6eeddcce393
- CAP-CA-EXIT-001; scope_fingerprint: e013e1b505e67e89336f1d7e41961555637e8be9d4acf0d1f8db1768edb59fec
- CAP-CA-SEC-001; scope_fingerprint: 0be18d693b23958b736c96a84990cb1de5489c77a159c56a8d7550bc570d4a98
