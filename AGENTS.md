# AVE Coding Agent Instructions

AVE is a local, conversational AI Vlog editor. Its current lifecycle is an accepted P0 reliable-media baseline plus a specified editing-execution-v1 programme; specification is never evidence of implementation.

## Mandatory reading order

1. `AGENTS.md`
2. `PROJECT_GOAL.md`
3. `docs/README.md` for domain and terminology routing
4. the relevant numbered domain policy under `docs/00-vision/` through
   `docs/08-decisions/`
5. `docs/product/PRODUCT_VISION.md`
6. `docs/product/EDITING_CAPABILITY_SCOPE_V1.md`
7. `docs/architecture/SYSTEM_ARCHITECTURE.md`
8. `docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md`
9. `docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml`
10. `docs/program/editing-execution-v1/CAPABILITY_MATRIX.yaml`
11. `docs/program/editing-execution-v1/ACCEPTANCE_MATRIX.yaml`
12. the active work package's specifications
13. `docs/current/STATUS.md`
14. `docs/current/WORK.md`

Do not use `docs/archive/` to infer current requirements. The authorities are: durable goal (`PROJECT_GOAL.md`), product scope (`docs/product/`), stable architecture (`docs/architecture/`), machine-readable programme (`docs/program/`), and generated current state (`docs/current/`).

The numbered directories are durable domain policy and navigation. They do not
replace hard-coded programme paths, generated state, contracts, tests, or
Evidence and cannot promote implementation status. For implementation work,
also read `docs/04-engineering/AGENT_EXECUTION_RULES.md`.

## Work-package protocol

Work only inside the active package's `allowed_paths`; all other paths are forbidden unless the user changes the package. Before work run `pnpm docs:start -- <WP-ID>`. Before claiming completion create an `EVD-*` record; then run `pnpm docs:complete -- <WP-ID> <EVIDENCE-ID>`, `pnpm docs:sync`, and `pnpm docs:check`.

Never hand-edit generated current documents or `docs/DOCUMENT_INDEX.md`. An interface, schema, directory, or smoke test is not implemented user capability. A blocked package must be marked `blocked` with Evidence and active Debt, not passed. Stable architecture changes need an ADR. Codex may not shrink v1 scope without explicit user authorization. Completion chooses the next dependency-ready package.

Pure documentation Work Orders may maintain an independent `DOC-*` ExecPlan and
Evidence without changing the implementation programme. They must not advance,
complete, or attach Evidence to an unrelated active package. They may not edit
generated current documents or the generated index; any tooling change requires
its own allowed paths.

## Stable engineering invariants

- Project Host is the only project-state authority and SQLite writer.
- Contracts are the cross-language source; never hand-edit `contracts/generated/`.
- Authoritative time is RationalTime, never floating seconds.
- Renderer never directly accesses SQLite, originals, shell, FFmpeg, or model SDKs.
- Worker never opens/modifies `project.sqlite`; stdout is structured protocol only.
- Timeline changes only through the current `CommandEditIntent` →
  `CommandEditIR` → simulation/validation → CommitPlan/Commit path; future
  command-free semantic Edit Intent requires a Host-owned adapter into that
  path. Preview/Master never silently discard unsupported semantics.
- Project Host derives target-specific Preview and Master RenderGraphs from the
  committed Timeline. They must share the same target-neutral semantic
  manifest/payload/hash, and each has its own ExecutionPlan.
- `CreativeSkillOutputV1` is the current typed Preset-selection boundary;
  future Creative Skill Definitions are evidence-bound reasoning knowledge and
  are not executable code.

## Verified command vocabulary

Use pnpm: `pnpm install --frozen-lockfile`, `pnpm run docs:sync`, `pnpm run docs:check`, `pnpm run typecheck`, `pnpm run architecture`, `pnpm run contracts:check`, `pnpm run check`, and `pnpm run acceptance:final:synthetic`. Re-verify a command if its script changes.
