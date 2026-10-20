---
evidence_id: EVD-20261015-DOC-012-CURRENT-EVIDENCE-RECONCILIATION
work_package_id: DOC-012
date: 2026-10-15
result: blocked
---

# DOC-012 Current Evidence Applicability Reconciliation

This documentation-only Evidence records the latest applicability-check
outcome and focused P4 revalidation performed during DOC-012. The checker
returned 34 current-scope applicability failures across
`editing-execution-v1` (3), `creative-assistant-v1` (13), and
`creative-assistant-stage3` (18). The exact capability IDs, fingerprint
classification, commands, observed results, and next action are recorded in
[the DOC-012 ExecPlan](../../plans/2026-10-15-current-evidence-reconciliation.md).

The P4 timeline, rendering, renderer, annotation, recycle/desktop, TypeScript,
contracts, and architecture checks listed there passed. They do not meet every
required test for all 34 scopes and do not establish P4 current-build
interaction acceptance. Historical Evidence and the applicability index were
not rewritten. A subsequent focused follow-up refreshed only the three P4
timeline/annotation/recycle index rows after their listed tests passed; the
hashed command ledger and current fingerprints are recorded in the ExecPlan.
The final docs check still reports 31 applicability failures. Programme
capability status was not promoted, P4 was not closed, and P5 was not started.

The user authorized a test-fixture-only correction after Stage2 Host tests
exposed text-only bytes being sent into the real-media probe. Six affected Host
fixtures now generate decodable synthetic MP4 files. The Creative Context,
Creative Skill, Duration, Story, Permission, and Intelligence Pipeline suites
passed with their existing assertions and probe checks unchanged. Feedback
Revision and Workspace Renderer tests also passed. Product workspace's Host
snapshot integration and Product actions integration passed. Await diagnostics
in a temporary test copy showed actual render/Worker work at the slow steps; the
original Product actions test then completed unchanged with exit code 0. Full
`pnpm run stage2:check` completed with exit code 0. No business logic or test
assertions were changed.

After the authorized test changes and generated-document synchronization, the
final `docs:check` exits 1 with 33 capability applicability failures and one
additional latest-evidence fingerprint mismatch for `creative-assistant-stage3`.
The 33 include the earlier 31 plus `CAP-CA-GOV-001` and
`CAP-S3-ANIMATED-MEDIA-001`; none were hidden or re-fingerprinted to force a
pass. `docs:sync -- --check` and typecheck passed. P4 remains open and P5
pending.

The current `stage3:check` completed with exit code 1 at
`tests/integration/stage3-desktop-workspace.test.ts:62`: the Electron journey
clicked the selected-draft Preview button but found no visible
`.player-panel video`. The later shutdown-denial logs were cleanup after that
assertion. Direct `worker:media:test` and `animated-media:host:test` passed, but
the required full Stage3 check failed, so Animated Media applicability remains
stale. The two additional applicability findings arose because the modified
`story-intelligence-host.test.ts` and broad `tests/integration/**` path change
the governed scopes; those are stale-scope findings, while the focused Stage2
tests passed. The latest Stage3 state fingerprint updated by `docs:sync` is
`9b8e5b7a12aba77547dba969affc3dc84462eafbfaf6aa2ee10b4bc09f8ad480`; the latest
animated-media Evidence remains bound to an earlier fingerprint. P4 remains
open and P5 pending.

A focused temporary Electron diagnostic follow-up reproduced the absent-player
symptom once. At timeout, the trace showed repeated player updates with empty
Preview URL/binding and no Preview query response/state-set event, locating the
failure before media reaches the player. It does not distinguish an un-fired
button handler from an upstream selection/state guard, so product root cause
remains unproven. A second run failed at Electron startup readiness
(`workbench: false`) before the journey. Temporary diagnostics were removed;
no product source, tests, fixtures, assertions, or P4/P5 status were changed.

A read-only check of the active deployment verified `ave-desktop-desktop-1`
healthy at `127.0.0.1:6080->8080/tcp`, Whisper healthy, the Desktop Host log
ready on container port 8080, and HTTP 200 for `curl.exe --head
http://127.0.0.1:6080/`. The deployed browser uses `apps/web/src/server.js`
and `apps/desktop/src/renderer/browser/entry.js`, then mounts shared
`apps/desktop/src/renderer/app/main.js` and `workbench.js`; Browser transports
queries through `/api/invoke`, while Electron uses preload IPC. The recorded
Stage3 failure is from `tests/integration/stage3-desktop-workspace.test.ts`
launching Electron and is not a direct test of the current Docker/browser
transport. It remains relevant evidence for the shared renderer/Desktop path,
but not proof that the active Browser entry fails. No interactive browser
Preview journey was run. User cancelled further Electron testing; no test or
gate was removed or marked passed, and the existing failure remains recorded.
