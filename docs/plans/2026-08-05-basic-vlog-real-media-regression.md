# Basic Vlog real-media identity regression ExecPlan

## Purpose

Repair the cross-language semantic identity mismatch discovered only by authorized real-media acceptance, close the automated test gap with a repository-owned synthetic fixture, and generate a durable local review project for user acceptance before publication.

## Context

`WP-VLOG-001` completed four bounded editing slices. The normal synthetic matrix passed, but `acceptance:real` failed before FFmpeg execution with `SEMANTIC_GRAPH_HASH_MISMATCH` for a graph containing multiple real sources, proxy maps, Timeline edits and captions. Worker fail-closed behavior prevented partial publication.

## Milestones

1. Capture and compare the TypeScript and Python canonical semantic manifests and minimize the differing field combination.
2. Add a cross-language regression to the normal check and make the smallest contract-preserving implementation repair.
3. Run focused Worker, RenderGraph, Timeline/audio-caption, Basic Vlog and synthetic acceptance checks, then the complete repository check.
4. Run authorized local real-media acceptance without copying or committing source media.
5. Create a persistent local review project and outputs under `<local-review-root>/AVE-final-20260805-basic-vlog`, verify project integrity and media properties, and wait for human acceptance before PR creation.

## Validation

The regression must prove Host-authored and Worker-recomputed semantic payload/hash equality for the formerly failing graph. Real acceptance must prove Preview/Master render publication, original-backed Master, proxy-backed Preview, QC pass, project close/reopen and readable outputs. Basic Vlog media checks must continue to prove reframe pixels, loudness/true peak, ducking attenuation/recovery and boundary fade ramps.

## Idempotence and recovery

Repository tests use generated temporary media. Authorized user media remains referenced in place. The review directory uses a new explicit target and is not overwritten if an existing target is found. Failed validation publishes no partial Render Bundle. No push, PR or merge occurs before user review.

## Progress

- 2026-08-05: Real-media preflight passed for two authorized files and subtitles; Preview execution failed closed with `SEMANTIC_GRAPH_HASH_MISMATCH` before media publication.
- 2026-08-05: Root cause isolated to Windows code-page decoding at both Node-to-Python stdio and FFprobe-to-Python stdout boundaries; UTF-8 is now explicit and hostile-codepage/Unicode-path regressions pass.
- 2026-08-05: Replaced phase-unsafe parallel Ducking floor mixing with `sidechaincompress` dry/wet mix and padded a shorter sidechain to the Timeline duration; repeated encoded recovery and Host QC runs pass.
- 2026-08-05: Corrected the real acceptance fixture so its final state contains no intentional one-second gap and audio covers the acceptance Timeline.
- 2026-08-05: Created and reopened `<local-review-root>/AVE-final-20260805-basic-vlog-v6`; Project Host persisted two render results and four execution/output manifests, QC passed, schema 19 integrity is ok, and Preview/Master are ready for human review.
- 2026-08-05: The complete `pnpm run check` passed against fingerprint `b0df289bcc730ad80adf97edae9d9c008e49cc1c8464792d8f8eb9c8d716e30f`, including the new hostile-codepage regression.
- 2026-08-05: Human review found the generated sine Music and silent/non-dialogue source unsuitable for judging the edit. Replaced them with a CC BY 3.0 Wikimedia live performance segment plus a short local narration, with attribution retained outside the repository and copied into the review project.
- 2026-08-05: Real AAC exposed a `-0.69 dBFS` post-encode peak from a `-1 dBTP` pre-encode target. Added 0.5 dB internal AAC headroom while preserving the configured final QC ceiling; focused loudness regressions pass.
- 2026-08-05: Visual review exposed clipped low-contrast black captions. Static captions now render white with a black border, the regression asserts the style, and the shorter licensed-source caption is readable in both reframe modes.
- 2026-08-05: Created and reopened `<local-review-root>/AVE-final-20260805-basic-vlog-v11`; QC passed at -14.37 LUFS and -1.27 dB true peak, Ducking was applied, schema 19 integrity is ok, and Preview/Master await human review.
- 2026-08-05: The complete `pnpm run check` passed against fingerprint `eff15adb26c2bc1cee301c4b407e02fa2463456caa84fc45e6b4dd14da7237f9`.
- 2026-08-05: The user reviewed v11 and accepted the bounded editing result. Dependency checks found no runtime or project reference to the old test archive, so `<local-review-root>/AVE-test-artifacts-20260805` was permanently deleted at the user's direction.

## Surprises and discoveries

- The complete normal check did not execute the external-input real acceptance path.
- A short source with Chinese caption text exposed Worker stdio code-page drift even though the recursive Graph/manifest values still compared equal after the same corruption.
- The earlier Ducking floor used parallel branches whose timing/phase could cancel during recovery; a shorter real Dialogue source additionally showed the compressor output ending before Music unless the sidechain is padded.
- Media dimensions and rotation metadata were insufficient visual evidence: one technically valid phone file contained sideways content, so the final review version uses two manually inspected upright sources.
- The first 12 seconds of the licensed performance showed a singer but measured only -38.7 LUFS; contact sheets alone were insufficient to locate the musical body, so 10-second loudness scans selected the 180-second region.
- Lossy AAC can rebound above a pre-encode true-peak target by several tenths of a dB; final encoded-file QC remains authoritative.

## Decision log

- Preserve Worker hash validation and fix canonical parity; never bypass or weaken the mismatch blocker.
- Add a synthetic minimized regression so future detection does not depend on user media.

## Outcomes

Machine validation, the complete repository check, persistent licensed-media delivery and user visual/audio acceptance are complete. `EVD-20260805-WP-VLOG-002-COMPLETE` closes this package before commit and PR publication.
