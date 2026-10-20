# DOC-012 Current Evidence Applicability Reconciliation

## Scope

Reconcile the current `docs:check` Evidence-applicability failures after the
October 15 source changes. This is an independent documentation work order. It
does not activate, complete, or attach Evidence to an implementation package,
and it does not change P4/P5 programme status.

The starting worktree contains extensive pre-existing edits and untracked files.
They were retained. The initial diagnostic checkpoint changed no source,
generated-current document, or programme manifest. A later focused follow-up
updated only three verified P4 rows in the applicability index, as recorded
below.

### Authorized test-fixture scope extension (2026-10-15)

The user authorized correcting stale text-only media fixtures while preserving
all existing assertions and production validation. Allowed paths for this
extension are `tests/integration/stage2-synthetic-media.ts`,
`tests/integration/creative-context-host.test.ts`,
`tests/integration/creative-skill-knowledge-host.test.ts`,
`tests/integration/duration-blueprint-host.test.ts`,
`tests/integration/story-intelligence-host.test.ts`,
`tests/integration/permission-matrix-host.test.ts`,
`tests/integration/intelligence-pipeline-host.test.ts`, and this DOC-012 plan/Evidence.
The shared fixture helper is needed because five independent Host suites create
media that now passes through the real probe; a single deterministic valid image
keeps those tests consistent without changing business logic, assertions, or
probe standards.

## Current findings

The latest elevated `pnpm run docs:check` reports 34 failures, all of the form
`evidence applicability <capability>`. The three earlier `EPERM realpath`
messages were sandbox-only and disappeared when the same checker ran with
approved workspace access. The 34 failures group as follows:

- `editing-execution-v1` (3): `CAP-RENDER-001`, `CAP-PRESET-001`,
  `CAP-FND-001`.
- `creative-assistant-v1` (13): `CAP-CA-CONTEXT-001`, `CAP-CA-SKILL-001`,
  `CAP-CA-DURATION-001`, `CAP-CA-STORY-001`, `CAP-CA-PERMISSION-001`,
  `CAP-CA-PIPELINE-001`, `CAP-CA-FEEDBACK-001`, `CAP-CA-PRODUCT-001`,
  `CAP-CA-PRODUCT-002`, `CAP-CA-UX-001`, `CAP-CA-EXIT-001`,
  `CAP-CA-GOV-003`, `CAP-CA-GOV-002`.
- `creative-assistant-stage3` (18): `CAP-S3-FIRST-LOOP-001`,
  `CAP-S3-SKILL-001`, `CAP-S3-DOCKER-001`, `CAP-S3-WEB-001`,
  `CAP-S3-DOCKER-CLEAN-001`, `CAP-S3-MEDIA-001`,
  `CAP-S3-AUDIO-PACK-001`, `CAP-S3-SOUNDTRACK-001`,
  `CAP-S3-PRECISION-001`, `CAP-S3-MEDIA-CLOSEOUT-001`,
  `CAP-S3-RELIABLE-IMPORT-001`, `CAP-S3-RELIABLE-PREVIEW-001`,
  `CAP-S3-RELIABLE-JOURNEY-001`, `CAP-S3-PROJECT-DELETE-001`,
  `CAP-S3-LEARNING-DEFAULT-001`, `CAP-S3-P4-TIMELINE-001`,
  `CAP-S3-P4-ANNOTATION-001`, `CAP-S3-P4-RECYCLE-001`.

For each listed capability, the current source-scope fingerprint differs from
the fingerprint in its applicability-index entry. Inspection of governed dirty
paths confirms that each scope contains changed implementation, contract,
test, or governance files. The historical Evidence remains unchanged. Its old
fingerprint cannot establish applicability to this checkout. Current
fingerprints alone are not evidence that the package's required tests passed.

`CAP-S3-ANIMATED-MEDIA-001` is not among the failures: its latest Evidence
records the current scope fingerprint, matching the independently recomputed
scope. Its own acceptance is a tested engineering capability and does not
close P4.

## Current verification

