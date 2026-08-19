# AVE Documentation Home

This is the human and Coding Agent entry point for AVE documentation. It routes
questions to one authority; it does not replace generated status or executed
Evidence.

## Authority map

| Question | Authority | Rule |
| --- | --- | --- |
| Why does AVE exist? | [`PROJECT_GOAL.md`](../PROJECT_GOAL.md) and [`00-vision/`](00-vision/README.md) | durable objective and long-term direction |
| What user outcome is intended? | [`01-product/`](01-product/README.md) | strategy and journey; current scope remains in `docs/product/` |
| How should creative intelligence reason? | [`02-intelligence/`](02-intelligence/README.md) | capability and policy views, not implemented contracts |
| What boundaries must the system preserve? | [`03-architecture/`](03-architecture/README.md) and [`docs/architecture/`](architecture/) | long-term worlds plus current stable runtime architecture |
| How may Coding Agents build it? | [`AGENTS.md`](../AGENTS.md), [`04-engineering/`](04-engineering/README.md), active Work Order | repository rules outrank explanatory guidance |
| How is quality evaluated? | [`05-evaluation/`](05-evaluation/README.md) | creative, collaboration, trust, and technical evidence |
| How is user data protected? | [`06-security/`](06-security/README.md) | consent, local-first handling, retention, deletion |
| What may be implemented now? | [`07-work-orders/`](07-work-orders/README.md), [`docs/program/`](program/), [`docs/current/`](current/) | only the active governed package; current state is generated |
| Why was a consequential design chosen? | [`08-decisions/`](08-decisions/README.md) and [`docs/decisions/`](decisions/) | ADR policy plus accepted ADR records |

## Status vocabulary

- **Current**: verified repository behavior or a current authority.
- **Specified**: defined semantics without implementation proof.
- **Tested**: automated evidence exists for the named boundary.
- **Accepted**: the required human or real-media gate also passed.
- **Blocked**: the named capability cannot be claimed.
- **Future**: target direction requiring a promoted Work Order.

Only `docs/program/`, generated `docs/current/`, and immutable
`docs/evidence/` may establish current capability status. A polished design
document never promotes a capability.

## Canonical terminology

| Term | One meaning | Canonical detail |
| --- | --- | --- |
| Project Host | sole project-state, transaction, Timeline commit, and SQLite write authority | [`03-architecture/PROJECT_HOST.md`](03-architecture/PROJECT_HOST.md) and current runtime architecture |
| Evidence Graph | project-domain graph of source-bound observations and reviewed relationships; not repository `EVD-*` Evidence | [`02-intelligence/CREATIVE_INTELLIGENCE_ARCHITECTURE.md`](02-intelligence/CREATIVE_INTELLIGENCE_ARCHITECTURE.md) |
| Material Evidence Pack | versioned, bounded evidence snapshot consumed by one creative run | [`docs/intelligence/OBJECT_MODEL.md`](intelligence/OBJECT_MODEL.md) |
| semantic Edit Intent | future command-free product proposal for what should change and why; not the current Host execution input | [`docs/intelligence/OBJECT_MODEL.md`](intelligence/OBJECT_MODEL.md) |
| CommandEditIntent | current Host execution input containing ordinary Timeline Commands, actor, provenance, preconditions, and expected effects | current Edit IR implementation and ADR-0016 |
| Edit IR / CommandEditIR | current Host-resolved, command-bearing, provenance-rich execution record | current edit architecture and ADR-0016 |
| Timeline | authoritative versioned editorial state; `Sequence` is an object inside it and Timeline Core is its domain module | current Timeline specification |
| CommitPlan | validated atomic plan that commits one logical Timeline version | ADR-0006 |
| RenderGraph | target-specific Preview or Master graph instance derived from committed Timeline; the pair must share one target-neutral semantic manifest/payload/hash | current render architecture |
| ExecutionPlan | immutable authorization for one target-specific RenderGraph | ADR-0010 |
| Creator Model | product subsystem for consented creator understanding; User Creative Profile is its auditable preference view | [`02-intelligence/CREATOR_MODEL.md`](02-intelligence/CREATOR_MODEL.md) |
| Creative Skill Definition | future versioned reasoning knowledge unit | [`02-intelligence/CREATIVE_SKILL_RUNTIME.md`](02-intelligence/CREATIVE_SKILL_RUNTIME.md) |
| CreativeSkillOutputV1 | current bounded Preset-selection output; not the future reasoning definition | current Preset/Skill specification |
| Decision Record | project creative-decision trace | Trust layer and product object model |
| ADR | repository architecture decision | [`08-decisions/ADR_REQUIRED.md`](08-decisions/ADR_REQUIRED.md) |

The **current** authoritative execution sequence is: `CommandEditIntent ->
Project Host resolve/preconditions -> CommandEditIR -> simulate/validate ->
CommitPlan -> Commit -> Preview/Master RenderGraphs with the same semantic
payload/hash -> one ExecutionPlan per graph -> QC`.

The **future product** sequence may prepend `semantic Edit Intent -> Host-owned
adapter`, but that adapter must produce the current `CommandEditIntent` and is
not implemented merely because the semantic object is documented.

## Retained compatibility locations

The numbered hierarchy is the durable domain and navigation layer. Existing
paths remain because repository tooling and programme records depend on them:

- `docs/product/`: current product scope and editing capability authority;
- `docs/architecture/`: current stable runtime and execution architecture;
- `docs/intelligence/`, `docs/product-intelligence/`, `docs/pipeline/`,
  `docs/ux/`: detailed future design views linked from the numbered layer;
- `docs/specifications/`: normative semantics, not completion claims;
- `docs/program/`, `docs/current/`, `docs/evidence/`: programme, current state,
  and executed facts;
- `docs/archive/`: historical context only, never current requirements.

Generated [`DOCUMENT_INDEX.md`](DOCUMENT_INDEX.md) remains the machine-produced
programme index. Do not hand-edit it.
