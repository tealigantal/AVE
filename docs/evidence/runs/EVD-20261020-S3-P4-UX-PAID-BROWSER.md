---
evidence_id: EVD-20261020-S3-P4-UX-PAID-BROWSER
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-20
recorded_at: 2026-10-20T10:26:02.046690+00:00
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
code_fingerprint: ed3a884835cc52612483fe9406215eac2049e76cc60fb6e57424e1c3e332453c
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# Bounded paid Browser journey and source-evidence regression

This is new immutable execution Evidence. Earlier preflight recorded zero calls
at its own time; it cannot contain the later authorization, actual calls and
results. The existing Stage3 navigation and P4 plan link this record. This is
not a parallel status authority, P4 acceptance, Stage Exit or Release.

## Scope, budget and actual dispatch

The later authorization permitted a minimal isolated cumulative budget harness,
not a product billing subsystem. It preserves the original native fetch,
DashScope endpoint, models and existing authentication. Only the two newly
created synthetic clips, their hash-allowlisted sampled images, and synthetic
project context were eligible; profile, feedback learning and private media
were excluded. Original configuration is read-only; a temporary configuration
with explicit output caps exists only in the isolated container tmpfs.

The harness reserves worst-case input/output/reasoning cost before each physical
send, fsyncs a hash-chained ledger, retains reservations after every outcome,
and refuses overspending, unknown destinations/models/settings/data, duplicate
wire retries and concurrent owners. It uses input UTF-8 bounds plus framing
and an image allowance, pricing tiers and explicit output/thinking limits.
No discounts, free quota or refunds are assumed. It is test-only under
`docs/evidence/assets/p4-ux/current-run-20261020/budget-harness/`.

The final offline tests passed in the actual Linux production image with
network disabled and no credentials. Cases include concurrent sends, failures,
unknown outcomes, retries/revisions, restart, corruption/write failure and the
unraisable CNY 5 cap. `offline-verification.json` binds the exact harness hashes;
`budget-policy.json` records official pricing/token documentation.

Actual dispatch: **9 calls**, **6 qwen3-vl-plus + 3 qwen3.7-max-2026-05-20**,
all HTTP 200, no uncertain sends. Cumulative nonrefundable conservative
reservation **CNY 3.740346 / 5**. Returned usage priced at the recorded rates
estimates CNY 0.871640; even counting reasoning again as additional output gives
CNY 1.138976. Neither is a verified provider bill. See `paid-summary.json` and
`ledger/ledger.jsonl`. There was no paid retry after the annotation failure.

## Actual Browser outcomes

Runtime: Compose Browser http://127.0.0.1:6080, image
`sha256:8d937f9ed613ee1f0743cd0f41fad86896d4437cd50dc459679ac25512e1e75a`,
pre-repair source fingerprint
`bb2b62e940b3ab605181e0e7f601dacb250da49b7ce48520af54692137731f76`.
The real Playwright Browser used normal UI operations, without seeded responses
or mocked model routes. Local trace/video are retained under
`output/playwright/p4-20261020/paid/`; traces may contain test session tokens
and must not be uploaded without separate screening.

- The earlier duplicate-import project failed CREATION_ORIGINAL_AMBIGUOUS before
  dispatch. A new test project imported each same synthetic fixture once; the
  original duplicate project remains intact and this defect is not fixed here.
- New project `5fd72046-0253-41e8-8069-5cb2b24d0880`, request
  `request:b4b635c9-3484-4ade-9dbc-aae9679a6bf8`: six actual vision responses
  and a two-call measured/final planner exchange committed v1, two 3-second shots.
- v1 Preview/Master were correctly blocked by FREEZE_FRAME for the static blue
  second shot (3–6 seconds). The gate was not weakened. Deleting that shot by
  actual precision UI created v2. Undo restored two shots as v3; redo made v4,
  one 3-second dynamic shot. v4 Preview and Master both passed QC.
- Actual playback/seek, right-click preview annotation, precise 3/2-second
  shot_1 anchor and combined submission were exercised. The local stale-version
  guard first refused submission without a call; after refresh the saved input
  submitted once. The ninth provider response succeeded, but local retention
  validation rejected it: MODEL_OUTPUT_INVALID / CREATION_LAYOUT_REBOUND,
  `retention cannot replace or reorder a bound picture`. No annotation-derived
  draft or grayscale output was created. v4 stayed intact.