| Command | Result |
| --- | --- |
| `pnpm run docs:check` | Exit 1; exactly the 34 applicability failures listed above |
| `pnpm run stage3:p4-timeline:test` | Passed: timeline command properties and manual-draft Host integration |
| `pnpm run timeline-render:test` | Passed |
| `pnpm run renderer:workbench:test` | Passed |
| `pnpm run stage3:p4-annotation:test` | Passed: 6 storage/protocol cases and annotation Host/integration suites |
| `pnpm run stage3:p4-recycle:test` | Passed, including recent-project lifecycle and deletion recovery |
| `pnpm run stage3:desktop:test` | Passed: SQLite close, desktop lifecycle, authorization and bootstrap suites |
| `pnpm run typecheck` | Passed |
| `pnpm run contracts:check` | Passed: 97 schemas and 97 valid/invalid example pairs |
| `pnpm run architecture` | Passed: 1,498 source files scanned |
| `docker compose ps` | Existing desktop and Whisper services are healthy |

The P4 test suites above include synthetic media and focused integration
coverage. They do not establish current-build P4 UI interaction acceptance or
real-media annotation round-trip acceptance. No applicability entries were
refingerprinted and no historical Evidence was changed.

## Current programme state and next action

Generated status reports no active work package. The Stage3 manifest has
`WP-S3-RELIABLE-UX-001` blocked and `WP-S3-RELIABLE-ACCEPTANCE-001` pending.
The P4 current-source implementation handoff and subsequent independent review
record only partial/blocked outcomes; the older R3 closeout is bound to an
earlier source fingerprint. P5 has not started.

That initial next-action proposal is superseded by the later 2026-10-15 fixture-correction and final-check entries below. Do not treat the initial 34 findings as the current result or as product failures; current docs:check findings are reported in the final verification section.

For P4, the remaining UI acceptance must exercise the user's current Docker Browser build and produce automated WIN-09/WIN-10 failure/recovery and export/reopen receipts bound to that build. The later Browser-entry clarification supersedes any Electron target implied by this initial checkpoint. Human aesthetic or listening feedback is optional. Keep P4 open and P5 pending until their own gates are satisfied.

## 2026-10-15 focused P4 scope revalidation

The P4 timeline, annotation, and recycle scopes each passed their package
required focused tests, typecheck, Contracts, and Architecture checks. Their
recomputed scope fingerprints and exact successful commands are in
[`p4-scope-verification-20261015.json`](../evidence/assets/doc-012/p4-scope-verification-20261015.json)
(SHA-256 `43a2be74a85079b9646b00dd07392d6621c088169583f6c0a7dbd160e757bb43`).
Only the corresponding three existing index rows were refreshed to cite this
DOC-012 revalidation; their historical Evidence files and programme capability
statuses remain unchanged.

The final `pnpm run docs:check` now reports 31 applicability failures, down
from the initial 34. The remaining IDs are:

- `editing-execution-v1`: `CAP-RENDER-001`, `CAP-PRESET-001`, `CAP-FND-001`.
- `creative-assistant-v1`: `CAP-CA-CONTEXT-001`, `CAP-CA-SKILL-001`,
  `CAP-CA-DURATION-001`, `CAP-CA-STORY-001`, `CAP-CA-PERMISSION-001`,
  `CAP-CA-PIPELINE-001`, `CAP-CA-FEEDBACK-001`, `CAP-CA-PRODUCT-001`,
  `CAP-CA-PRODUCT-002`, `CAP-CA-UX-001`, `CAP-CA-EXIT-001`,
  `CAP-CA-GOV-003`, `CAP-CA-GOV-002`.
- `creative-assistant-stage3`: `CAP-S3-FIRST-LOOP-001`,
  `CAP-S3-SKILL-001`, `CAP-S3-DOCKER-001`, `CAP-S3-WEB-001`,
  `CAP-S3-DOCKER-CLEAN-001`, `CAP-S3-MEDIA-001`,
  `CAP-S3-AUDIO-PACK-001`, `CAP-S3-SOUNDTRACK-001`,
  `CAP-S3-PRECISION-001`, `CAP-S3-MEDIA-CLOSEOUT-001`,
  `CAP-S3-RELIABLE-IMPORT-001`, `CAP-S3-RELIABLE-PREVIEW-001`,
  `CAP-S3-RELIABLE-JOURNEY-001`, `CAP-S3-PROJECT-DELETE-001`,
  `CAP-S3-LEARNING-DEFAULT-001`.

