---
evidence_id: EVD-20261020-S3-P4-UX-BROWSER-PARTIAL
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-20
recorded_at: 2026-10-20T08:46:22.172732+00:00
repository_commit: 99aeecee096a9424eb1df465f5546b297b90b0b9
code_fingerprint: 01a26c7304049cc9e73f1f60256098c8c4e19160a585a955b91d65006d1a47e1
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: blocked
---

# Current Compose Browser partial verification and asset-count repair

This is new execution Evidence, not a replacement for historical acceptance.
Existing programme/plan documents cannot preserve this run's immutable observations,
so this record belongs only to the Evidence layer. The owning P4 plan and Stage3
work-order navigation link here. No P4 completion, P5 start, Stage Exit or Release
is claimed. This phase did not commit or push.

## Environment and source binding

The target was the actual production Browser at `http://127.0.0.1:6080/`.
The task-owned Compose project was `ave-p4-20261020`, with new profile,
configuration, projects, uploads and exports volumes. Original user project,
configuration and media volumes were not used. Only the pinned Whisper model
cache was copied from a read-only original mount into a separate test volume.
All uploaded video was generated with FFmpeg, with provenance recorded in
`docs/evidence/assets/p4-ux/current-run-20261020/fixture-provenance.json`.
Vision/planner endpoints were deliberately configured to loopback port 9 with
dummy credentials. No external model invocation or provider authorization is
claimed. The build fetched public container metadata/model assets; this is not a
creative model inference request.

Initial UI image: `sha256:49a4b03012b754187bcd095666cd7c10437595e6381d4c6492c8f762712ba6b0`.
Its 910 embedded source hashes and 747 output hashes matched the pre-repair tree.
After the one-line renderer repair, a fresh Docker build succeeded using the
repository Dockerfile and frozen dependency layers. Final image:
`sha256:8d937f9ed613ee1f0743cd0f41fad86896d4437cd50dc459679ac25512e1e75a`.
Final source digest `cbe672eedf0e4479ec2aa4cd6f704f12c8e15ffcb3fc8c30c4d7acabb6931a1b`;
output digest `3e0b69aee4cd8b5a8b1cf88980cc828abd74c6c667694fac2c3c90b3d7d1c40b`.
All 910 source hashes and 747 output hashes matched; no unlisted source files
were found in the declared build roots. Details are in `repaired-image-verification.json`.
Whisper image remained `sha256:9ec266ac95e71f7cc6b402f7d5a8ea35ed1c0fb5ece915fbc9411faca596b3cc`.

## Actual Browser observations

Project `P4-20261020-WIN09-Synthetic-cd5fb026`, Host project ID
`a2acb1aa-165c-417e-bea7-5637fe703741`, was created through the normal UI.

| Gate / operations | Actual result and limit |
| --- | --- |
| WIN-09 / OP-02, OP-20 | At 08:28:46 UTC, invalid recovery.mp4 failed with original `moov atom not found`; blue.mp4 imported. Error history retained the original Worker error and source-reselection guidance. After >30 seconds and a successful duplicate upload, the failure remained; refresh preserved it. At 08:30:47, failed-only retry using corrected same-name video succeeded, with two distinct valid assets and automatic resolution of the related issue. Resolved history remained accessible; no manual mark-resolved shortcut was used. This full sequence ran on the pre-repair image; the final repaired image separately verified persisted assets/history and reopened state. No formal complete-current-image receipt is claimed. |
| OP-01, OP-05, OP-21, WIN-10 subset | Navigation, an unsent Chinese draft, page refresh, normal close/reopen via recents, and multiline input across versions/issues/help/assets/creation succeeded. After final-image Host replacement, reopening restored both videos and the multiline draft. |
| OP-24 subset | Actual Browser captures at 1440x1000, 1024x768 and 1280x800; checked 1440/1280 horizontal overflow false, and 1280 reduced-motion true. Screenshots inspected. Full populated-timeline geometry, OS IME and every keyboard/zoom case were not verified. |
| OP-06–19, OP-22–23 / full WIN-10 | No playable draft was generated. The live empty-state UI disabled authorized spans, precision commits, preview and export pending a request/draft. Real annotation submit/retry/reopen, version comparison/adoption and Preview/Master/export-hash journey remain unverified because no external provider/data authorization was established for this run. No seeded project or historical R3 run substituted for these operations. |

