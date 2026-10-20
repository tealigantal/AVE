---
evidence_id: EVD-20261015-DOC-012-BROWSER-DESIGN-RECONCILIATION
work_package_id: DOC-012
date: 2026-10-15
result: completed
---

# DOC-012 Browser Entry and Design Reconciliation

This supplemental documentation Evidence records a current-target correction. The user's active deployment is the Compose Browser at `http://127.0.0.1:6080/`; its web Host source is `apps/web/src/server.ts` (compiled to `apps/web/src/server.js` in the Docker image) and its `/api/invoke` transport differs from Electron IPC while sharing Renderer modules. The earlier Electron Preview failure remains accurate for that Electron journey and is not evidence that the Docker Browser entry fails. HTTP health/source routing was previously checked; no interactive Browser Preview journey was run in this follow-up.

The P4 work-package clarification and Workspace Design now require P4 WIN-09/WIN-10 receipts against the current Docker Browser build. The obsolete P3 silver/gray Electron visual assertion was moved out of current normative acceptance wording and preserved at `docs/archive/acceptance/2026-09-p3-electron-workbench-layout.md`; its historical status and Evidence IDs remain untouched. The proposed global-settings location for detailed creation permissions remains undecided and is explicitly not treated as approved or implemented.

No product source, tests, scripts, business environment, original media, generated-current source, programme status, or prior Evidence was changed. Electron, Docker, and full feature acceptance were not run. Documentation synchronization and checks are recorded separately in the DOC-012 ExecPlan.
Verification: `node scripts/docs/sync.mjs` and `node scripts/docs/sync.mjs --check` exited 0. `node scripts/docs/check.mjs` exited 1 with three workspace-root realpath EPERMs, 33 capability applicability findings, and one latest Stage3 Evidence fingerprint mismatch. No broken-link diagnostic was emitted. `pnpm` was unavailable; Corepack could not fetch pnpm because registry DNS/network access was unavailable. No Electron, Docker, feature suite, or interaction acceptance ran. See the ExecPlan for exact applicability IDs and classification.