The deduplicated no-paid-API checks that passed are recorded in the Evidence
asset and above. The user subsequently authorized a test-fixture-only
correction. Six affected Host suites now generate decodable synthetic MP4 inputs
while retaining their original assertions and real-probe validation. No
business logic or assertions were changed. After this update,
`creative-context:test`, `creative-skill-knowledge:test`,
`duration-blueprint:test`, `story-intelligence:test`, `permission-matrix:test`,
and `intelligence-pipeline:test` passed, including property, Host, and storage/
protocol portions where present. `feedback-revision:test` and
`stage2-workspace-renderer:test` also passed. The Product actions integration
was instrumented in a temporary copy to identify its slow awaits, then the
original test was run unchanged to exit code 0. The full `pnpm run stage2:check`
subsequently completed with exit code 0, including Product actions. All Stage2
synthetic media tests passed; none assert real-media or human acceptance.
`acceptance:foundation:real` requires a separately authorized media manifest,
`acceptance:basic-vlog:real-review` requires human review, and
`stage2-product-workspace:real` is explicitly retired; none is recorded as a
pass.

P4 remains open: WIN-09/WIN-10 still lack automated interaction receipts bound
to a build of the current source. The running Docker image is healthy but does
not prove a current-source build or acceptance. P5 remains pending.

## 2026-10-15 final check after authorized fixture correction

The final synchronized check has **33 `evidence applicability` failures** and
one additional `latest evidence fingerprint mismatch creative-assistant-stage3`
finding. The 33 capability IDs are the 31 listed above plus
`CAP-CA-GOV-001` and `CAP-S3-ANIMATED-MEDIA-001`. The additional latest-evidence
finding is recorded separately; no claim is made that its fingerprint is
current. The test-fixture additions changed governed test paths, so the earlier
31-count checkpoint is historical, not the final result. No other stale
fingerprint was overwritten to force the check green.

After `pnpm run docs:sync`, `pnpm run docs:sync -- --check` passed. The final
`pnpm run docs:check` exited 1 with the findings above. `pnpm run typecheck`
passed after the helper and test changes. The full `pnpm run stage2:check`
completed with exit code 0. The long Product actions test prints only its
terminal summary; await diagnostics showed actual render/Worker work of about
3–7 seconds at slow steps. The original test completed unchanged with exit code
0. The corrected tests verify synthetic FFmpeg MP4 media through the real probe;
they do not assert real-media or human acceptance.

The current `pnpm run stage3:check` completed with exit code 1 at
`tests/integration/stage3-desktop-workspace.test.ts:62`. The Electron journey
failed at `P4_ELECTRON_STAGE journey:start`: after clicking the selected-draft
Preview action, the harness found the button visible but `.player-panel video`
was `null` (`{"visibility":"visible","video":null}`). Subsequent
`DESKTOP_SHUTTING_DOWN` messages are cleanup after that assertion, not the
initiating failure. This is a current UI/Preview integration failure; no
business source was changed. The direct `worker:media:test` and
`animated-media:host:test` both passed, but the Animated Media package's required
full `stage3:check` did not, so its evidence applicability remains unverified.

The two additional applicability failures have an exact scope cause:
`CAP-CA-GOV-001` includes `tests/integration/story-intelligence-host.test.ts`,
and `CAP-S3-ANIMATED-MEDIA-001` includes `tests/integration/**`; the six
authorized fixture changes altered these governed bytes. They are stale-scope
findings rather than failures in the corrected fixture tests. The current
relevant Stage2 tests passed, but `docs:check` remains globally red and
`stage3:check` failed, so neither index row was refreshed. The extra latest
fingerprint mismatch appeared when `docs:sync` regenerated Stage3 `STATE.yaml`
with current code fingerprint
`9b8e5b7a12aba77547dba969affc3dc84462eafbfaf6aa2ee10b4bc09f8ad480`; the latest
animated-media Evidence is tied to an earlier fingerprint. This is stale
evidence, not a product-test failure, and historical Evidence was left
unchanged.

