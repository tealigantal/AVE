# AVE Final Documentation Refactor Report

## Executive outcome

DOC-002 establishes the requested `00-vision` through `08-decisions` hierarchy
as AVE's long-term domain policy and navigation layer while preserving the
existing product, architecture, programme, generated-current, Evidence, and ADR
paths required by repository tooling. The refactor is documentation-only and
does not promote any implementation capability.

## 修改前状态

The baseline contained 381 tracked Markdown files:

| Class | Count | Audit finding |
| --- | ---: | --- |
| root governance/entry | 5 | README overstated that editing-execution-v1 was not implemented; historical blueprint remained prominent |
| `docs/` non-archive | 180 | rich product/intelligence/architecture material but no single long-term domain map |
| `docs/archive/` | 97 | correctly historical at directory level; not current authority |
| feature boundary README files | 92 | structural package markers, not long-term product documentation |
| other local engineering README files | 7 | contracts/database/tests/tools entry points |

The audit found no byte-identical duplicate Markdown, no initial broken relative
Markdown links, and no Unicode replacement characters. It did find:

- overlap among Product Goal/Vision/Evolution, intelligence System/Runtime/
  Object/Reasoning, Skill documents, UX documents, quality documents, and Work
  Order guidance without a top-level authority map;
- a current-state contradiction in root README;
- ambiguity between domain Evidence and repository `EVD-*` Evidence;
- ambiguity between future Creative Skill Definitions and current
  `CreativeSkillOutputV1` Preset selections;
- inconsistent Edit Intent/Edit IR ordering and singular/plural RenderGraph
  language;
- no unified Creator Model, privacy model, trust layer, versioning overview,
  test/release policy, human evaluation policy, or copyable Work Order template;
- ADR index omissions for ADR-0015 and ADR-0016;
- 23 current specification/work-package Markdown files with headings embedded
  on content lines, reducing rendered navigation quality;
- generated index/current wording issues that cannot be repaired without
  forbidden script changes.

## 修改后状态

The repository now has two intentionally different documentation views:

```text
README.md
  -> docs/README.md                 human/agent nine-domain map
       -> docs/00-vision/ ... docs/08-decisions/
  -> docs/DOCUMENT_INDEX.md         generated programme index

Existing execution authorities retained:
  docs/product/ + docs/architecture/
  docs/program/ + docs/current/ + docs/evidence/
  docs/specifications/ + docs/decisions/
```

The numbered layer owns long-term domain intent, terminology, policies, and
navigation. It does not own current capability status, protocol fields, schema,
persistence, executable behavior, or completion claims. Current execution
authorities remain at their hard-coded paths.

## 新增文件

### Root and top-level navigation

- `ARCHITECTURE.md`
- `docs/README.md`
- `docs/FINAL_DOC_REFACTOR_REPORT.md`
- `docs/plans/2026-08-19-documentation-architecture-refactor.md`

### 00 Vision

- `docs/00-vision/README.md`
- `docs/00-vision/AVE_LONG_TERM_VISION.md`

### 01 Product

- `docs/01-product/README.md`
- `PRODUCT_STRATEGY.md`, `USER_EXPERIENCE.md`, `USER_JOURNEY.md`, and
  `WORKFLOW_MODEL.md` under that directory.

### 02 Intelligence

- `docs/02-intelligence/README.md`
- `CREATIVE_INTELLIGENCE_ARCHITECTURE.md`, `NARRATIVE_ENGINE.md`,
  `CREATOR_MODEL.md`, `CREATIVE_SKILL_RUNTIME.md`, `KNOWLEDGE_SYSTEM.md`, and
  `PRODUCT_LEARNING_SYSTEM.md` under that directory.

### 03 Architecture

- `docs/03-architecture/README.md`
- `SYSTEM_ARCHITECTURE.md`, `PROJECT_HOST.md`, `VERSIONING.md`,
  `AI_BOUNDARY.md`, `TRUST_LAYER.md`, `MEDIA_PROVENANCE.md`, and
  `AUTONOMY_POLICY.md` under that directory.

### 04 Engineering

- `docs/04-engineering/README.md`
- `AGENT_EXECUTION_RULES.md`, `ANTI_PATTERN_CATALOG.md`, `TEST_STRATEGY.md`,
  and `RELEASE_PROCESS.md` under that directory.

