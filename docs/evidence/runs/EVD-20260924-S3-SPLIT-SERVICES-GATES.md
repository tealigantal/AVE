---
evidence_id: EVD-20260924-S3-SPLIT-SERVICES-GATES
date: 2026-09-24
code_fingerprint: a6e21b719fd8cac6867d3c9939562d31dc4692423a33e2d6ab38c0fd9ee4de3c
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: split_framework_engineering_pass_real_checkpoint_pending
---
# Split-service framework gates

The user's bounded request to prepare Qwen vision + Whisper transcription + an
independent acoustic model is implemented. Root was the only source writer;
existing read-only provider reviewer retained inherited model/reasoning settings.
The same registered WP owns all shared edits. No candidate package is completed.

Main loads explicit local JSON settings with separate endpoints/models/keys. A
disabled template is created on first unconfigured launch. Vision receives PNG,
Whisper receives multipart WAV with verbose segment timestamps, sound receives
original WAV through JSON/SSE chat. Planner defaults to the vision service's text
capability, or uses an explicit fourth configuration. No silent substitutions or
whole-pipeline retry. Native request review lists every receiving route. Each
physical send persists its exact target and wire identity before transport.
Child output/usage settlements remain independent; cancellation drains child
audit before ending the outer operation. Exact decimal timestamps are mapped to
source RationalTime. Ordered composition proof reconstructs final observations
at first publication and reopen against every immutable physical settlement.
Remote services require authentication; loopback may omit a key. Enabled invalid
configuration fails explicitly. Raw settings and keys do not reach Renderer,
project records, examples or logs. No product data/cost ceiling was introduced.

Validation: pnpm run check, session 41312, exit 0; pnpm run
acceptance:final:synthetic, session 39065, exit 0. No gate skipped. Source fingerprint
was recomputed after both completed and is unchanged. Focused model, actual Host
observation, Desktop authorization/lifecycle, type and architecture checks passed
before the full gate. Full check also exercised Stage2, all Stage3 groups, real
encoded fixture render/QC, contracts, storage, workers and foundation acceptance.
The new test covers exact multipart/SSE requests, routing/privacy, source time,
known usage on cancel, failed calls with no observation or Timeline publication,
corrupted fusion rejection, planner creation and save/reopen. Provider and native
confirmation responses remain controlled fixtures, never real model acceptance.

Original failures and exact fixes remain in
[EVD-20260924-S3-SPLIT-SERVICES-PRECHECK](EVD-20260924-S3-SPLIT-SERVICES-PRECHECK.md).
The read-only audit found the cancelled outer/child usage race. Root fixed it and
added the specific sound-SSE usage-before-DONE failure test. Follow-up review
found no further blocking issue. Tests were rerun after concrete code/input fixes,
not to hide intermittent failure; original logs remain outside Git.

Current full-gate Desktop artifacts are OS TEMP/ave-stage3-desktop-workspace-8EnbXB:
project contains actual fixture Preview/Master/QC; review contains request,
material, drafts and profile PNGs plus CREATION-WORKSPACE-REVIEW.json and
CREATION-WORKSPACE-OBSERVATION.json. These are engineering fixtures/captures,
not a new user film, real model output, or the requested real journey recording.
Setup is documented in [MODEL_SERVICES_SETUP](../../work-orders/stage3/MODEL_SERVICES_SETUP.md).

No paid provider call, private-media upload, model download or deployment occurred.
The existing unavailable credentials were not retried. API mode avoids loading
these models locally; local operation requires actual compatible services and
suitable hardware. Serial calls do not automatically unload server model weights.
Runtime model input windows/quality still require real deployment validation.

The requested framework slice is complete. The larger first real personalized
checkpoint is NOT complete: held-out real personalization/exception/forgetting,
real model-generated user works and their recording/direct review are pending.
WP-S3-INTEGRATION-001 is blocked with active DEBT-S3-FIRST-INPUTS; CAP stays
specified and seven real acceptance rows remain blocked. Do not docs:complete
this WP or start another checkpoint. Next, after user configures usable keys or
local services, reactivate this same WP and run the previously approved real
case/learning scope through current Desktop with exact request authorization.

Branch codex/stage3-first-personal-creation, unchanged HEAD
3521aa8a5d019fb49dd486a11a424bc937857db1. No implementation commit/push/PR/merge.
Scope audit found 237 meaningful changed/untracked paths, all allowed, no staged
files or private media/database/environment/log extensions. Existing changes are
preserved. An accepted framework must not be labelled the real checkpoint.

Retained OS TEMP log SHA-256:
- ave-stage3-split-check.log: 24066047e055c73885cc6292436257fc6d1d316fa30fff90e18f53f685c6830f
- ave-stage3-split-final-synthetic.log: 808ee2be19b86adf6d26d7db235b2963715d55f148e292583e025e6bcde27184
- ave-stage3-split-model-regression-fixed.log: 0ce4dfde3de7fdaaf906594155bc3ff1c6bcde948ba1ae5738ab856f054cfd2e
- ave-stage3-split-observation-regression.log: 8589eb841c9e37bec1dc158a461aedbab25da6ea52b3b24b980e004456a0413a
- ave-stage3-split-desktop-regression.log: 738f49947efa165091750bde3317dce68a871f236fb3351607c988eab85d72db
- ave-stage3-split-typecheck-final.log: 7599ce85929321f587f58c8c53bec001591ebd09b02f5b47265a0efcab566493
- ave-stage3-split-architecture.log: 48960894f01070252027c7043d7c1e8873e7ffe435f077d11b37c5e01e85cd66
- ave-stage3-split-typecheck-first.log: 68ba4756b89db94097fd0562da22f8552f96d32c197297801606050923a8e799
- ave-stage3-split-typecheck-fixed.log: 5d51612f48b66159d37c2b01c54ca97141b138ef74420661fc2a0143d0fef8cc
- ave-stage3-split-targeted-first.log: 3e9865d911d96988a9d1eecf2abad789e5a9b078665a73f19facd0ef9a4cf054
- ave-stage3-split-targeted-second.log: d1741fcf7f367d621abbc74cee7cc32bfdeb5b62a2f8d682faca317439f95ad0
- ave-stage3-split-targeted-third.log: 70db467279c457f28c55b501d829c189cbd45989982a2bc4f2eae7bebc8bcd17
- ave-stage3-split-targeted-fourth.log: 6fd0b4208a314c85b201889afaa9d1e6d83360ec73cf92a1ade69110e0a4091e
- ave-stage3-split-model-regression.log: e98812045b0a86471b5841504be68cfe93fe3e6275bf00af3ce3cedc6686b64c

Engineering applicability bindings without capability promotion:
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