## Focused Preview-path diagnostic follow-up

A temporary instrumented copy of the Electron review harness reproduced the
failure once in the authorized development environment. At the timeout the
button remained visible and `.player-panel video` was `null`; the captured
renderer trace contained repeated `player-update` entries with empty
`previewUrl`, `previewBinding: null`, and `loaded: ""`, with no
`preview-response`, `preview-state-set`, or video mount entry. This places the
observed failure before Preview data reaches the player and rules out video
source decoding as the immediate cause in that run. The trace does not prove
whether the button listener failed to invoke `loadPreview`, or an upstream
state/selection guard prevented the query; therefore root cause remains
unresolved and no product fix is justified yet.

A second focused run did not reach the journey because the Electron harness
failed its startup workbench readiness check (`workbench: false`) and timed out
shutdown. The ordinary sandbox run also stopped before the journey on the
platform's immutable-original filesystem `EPERM`; the authorized run overcame
that constraint once. All instrumented copies and the workspace temp directory
were removed. No source code, original media, tests, assertions, or package
status were changed by this follow-up. Next diagnostic should trace the click
handler and `restorePreview` entry together with selected request/draft/render
IDs, then observe the Preview query outcome; do not rerun full Stage3.

## Browser deployment entry applicability check (2026-10-15)

The active Compose deployment was inspected without starting or changing it:
`docker compose ps --all` reported `ave-desktop-desktop-1` healthy on
`127.0.0.1:6080->8080/tcp` and `ave-desktop-whisper-1` healthy;
`docker compose logs --tail=80 desktop` reported `AVE direct browser Host ready
on :8080`; a read-only `curl.exe --head http://127.0.0.1:6080/` returned
HTTP 200. The exact active browser URL is therefore
`http://127.0.0.1:6080/` (the README's `http://localhost:6080/` alias also
uses the configured 6080 port). The port is corroborated by `.env`
`AVE_BROWSER_PORT=6080` and `compose.yaml`'s loopback mapping to container 8080.

The web image starts `apps/web/src/server.js` (`docker/start-desktop.sh`),
which serves files from `apps/desktop/src/renderer` (`apps/web/src/server.ts`);
`apps/web/src/renderer/browser/entry.js` is injected in place of the index's
`/app/main.js` and then imports `/app/main.js`. That app mounts the same
`workbench.js`/`player-panel.js` implementation. Preview selection still calls
`loadPreview` and queries `project.creation.preview`; the transport adapter is
different: Browser uses `/api/invoke`, while Electron preload uses
`ipcRenderer.invoke`.

Consequently, the prior failure at `tests/integration/stage3-desktop-workspace.test.ts:62`
was an Electron-workbench journey, not a direct check of the user's running
Docker/browser entry. Shared renderer code means it remains a useful signal for
the common UI path, but it cannot by itself establish a failure in Browser
transport or the active container. This entry check only verified HTTP
availability and source/config routing; it did not run an interactive Preview
journey. The user cancelled further Electron testing for this task. No gate,
test, business code, or container was removed, changed, or marked passed; the
previous Stage3 failure remains recorded as an Electron test failure.

## 2026-10-15 Browser-entry and stale-design reconciliation

This documentation-only follow-up corrects the active P4 acceptance target using the read-only deployment/source-routing check above. The user operates the Compose Browser at `http://127.0.0.1:6080/`; `apps/web/src/server.ts` is the web Host source; Docker runs its compiled `apps/web/src/server.js` artifact, the Browser loads the shared Renderer, and its `/api/invoke` transport differs from Electron preload IPC. The earlier `stage3-desktop-workspace.test.ts` Preview failure remains a true failure of that Electron journey and a signal for shared Renderer investigation. It is not a demonstrated failure of the active Docker Browser entry. No Browser Preview interaction was run here, and this correction does not satisfy WIN-09/WIN-10.

