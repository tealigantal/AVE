---
evidence_id: EVD-20261015-DOC-012-CURRENT-DOCUMENT-CORRECTION
work_package_id: DOC-012
date: 2026-10-15
result: completed
---

# DOC-012 Current Document and Status Correction

This supplement records the continuation after the Browser-entry clarification. Current user documentation now treats the Compose Browser at `http://127.0.0.1:6080/` as the active user workflow. Source routing is described precisely: `apps/web/src/server.ts` is the TypeScript source; Docker launches the compiled `apps/web/src/server.js` artifact; `apps/desktop/src/renderer/browser/entry.js` uses the session-protected Browser transport. Electron IPC remains a separate runtime path, and its failed Preview journey is retained as an Electron result rather than a demonstrated Docker Browser defect.

The English and Chinese READMEs no longer report P4 formally closed or P5 running. Their current status follows generated programme status: P4 remains open/blocked and P5 remains pending/not started. The Browser screenshot is labeled as a build-specific Evidence artifact, not a fresh current-source screenshot or acceptance proof. The Docker guide now identifies the Compose Browser as the active user workflow and marks its October 2 linked evidence as historical/build-specific. The current P4 acceptance wording names the Browser target; OP-23 documents Browser downloads and distinguishes download initiation from OS-level save completion. The stale P4 debt summary and exit condition were corrected in `STATE.yaml`, then generated current documents were refreshed.

The old P3 silver/gray Electron visual assertion remains archived with its original text. Historical DOC-012 Evidence and all implementation-package statuses/capability outcomes were preserved; P4 remains blocked and P5 pending. The proposed global-settings location for detailed creation permissions remains an undecided product choice.

No product source, tests, validation scripts, container, or original media were changed. No Electron, Docker, or functional acceptance was run.

Verification: `node scripts/docs/sync.mjs` exited 0 and `node scripts/docs/sync.mjs --check` exited 0. `node scripts/docs/check.mjs` exited 1 with three workspace-root `realpath` EPERM diagnostics, 33 Evidence applicability findings and one latest Stage3 Evidence fingerprint mismatch. These are documentation applicability/linkage debt, not 34 product feature failures; no old fingerprint was refreshed. The check emitted no broken-link diagnostic.