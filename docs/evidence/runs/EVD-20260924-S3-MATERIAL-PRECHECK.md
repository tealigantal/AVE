---
evidence_id: EVD-20260924-S3-MATERIAL-PRECHECK
date: 2026-09-24
code_fingerprint: 61d23ce4aeec8dd720a126e993496524c25c87cf0d4be006f15dddf8bb70d4fc
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: focused_material_pass_full_gates_pending
---
# Trusted request-bound material preparation

Owned by WP-S3-INTEGRATION-001 and the existing
[ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md).
This is implementation/regression evidence, not real creative acceptance.

The public Host prepareCreationMaterial operation accepts only a trusted user
channel, existing request asset IDs and an exact imported original location.
Actual fingerprint/probe and immutable copying precede one transaction for
original/immutable permissions, immutable registration and a typed material
receipt. The receipt references the real version-one creation request object;
it does not fabricate Stage2 approval, grant cross-project learning or permit
network dispatch. Current request authorization and source permissions remain
mandatory for generation. Reuse retains original receipt/permission identity;
explicit denial, changed location, cancellation, revision or revoke cannot be
overwritten by an older preparation. Same operation ID with different input
fails; a failed uncommitted operation can be explicitly attempted again.

Copying remains a drained producer: cancel/close waits for pending writes and
owned-file compensation, handle closure and mutation-permit release. Permission
restoration is held-inode based and runs even after a cleanup path lookup fails.
Successful transaction commit is the result boundary; later cancellation cannot
erase a committed receipt or report it as absent.

Read-only review found two defects. A second request selecting another imported
path for identical content made the first request fail project-wide original
uniqueness. The regression reproduced CREATION_ORIGINAL_AUTHORITY_REQUIRED;
generation now resolves and deduplicates the current request's receipt pairs.
Windows cleanup could leave a readonly inode writable when stat/lstat failed
after cleanup chmod. Restoration now runs in finally through the held fd; a
post-chmod EIO test checks the exact root cause, readonly residual inode, zero
permission/receipt commits and released operation. Both reviewers subsequently
found no remaining blocker in these changes. Their two test observations were
also corrected: check asset.permission.recorded and the actual model_runs table.

Failure history retained: the first contract generation failed opening the
generated validator with Windows UNKNOWN/-4094. An explicit read/write open
subsequently succeeded; the exact transient cause remains unproven, and no ACL
or checker was changed. The next generation exposed a missing standalone
validator export; its explicit codegen export and declaration were added.
The new test first attempted an unknown asset authorization, correctly rejected
at request creation; the source-denial test now exercises the existing request.
The revoke assertion was corrected from authorization-stale to the actual
REQUEST_REVOKED cancellation reason. A branded AssetId type error was fixed
using the existing fingerprint constructor. Each code/input correction preceded
its rerun; no weakened assertions, hidden fallback or lucky retries.

Passed: stage3:check, typecheck (65 generated contracts), architecture (305 source
files), git diff --check. Tests use real encoded synthetic bytes, Worker probes,
SQLite and files, including atomic event-insert failure, reopen/idempotency,
request scope, cancel/revoke/revise/denial races, queued cancellation, pending
write/close drain, post-commit cancellation and Windows cleanup protection.
Generation HTTP responses remain local fixtures. Full current repository gates
are pending; the preceding generation-gate Evidence belongs to older source.

No real model calls, private uploads, fees, personalized film or recording;
no source commit/push or PR. Actual observation/learning, draft-bound render/QC
and workbench replacement remain unfinished. External source/learning/design/
provider/data/budget inputs still require a user answer. Package/goal remain
active; Stage3 candidates and real C1/C2/C3/C4/C6/C8/C9 are not completed.

Scope bindings below refresh regression applicability only; prior acceptance
bounds and Stage3 specified status are unchanged.

- CAP-RENDER-001; scope_fingerprint: d858c5be95d7ed22a10d519d4b82939ed3c75f324c8315e656fc0728d2e76c66
- CAP-PRESET-001; scope_fingerprint: 56163932925095388839a90edf2e16b8a7f315214d9d50d05370a48905f09b5d
- CAP-FND-001; scope_fingerprint: b611c5d43fb3863c42953d914e78ecbadb66771ea5cbfe1ac24270b060b4a4c5
- CAP-CA-GOV-001; scope_fingerprint: c3f323974ec1d4d7daf138662f052368a2b4d7a54bc6fcef3ec1ee9131b999ad
- CAP-CA-CONTEXT-001; scope_fingerprint: ae8533354a41e8b842815b535173ec1a3df0c0248055c9a853e8e8dfc571e94a
- CAP-CA-SKILL-001; scope_fingerprint: e64da5c2404d0c5a7d55434a15dacfcd06dd48312c110b90569cea723a3b4ee0
- CAP-CA-DURATION-001; scope_fingerprint: a98ed3c3b19eddbdb2f056d9407172a34917ca189619b5f8cd02409ed6760c74
- CAP-CA-STORY-001; scope_fingerprint: 77cccc2388a96fae86e9e3873c4d10ea09193c2612221ef519340ca5f4f66a50
- CAP-CA-PERMISSION-001; scope_fingerprint: 32c68f995b16b05359d8e226ab212dd2579b4d75168768c2666b793a02e7992a
- CAP-CA-PIPELINE-001; scope_fingerprint: cd448a0c2ab49f3ca30fc982bdb292f1cc410f31df42b5f3074fe4fd59246f78
- CAP-CA-FEEDBACK-001; scope_fingerprint: da6d493502cce777470e132cbf99f5ed085fa019c5901a09eb1472db168da488
- CAP-CA-PRODUCT-001; scope_fingerprint: b451ef11b72dd17c5d0b47ff28a3cf064d3d5e80489de7c3b2d30a6b07442cc2
- CAP-CA-PRODUCT-002; scope_fingerprint: 99dc7f3e60748202fb242f1b8120db2a0cc22a6478a0768cfde02a3e50f609fb
- CAP-CA-UX-001; scope_fingerprint: 2294d59eee4e6a04013ed963d07776ac4a52123b7c8f6ae5bc52106764cb1f63
- CAP-CA-EXIT-001; scope_fingerprint: 2a6662479e6af02cd853753610bcac369bfedc3a953000e5fd10d11e0f809eb6
- CAP-CA-SEC-001; scope_fingerprint: 5b338e4de25577673f88057a7790f63189e55d459ef10d85df144e8f039a3721
