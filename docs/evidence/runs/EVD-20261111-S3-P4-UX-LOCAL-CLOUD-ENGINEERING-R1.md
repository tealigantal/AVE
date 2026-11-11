---
evidence_id: EVD-20261111-S3-P4-UX-LOCAL-CLOUD-ENGINEERING-R1
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-11
repository_commit: 293695defc884445630b7d83e77a58c8f2031186
code_fingerprint: db12686049437c21c0d1fa3ce3776f053135fb5390b2f6e84930354aaa27199b
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: partial
---

# Local engineering build and independent cloud model profiles

This record belongs to the current work package. It records engineering and deployment outcomes, not package completion, real-video acceptance, Stage Exit or Release. The existing execution plan owns the detailed chronological tests and limitations; no historical Evidence was changed.

## 6084

The user authorized reconstruction on port 6084 and retained real-video acceptance. The deployed desktop is `sha256:94b3948f319919f2a792c86d36523e2aa565efa47b2264b999e096cd4908199b`; Whisper is `sha256:304ee15404eeccf0188a17f5b57e95d159ebc6f212c759f9e3c90d5cc240c518`. Their build-input digest is `82c4f66f767141d9e46b8c4bc0fff7b1f63b8a9e759e4927fbfc37f4db2b6b96`, which predates the cloud-profile source addition. The current source fingerprint above must not be used to imply that 6084 contains later 6085 changes.

Only the `ave-desktop` Compose services were recreated. Existing named project/profile/upload/configuration/model-cache volumes and material/export mounts were retained. Verified runtime memory limits are 768MiB and 1280MiB, with both services pinned to CPU 0–1. Both are healthy and the Browser entry returned HTTP 200. Transcription and sound use local Whisper-small CPU/int8 and the original YAMNet; vision and planning retain the original Qwen cloud configuration.

The exact built image, in an isolated no-network 768MiB/2-CPU container, passed synthetic compiled-Host/Worker observation, proxy binding, interrupted segment recovery/reopen, both QC targets, revocation, corrupt-cache rejection and cancellation. Its source/output hashes matched image provenance. Peak cgroup memory was 146,288,640 bytes and OOM counters were zero. This small synthetic case does not prove the user's 45-second/26-clip/high-resolution project, combined model/Host budget, every editing operation or arm64.

## 6085

The user separately authorized all-cloud Qwen model profiles and a model option in AVE. The deployed image is `sha256:bf3ad1c5d4a685ff1d0c886fa58f0c99e31ee9e686a2a5417e1a4e031706efbd`, build-input `14d55ad9c67999e690eee5661d800cf746ef79e9d7c2d3ec11779163a1b6c446`. It uses its own existing Compose project and volumes.

The default economy profile uses `qwen3.7-flash-2026-07-15` for vision/planning, `qwen-audio-3.1-asr-flash` for timed transcription, and `qwen3.8-omni-flash` for sound. The enhanced profile changes vision/planning to `qwen3.5-plus-2026-02-15`. Optional thinking is disabled. All profile roles require the supported official HTTPS routes and Qwen protocols; there is no local-model fallback. No key is included in UI metadata or the template. New requests select a registered deployment digest, and existing authorization snapshots retain their original identity.

Six short synthetic real API calls returned 662 reported tokens in total, without retries or user media. These prove small endpoint/adapter compatibility, not full planning quality, long-transcription completeness or a real edited video. Prices/capabilities were checked against the official Qwen documentation linked in the execution plan.

The candidate was first started with disposable tmpfs storage. The first disposable startup failed because its tmpfs `/config` was root-owned; recreating only that disposable test container with the intended UID/GID fixed the fixture. The actual named-volume deployment did not have that fixture error. A real browser then created a synthetic test project on port 6086, observed the model selector under Creation settings → Creation requirements, and switched economy/enhanced profiles; all four displayed models changed correctly. No model request was submitted through the UI. Screenshot: [model configuration](../assets/p4-ux/local-cloud-20261111/model-config.png). The test container was removed after verification.

The production 6085 entry returned HTTP 200 and healthy status; its only application processes were the web Host/start wrapper, with no local inference service or Whisper sidecar. During 6085 replacement, the two 6084 container IDs, StartedAt values and image IDs remained exactly unchanged.

## Engineering checks and remaining work

Architecture, 121 contract schemas with valid/invalid examples, TypeScript, Worker lint/typecheck, Docker packaging, cloud/local startup, Browser Host, model protocol, synthetic sampling, `stage3:render:test` and `stage3:p4-integration:test` passed at their recorded checkpoints. Negative tests intentionally emitted failures without producing success receipts. An initial new script lacked the tsx loader, and an added transport identity initially broke planner compatibility; both were fixed with focused and subsequent full regression tests, without relaxing the planner's contract.

The last documentation check still failed on the separate unfinished scene-request v1/v2 migration and historical applicability/fingerprint gates. No docs:complete was executed. Low-resource rendering supports the verified continuous single-video-track 30fps/simple-cut scope; unsupported semantics fail explicitly. OOM adaptive block reduction, true long-audio production observation, full large-media/two-service acceptance and native arm64 verification remain unfinished. Rendering remains inside Docker/FFmpeg; only the model roles of 6085 are cloud services. User real-video acceptance is pending.
