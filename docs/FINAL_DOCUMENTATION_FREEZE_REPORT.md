# Final Documentation Freeze Report

> Historical snapshot: this report records the 2026-08-19 DOC-003 freeze. Its
> compatibility-route decisions were superseded by ADR-0025 on 2026-08-28.
> Current navigation and authority are defined by `AGENTS.md`,
> `docs/README.md`, `docs/DOCUMENT_AUTHORITY_MAP.md` and generated
> `docs/current/**`.

## Scope

This final governance pass covers documentation entry, authority, Coding Agent
reading order, current/future separation, and canonical terminology on branch
`codex/product-intelligence-docs`.

It is the independent documentation-only `DOC-003` lane. It does not implement
product intelligence, change runtime behavior, advance or complete
`WP-ADV-002`, or promote any capability/acceptance status. No application,
package, contract, database, script, or test file was modified.

Final state:

> **Documentation Architecture v1.0 Frozen**

This freezes structure, authority relationships, canonical terminology, and
future document-creation rules. It does not mean that historical files have
been deleted or that future product designs are implemented.

## Modified Files

The final pass is intentionally concentrated in these groups:

- entry and governance: root `README.md`, `AGENTS.md`, `ARCHITECTURE.md`,
  `docs/README.md`, `docs/CURRENT_STATUS.md`, and `docs/CURRENT_WORK.md`;
- new authority/freeze records: `docs/DOCUMENT_AUTHORITY_MAP.md`, this report,
  the DOC-003 ExecPlan, and independent DOC-003 Evidence;
- current terminology authorities: numbered domain policy, retained product,
  intelligence, architecture, pipeline, research, specification, Work Order,
  and programme documents under `docs/`;
- programme terminology only: `ACCEPTANCE_MATRIX.yaml` labels/scenarios and
  maintained work-package prose were updated without changing any ID, status,
  Evidence binding, dependency, allowed path, or active package;
- issue registry: DOC-ISSUE-001 now records the generated-index difference as
  an accepted v1.0 constraint resolved by the authority map.

Generated `docs/current/**`, generated `docs/DOCUMENT_INDEX.md`, programme
`STATE.yaml` and `CAPABILITY_MATRIX.yaml`, contracts, source, tests, scripts,
and historical Evidence/ADR records remain unchanged. The execution manifest's
Preset package display title was terminology-normalized; its IDs, state,
dependencies, paths, acceptance bindings, and ordering did not change.

## Authority Model

The repository has one model with two intentional views:

```text
README.md
  -> AGENTS.md
  -> docs/README.md
  -> docs/DOCUMENT_INDEX.md
  -> corresponding domain document
```

`docs/DOCUMENT_AUTHORITY_MAP.md` defines ownership:

- numbered `00-vision` through `08-decisions` directories are durable domain
  navigation and policy;
- retained `docs/product/` and `docs/architecture/` remain current scope and
  runtime architecture authorities;
- `docs/program/`, generated `docs/current/`, contracts, and immutable Evidence
  remain the implementation/status/protocol/executed-fact authorities;
- `docs/decisions/` contains ADR records; `docs/07-work-orders/` contains Work
  Order policy/templates; activation still requires the programme;
- generated `DOCUMENT_INDEX.md` is the programme class index, not a competing
  whole-repository domain map.

At the DOC-003 freeze, `docs/CURRENT_STATUS.md` and `docs/CURRENT_WORK.md` were
deprecated compatibility routes. ADR-0025 later removed them; current entry
points now link directly to generated
`docs/current/STATUS.md`, `WORK.md`, `VALIDATION.md`, and `DEBT.md`, which answer the
current phase, completed/blocked boundaries, active work, ready next package,
allowed paths, and debt.

## Remaining Ambiguities

No remaining ambiguity blocks the structure freeze. These registered,
non-blocking constraints remain:

