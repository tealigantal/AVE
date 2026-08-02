# AVE Coding Agent Instructions

AVE is a local, conversational AI Vlog editor. Its current lifecycle is an accepted P0 reliable-media baseline plus a specified editing-execution-v1 programme; specification is never evidence of implementation.

## Mandatory reading order

1. `AGENTS.md`
2. `PROJECT_GOAL.md`
3. `docs/product/PRODUCT_VISION.md`
4. `docs/product/EDITING_CAPABILITY_SCOPE_V1.md`
5. `docs/architecture/SYSTEM_ARCHITECTURE.md`
6. `docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md`
7. `docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml`
8. `docs/program/editing-execution-v1/CAPABILITY_MATRIX.yaml`
9. `docs/program/editing-execution-v1/ACCEPTANCE_MATRIX.yaml`
10. the active work package's specifications
11. `docs/current/STATUS.md`
12. `docs/current/WORK.md`

Do not use `docs/archive/` to infer current requirements. The authorities are: durable goal (`PROJECT_GOAL.md`), product scope (`docs/product/`), stable architecture (`docs/architecture/`), machine-readable programme (`docs/program/`), and generated current state (`docs/current/`).

## Work-package protocol

Work only inside the active package's `allowed_paths`; all other paths are forbidden unless the user changes the package. Before work run `pnpm docs:start -- <WP-ID>`. Before claiming completion create an `EVD-*` record; then run `pnpm docs:complete -- <WP-ID> <EVIDENCE-ID>`, `pnpm docs:sync`, and `pnpm docs:check`.

Never hand-edit generated current documents or `docs/DOCUMENT_INDEX.md`. An interface, schema, directory, or smoke test is not implemented user capability. A blocked package must be marked `blocked` with Evidence and active Debt, not passed. Stable architecture changes need an ADR. Codex may not shrink v1 scope without explicit user authorization. Completion chooses the next dependency-ready package.

## Stable engineering invariants

- Project Host is the only project-state authority and SQLite writer.
- Contracts are the cross-language source; never hand-edit `contracts/generated/`.
- Authoritative time is RationalTime, never floating seconds.
- Renderer never directly accesses SQLite, originals, shell, FFmpeg, or model SDKs.
- Worker never opens/modifies `project.sqlite`; stdout is structured protocol only.
- Timeline changes only through Command/Commit; Preview/Master never silently discard unsupported semantics.

## Verified command vocabulary

Use pnpm: `pnpm install --frozen-lockfile`, `pnpm run docs:sync`, `pnpm run docs:check`, `pnpm run typecheck`, `pnpm run architecture`, `pnpm run contracts:check`, `pnpm run check`, and `pnpm run acceptance:final:synthetic`. Re-verify a command if its script changes.
