---
evidence_id: EVD-20261022-S3-P4-UX-REAUTH-BLOCKED
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-22
recorded_at: 2026-10-22T07:17:23+00:00
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
code_fingerprint: f7f7e245305b62476e4d7ecb8cb26ac0de3efb544b29ba454673367362109bd7
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# P4 same-request renewal and historical execution read

This checkpoint implements the explicitly authorized same-request renewal path
and repairs reads of immutable execution records created under the preceding
authorization generation. It does not close P4 or claim model annotation,
Timeline mutation, Preview/Master QC, export, or complete interaction coverage.
P5 was not started. No commit, push, branch change, or main operation occurred.

## Change and automated evidence

The request contract now records append-only renewal history including the
authorization actor, unchanged scope digest, previous and renewed expiry, and
the prior authorization digest. Project Host prepares a review bound to the
same request and scope, checks for stale sequence/state before persistence, and
commits through its normal authority. The desktop confirmation surface asks
the user to renew that same request; it does not transfer another request's
authorization. Historical manual-draft execution receipts and prior model
observations/materials are read against their recorded authorization
generation and immutable digest. Active runs and new writes remain bound to the
current authorization.

Validation passed:

- `node tools/contract-codegen/generate.mjs` generated 97 contracts and
  validators.
- `node --expose-gc --import tsx tests/integration/stage3-request-host.test.ts`
  passed the same-scope renewal, actor denial, stale-review denial, persistence,
  reopen, and cancellation checks.
