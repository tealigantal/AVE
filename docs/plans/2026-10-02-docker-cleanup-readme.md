# Docker cleanup and bilingual README ExecPlan

## Purpose / Big Picture
One Windows Docker Desktop Compose entry, two containers, useful English/Chinese GitHub onboarding and a reviewable PR.

## Context and Orientation
Branch codex/docker-one-click contains the pending Docker/browser foundation atop main. Include that necessary foundation; preserve native projects, credentials and unrelated containers. Reuse programme and architecture authorities.

## Plan of Work
Start WP-S3-DOCKER-002; record ADR-0039; fold initialization into its owning services; remove GUI remnants; write bilingual entry; validate persistence and required checks; complete Evidence and submit PR.

## Concrete Steps
`pnpm docs:start -- WP-S3-DOCKER-002`; packaging regression; `docker compose up -d --build --wait --wait-timeout 1800`; `pnpm run check`; `pnpm run acceptance:final:synthetic`; docs completion/sync/check; diff/secret review and PR.

## Validation and Acceptance
Exactly two services, unchanged volume identities, non-root Host, explicit missing-key/device errors, direct browser workbench, unchanged persisted project/export bytes, bilingual links. No new cloud/private-media invocation required.

## Idempotence and Recovery
Atomic configuration replacement and pinned cache reuse on repeated startup. Keep volumes/exports. Never prune, down -v or touch other projects. Preserve failure causes and repair the focused change.

## Interfaces and Dependencies
Configuration contract, pinned Whisper-small, Host/browser adapter and media semantics remain unchanged; initialization topology changes.

## Progress
- [x] Read runtime, pending changes, governance and authorization.
- [x] Implementation and bilingual entry.
- [x] Live verification and required checks.
- [x] Draft PR #29 created; EVD-20261002-S3-DOCKER-CLEAN-FINAL recorded and WP completed through docs:complete, docs:sync and docs:check.

## Surprises & Discoveries
No root LICENSE: no invented licence badge. One-shot containers reappear because Compose declares them. Windows Python defaults to GBK; source-writing helpers use UTF-8 explicitly.

Initial full check passed through worker:render-graph:test, then failed the required Pillow 12.3.0 assertion because default system Python has 11.2.1. The existing isolated Worker interpreter has 12.3.0. After selecting it via PATH and AVE_PYTHON, worker:render-correctness:test passed once; full check is rerunning in that environment. No dependency install, skip or assertion change. Three pending source files had CR/EOF whitespace; normalize those files without changing semantics and rebuild the image.

## Decision Log
Keep two runtime services and existing named volumes; drop Host privileges immediately after configuration generation. Preserve historical Evidence, add a new ADR.

First PR security job rejected the prior immutable WEB-FINAL download-path receipt. Preserve that record and the existing eight historical exclusions; add only its exact path to the established exclusion list and bind its normalized bytes to SHA256 22c9c0129908f05bb8e59b07e8ef0da99776fee8be56f8120986bdd7a33279b9 in the workflow contract test. All other source/new Evidence paths remain scanned. User's publication request authorizes this existing synthetic receipt; no key or private media content is present. This focused CI repair is added to the Work Order paths.

## Artifacts and Notes
Structural references: [Immich](https://github.com/immich-app/immich) and [Open WebUI](https://github.com/open-webui/open-webui/blob/main/README.md), checked 2026-10-02. Reuse product-first layout, language links, real screenshot and actionable Docker setup; do not copy unsupported capability/licence claims.

Packaging regression passed, including actual config initialization/0600 ownership, UID/GID/supplemental-group drop and credential-environment removal, pinned cache branch tests (controlled downloader), missing credentials and invalid/broken devices. Actual Docker Desktop build/start and repeat recreation both passed with only two healthy services. Persisted synthetic project integrity_check=ok; actual HTTP recent-project reopen, media read and close passed without a model call. Master SHA256 remains 657aeea0ab7196f43530df889048d4cea8b13f2e4fe047a9f3f7ee0694e2e1f6. Other container IDs remain unchanged. Both README local link checks passed. Independent read-only reviewer found no blocker; actual Host/Worker UID 1000 and private config ownership verified. Full check in progress; no result inferred from partial output.

## Outcomes & Retrospective
Two runtime services, no GUI/one-shot-container remnants, retained private configuration and durable projects/exports, and matching English/Chinese onboarding delivered. `pnpm run check` exited 0 once using the existing pinned Worker environment; `acceptance:final:synthetic`, final packaging and workflow guard checks passed. Initial default-Python and initial PR machine-path failures remain recorded. Independent review found no blocker. PR #29 is a draft for human review; no merge/release or creative-quality/human acceptance claim. Final remote-head CI status is reported separately from local validation.