### 05 Evaluation

- `docs/05-evaluation/README.md`
- `AVE_BENCHMARK.md`, `CREATIVE_METRICS.md`, and `HUMAN_EVALUATION.md` under
  that directory.

### 06–08 Policies

- `docs/06-security/README.md` and `AI_PRIVACY_MODEL.md`;
- `docs/07-work-orders/README.md` and `WO_TEMPLATE.md`;
- `docs/08-decisions/README.md` and `ADR_REQUIRED.md`;
- `docs/decisions/OPEN_ISSUES.md` as the exact canonical audit-issue path.

An independent DOC Evidence record is added after final validation.

## 修改文件

- `README.md`: removes the maturity snapshot, uses the new documentation home,
  links generated status, and clearly marks the root blueprint historical.
- `AGENTS.md`: adds domain routing, detailed agent-rule reference, DOC-only lane,
  paired-RenderGraph semantic identity, and Creative Skill name distinction.
- `docs/PRODUCT_INTELLIGENCE_BLUEPRINT.md`: separates future semantic Edit
  Intent/Host adapter from current command execution and describes the actual
  Preview/Master RenderGraph pair.
- `docs/architecture/SYSTEM_ARCHITECTURE.md` and
  `EDITING_EXECUTION_ARCHITECTURE_V1.md`: align current `CommandEditIntent` /
  `CommandEditIR` and Preview/Master graph semantics with source.
- `docs/intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md` and
  `CREATIVE_INTELLIGENCE_SYSTEM.md`: distinguish future semantic intent from
  the current Host input and correct render outputs.
- `docs/pipeline/MATERIAL_UNDERSTANDING_PIPELINE.md` and
  `CREATIVE_PLAN_TO_TIMELINE_PIPELINE.md`: use the canonical Material Evidence
  Pack name and future-to-current adapter sequence.
- `docs/product-intelligence/CREATIVE_QUALITY_BENCHMARK.md`,
  `FUTURE_PRODUCT_EVOLUTION.md`, and `VIDEO_UNDERSTANDING_MODEL.md`: align graph,
  intent, and Observation/Interpretation terminology.
- `docs/specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md` and
  `FOUNDATION_AUTHORITY_RECOVERY.md`: align specification language with current
  source and future adapter status.
- `docs/program/editing-execution-v1/work-packages/WP-PRESET-002.md`: removes an
  obsolete plural-graph description from a historical gap statement.
- `docs/plans/2026-08-18-doc-001-creative-intelligence-evolution.md`: clarifies
  the future semantic-intent adapter boundary in the prior DOC plan.
- `docs/decisions/ADR-0014-atomic-preset-application-provenance.md`: clarifies
  the accepted decision as two target-specific graphs sharing one semantic
  payload/hash, matching its implementation.
- `docs/decisions/README.md`: restores ADR-0015 and ADR-0016 to the index.

No generated current document, generated document index, programme YAML,
application source, test, script, contract, database, or configuration file was
edited.

## 文档迁移关系

| Target view | Reconciled existing sources | Result |
| --- | --- | --- |
| Vision | `PROJECT_GOAL.md`, Product Vision, Future Evolution | Creative OS is a long-term horizon; current co-editor goal remains authoritative |
| Product | product vision/scope, UX, workflow, pipeline docs | separates strategy, experience contract, chronological journey, and action/capability mapping |
| Intelligence | Blueprint, Object Model, Runtime, reasoning, story, profile, memory, Skill views | one observation/interpretation/decision boundary and no second execution model |
| Architecture | stable architecture, editing execution, permissions, ADRs | conceptual worlds map to existing Renderer/Host/Worker/Storage/Contracts boundaries |
| Engineering | root AGENTS, PLANS, Work Order spec, programme protocol | root AGENTS remains discovered authority; detailed construction rules are linked |
| Evaluation | Product Metrics, Creative Quality Benchmark, quality pipeline, approval model | capability acceptance, creative evaluation, and human review remain separate |
| Security | permission, memory, profile, provenance policies | one local-first consent/retention/deletion view without implementation claims |
| Work Orders | Implementation Work Order Spec, PLANS, programme examples | copyable template does not activate implementation |
| Decisions | existing ADR index and accepted ADRs | explicit trigger policy; ADR records remain in `docs/decisions/` |

