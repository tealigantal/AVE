# AVE Coding Agent Instructions

AVE is a local, conversational AI Vlog editor. Read generated `docs/current/STATUS.md` and `WORK.md` for the active programme, package and debts; do not infer current state from a dated plan or Evidence. Stage2's corrected-duration/real-media gates and the editing-execution-v1 backlog remain independent of Stage3 work. Specification and historical Evidence never prove current implementation or acceptance.

## Mandatory documentation reading order

A first-time repository reader starts at `README.md`, then follows its route to
this file, `docs/README.md`, generated `docs/DOCUMENT_INDEX.md`, and the
corresponding domain document.

For every Coding Agent task, read in this order:

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/DOCUMENT_AUTHORITY_MAP.md`
4. generated `docs/current/STATUS.md`
5. generated `docs/current/WORK.md`
6. the corresponding domain document

For implementation or capability claims, continue through the deeper authority
chain: `PROJECT_GOAL.md`; the relevant numbered domain policy;
`docs/product/PRODUCT_VISION.md` and
`docs/product/EDITING_CAPABILITY_SCOPE_V1.md`;
`docs/architecture/SYSTEM_ARCHITECTURE.md` and
`docs/architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md`;
`docs/program/editing-execution-v1/EXECUTION_MANIFEST.yaml` and the current
`docs/program/creative-assistant-v1/EXECUTION_MANIFEST.yaml`, and the active
Stage3 `docs/program/creative-assistant-stage3/EXECUTION_MANIFEST.yaml`, with each
programme's `CAPABILITY_MATRIX.yaml` and `ACCEPTANCE_MATRIX.yaml`; the active work
package's specifications; then generated `docs/current/STATUS.md` and
`docs/current/WORK.md`.

Do not use `docs/archive/` to infer current requirements. The authorities are: durable goal (`PROJECT_GOAL.md`), product scope (`docs/product/`), stable architecture (`docs/architecture/`), machine-readable programme (`docs/program/`), and generated current state (`docs/current/`).

The numbered directories are durable domain policy and navigation. They do not
replace hard-coded programme paths, generated state, contracts, tests, or
Evidence and cannot promote implementation status. For implementation work,
also read `docs/04-engineering/AGENT_EXECUTION_RULES.md`.

## P4 execution entry

For the demo workbench task, read the active
`docs/program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-UX-001.md`,
then the P4 section of `docs/plans/2026-10-03-reliable-workbench-real-acceptance.md`
and `docs/ux/WORKSPACE_DESIGN.md`. The package owns the operation checklist;
the plan owns execution order, checkpoints and verification. Follow the first
unfinished execution unit; finish real functionality before the visual rebuild.
`demos/p4-workbench/{index.html,demo.js,demo.css}` is the sole UI reference.
Keep its simulated data out of production. Do not substitute earlier UI designs.

Before editing, record the existing dirty files and inspect the named entry
points. Keep one unit's implementation, callers and tests together. Update the
existing plan with actual results and the next action; do not mark a whole
capability complete from a component test. Automated verification is agent-owned;
Complete interaction checks automatically where supported and record actual
coverage. Human review, listening and aesthetic feedback are optional and do not
block P4/P5 completion; never fabricate them. Continue already-authorized work
without repeated confirmation. Product permission checks and data protection
remain mandatory.

## Work-package protocol

Work inside the active package's `allowed_paths`. For necessary files within the user's existing task, record the concrete reason and update the manifest before editing; do not add a repeated user-approval gate. Unrelated work is outside scope. Before work run `pnpm docs:start -- <WP-ID>`. Before claiming completion create an `EVD-*` record; then run `pnpm docs:complete -- <WP-ID> <EVIDENCE-ID>`, `pnpm docs:sync`, and `pnpm docs:check`.

Never hand-edit generated current documents or `docs/DOCUMENT_INDEX.md`. An interface, schema, directory, or smoke test is not implemented user capability. A blocked package must be marked `blocked` with Evidence and active Debt, not passed. Stable architecture changes need an ADR. Codex may not shrink v1 scope without explicit user authorization. Completion chooses the next dependency-ready package. P4/P5 use verified engineering and automated interaction outcomes, not a human sign-off or repeated authorization prerequisite. Existing evidence of human feedback remains historical fact.

Pure documentation Work Orders may maintain an independent `DOC-*` ExecPlan and
Evidence without changing the implementation programme. They must not advance,
complete, or attach Evidence to an unrelated active package. They may not edit
generated current documents or the generated index; any tooling change requires
its own allowed paths.

## Merge gates

`main` is the development-integration branch. Development Integration, Stage
Exit, and Release are separate gates (ADR-0026): automatic merge uses the exact
final head SHA and green remote required checks, while missing private real
media or optional human feedback must remain truthful rather than
indefinitely blocking an otherwise safe development integration. An interface
replacement removes or replaces its old Schema, examples, generated bindings,
adapters, runtime readers, tests, and current documentation in one change.
Historical ADRs and Evidence are never rewritten as current instructions.

## Documentation modification rules

- Do not create a duplicate concept, a second architecture, or a parallel
  current-state source.
- Do not edit a historical decision as a substitute for a new ADR.
- Do not describe a future plan as current, tested, accepted, or implemented
  capability.
- Every new document must have one authority layer, explain why an existing
  authority cannot cover it, and link from the owning navigation page.
- Preserve generated boundaries: never hand-edit `docs/current/**`,
  `docs/DOCUMENT_INDEX.md`, or `contracts/generated/**`.

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
- Project Host derives one target-neutral **Semantic Render Manifest** from the
  committed Timeline, then builds target-specific Preview and Master
  RenderGraphs. The graphs share the manifest/payload/hash; Preview and Master
  each have their own ExecutionPlan. “One RenderGraph” is not a valid shorthand
  for this model.
- `CreativeSkillOutputV1` is the current typed Preset-selection boundary;
  future Creative Skill Definitions are evidence-bound reasoning knowledge and
  are not executable code.

## Verified command vocabulary

Use pnpm: `pnpm install --frozen-lockfile`, `pnpm run docs:sync`, `pnpm run docs:check`, `pnpm run typecheck`, `pnpm run architecture`, `pnpm run contracts:check`, `pnpm run check`, and `pnpm run acceptance:final:synthetic`. Re-verify a command if its script changes.
