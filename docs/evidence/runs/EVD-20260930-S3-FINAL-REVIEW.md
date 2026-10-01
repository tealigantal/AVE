---
evidence_id: EVD-20260930-S3-FINAL-REVIEW
work_package_id: WP-S3-INTEGRATION-001
date: 2026-09-30
code_fingerprint: e02bad96ba3fe0eed1996d363e364936d9c5ee75029ace272732190d774cc686
repository_commit: aad6f4085f11b5bb6034be836a361413c65340e3
capability_ids: [CAP-S3-FIRST-LOOP-001]
acceptance_ids: [ACC-S3-FIRST-C1, ACC-S3-FIRST-C2, ACC-S3-FIRST-C3, ACC-S3-FIRST-C4, ACC-S3-FIRST-C5, ACC-S3-FIRST-C6, ACC-S3-FIRST-C7, ACC-S3-FIRST-C8, ACC-S3-FIRST-C9]
result: stage3_implementation_and_automated_verification_complete_final_human_review_pending
---
# Stage3 final automated handoff after service recovery

The existing S3-01..06 package and C1-C9 remain the only scope.
[Prior complete local evidence](EVD-20260930-S3-AUTOMATED-LOCAL-FINAL-R2.md)
and [preserved service-blocked run](EVD-20260930-S3-CURRENT-GATES-SERVICE-BLOCK.md)
retain the full actual journey, failures and current v7/r17 repair gates.
This record closes the previously external C1/C8 gap; no old failure is rewritten.

## Service and filesystem boundary

The ordinary Windows shell did not see the Codex logical LOCALAPPDATA path.
Read-only diagnosis identified packaged-app redirection to
Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/AVE/stage3-final-review.
Physical/logical Python, source, model and labels have identical SHA256; Python
3.12.14, numpy2.4.3, scipy1.17.1 and LiteRT imports pass. This is filesystem
redirection, not evidence of two computers. The previous policy denial is retained.
After the user's explicit authorization to launch it, the same Start-Process
method using the physical directory succeeds; PID34348, loopback18081 only,
health model yamnet-tflite-1-10c95ea3eb9a7bb4/cpu. No silent service/model switch
or Whisper rebuild. Health is availability evidence, not quality acceptance.

## Distinct current formal-app run

Local run speech-journey-1790775170902 uses current complete build
audio-clock-build-1790759553605 / app SHA
e37d7ff93f9e798c599bb6c2217d79002cab6d4139ae6d22a36595c489a61412.
Actual UI imports licensed USGS C01 (source SHA
9ca3f15538a264309e29829236210d4c238fc26b59bba3131b18f13e0b6ac0b0),
requests and grants exact request-level consent through the isolated test role.
Four vision, one existing Whisper, one original YAMNet and two planning calls
return real responses. Host compiles and commits v1 through the current IR path.
Two real clips total240ticks@30=8seconds; first156ticks, second84ticks.
Source ranges are retained as rational PTS (not claimed source-contiguous):
145530..23077530 and38071600..50419600 at4410000.
English source-backed captions, Original audio and no invented music follow
the frozen request. Preview/Master share semantic hash
d0bb13575a0733ba111ebd5e714908c31fd69367afb37472a19b6156e14ed1a0,
with separate target plans; both actual encodes and unchanged QC pass.
Both media hashes and exact UI-export hash are
f217fce9d3cad00645a0dfc4c367cf79cd83144d31e7523d8f622f52dfa50183.

Continuation phase-speech-export-reopen-1790775356397 passes actual explicit
playback/input/clock progression, wide/narrow centered export, exact Master save,
normal native close/reopen, unsent-input and viewed/adopted/latest restoration.
Independent readonly proof confirms all8 provider calls, model runs and Worker
jobs unchanged across export/reopen. Raw files, receipts, source-map, results and
service-recovered-new-journey-proof-20260930.json stay local.

## Visual observations and limits

Root opened producing/watchable UI, both encoded shot frames, narrow export
and reopened-input screenshots, plus actual retained WebM frames. The reference
silver-gray hierarchy, largest central player, bottom composer/dock, real
filmstrip/history and modal are visible. Immediate watchable/reopen still images
retain true thumbnail-loading states; later recording frames show decoded real
thumbs. This is not fake imagery or claimed pixel-perfect prototype browsing.
Requests for frames beyond the short retained window recordings produced no
image; missing frames are not counted as observation. Final subjective story,
aesthetic and listening review remains pending, alongside prior recording/ASR
limitations documented in the existing index. No new blocker was found by this
independent artifact/product self-review; prior independent code review remains
applicable because source fingerprint is unchanged.

## C1-C9 and gates

C1 new current-build automatic creation and C8 current dual encoding/export now
pass this distinct post-recovery journey. C2 interruption/stale cancellation,
C3 real feedback/pacing/protection/audio/captions, C4 manual/version/composition,
C5 different intentions/performance, C6 independent held-out personalization/
current override/exception/correction/forgetting, C7 reference UI/motion and
C9 failure closure keep their scoped existing proofs linked above. All nine are
tested, never human-accepted. All137 retained managed phases and942 unique call
ledger IDs (not successful-call count) remain indexed, including the old failure.

Complete check14/synthetic14 pass at unchanged e02bad96ba3fe0eed1996d363e364936d9c5ee75029ace272732190d774cc686; exact repair commit
aad6f4085f11b5bb6034be836a361413c65340e3 and pre-handoff doc head a26842a have
green remote required check/security. No production source changed since gates;
this continuation adds formal real media evidence and current documentation.
Run docs:complete/sync/check and final exact-head remote CI before delivery.

Only sanitized text is published; no media, database, credentials, config or
private HTML enters Git/PR. Shortest ordinary Windows review path is the physical
package LocalCache directory above / REVIEW_INDEX.md; relative MP4/source-map/PNG/
WebM links work from that directory. The existing Open-Review.ps1 app launcher
retains its prior Codex execution-context scope; normal-shell legacy saved paths
have not been migrated or falsely claimed tested. Review actual indexed media
directly, or use the launcher in Codex's task terminal. No new parallel project,
merge, release or later-stage work.

Scope bindings:
- CAP-S3-FIRST-LOOP-001; scope_fingerprint: b05aa9b78e795fb2291f744e1fff585b0fbc57dfd9a0b639a75f15668d0c746b
