---
evidence_id: EVD-20260924-S3-SPLIT-SERVICES-PRECHECK
date: 2026-09-24
code_fingerprint: a6e21b719fd8cac6867d3c9939562d31dc4692423a33e2d6ab38c0fd9ee4de3c
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: targeted_engineering_pass_full_gates_pending
---
# Split model services precheck

User selected Qwen vision + Whisper transcription + independent acoustic model,
with credentials supplied later. Root registered the same WP scope before edits.
Actual JSON/SSE chat and multipart verbose-transcription transports now feed
the existing Host observation, draft and local profile paths. Every physical
send has its exact target, serialized body hash/bytes and immutable settlement.
Ordered child outputs reconstruct the fused observation at publication/reopen;
no synthetic extra provider call is added for deterministic fusion. Cancellation
waits for child audit and preserves already-known usage. Keys remain Main-only.
Setup instructions and automatically created disabled local template are present.

Passed: pnpm run stage3:model:test; pnpm run stage3:observation:test;
pnpm run stage3:desktop:test; pnpm run typecheck; pnpm run architecture.
Tests use actually encoded fixtures, actual SQLite/Host and controlled HTTP replies.
They cover wire bytes/targets, precise decimal-to-source time, empty speech,
malformed/out-of-range output, failed/cancelled calls without publication, known
SSE usage on cancellation, fusion corruption denial, planner draft and reopen.
No remote model generation or true semantic quality acceptance is claimed.

Failures retained under OS TEMP: ave-stage3-split-typecheck-first.log and
-typecheck-fixed.log (readonly route type mismatch, fixed by explicit mutable
authorization copy); -targeted-first.log (missing runtime parenthesis),
-targeted-second.log (test expected 2 content parts; actual protocol adds an
explicit sample-ID text part, fixed exact expectation), -targeted-third.log
(CREATION_MODEL_RESULT_UNRECORDED exposed missing aggregate accounting proof),
-targeted-fourth.log (storage edit parser typo), -model-regression.log
(test request lacked transcript permission, correctly denied; explicit test
consent added). Fixed runs are -targeted-fifth.log, -model-regression-fixed.log,
-typecheck-final.log, -observation-regression.log, -desktop-regression.log and
-architecture.log. Read-only review found cancellation audit race; root fixed it
and added the known-usage regression. Subsequent read-only review has no blocker.

Full check and final synthetic are pending. This applicability rebinding is for
current engineering validation only; historical acceptance is not rewritten,
capability status is not promoted, real acceptance rows remain blocked.
WP-S3-INTEGRATION-001 remains the only active package. No commit/push/PR/merge
or next checkpoint. Next: finish full gates, record final evidence, retain real
model/private-material checkpoint as pending usable user configuration.

Engineering scope bindings without capability promotion:
- CAP-RENDER-001; scope_fingerprint: dc0142fc8dd4aa13788c8a0e3a5b9e35a438b8b0b891784958149cbec62e7b59
- CAP-PRESET-001; scope_fingerprint: a08f9699d884e32b9689b000358913251a09177a4b10e7f92c772186817d2c27
- CAP-FND-001; scope_fingerprint: e1c6670f635a7146762bb6f784ab81679c0513c11c0494e4c658254c96081685
- CAP-CA-GOV-001; scope_fingerprint: 7b2725463a8d338b8a811ae53ac85db4e6a131b911e8282ba14fc133e6fdbda3
- CAP-CA-CONTEXT-001; scope_fingerprint: c0192e0bd25bd5d6fb9948ff0e61c437fc0a235f03da703532c775f47b6cb749
- CAP-CA-SKILL-001; scope_fingerprint: 959d2b9f3786bdb7b56682150b9f783a59c036dfd996b119d783dfe6cfa42eac
- CAP-CA-DURATION-001; scope_fingerprint: e548b1d4459a62519d7b045effc3c724e108d8a142dc9c731170789f37ba10c6
- CAP-CA-STORY-001; scope_fingerprint: b687d925263d270ab032d0c853e003f355a3931c79a8e32c94e8164fbca30ce6
- CAP-CA-PERMISSION-001; scope_fingerprint: e7a4933530942e54742fd8481122871e6f434c3fe8f25b320f1c939ec01f1cd2
- CAP-CA-PIPELINE-001; scope_fingerprint: e699fd08e01f721a77625d14e6c94334f9c0e1183f8f8464d0bc1ca354453c37
- CAP-CA-FEEDBACK-001; scope_fingerprint: dc55505c53c398b62a00d405b4bde40b5b448b6c4d0aff959ff7576d0af0ad5b
- CAP-CA-PRODUCT-001; scope_fingerprint: 1a8493f9ede3fe9fc19e512f334e9b5b05ef0ce05b9e779ea134519ec2721f7c
- CAP-CA-PRODUCT-002; scope_fingerprint: 38cfcaf19ae875b5f0a748fdc96e0f8ac694a340ae539ae7a87f71fc61492d57
- CAP-CA-UX-001; scope_fingerprint: 09276853744ecc8f37853d5bbaa31367b4be5d1073785e1fbdfeb1dde91d4513
- CAP-CA-EXIT-001; scope_fingerprint: 56e1b4aaf113ef87e5bfb2d649ca0a5ef8af2720f47a2b2feed7903c7eda3426
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 9b5dda9d66429921f6110615dd9a9887b918bb8efbe4ee1bf27f8e28aa386445
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 342a342f402af82dfae500e8fd2ba5a57d55dc5729457c7405ce47ffb2e1a8d6
