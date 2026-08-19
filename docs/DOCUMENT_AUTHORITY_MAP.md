# Document Authority Map

## Purpose

This is the single authority relationship for AVE documentation. It resolves
the apparent “two documentation systems” without moving or duplicating either
layer.

The numbered directories are the durable domain navigation and policy layer.
They do **not** replace the retained product, runtime architecture, programme,
contract, Evidence, generated-current, specification, or ADR paths used by
repository governance and tooling.

## Authority by domain

| Domain | Domain authority | Retained execution/detail authority |
| --- | --- | --- |
| Long-term vision | [`00-vision/`](00-vision/README.md) | durable objective in [`PROJECT_GOAL.md`](../PROJECT_GOAL.md) outranks explanatory vision |
| Product experience | [`01-product/`](01-product/README.md) | current product scope in [`docs/product/`](product/) |
| AI intelligence | [`02-intelligence/`](02-intelligence/README.md) | detailed future designs in `docs/intelligence/` and `docs/product-intelligence/`; these are not current contracts |
| Stable architecture | [`03-architecture/`](03-architecture/README.md) | current runtime invariants in [`docs/architecture/`](architecture/) and root [`ARCHITECTURE.md`](../ARCHITECTURE.md) entry |
| Current implementation status | generated [`docs/current/`](current/) | programme Evidence in `docs/evidence/`; documentation-only Evidence does not promote capability |
| Execution programme and package order | [`docs/program/`](program/) | task ExecPlans in `docs/plans/` are living execution records, not programme status authority |
| Protocol definitions | [`contracts/`](../contracts/) | generated bindings are derived and must not be hand-edited |
| Architecture decisions | [`docs/decisions/`](decisions/) | [`08-decisions/`](08-decisions/README.md) owns ADR trigger and navigation policy |
| Work Orders | [`docs/07-work-orders/`](07-work-orders/README.md) | active implementation requires promotion into `docs/program/`; candidate Work Orders do not authorize work |

Supporting evaluation, engineering, and security policy lives in
`docs/04-engineering/`, `docs/05-evaluation/`, and `docs/06-security/`. Normative
future semantics live in `docs/specifications/`; executed facts live in
`docs/evidence/`; `docs/archive/` and completed plans are historical context,
never present-tense authority.

## Entry and index responsibilities

- Root `README.md` is the only first-entry orientation.
- Root `AGENTS.md` is the repository-discovered Coding Agent instruction
  authority.
- `docs/README.md` routes humans and agents to a domain.
- Generated `docs/DOCUMENT_INDEX.md` classifies programme documents and must
  not be hand-edited. Its omission of the numbered layer does not reduce that
  layer's navigation role.
- This file defines authority relationships; domain READMEs must link rather
  than restate the complete map.

## Conflict and lifecycle order

For implementation claims, use this order:

1. current contracts, source, executed tests, and applicable immutable
   Evidence;
2. generated `docs/current/` state;
3. machine-readable `docs/program/` scope and package state;
4. stable product and architecture authorities;
5. numbered long-term domain policy and future design;
6. historical plans and archive material.

Specification means defined, not implemented. Documentation existence never
promotes a capability to tested or accepted.

## Canonical terminology boundary

- **Edit Intent** is the future command-free semantic proposal. The current
  execution layer is `CommandEditIntent -> CommandEditIR -> CommitPlan`.
- **Semantic Render Manifest** is the target-neutral semantic identity.
  Preview and Master are separate target-specific RenderGraphs with separate
  Preview and Master ExecutionPlans. Legacy “统一/同一 RenderGraph” shorthand
  means shared semantic identity only; it never means one executable graph.
- **Creative Skill Definition** is future reasoning knowledge. Current
  **Preset / Skill Output** is the bounded `CreativeSkillOutputV1` Preset
  selection boundary. They are not equivalent.

## Documentation Architecture v1.0 freeze rules

After this freeze, every proposed new document must:

1. identify its owning authority layer and navigation parent;
2. state why no existing document can cover the content;
3. avoid a duplicate concept, architecture, status source, or decision record;
4. link to rather than replace the existing authority.

Changing an ownership boundary, current-state source, protocol authority, or
stable architecture requires a governed Work Order and, when architectural, an
ADR. Editing old decisions or future plans cannot substitute for that process.