- `node --expose-gc --import tsx tests/integration/stage3-manual-draft-host.test.ts`
  passed consecutive manual edits, output/QC receipts, undo/redo, reopen, and
  historical execution reading after renewal. It required the managed elevated
  run because the Windows sandbox denied the repository's immutable-original
  hard-link operation with `EPERM`; the test completed successfully once
  allowed.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.base.json`,
  `node tools/contract-codegen/check.mjs`, and
  `node tests/architecture/renderer-workbench.mjs` passed.
- `node --test tests/property/timeline-annotation-queue.test.mjs` passed 5/5.
- The offline budget-harness test passed with its CNY 12,000,000 hard ceiling.
  It performs no provider calls and does not simulate provider success.

## Existing Browser and actual product state

The already-running AVE Compose project on `127.0.0.1:6081` was rebuilt and
recreated in place with the same Compose project, named services, and existing
volumes. The Desktop service and its Whisper dependency became healthy; HTTP
on 6081 returned 200. The rebuilt Browser image is
`sha256:d2923f32fccaa4076479eea431df70c48d265dc0af166f3d0d33d08334352ad4`.
No new runtime or parallel deployment was started. WeChat on port 6080 was not
accessed or modified.

The actual Browser opened the existing project
`P4-20261020-Paid-Synthetic-0948-a27cc43e`, loaded its existing two synthetic
video assets, and read Timeline v6 after the renewed authorization. Selecting
the product's “查看新版本” control loaded a real v6 preview, with its single
three-second clip visible. The earlier product confirmation had renewed the
same request through 2026-10-23 without changing its asset/data scope; this
continuation did not submit another authorization or any model request.

The previous expired-request error is no longer present while reading the
workspace. However, the pending old v4 grayscale annotation still locks the
normal composer. The visible “重新打开编辑” and “编辑失败任务并保留批注”
controls call the same Renderer handler. Inspection of that handler shows it
first sends `project.creation.annotation.supersede` to Host, then restores the
historical annotation as a draft. The separate “retry” button would rerun the
failed operation. The user had explicitly prohibited clicking the old failed
task recovery control and prohibited using another request's authorization or
an API/database route around that write. Automatic review rejected the
“重新打开编辑” action because it could perform the prohibited supersede
write. No retry, supersede, or alternative write was attempted. This is the
remaining concrete blocker to submitting a fresh annotation through the
existing request; the normal UI has no unlocked composer until the old failure
is superseded.

## Provider ledger and remaining acceptance

The existing JSONL ledger remains at 32 records, including 16 retained
reservations totaling CNY 5.106684. Its SHA-256 is
`3d33d9b3cf1a0fd7b32f0131d7d68b1d598aefd53ec232eca4c092b38a2b4d4e`.
There were zero new provider calls in this checkpoint. Against the authorized
cumulative CNY 12 ceiling, CNY 6.893316 of reservation capacity remains.
Reservations are conservative pre-call caps, not verified provider charges.

`node scripts/docs/sync.mjs` regenerated the current views from manifest/state.
`node scripts/docs/check.mjs` still exits 1 on the repository's pre-existing
historical evidence applicability debt: five `UNVERIFIED` records and 32
capability applicability findings across older programme evidence. The new
Evidence fingerprint matches the synchronized source fingerprint. No generated
document was hand-edited and `docs:complete` was not run because P4 remains
blocked.

The requested two real model annotation rounds, resulting Timeline mutation,
Preview/Master and QC, export, failure/retry, undo/redo/reopen flow, and
remaining OP/WIN interaction coverage are still incomplete. Keep P4 blocked
until the user-approved product flow can supersede the historical failure and
continue under the same renewed request. Preserve the project, source assets,
and existing ledger; do not enter P5 or treat these focused checks as package
acceptance.

## Addendum: explicitly authorized UI recovery attempt

At 2026-10-22, after the user explicitly authorized this exact UI operation, I
clicked “重新打开编辑” once on the original request. The UI handler stopped
before dispatching the Host command because a different unsent overall
requirement was present in the composer: `assertAnnotationRestoreSafe` reported
“当前还有未发送的整体要求，请先处理这份草稿，再恢复历史失败任务。” The
source checks that composer value before the `project.creation.annotation.supersede`
command. The failed task therefore remains `failed`; no Host supersede or draft
restore was committed, and no provider call was issued. The composer includes
an appended “about v6 clip 1” phrase from the earlier normal UI reference action;
the current UI disables its editor while the recovery is locked. I did not send
or clear this unsent requirement because it is not user-authored and its control
is disabled. The 32-record ledger remains at 16 reservations / CNY 5.106684.
The current blocker is the product's unsent-composer guard, not the earlier
automatic-review denial. Do not submit the unsent text; resume only after it
can be safely removed through the product UI while preserving the old failed
annotation.

## Addendum: resumed service and authorized retry result

On 2026-10-22, the existing Compose project was confirmed healthy on port
6081, with Desktop and Whisper healthy; WeChat/6080 was not accessed. The
existing Browser reopened the same v6 project and showed the saved failure
`CREATION_MATERIAL_AUTHORIZATION_REBOUND` with its normal `重试此任务` UI
control. After the user authorized this exact retry, that control was clicked
once. The page still reports the same failure. The provider ledger is
unchanged at 32 records, 16 reservations, CNY 5.106684 total (12 vision and 4
planner reservations), so this attempt did not reach a model call or add a
reservation. No further retry was made. Real annotation, timeline, render,
quality, undo/redo, reopen, and export acceptance remain incomplete; inspect
the Host-side retry diagnostic for this persisted task before any further
attempt. P4 remains blocked.

## Addendum: persisted generation result and feedback-goal regression

Read-only inspection of the original project database found the final planner response paired with a successful HTTP 200 ledger entry (response object hash `d11feba8b13d110ef56e75a655e902508c18dd1a726706c5f86b85851bc02246`). The saved, schema-shaped output contains one shot whose `color` field is explicitly `null`. The submitted revision text contains the grayscale request. `commitCreationEdit` constructs the required intent identity, actor, provenance, reason and expected-effect fields from Host-owned values; `resolveCommandEditIntent` rejects empty `commands` / empty `expected_effects`. The model plan omitted the requested grade, so compilation produced no effective edit command and Host surfaced the generic `EDIT_INTENT_INVALID`. The raw provider wire body is not retained as a readable object in this project, so the persisted parsed result cannot distinguish model omission from a pre-storage response-parser omission. There is no evidence of a Host field-name mismatch.

Added a bounded grayscale-goal check to `stage3-feedback-goals.ts`: explicit grayscale feedback now requires `saturation: 0` on every planned shot and otherwise fails with `CREATION_COLOR_GOAL_UNMET` before commit. Replayed the actual saved revision and shot-color field through that check in memory; it detected the goal and rejected the saved `color: null` output with `CREATION_COLOR_GOAL_UNMET`. No response field was changed, no timeline was written, and no new model request was made. The focused property test `node --import tsx tests/property/stage3-feedback-goals.test.ts` passed, including missing-color rejection and explicit grayscale acceptance. `pnpm docs:start -- WP-S3-RELIABLE-UX-001` could not run because pnpm is unavailable in this executor. The source change is not deployed to the running app; no further paid acceptance was attempted.

The final local budget ledger has 36 records: all 18 reservations have HTTP 200 responses and no pending wire. CNY 7.519752 is the sum of retained upper-bound reservations, not settled usage. Applying the recorded token rates to the 18 response usage records gives a usage-priced estimate of CNY 1.773868; this local ledger is not an external provider invoice. The last two planner reservations total CNY 2.413068 per generation. If the existing six-sample observation can be reused, two successful real annotation generations would require at least four further planner calls and a further upper-bound reserve of CNY 4.826136. Together with existing retained reservations this reaches CNY 12.345888, exceeding the current CNY 12 hard cap by CNY 0.345888. Visual calls may also be needed and the 12-call visual cap is exhausted, so this is a lower bound conditional on observation reuse. Await a user decision before changing call caps or budget. P4 remains blocked.


## Addendum: authorized budget and execution continuation

The user authorized the cumulative API ceiling to CNY 13 and planner-call limit to 10 (four additional calls); the visual-call limit remains 12 with no additions. No provider call or reservation was made in this turn. Source review confirms Host constructs `ModelInput.context.request` with current revisions and includes `timeline_annotation_batch`, so the grayscale instruction and restored annotation are in the model-input construction path. The exact persisted `ModelInput` for the failed operation was not re-read in this turn. Read-only `docker ps` was denied by the Docker Desktop named pipe (`Access is denied`), and a separate GET to `http://127.0.0.1:6081/` failed. Following the user's instruction, no permission escalation, alternate Docker path, service restart, deployment or paid call was attempted. The grayscale guard and in-memory replay of the actual persisted revision/color field remain locally verified; real UI acceptance is pending. Budget and ledger counts remain as previously verified, with zero new reservations in this turn.
## Addendum: gray operation reached Host but source context remains unsupported

