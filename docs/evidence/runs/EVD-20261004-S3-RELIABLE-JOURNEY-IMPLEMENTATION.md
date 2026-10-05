---
evidence_id: EVD-20261004-S3-RELIABLE-JOURNEY-IMPLEMENTATION
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-04
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 218d4e0439548a2a424f43c6890243132cd8b89d38698f94b538691f29b9ede8
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# P3 implementation and current-container handoff

P2 closed only after the user's exact statement “人工审核通过，继续”; P3 was then started through docs:start. This record does not reuse that approval for P3. User's instruction to omit checks and rebuild for personal review controls this round: full/focused tests, standalone typecheck/contracts/docs:check, actual playback, cloud generation and subjective review are not-run. Contract generation and the image build's required TypeScript compilation ran; they are packaging evidence, not product acceptance.

## Implemented boundaries

- Host owns WorkspaceIssueV1 immutable revisions in existing object_refs/object storage. No SQLite migration, localStorage replacement, compatibility reader or old IPC alias. Failure responses include saved project/asset/request/version identity, cause code, preserved work and recovery. Query/report/acknowledge retain current registered-session/project guards. Closed/resolved prompts preserve historical revisions; a new occurrence remains actionable. Persistence failure keeps the original failure and explicitly marks the issue unsaved.
- Existing error dialog consumes this current Host journal and restores it on refresh/reopen. Unrelated successful operations do not clear unresolved failures; technical details are collapsible. Normal superseded/cancelled browse responses do not open an error modal. Renderer-only errors remain explicitly unsaved until Host confirms.
- Existing ui.save chain confirms the actual input revision. Saving/pending/saved/failed and failed restoration are distinct; explicit retry does not claim a failed save succeeded. Normal close keeps its save barrier. Pagehide asynchronous writes are not a guarantee that unconfirmed text survived a sudden disconnect.
- Existing job projection presents actual persisted PENDING/READY/RUNNING/RECOVERING/PAUSED/WAITING_FOR_USER/RETRYABLE_FAILED/BLOCKED/SUCCEEDED/CANCELLED states in Chinese, without invented zero progress or success from cancellation.
- Existing creation.export still writes the fixed, QC-approved Master and required credits with exclusive file creation. Host verifies saved bytes against that Master and registers a CreationExportV1 receipt for the exact request/draft/render/version/hash. New files are cleaned up if export/receipt registration fails; cleanup errors remain AggregateError causes. The export panel queries current per-version receipts after reopening. Browser reports download initiation and does not claim OS download completion; persisted file-written means the Host file was written. Re-export requires a fresh explicit action and current authorization.

## Public-area source audit (not interaction acceptance)

The owning plan's table lists nine rows, including profile learning; its scope is retained in full.

| Area | Current consumer/authority | This round / remaining actual evidence |
| --- | --- | --- |
| Project entry | project-panel; project handlers/session manager/recent projects | Existing create/open/trash identity and close barrier reused; real save/reopen pending |
| Materials | media-panel/source-player; import and browse Host | P2 accepted baseline reused; persistent failure feedback added; new-build browsing pending |
| Central player | source-player/player-panel; restricted media references | Current P2 chain retained; playback/seek/return and sound pending |
| Conversation | creation-workspace/workbench; current request Host | Confirmed input state and failure journal added; real model modify/cancel/stale-result journey pending |
| Refinement | precision-edit/creation-workspace; current CommandEditIR/CommitPlan | Shared request/version errors now recorded; actual protect/conflict/continuation pending |
| History/compare | comparison-panel and draft history Host | Existing watch/adopt/undo/redo semantics retained; actual version comparison pending |
| Soundtrack | audio-library; Host audio measurement/credits | Existing source/measurement/credit authority retained; actual audition/licensing/credits pending |
| Export | export-dialog/creation handlers/Host | Verified fixed-version write receipts and truthful browser wording added; downloaded file/sidecars need actual viewing |
| Profile learning | creation-workspace; user-profile repository/Host | Existing scoped consent/exception/forget operations retained; damaged/unmatched/disabled and learning journey pending |

## Packaging and preservation

Final build input: f3303656d8c9ea4b6ad8818b83630e06306701d6ea13b5428bd85cdecfcbd859. Both current containers were recreated by the existing compose.yaml + docker/compose.gpu.yaml, only desktop and whisper. Old desktop exited normally after SIGTERM (143); no forced kill. Named volumes, original material/export binds and GPU requests preserved; six unrelated container IDs/images/states unchanged. Docker Desktop exposed the same exports bind once as C:/... and once as /run/desktop/mnt/host/c/...; initial literal comparison rejected that representation difference, then physical source/destination/rw identity was compared after explicit normalization. No data move or compatibility path was added.

Assets: build-attempt01.log retains the initial TS unknown-narrowing compilation failure; build-attempt02.log/build-final.log are intermediate successful images, not deployed acceptance builds; build-export.log is final build. runtime-before.json/runtime-after.json/deployment-boundary.json and container-update.log record deployment scope. build-identity.json binds current inputs/code. No tests were run to manufacture a green result. P3 remains blocked on current real journey and review; P4 is not started, no commit/push/merge/release.