Screenshots/snapshots/trace/video are under `output/playwright/p4-20261020/`.
Relevant captures: `win09-recovered.png`, `precision-empty.png`, `reopened.yml`,
`layout-1024.png`, `layout-1280-reduced-motion.png`,
`current-image-project-count.png`, `current-image-project-count.yml`, and
`current-image-resolved-history.yml`. Recording spans two source identities and
intentional restarts; it is diagnostic evidence, not a formal full gate receipt.
Network traces may contain local test session tokens and remain local, unpushed.

## Scoped repair

The real project card displayed three materials while the gallery showed two
because duplicate uploads create multiple original-location records for one
asset. `apps/desktop/src/renderer/workbench/workbench.js` now counts distinct
original asset IDs, consistent with the gallery. No Host records/schema changed.
On the rebuilt image, the same reopened project displays `2 份素材 · 作品 v0`,
and both videos plus the unsent multiline draft remain. This actual duplicate
upload/reopen regression is the repair's behavioral verification.

## Engineering verification and limits

`checks/results.json` records 15 commands: 14 exit 0, one initially failed on
local Pillow version. Passed: web:host:test, stage3:p4-integration:test,
timeline-render:test, worker:render-graph:test, renderer:workbench:test,
interaction-acceptance:test, typecheck, contracts:check, architecture,
render-graph:test, stage3:request:test, stage3:generation:test, stage3:model:test,
and acceptance:final:synthetic. Model tests use controlled fixtures/local protocol
servers and do not establish a real provider journey. Synthetic acceptance
explicitly does not claim private/real-media acceptance.

The existing aggregate P4 test command invoked its Electron DOM fixture harness.
This was an execution-scope deviation from the Browser-only deployment target;
it is recorded only as an engineering fixture result, never as Browser acceptance,
and was not repeated. All acceptance interactions above used Chrome against
Compose Browser. No Electron user project was opened.

worker:render-correctness:test initially failed because host Python did not have
Pillow 12.3.0. The identical repository test was then executed using the freshly
built production container's pinned Pillow 12.3.0, networking disabled, repository
mounted read-only and temporary outputs: exit 0, `render graph media correctness
acceptance passed`. Original failure log is retained. After the renderer repair,
renderer:workbench:test, typecheck and architecture were rerun and passed.
The 910 source / 747 output hash verification also occurred after repair.

Documentation checks and final preservation inventory are recorded in the plan
and the run's checks/final-inventory files. Existing applicability failures are
not refreshed away, and historical Evidence is not rewritten.

## Disposition

P4 remains blocked with DEBT-S3-P4-CURRENT-UI-REVALIDATION active; P5 remains
pending. No docs:complete was run. Needed next: authorize a concrete provider and
synthetic-media data scope for this run, then execute the remaining full Browser
request-to-draft, precision, annotation, version and export journey on one bound
current build. Complete remaining OP-01–24 cases and formal WIN-09/WIN-10
receipts; reconcile only evidence-backed applicability entries. Human sign-off
is optional and is not the blocker. No permission-review denial occurred.

## Final gate results

`docs:sync` exit 0. `docs:check` and `check` exit 1 with 36 Evidence applicability findings and one latest Stage3 Evidence fingerprint mismatch (37 total; three more than the starting baseline after the renderer repair). Full check stopped at docs:check; downstream checks are not claimed as a complete suite. The independently run checks are listed above. Automatic docs sync updated current-source fingerprint fields, not historical Evidence or applicability hashes. All 1480 initial excluded files remain byte-identical; no original file is missing. Only the already-dirty P4 plan changed among initial dirty files. The task-owned Browser and Compose services were stopped; their volumes and recordings remain. Original user AVE services remain stopped, and unrelated services were untouched. No changes were staged, committed or pushed in this phase.
