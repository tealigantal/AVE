---
evidence_id: EVD-20260924-S3-RENDER-PRECHECK
date: 2026-09-24
code_fingerprint: aff1a208281d5f58837cb0ac966a5e5d9b71eacb9fe4128011e8a509eea77bd8
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: focused_render_and_producer_drain_pass_full_gates_pending
---
# Saved draft rendering and producer lifetime

WP-S3-INTEGRATION-001 and its [ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md)
remain active. Root alone wrote source; the two existing read-only agents kept
the inherited model/settings. No candidate, real checkpoint or Stage Exit is complete.

The shared render path now accepts the exact saved draft Timeline and verifies
generation/source/target-plan identities. Actual Preview and Master each receive
independent QC. Output bundle, draft receipt and watchable state publish atomically;
adopted/viewed pointers remain independent. Playback validates the actual object
reference and bytes of that draft. Target geometry/fps/duration and stream-duration
difference limits are passed to QC; this is not perceptual synchronization or
semantic quality verification. New generation plans explicitly fix the existing
30 fps encoding baseline, with authoritative Timeline time still rational.

Windows Worker startup assigns a suspended process to an owned non-breakaway Job
before execution; Linux uses a dedicated subreaper and an unreaped leader, then
reaps descendants to ECHILD. Stop awaits explicit OS drain and owner close, and
all direct callers now await the one stop contract. Unconfirmed termination
poisons admission/retry and retains Host staging, source handles and session.
No taskkill fallback or process-exit-only success remains. Platform support here
is Windows/Linux; unsupported owners fail before launching a producer.

Passed on Windows: `pnpm run stage3:check`, `pnpm run typecheck` (66 contracts),
`pnpm run architecture` (309 sources), `pnpm run worker:client:test`,
`pnpm run worker:crash-recovery:test`, `pnpm run platform:foundation:test`,
`pnpm run dev-cli:test`. The new `stage3:render:test` is included in stage3:check.
Its actual encoded synthetic motion/audio uses real Worker, FFmpeg, SQLite and
files; model output is a local HTTP fixture. No private footage or remote model
call was used.

Render negatives verify exact reasons and no incorrect publication: real wrong
dimensions/fps/duration and audio duration, missing object reference with retained
bytes, corrupt bytes, source-stat FD release, concurrent inspection drain,
receipt-insert rollback, post-COMMIT acknowledgement failure, repeated cleanup
failures with unique retained diagnostics, cancellation and reopen. A separate
Host fault-injection test verifies unconfirmed-ownership retention and rejection
of close/open/new render; it is not represented as an actual OS crash result.

The actual Windows client tests kill an owner and prove poison/no new generation;
they also cover timeout, explicit abort, concurrent close, live orphaned/detached
grandchildren, retry only after death, blocked large stdin and a dropped stop
signal. The latter waits for the real 20-second termination deadline and proves
that a 60-second response waiter is rejected immediately at that boundary.
Windows and WSL Ubuntu/Python 3.12.3 both passed the standalone Python owner smoke,
including detached grandchildren, preserved exit code 17 and blocked stdin.
WSL has no Node executable, so no Linux Node-client/full-gate pass is claimed.

Read-only review defects were fixed before reruns: output references use the
existing NULL version, paused drafts can render after reopen, successful commits
survive cleanup failures, repeated failures append unique references, source
inspections drain together, newly opened handles close if fstat fails, and failed
render state is explicit. Worker fixes close inherited parent pipe ends promptly,
keep close/reopen admission ordered, bound abort acknowledgement, wake response
waiters when termination is unconfirmed, and preserve original owner diagnostics.
The relevant reviewers found no remaining blocker in their final targeted checks.

Original development failures are retained here: generated validator open failed
with Windows UNKNOWN/-4094 (root cause unproven; no ACL/checker change); the new
QC schema needed its referenced validator and strict object type; Host's DB type
and a nonexistent ticket.project_id assumption were corrected; repeated identical
fixture decisions correctly failed as an empty edit, so test inputs now differ;
the render-reference check incorrectly required version 1 instead of SQL NULL.
The new Python test initially had an invalid nested writer string, then used a
Windows-inappropriate os.kill(pid,0) assertion; the corrected fixture and explicit
Windows process-handle query preceded passing reruns. No lucky retry or weakened
gate was used. Full repository gates on this fingerprint are next.

Real observation/learning, workbench replacement and the held-out project loop
remain unfinished. Material/learning/design/provider/data/budget inputs remain
unanswered. No actual film/recording, source commit/push, draft PR, merge or release.
The following bindings only refresh regression applicability; prior acceptance
bounds and Stage3 specified status remain unchanged.

- CAP-RENDER-001; scope_fingerprint: b4cdda44afb566a4d07f3ba07cf5acda3ad23d7d092f8d49b4359ddc6113e8d0
- CAP-PRESET-001; scope_fingerprint: ea3e4d00e2ad3b16f255cf92e75b3476d85ccade47f2195c8367a8232170aacb
- CAP-FND-001; scope_fingerprint: 718ab3549cf1965920bf48a5157cb71fff068036561e1d01f002d4a29d25e1ad
- CAP-CA-GOV-001; scope_fingerprint: ebec047c7990226c925742385927fbe2f7218757e5edb4407e910ed5719c8683
- CAP-CA-CONTEXT-001; scope_fingerprint: 80b64715a1d679333bc1d57e6071ae77d5037a600ed6cff73af66babbc7b87d1
- CAP-CA-SKILL-001; scope_fingerprint: 606dee26835334da51f235ed3094cb6bcde04cff35f6bcae3a2f514ab9dce5ea
- CAP-CA-DURATION-001; scope_fingerprint: 2a17945102d52bfd2bea7dee0507c4aff603911199e0d725b890343866d89b9f
- CAP-CA-STORY-001; scope_fingerprint: 6ea84c6a4706071707f1d8e53e21a72685b8d0f03fe735790cbbf679c953f6ea
- CAP-CA-PERMISSION-001; scope_fingerprint: 19081d35f6a9293fbe8fa12a31a1b0a4fd292fc9f82edf1b2d272936925dcd6b
- CAP-CA-PIPELINE-001; scope_fingerprint: 1e4945660666dee6553433763323e516864a764b05cb9a178d1e8ae63ba6a1e8
- CAP-CA-FEEDBACK-001; scope_fingerprint: 908aa758db5750e5b9350997d7a8c74b463b516bb50a80b16bd4b8604202c152
- CAP-CA-PRODUCT-001; scope_fingerprint: c0d5820ea60d9ad26cb0963a6075436c21650bfa2c3d02cb76b947a2d9a73282
- CAP-CA-PRODUCT-002; scope_fingerprint: 2632643f028254267210ed0ce08202d5ace41ed0a0546b55f9074ae446126833
- CAP-CA-UX-001; scope_fingerprint: 66eb5ffe8780bfbf4cbb80d74ccaca3fe786b908572226d911a9b7c7d215a936
- CAP-CA-EXIT-001; scope_fingerprint: 9e958381682d8f9449554e5d2082422c979fae36db702ba65f1818dea801958e
- CAP-CA-SEC-001; scope_fingerprint: b71e5837ac7726beecea5110bb7c2d4c075119b97943dcebef8c2973a5153ab9