The active P4 package and Workspace Design now name the Compose Browser as the acceptance target. The P3 silver/gray Electron layout assertion was removed from normative current acceptance wording and preserved verbatim in `docs/archive/acceptance/2026-09-p3-electron-workbench-layout.md`, with a link from the archive navigation. Its historical acceptance status and Evidence references were not changed. The DOC-007 execution plan's former next-step text requiring an authorized Electron run is superseded by this clarification; P4 still needs current-build Browser interaction receipts for WIN-09/WIN-10.

Open product decision: the suggestion to move detailed creation-time permissions to global settings has not been approved or specified. No current permission requirement is changed and no implementation is claimed. A product decision must resolve ownership, timing, and consent semantics before any corresponding requirement changes.

This follow-up did not run Electron, Docker, or full functional acceptance and did not modify product source, tests, business environment, original media, programme status, or historical Evidence. It records documentation reconciliation only.
## Documentation verification result (2026-10-15)

- `pnpm run docs:sync`: unavailable because `pnpm` is not installed and Corepack cannot reach `registry.npmjs.org`; equivalent `node scripts/docs/sync.mjs` completed with exit 0.
- `node scripts/docs/sync.mjs --check`: exit 0.
- `node scripts/docs/check.mjs`: exit 1. Output contains 3 workspace-root `realpath` EPERM diagnostics, 33 Evidence applicability findings across the three programmes, and 1 latest Stage3 Evidence fingerprint mismatch. It emitted no broken-link diagnostic. These are documentation/scope applicability findings; they are not 34 product feature failures. The detailed applicability IDs remain in the earlier DOC-012 sections.
- No Electron, Docker, full feature test suite, or interaction acceptance was run for this documentation-only follow-up.

P4 remains open and P5 pending. The only remaining product/design decision surfaced here is whether detailed creation permissions should move into global settings; it is not approved or implemented.
### Documentation correction scope extension (2026-10-15)

The user's DOC-012 instruction authorized this documentation-only reconciliation. Necessary paths and reasons: `docs/program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-UX-001.md`, `docs/ux/WORKSPACE_DESIGN.md`, `docs/plans/2026-10-03-reliable-workbench-real-acceptance.md`, and `docs/program/creative-assistant-stage3/ACCEPTANCE_MATRIX.yaml` to replace obsolete Electron-as-current P4 guidance with the verified Docker Browser target while preserving WIN-09/WIN-10; `docs/archive/acceptance/2026-09-p3-electron-workbench-layout.md` and `docs/archive/README.md` to retain and route the superseded P3 assertion; `docs/README.md` and `README.md` / `README.zh-CN.md` to correct current status and route users to Docker; `docs/04-engineering/DOCKER_DESKTOP.md` to describe the actual Browser deployment and distinguish TypeScript source from the compiled image entry; `docs/program/creative-assistant-stage3/STATE.yaml` to replace stale Electron/unavailable-runtime debt with the verified Browser target and still-unverified acceptance; and the DOC-012 plan plus supplemental Evidence to record scope and outcome. Generated `docs/current/**` is refreshed from that metadata, not hand-edited. No implementation programme package is activated or completed by this independent document work order.
## 2026-10-15 current-source document alignment

The follow-up corrections and final documentation-only verification are recorded in [EVD-20261015-DOC-012-CURRENT-DOCUMENT-CORRECTION](../evidence/runs/EVD-20261015-DOC-012-CURRENT-DOCUMENT-CORRECTION.md). This supplements, and does not rewrite, the earlier Browser-design Evidence. Current metadata and generated status now retain P4 blocked/P5 pending, name the Compose Browser acceptance target, and classify the known 33 applicability findings plus latest fingerprint mismatch as evidence-governance debt. No source, tests, scripts, feature acceptance, or historical Evidence were changed for this follow-up.