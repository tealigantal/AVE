---
evidence_id: EVD-20260925-S3-ACOUSTIC-PRECHECK
date: 2026-09-25
code_fingerprint: f503b940d536d51cf88917898ac3177e4b7e078a19e6fd8bc889db68ed991b14
repository_commit: 06704a86de3a02347b5c4f60ed0f66d6c9e9ae5c
result: targeted_protocol_passed_real_acoustic_semantics_failed_full_gates_pending
---
# Acoustic role repair precheck

Same WP-S3-INTEGRATION-001; root is the only writer. Fixed immutable versioned
system instruction plus direct user instruction; full content participates in
deployment/cache/wire identity. No observation schema or historical proof changes.
No label-to-description rules, transcript-based acoustic inference, output cleaning,
model fallback, or retry-until-pass. Configuration and actual requests preserve
original WAV content and isolate acoustic inputs from transcripts and profiles.

Targeted commands passed: node --import tsx with
tests/integration/stage3-provider-protocol.test.ts, stage3-split-model.test.ts,
stage3-budget-host.test.ts; pnpm run typecheck passed before final test additions.
Full current-source gates remain pending. Scope bindings below identify engineering
applicability for that pending regression, not a new capability or acceptance claim.

Initial protocol test failed because the new assertion used MODEL_REPLAY_MISS
instead of the real MODEL_REPLAY_MISSING code; corrected the test. Read-only review
then found replayStore was absent, making the negative test vacuous. Added actual
write/read, positive replay without a send, then text/version changes that fail
replay without a send. Re-ran changed tests; passed. Review found no sound-label
branches or production logic blocker. Added changed split-deployment historical
composition reopen and zero-send/zero-commit rejection of old authorization.

## Actual model calls: semantic failure, not acceptance

Eight predeclared development controls per model: Chinese/English TTS, zero PCM
silence, pure tone, speech mentioning an absent sound, spoken instruction, speech
plus tone, and tone changing to silence. Production split provider executed local
Whisper and remote sound for every sample. All 32 physical calls and raw outputs
were retained; 16 per candidate, one attempt each, no retry. Source audio was
synthetic, public test data; no private source footage or credentials in Git.

Both candidates returned structurally valid observations for 8/8 samples, but both
failed semantic review. All-zero silence has 96000 zero-valued samples at 16 kHz;
qwen3-omni-flash fabricated human voice, hum and friction, and qwen3.8-omni-flash
fabricated a click and male voice. Both missed the three-second zero tail of the
tone-to-silence control and the added tone in the speech mixture. These deterministic
source facts independently refute the claims; no human-listening claim is made.
No model output was transformed into a passing description. No current model was
switched and no retained original failure was overwritten.

qwen3-omni-flash: 3343 sound tokens, per-call latency 853–1619 ms.
qwen3.8-omni-flash: 6628 sound tokens, 6144–13605 ms. Local Whisper token usage and
settled currency cost are unknown, not zero. No product spending ceiling added.

Private local evidence root: LOCALAPPDATA/AVE/acoustic-repair-20260925.
- qwen3-omni-flash-1790336582448/results.json SHA256 6826e9c50e31b10b2c5b60fac5320fe22c564293ebf0c24703f75afeaa445c0d
- qwen3.8-omni-flash-1790336647350/results.json SHA256 9e2d4e9d69dc68a293980f69a37ace7a5b71819dfc16ae4887dec64ac3d72062
- development-manifest.json, prepare.py, run.mts, semantic-review.json preserve
  input identities, generation, timestamps, deployment/wire hashes, all audits.

Held-out evaluation and paired stability expansion were not started because both
candidates failed development controls. Existing authorized historical media
contains one independent recording; its windows are not four independent sources.
The first real personalized loop remains incomplete: real new-source draft,
workbench revisions, held-out learning/exception/forgetting, Preview/Master/QC,
save/reopen and recording are not accepted. No package or Stage3 promotion.

Engineering applicability bindings (pending full regression; unchanged statuses):
- CAP-RENDER-001; scope_fingerprint: 545bd8acd37da03eaa20ba2160199d3e38cf7a809d93ccb90a8852a79859a4cb
- CAP-PRESET-001; scope_fingerprint: 7a5417632cfa69fb2dd5d8082fde01b1d48feb1ceb6dfe11f2746fc168dbbbcb
- CAP-FND-001; scope_fingerprint: 19601debdac2f859a7ba45000e5c0cd203ffb5c72c450daade6616c682270350
- CAP-CA-GOV-001; scope_fingerprint: 7b2725463a8d338b8a811ae53ac85db4e6a131b911e8282ba14fc133e6fdbda3
- CAP-CA-CONTEXT-001; scope_fingerprint: e8eb775ad3125755df683c299a6111faf5b6a684d7094d03e23e27c8abfa8082
- CAP-CA-SKILL-001; scope_fingerprint: 959d2b9f3786bdb7b56682150b9f783a59c036dfd996b119d783dfe6cfa42eac
- CAP-CA-DURATION-001; scope_fingerprint: e548b1d4459a62519d7b045effc3c724e108d8a142dc9c731170789f37ba10c6
- CAP-CA-STORY-001; scope_fingerprint: 9601b07c954b4ea6844bc5fc87e89d100b00b3ccb4cad171f8ca74312d477a3e
- CAP-CA-PERMISSION-001; scope_fingerprint: e7a4933530942e54742fd8481122871e6f434c3fe8f25b320f1c939ec01f1cd2
- CAP-CA-PIPELINE-001; scope_fingerprint: 3acf03d3865fbc30c0763ba4173c44091945ad615f88746c0db2436323246e51
- CAP-CA-FEEDBACK-001; scope_fingerprint: e94e10edec86512a891f80c757959dee7edcb7f5af62094e0f6f727b3217031e
- CAP-CA-PRODUCT-001; scope_fingerprint: d0ec6228f7f026839564dbdcc4a7f2bf575fcab13b0eb24b11317a7c94203f72
- CAP-CA-PRODUCT-002; scope_fingerprint: 2e492c699a40a526d64321a8e0518f818a30faf90c19cd3e289c28d96c1a2027
- CAP-CA-UX-001; scope_fingerprint: a84cf4928699af4bac93d43b007a8ef9c70d3eebf462544ade8966ff508cdce7
- CAP-CA-EXIT-001; scope_fingerprint: 42ca4cb18a24d4e9c1c2b266bde401c3b75c2c8b4bc3d55e7a9840fb01f74a85
- CAP-CA-GOV-003; scope_fingerprint: 60c45034ae7fa9379181ee94036faebae993809d48d14274e4770bc0b9a2732f
- CAP-CA-GOV-002; scope_fingerprint: cde84d6a6f2ce54440168c1813f8e0a9399769ed91d42afd55b1999aec220b00
- CAP-CA-SEC-001; scope_fingerprint: 9b5dda9d66429921f6110615dd9a9887b918bb8efbe4ee1bf27f8e28aa386445
- CAP-CA-RECON-001; scope_fingerprint: f2fcfc77b2e826f500435d1a17aebe6246d697f52b67bf1c0565073561d07311
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: 9ff4a2f238674638bfcd0da2b8a5ee4834071b9d05d7ad98159eb39627f89ef3