1. `PROJECT_GOAL.md` is outside this task's allowed paths and retains legacy
   “统一/同一 RenderGraph” wording. The frozen authority map defines that
   shorthand as one shared Semantic Render Manifest, never one executable
   graph.
2. Generated `DOCUMENT_INDEX.md` does not list the numbered navigation layer.
   The authority map resolves ownership; generator expansion is optional future
   docs-tooling work, not required for v1.0.
3. Generated “Latest evidence” means latest programme Evidence, not the newest
   repository-wide DOC Evidence.
4. Legacy inline-heading formatting remains in some specifications and work
   packages; it is navigation debt, not an authority conflict.
5. The historical root blueprint, completed ExecPlans, older ADR formats, and
   candidate Work Orders remain searchable and must retain lifecycle labels.
6. Creator Model, expanded intelligence objects, learning, autonomy, and
   Creative Skill Definitions remain future designs until promoted through
   contracts, Host implementation, tests, Evidence, and applicable review.
7. Generated `docs/current/WORK.md` represents the active implementation
   package only; independent DOC lanes are recorded in their own ExecPlans and
   Evidence.

Canonical detail remains in `docs/decisions/OPEN_ISSUES.md`.

## Frozen Decisions

- There is one first-entry path and one document authority map.
- Numbered directories are navigation/policy; they do not replace current
  product, runtime architecture, programme, generated status, contract,
  Evidence, specification, or ADR authorities.
- Current status is generated once. Compatibility routes may link but never
  duplicate it.
- Future **Edit Intent** enters current execution only through a Host-owned
  adapter: `Edit Intent -> CommandEditIntent -> CommandEditIR -> CommitPlan`.
- One **Semantic Render Manifest** fans out to target-specific Preview and
  Master RenderGraphs, each with its own ExecutionPlan. There is no shared
  executable RenderGraph.
- Future **Creative Skill Definition** is reasoning knowledge. Current
  **Preset / Skill Output** is the bounded `CreativeSkillOutputV1` Preset
  selection boundary. They are not equivalent.
- A future plan, schema, interface, directory, test, or document never proves
  current user capability by existence alone.

## Future Documentation Change Rules

Every new document must:

1. identify its owning authority layer and navigation parent;
2. explain why the existing authority cannot cover the content;
3. avoid a duplicate concept, architecture, current-state source, or decision;
4. link to rather than replace the existing authority.

In addition:

- use an ADR for a consequential architecture decision; do not rewrite history
  to simulate a new decision;
- use a governed Work Order for generator, programme, contract, status-source,
  or ownership changes;
- keep current, specified, tested, accepted, blocked, and future claims
  explicit;
- do not hand-edit generated current documents, generated indexes, or generated
  contract bindings.

## Verification

Observed on 2026-08-19 Asia/Shanghai:

- `pnpm run docs:sync -- --check` passed;
- `pnpm run docs:check` passed;
- `pnpm run docs:architecture:test` passed after restoring the required
  `DEPRECATED` marker on both compatibility routes;
- `pnpm run docs:fingerprint:test` passed;
- `git diff --check` passed;
- all 428 Markdown files passed the relative-link scan;
- changed-path audit found only `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, and
  `docs/**` paths;
- generated current/index immutability audit passed;
- `ACCEPTANCE_MATRIX.yaml` parses, and all 34 acceptance IDs, statuses, and
  Evidence bindings match HEAD;
- `STATE.yaml` and `CAPABILITY_MATRIX.yaml` are unchanged; the execution
  manifest package state/dependencies/paths/acceptance/order are unchanged;
- maintained non-historical terminology scans found no unqualified current
  execution IR name, ambiguous unified/target-neutral RenderGraph, or old
  Creative Skill/current Skill Output equivalence;
- three independent read-only audits covered entry/authority, terminology, and
  current/freeze semantics.

Initial custom terminology audit iterations over-included Windows paths under
archive, Evidence, plans, and decisions, then one historical report, because
of exclusion-pattern errors. The corrected path filter passed; these were
validation harness issues, not documentation defects.