- The actual MP4 download completed with Playwright download failure=null.
  `AVE-v4.mp4` is 337085 bytes, 3.000000 seconds, H.264/AAC. Full ffmpeg decode
  exited 0. SHA-256 `bf87aeb547b6ed163227e925c5b7c241339a7225f89eda60c39ef510a5adbdc6`
  exactly matches the Master receipt. Preview/Master have distinct execution
  plans, the same target-neutral semantic hash, and passed QC. No audio sidecar
  was required/provided for this no-library-audio version.
- Closed and reopened this actual project. v4, one shot, two distinct imported
  assets, failed annotation text/precise anchor and retry/edit state persisted.
  Screenshot `reopened-v4-annotation-failure.png` was visually inspected. Export
  history recorded one write before close; its persistence after reopen was not
  separately re-opened and is not claimed.

Receipts: `render-provenance-receipt.json`, `export-verification.json`.
Browser video `video-2026-10-20T09-41-59-201Z.webm` and trace
`traces/trace-1792489318898.trace` retain the exact interaction chronology.

## Root cause, narrow repair and verification limits

Raw v1/v3 Timeline objects carry shot_1 evidence refs; v2/v4 omit them. The
Browser timeline projection omitted semantic_sidecar, and a whole-track
precision command dropped provenance even from the untouched shot. The later
model response retained the correct source and duration, but Host retention
could no longer find the bound span reference.

The final repair in `apps/desktop/src/main/ipc/creation.handlers.ts` projects
only semantic_id, labels and evidence_refs for clips. Arbitrary metadata and
source paths stay hidden. The ordinary exact CommandEditIntent/IR/storage
binding remains unchanged. An earlier attempted Host-side command hydration
failed CREATION_MANUAL_EXECUTION_REBOUND in the real test and was removed;
there is no delivered Host/storage protocol change. Early test setup failures
(duplicate local names, missing pnpm PATH, undefined wire fields and protected
fixture scope) were corrected; none involved an external model call.

`stage3:manual:test` passes with a separate synthetic fixture project using the
actual Browser projection, deletion command, real Host commit and reopen. It
asserts exact retained source evidence and no arbitrary metadata in projection.
All model responses in this regression are local fixtures. Final typecheck,
architecture and web:host:test also passed. Logs are in the harness directory.
This repairs the specific provenance omission; it does not certify every
operational property of all projected whole-track edits.

**The repaired source was not rebuilt into the Browser image, and the paid
annotation flow was not repeated.** Previously persisted v2/v4 are not migrated
or silently repaired. The remaining conservative allowance is CNY 1.259654;
a normal two-planner-call retry at the observed bounds needs about CNY 2.4,
so a complete new paid attempt cannot be guaranteed inside this run's cap.
No reservation was refunded/reset and no partial retry was dispatched.

## Governance, preservation and exact remaining block

P4 remains blocked with active DEBT-S3-P4-CURRENT-UI-REVALIDATION; P5 remains
pending. Next: rebuild the repaired source, verify the Browser source-evidence
path and then complete an adequately bounded full annotation journey and the
remaining OP-01–24 / WIN-09–10 checks. This is a technical/capability block,
not an approval denial, missing repeated user confirmation, unknown provider
outcome or human-review prerequisite. Stage2 duration/real-media gates and the
editing-execution-v1 backlog are independent.

The narrow projection/test change alters 24 already-deferred historical scopes.
`changed-historical-scopes.json` lists exact before/after hashes and includes;
they remain explicitly UNVERIFIED, not accepted. Only their reviewed debt
classification is advanced to this source and this Evidence; no old Evidence
or applicability record is rewritten. Current-design full revalidation remains
outstanding. Default docs checks may carry these visible debts; strict and
completion checks must continue to reject unverified capability acceptance.

The isolated Browser and both test services were stopped. Original desktop and
whisper services remain stopped; volumes, originals and ledger were retained.
The temporary authentication copy was memory-only. All 1480 initially excluded
files remain byte-identical, none missing; only the already-dirty P4 plan changed
within the initial 1481-file inventory. HEAD is still
`99aeecee096a9424eb1df465f5546b297b90b0b9`, upstream
`origin/codex/p4-stage-start-20261009`, index empty. No commit, push, PR, merge,
private-media access or P5 work in this paid phase. See `preservation.json`.