This continuation used the user's approved CNY 13 cumulative ceiling and 10
planner-call cap, with the vision cap unchanged at 12. The same synthetic
project and same-request authorization were reopened through the actual 6081
Browser. No WeChat container or port 6080 was accessed.

The saved response from the first authorized retry showed the model had been
given an output schema that allowed only `color: null`, despite the explicit
grayscale request. The schema was narrowed for explicit grayscale to neutral
exposure/contrast and saturation 0, and the Host marked the renderer's
`basic-color` capability available for that explicit user operation. The
actual retry then returned the requested saturation-0 operation, proving the
planner input correction worked. The next Host compile rejected it with
`CREATION_COLOR_CONTEXT_MISSING:shot_1`: the authorized 640x360 H.264 test clip
has no probed `color_primaries`, `color_transfer`, `color_space`, or
`color_range` tags, so the evidence-bound source span has no `ColorContext`.
The compile guard was preserved; no color facts or timeline state were
invented to bypass it.

The latest four planner calls all returned HTTP 200 and were settled; no
request is pending or uncertain. The ledger now contains 44 entries / 22
reservations: 10 planner and 12 visual calls. Retained conservative
reservations total CNY 12.367836. Recorded token usage priced at the configured
rates estimates CNY 3.024484; this is not a provider invoice. The 10-call
planner cap and 12-call vision cap are both exhausted, so no further model call
was made. CNY 0.632164 remains below the monetary ceiling, but does not
override the exhausted call-count caps.

The existing AVE Desktop and Whisper Compose services were rebuilt/recreated
on their existing 6081 deployment and volumes to include the Host request
capability fix. Whisper was recreated to attach to the new Desktop network
namespace; both services report healthy. The normal Browser retry completed
through the model but failed before any timeline write. The project remains at
v6 with its original duration and media. No Preview/Master render of a gray
edit, QC, export, undo/redo of a gray edit, reopen verification after such an
edit, or second successful annotation round exists. No mock or replay is
claimed as acceptance. P4 remains blocked on the unsupported/missing
`ColorContext` for this source and the exhausted model-call caps. The tested
worktree changes are not committed or pushed; P5 was not entered.