Physical relocation was intentionally not performed. Documentation checks and
architecture tests hard-code `docs/product/` and `docs/architecture/`, while
`docs/DOCUMENT_INDEX.md` and `docs/current/` are generated. The user forbade
changing scripts/tests/configuration, so moving those authorities would make the
repository invalid. The overlay is the only non-destructive, idempotent result
inside the authorized scope.

## 架构增强点

- Introduces the Creator -> Creative -> Timeline -> Render -> Outcome Learning
  world map without creating new processes or state owners.
- Establishes one canonical semantic chain from observation to encoded output.
- Defines Project Host, versioning, AI authority, trust, provenance, and
  autonomy as separate reviewable policies.
- Makes the source-accurate model explicit: target-specific Preview/Master
  RenderGraphs share one target-neutral semantic manifest/payload/hash and each
  has an ExecutionPlan.
- Separates the future command-free semantic Edit Intent/Host adapter from the
  current `CommandEditIntent` → `CommandEditIR` execution path.
- Separates future Creative Skill reasoning definitions from the current typed
  Preset-selection output.
- Treats Creator Model as a consented product subsystem and User Creative
  Profile as an auditable view, not hidden model state.
- Defines product learning as a governed knowledge-update proposal loop, never
  automatic training.

## 对未来 Codex 开发影响

A future Coding Agent can now route every task through `docs/README.md`, find
the canonical term before creating a type, identify whether a statement is
current/specified/tested/accepted/blocked/future, and derive a bounded Work Order
with exact inputs, outputs, paths, tests, fixtures, stop conditions, and
completion evidence.

The strengthened `AGENTS.md` prevents a documentation task from advancing an
unrelated programme package, requires detailed execution rules for code work,
and preserves generated/current authority. The anti-pattern and test policies
also prevent a marker, mock, schema, directory, or generated file from being
reported as user capability.

## 未解决问题

Canonical detail is in [`docs/decisions/OPEN_ISSUES.md`](decisions/OPEN_ISSUES.md).
The remaining items are:

- generated index does not include the numbered layer until a future authorized
  docs-tooling change;
- generated “Latest evidence” label means programme Evidence and remains
  potentially ambiguous;
- legacy inline-heading formatting remains in 23 programme/spec documents;
- several future objects and policies still require promoted schemas/runtime
  Work Orders before they can be claimed;
- historical blueprint and completed ExecPlans remain searchable and require
  readers to respect lifecycle labels;
- older ADR files have inconsistent section completeness and should be
  normalized only through a focused, non-semantic ADR-maintenance task.

No confirmed application-code defect was discovered during this documentation
audit.

## Validation

Observed passing on 2026-08-19 Asia/Shanghai:

- `pnpm run docs:sync -- --check`;
- `pnpm run docs:check` (`docs check passed`);
- `pnpm run docs:architecture:test` (structure and governance fixtures passed);
- `git diff --check`;
- Markdown audit over 424 tracked/untracked files: zero broken relative links,
  zero byte-identical documents;
- all 31 required target/report/root artifacts present;
- docs-only path audit passed;
- generated current/index and programme YAML immutability audit passed;
- source-grounded terminology audit passed after correcting the initial
  single-RenderGraph and semantic-Intent/current-input review findings.
- three independent read-only review lanes (authority/governance, structure,
  and all-Markdown content/terminology) reported no remaining blocker.

Exact commands, the corrected UTF-8/NUL link scanner, scope, and remaining risk
are recorded in
[`EVD-20260819-DOC-002-DOCUMENTATION-ARCHITECTURE-REFACTOR`](evidence/runs/EVD-20260819-DOC-002-DOCUMENTATION-ARCHITECTURE-REFACTOR.md).

## 最终验收清单

- [x] 文档结构完成重构
- [x] 没有代码修改
- [x] AI 智能层独立存在
- [x] 工程层独立存在
- [x] Codex 施工规范存在
- [x] Work Order 规范存在
- [x] Evaluation 体系存在
- [x] README 索引完成
- [x] 最终报告完成
