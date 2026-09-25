---
evidence_id: EVD-20260923-S3-GENERATION-PRECHECK
date: 2026-09-23
code_fingerprint: 2e3849dfb8f6b4c1f226315b374b8d8f1a33b50393412e694486ba2b1a9c9375
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: focused_generation_pass_full_gates_pending
---
# Source-bound public generation and lifecycle precheck

Owned by WP-S3-INTEGRATION-001 and the existing
[ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md).
This records implementation and controlled regression, not the real checkpoint.

The public Host generation operation now resolves exact project Evidence refs,
authorized immutable sources and actual stream bounds, selects a current local
profile snapshot, sends a bounded structured decision request through the
configured Gateway, retains the returned model result locally, compiles into
ordinary Commands, preflights both render targets and commits an atomic draft.
The model cannot supply Host identity fields or executable Commands. Generation
artifacts retain source/evidence/profile/model and render-plan identities.

Probe validation joins actual stream indices, uses exact rational start/duration
bounds, rejects ambiguous streams and checks embedded audio coverage. It does
not infer narrative from equal subdivisions. Model output schema derives from
the current creation-plan contract; color is offered only with actual complete
Rec.709/8-bit/limited tags supported by the current render route.

Read-only review found duplicate sequence/private LUT data in model input,
empty-profile metadata outside the authorized category, excessive color support,
unrepresented old grades being discarded, unbounded preparation cancellation,
and concurrent project opening overwriting a session. Root fixed these with
minimal outbound projections, explicit grade rejection, cancellable dependency
waiting and one FIFO open/create/close queue. Late fingerprint completion cannot
start probe/model/commit. A cancellation after atomic commit still returns the
actual draft. The reviewers found no remaining blocking defect in these repairs.

Failure history: the first helper typecheck exposed nullable match narrowing;
the explicit failing branch was fixed before rerun. The new actual encoded
color fixture then failed with CREATION_COLOR_CONTEXT_MISSING:red-shot. ffprobe
showed the produced stream lacked primaries/transfer despite output flags.
The input generator was changed to set complete frame color parameters, actual
ffprobe confirmed those fields, and the revised fixture passed. No default
color context, weakened assertion or unchanged lucky retry was used.

Passed: stage3:check, typecheck (64 generated contracts), architecture (304
source files), git diff --check. The generation suite includes real FFmpeg
encoded synthetic sources, real Worker fingerprint/probe, SQLite, IR/CommitPlan,
unequal source cuts, linked sound, captions and color, revisions, stale/manual
and identity denials, late cancellation, source cleanup and reopen. HTTP/model
responses remain local fixtures. Whole-repository gates on this source are
pending; prior green gates do not establish this new source's result.

No external model call, private media upload, model fee, real personalized film,
recording, source commit/push or PR. Real C1/C2/C3/C4/C6/C8/C9 remains blocked.
Material permission entry, actual model observation/learning, draft-bound
Preview/Master/QC execution and desktop replacement remain implementation work.
The package/goal stay active; no S3 candidate or Stage Exit is completed.

Scope bindings below refresh affected regression evidence only; existing
historical acceptance bounds and Stage3 specified status are unchanged.

- CAP-RENDER-001; scope_fingerprint: 68fe89b12ef06ad36e7470d303a92a07ce9367a54f2e589677d4d2cd2238f11e
- CAP-PRESET-001; scope_fingerprint: 80ad4c1e7aecd7410149467233d826f4753efb6c912c34d85e2f5986b4eb6222
- CAP-FND-001; scope_fingerprint: ba482fb99be0f8bac5314b16ef214cf0f179e76ae68ee7039b3c96d1b0067e89
- CAP-CA-GOV-001; scope_fingerprint: e134ec79dd38eeb390e00f29b8635d640ac9db779c10fcb1b05b567b291e6541
- CAP-CA-CONTEXT-001; scope_fingerprint: f6d2182d98d95b361263c2a084b437048bc05c306cea576dbf23a7d880fce99e
- CAP-CA-SKILL-001; scope_fingerprint: 06602cc79b7979fcb8a356f444aa9b0d556fbca060eed3edd9de9ad61efcc347
- CAP-CA-DURATION-001; scope_fingerprint: 7ba02340e0bb031c787b79c429dc10852103b297f87f6357e6c4d5ebd74a5d95
- CAP-CA-STORY-001; scope_fingerprint: 190c3704dffc57149fbbf6fb4cb46f09c039f8953f66aa0d821627ba33d483da
- CAP-CA-PERMISSION-001; scope_fingerprint: 728d973585205342ea39ffd2ebd995db4eb5f6a9b29510ebcf3612e1bc846936
- CAP-CA-PIPELINE-001; scope_fingerprint: f1b3183407aeab0b6952c7783dcf2ea9ec4d524cb8910da2b924d803fac91a7b
- CAP-CA-FEEDBACK-001; scope_fingerprint: f84bf29deed58cef86e70653e6753ba3d33775a08e2b29badea2c94ee8f634e7
- CAP-CA-PRODUCT-001; scope_fingerprint: fc1dd363f185a7ab8f48fd373daf408d4964d1528f0000d87e64a9d9b9286ef1
- CAP-CA-PRODUCT-002; scope_fingerprint: b442efb099e48a3442f059e3ac3437084f2ffe0a412ff5bf162b3ba669ca7ecd
- CAP-CA-UX-001; scope_fingerprint: 2639f857d6cfdc03b3236de3c530c7a003522bf62a597613714e95a4046777f1
- CAP-CA-EXIT-001; scope_fingerprint: 056568eea58741fa05d168563fa18ee88842df024dce18674d4935fd2b31854a
- CAP-CA-SEC-001; scope_fingerprint: 5355660ced89637f1d9e7afd9a56cb4e08e50eb2a6ec53d899eeabbeeecfc774
