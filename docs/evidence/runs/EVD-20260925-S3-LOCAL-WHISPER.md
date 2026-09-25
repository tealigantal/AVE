---
evidence_id: EVD-20260925-S3-LOCAL-WHISPER
date: 2026-09-25
code_fingerprint: a6e21b719fd8cac6867d3c9939562d31dc4692423a33e2d6ab38c0fd9ee4de3c
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: local_whisper_verified_acoustic_semantics_failed_real_checkpoint_pending
---
# Local Whisper installation and real service verification

Scope: the user explicitly requested local Whisper installation after saved
Lilsunspot Qwen credentials had been recovered and tested. Root reactivated the
same WP-S3-INTEGRATION-001. Only root wrote files. Application source did not
change; the existing source fingerprint and full engineering gates in
[EVD-20260924-S3-SPLIT-SERVICES-GATES](EVD-20260924-S3-SPLIT-SERVICES-GATES.md)
remain applicable. This is deployment and interface verification, not completion
of any S3 candidate or the first personalized creation checkpoint.

The isolated `ave-whisper` container serves only 127.0.0.1:18080, has
restart-unless-stopped, and uses its own `ave-whisper-models` volume. Existing
GP/Gym containers remained running and unchanged. Compose and installation
metadata are outside Git at LOCALAPPDATA/AVE/whisper. The image is pinned to
ghcr.io/speaches-ai/speaches@sha256:c0da392c37e76a01ba479239b43124c67baf8913ae0f491071d6ac544641dad7.
Its installed faster-whisper is 1.1.1 and CTranslate2 is 4.5.0. Actual service
configuration reports CUDA/int8_float16 and one available GPU.

Model: Systran/faster-whisper-small, revision
536b0662742c02347bc0e980a01041f333bce120. The 483546902-byte model.bin SHA-256 is
3e305921506d8872816023e4c273e75d2419fb89b24da97b4fe7bce14170d671, verified against
official LFS metadata and again inside the container. HF_HUB_OFFLINE=1 makes the
final service load this cached model without a network fetch. This offline
setting applies to local Whisper; Qwen still uses its explicitly configured API.

Actual verification used a public synthetic colored image and Windows-generated
Chinese/English TTS WAVs, never private source footage:

- Native faster-whisper 1.2.1 CPU/int8 with VAD batch inference recognized both
  5.6-second utterances correctly in about 3.1 seconds each, with all segments
  inside the input duration. This is a single-machine smoke result.
- Actual Gateway multipart HTTP transcription on GPU recognized both utterances
  correctly with valid segment bounds. Chinese cold request: 42846 ms; subsequent
  English request: 494 ms. No inference retry occurred.
- After enabling offline cache loading and recreating only this container,
  configuredSplitModelProvider made exactly three physical calls: Qwen vision
  (138 tokens), local Whisper (usage unavailable), Qwen sound (158 tokens).
  Their dispatch hashes/targets and audits were saved before/after transport.
  The transcript mapped exactly to source RationalTime 30 through 35 seconds.
  loadModelServices with an empty environment selected ave-split/creation-v1.
  The existing saved-key configuration was updated with local transcription and
  enabled. No environment Qwen credentials were used or displayed. API cost was
  not reported; no cost amount is invented.
- The split smoke command exited 0 for transport/schema/fusion. Root's separate
  semantic review FAILED the sound role: it translated the spoken words instead
  of describing audible characteristics, contrary to its instruction. This is
  not acoustic quality acceptance. The earlier pure-tone misdescription also
  remains valid evidence and is not erased by successful transport.

Original failures retained outside Git:

- Initial Hugging Face download failed with TLS unexpected EOF; the subsequent
  official download ended short. Exact HTTP Range resume completed the remaining
  bytes and the final official digest matched. No TLS checks were disabled.
- Direct CPU non-batch inference returned an English segment ending at 6.0 s for
  a 5.5635625 s input. Explicit baseline validation failed with
  SEGMENT_OUTSIDE_AUDIO. VAD batch inference was then separately tested; no
  timestamps were clipped or fabricated.
- Initial HTTP request failed with 404 because the Windows bind appeared empty
  inside the container. A dedicated volume replaced that bind; verified local
  files were copied in and their ownership fixed for the service user. The
  subsequent request followed that concrete deployment correction.
- A local evidence-copy helper initially used the Windows default text encoding
  and failed to read UTF-8 JSON. Explicit UTF-8 corrected this helper; no model
  call was repeated because of it.

Artifacts: LOCALAPPDATA/AVE/whisper contains compose.json, installation.json,
whisper-tests.json, whisper-tests-bind-failure.json, cpu-verification.json,
cpu-baseline-validation.json, cpu-batched-verification.json,
split-service-test.json, split-quality-review.json, the test WAVs/scripts and
logs/. Raw credentials remain only in Electron userData/model-services.json.
No private media, keys, contexts or sensitive logs are added to Git.

Application source fingerprint was recomputed after installation and unchanged.
Documentation sync and check passed. A scan of 353 changed/untracked existing
files found zero occurrences of the configured provider key. No full application test rerun was
needed for this source-unchanged deployment slice; actual service tests above
cover its new behavior. No task commit, push, PR, merge or release occurred.

The Whisper installation request is satisfied. The same larger WP remains
active and uncompleted, with acoustic quality and the real personalized
creation/held-out learning/exception/forgetting/Preview/Master/QC/reopen/recording
acceptance still pending. Next: resolve the acoustic semantic failure, then
resume the already selected real case and learning scope. Do not rediscover
inputs or promote an interface smoke test into the real checkpoint.
