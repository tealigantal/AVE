---
evidence_id: EVD-20261022-S3-P4-UX-ANNOTATION-REOPEN
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-22
recorded_at: 2026-10-22T02:53:43+00:00
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
code_fingerprint: 6d4523e2420c13727c040ce7afbdf865dc097ffda8d5b8693bada339b6c11c85
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# P4 annotation-reopen repair and current authorization blocker

This Evidence records a focused repair and real Browser follow-up on the
already-existing synthetic P4 project. It does not claim the requested model,
timeline, Preview/Master, export, or full OP/WIN acceptance. P4 remains blocked;
P5 was not started. No commit, push, branch change, or main-branch operation was
performed.

## Budget and preserved state

The user raised the cumulative DashScope ceiling from CNY 5 to CNY 8. The
retained ledger still has 18 records (9 reserved provider calls), reserves
3,740,346 micro-CNY (CNY 3.740346), and has SHA-256
`9d86037b46249e43a36ce2abdfe38b112226e2b8da9e828aec281ce1b0890f04`. No new
provider request was made; the file hash and reservation total are unchanged.
Remaining reservation capacity under CNY 8 is CNY 4.259654. The current hard
bound for one planner request is 1,749,888 micro-CNY; two planner requests can
reserve at most 3,499,776 micro-CNY, leaving CNY 0.759878 before any vision
request. These are conservative reservations, not a verified provider bill.
The current official Model Studio pricing page lists the authorized
`qwen3.7-max-2026-05-20` Global rates at CNY 12/36 per million input/output
tokens: [Alibaba Cloud Model Studio pricing](https://help.aliyun.com/en/model-studio/model-pricing).

Only the existing synthetic project and its already-imported clips were opened.
No private material was added or uploaded. The prior failed annotation and v6
project data remain present. The original timeline was not changed in this
checkpoint.

## Reproduced issue and repair

The live Browser reopened project `P4-20261020-Paid-Synthetic-0948-a27cc43e`
at v6. Its old v4 grayscale annotation remained visible as failed with
`MODEL_OUTPUT_INVALID: retention cannot replace or reorder a bound picture`.
Read-only inspection of the project’s saved UI object showed that the queued
annotation and bound v3 submission had identical values. Project storage’s
canonical JSON had reordered object keys, while the Renderer compared
`JSON.stringify` strings and incorrectly rejected the failed-task reopen.

`timeline-annotation-queue.js` now compares JSON structures independently of
object-key insertion order. The failed-task recovery guard, submission-boundary
checks, and receipt comparison use that structural helper. A focused regression
test reproduces persisted key reordering and confirms that changed annotation
content is still rejected. The actual Browser rebuild passed the old false
mismatch check and reached the next product guard. This evidence therefore
confirms the recovery-comparison fix; it does not claim successful recovery.

Focused checks passed:

- `node --test tests/property/timeline-annotation-queue.test.mjs` — 5/5,
  including the canonical-key-order regression.
- `pnpm run renderer:workbench:test` — renderer boundary check passed.
- `pnpm run typecheck` — passed; contract generation reported 97 generated
  contracts/validators.
- The offline-only paid-budget guard test passed with the CNY 8 hard ceiling;
  it made zero external calls and does not simulate provider success.
- `docker build -f docker/Dockerfile -t ave-p4-browser:annotation-order-20261022 .`
  built local image `sha256:1ca0291e91b023a16c919c4b2a8bdfab9a313548c767dd36158f70ea1a4a63df`.

## Browser result and blocker

The original P4 Browser port 6080 was occupied by the running
`wechatassistant-gui-only-v9` container, so it was not touched. An isolated AVE
Compose runtime on 6081 was started on the existing synthetic P4 volumes and the
actual Browser opened the v6 project. The rebuilt Browser’s failed-task edit
action no longer reported a local annotation mismatch; it was rejected at the
next product guard with `REQUEST_EXPIRED`. The failed v4 request’s authorization
expired at `2026-10-21T17:41`; the product correctly refused to supersede or
reopen that request. No model call followed.

A fresh request form was displayed but not submitted. The latest user
instruction then required future verification to use the existing local
development environment rather than an isolated environment. An attempted
operation to fill this unsent request in the isolated paid Compose Browser was
denied by automatic approval review for that reason and was not executed. No
retry or indirect substitute was attempted. The current paid Compose service
was already running at that point and was left intact; its ledger still matches
the preflight hash above. `127.0.0.1:6080` remains owned by WeChat, so the next
run needs an already-running AVE development Browser on a non-conflicting
endpoint and a fresh in-app authorization. Do not stop, restart, or change the
WeChat containers to recover the port.

No new MP4, timeline version, Preview/Master receipt, QC result, undo/redo
sequence, or re-open-after-export record was produced in this checkpoint. The
previously saved v4 export remains historical output and is not presented as
this requested run’s result. Remaining OP-01–24 and WIN-09/WIN-10 coverage is
still open.


## Documentation closeout

`pnpm run docs:sync` passed and regenerated `docs/current/**` from the manifest and state. The generated status reports no active package and keeps P4 pending; the machine-readable manifest/state keep WP-S3-RELIABLE-UX-001 blocked with an active debt and this Evidence. `pnpm run docs:check` was run and failed on 37 historical evidence-applicability findings (12 `UNVERIFIED` records and 25 applicability findings, including unrelated capabilities). These are existing historical applicability gaps, not proof of the current implementation and not a passing package check. No generated file was hand-edited. P4 is not complete; `docs:complete` was not run.
## Addendum: 2026-10-22 live failure diagnosis

The existing Browser on `127.0.0.1:6081` was used; WeChat on `6080` was not touched. One fresh authorized request, `request:b012bb1c-48a6-4aa0-b54c-6a3f95715d3f`, completed six vision calls and one planner call. The saved planner measurement requested `target_duration_ticks=75` (2.5 seconds) while setting `retain_manual_layout=true` against base Timeline v6, whose bound whole-work extent is 90 ticks (3 seconds). `packages/platform/contract-runtime/src/creation-planning.mjs` correctly rejected this at the retained-extent guard with `CREATION_LAYOUT_REBOUND`; the persisted failure has no committed draft IDs. This request was a mismatched duration-trim prompt, not the authorized grayscale annotation operation, and it was not retried.

The old grayscale message remains bound to request `request:b4b635c9-3484-4ade-9dbc-aae9679a6bf8`, draft v4 and `shot_1` at 3/2 seconds. The live UI resolves its anchor uniquely to `shot_1` in v6, but the player still has no loaded preview and the failed submission keeps its draft controls locked. Host `supersedeFailedTimelineAnnotation` rejects this local recovery operation after the request's grant expiry (`project-host.ts`, expiry guard); the saved event log still has only the original `failed` status and no `superseded` event. The fresh grant belongs to b012 and is not transferable to b4. The Host permission guard was not bypassed. A browser action intended to restore the historical anchor was rejected by automatic approval review because its target reference was not current; a later recovery-click retry was also rejected after the selector attempt limit. No model call or Host mutation followed those rejections.

The cumulative reservation after the seven new provider calls is CNY 5.106684 of CNY 8.000000, leaving CNY 2.893316. No further calls were made. P4 remains blocked pending a product-supported fresh authorization for the existing v4 annotation request (or a user-approved alternative that keeps the same evidence and budget bounds); a new request would not itself restore the old request's draft binding.
