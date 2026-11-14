# AVE Documentation Home

唯一当前执行计划是 [LLM 语义执行计划](plans/2026-11-12-llm-semantic-foundation.md)；工作包是登记信息，不是另一个执行入口。历史证据保留，产品状态以实际代码和验证为准。

2026-11-11 用户调整产品方向：自动剪辑效果对标 Hypit/ChatCut 并保留精修，模型采用云端配置、允许云端渲染，本地部署暂缓。研究和下一步评测见 [DOC-013](product-intelligence/CLOUD_EDITING_RESEARCH.md)，稳定决策见 [ADR-0059](decisions/ADR-0059-cloud-editing-direction.md)；两者均不证明新能力已实现。

同日接续的 [DOC-015：Hypit 模块核对与完整交付实施方案](product-intelligence/CLOUD_EDITING_RESEARCH.md#doc-015hypit-模块核对与完整交付实施方案) 固定上游源码、发行包、许可证、现有代码复用和 U1–U7 完整实施单元。所有新增效果必须同时接入精修轨道与分段独立批注，不以少量效果演示替代完整目标。受控执行适配见拟议 [ADR-0060](decisions/ADR-0060-hypit-execution-adapter.md)；本轮只更新研究/产品要求，不推进实现包。

This is the human and Coding Agent entry point for AVE documentation. It routes
questions to one authority; it does not replace generated status or executed
Evidence.

## 当前初稿容错与检查范围

用户要求以可编辑初稿和持续纠正为目标：LLM 理解创作要求，普通创意判断不要求额外强制证明；局部故障保留可用结果并说明缺项，授权、素材身份、真实范围、事务和渲染有效性继续校验。具体边界与当前进展见 [智能架构](02-intelligence/CREATIVE_INTELLIGENCE_ARCHITECTURE.md) 和 [执行计划](plans/2026-11-12-llm-semantic-foundation.md)。目标或文档不等于真实云端验证。

`pnpm run check` 目前只运行类型、契约和架构检查，不运行 Stage3 或全组件套件。受影响测试按用户要求和实际任务选择；既有测试结果及未验证范围须如实报告，文档历史漂移不能阻断已授权的真实测试。

## First-time reading path

```text
README.md
  -> AGENTS.md
  -> docs/README.md
  -> docs/DOCUMENT_INDEX.md
  -> corresponding domain document
```

The generated [`DOCUMENT_INDEX.md`](DOCUMENT_INDEX.md) classifies programme
documents. The canonical relationship between the numbered navigation layer
and retained execution authorities is defined only in
[`DOCUMENT_AUTHORITY_MAP.md`](DOCUMENT_AUTHORITY_MAP.md).

## Domain routing

This table routes questions. It does not redefine the precedence and ownership
rules in the authority map.

| Question | Authority | Rule |
| --- | --- | --- |
| Why does AVE exist? | [`PROJECT_GOAL.md`](../PROJECT_GOAL.md) and [`00-vision/`](00-vision/README.md) | durable objective and long-term direction |
| What user outcome is intended? | [`01-product/`](01-product/README.md) | strategy and journey; current scope remains in `docs/product/` |
| How should creative intelligence reason? | [`02-intelligence/`](02-intelligence/README.md) | future capability and policy views, not implemented contracts |
| What boundaries must the system preserve? | [`03-architecture/`](03-architecture/README.md) and [`docs/architecture/`](architecture/) | long-term worlds plus current stable runtime architecture |
| How may Coding Agents build it? | [`AGENTS.md`](../AGENTS.md), [`04-engineering/`](04-engineering/README.md), active Work Order | repository rules outrank explanatory guidance |
| How is quality evaluated? | [`05-evaluation/`](05-evaluation/README.md) | creative, collaboration, trust, and technical evidence |
| How is user data protected? | [`06-security/`](06-security/README.md) | consent, authorized cloud processing, retention, deletion |
| What may be implemented now? | [`07-work-orders/`](07-work-orders/README.md), [`docs/program/`](program/), [`docs/current/`](current/) | only the active governed package; current state is generated |
| Why was a consequential design chosen? | [`08-decisions/`](08-decisions/README.md) and [`docs/decisions/`](decisions/) | ADR policy plus accepted ADR records |

## Status vocabulary

- **Current**: verified repository behavior or a current authority.
- **Specified**: defined semantics without implementation proof.
- **Tested**: automated evidence exists for the named boundary.
- **Accepted**: the package-specific verification and real-media criteria passed; P4/P5 do not require human sign-off.
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
| Edit Intent | future command-free semantic product proposal for what should change and why; not the current Host execution input | [`docs/intelligence/OBJECT_MODEL.md`](intelligence/OBJECT_MODEL.md) |
| CommandEditIntent | current Host execution input containing ordinary Timeline Commands, actor, provenance, preconditions, and expected effects | current command execution implementation and ADR-0016 |
| CommandEditIR | current Host-resolved, command-bearing, provenance-rich execution record; do not shorten this current-layer name | current edit architecture and ADR-0016 |
| Timeline | authoritative versioned editorial state; `Sequence` is an object inside it and Timeline Core is its domain module | current Timeline specification |
| CommitPlan | validated atomic plan that commits one logical Timeline version | ADR-0006 |
| Semantic Render Manifest | one target-neutral semantic manifest/payload/hash derived from committed Timeline; current contract fields may retain `semanticGraphPayload` and `semanticGraphHash` names | current render architecture |
| RenderGraph | one target-specific Preview or Master graph instance derived from the Semantic Render Manifest; never one shared executable graph | current render architecture |
| ExecutionPlan | immutable authorization for one target-specific RenderGraph | ADR-0010 |
| Creator Model | product subsystem for consented creator understanding; User Creative Profile is its auditable preference view | [`02-intelligence/CREATOR_MODEL.md`](02-intelligence/CREATOR_MODEL.md) |
| Creative Skill Definition | future versioned reasoning knowledge unit | [`02-intelligence/CREATIVE_SKILL_RUNTIME.md`](02-intelligence/CREATIVE_SKILL_RUNTIME.md) |
| Preset / Skill Output | current bounded Preset-selection boundary, represented by `CreativeSkillOutputV1`; not a Creative Skill Definition | current Preset/Skill specification |
| Decision Record | project creative-decision trace | Trust layer and product object model |
| ADR | repository architecture decision | [`08-decisions/ADR_REQUIRED.md`](08-decisions/ADR_REQUIRED.md) |

The **current** authoritative execution sequence is:

```text
CommandEditIntent
  -> Project Host resolve/preconditions
  -> CommandEditIR
  -> simulate/validate
  -> CommitPlan -> Commit
  -> Semantic Render Manifest
       -> Preview RenderGraph -> Preview ExecutionPlan
       -> Master RenderGraph  -> Master ExecutionPlan
  -> QC
```

The **future product** sequence may prepend `Edit Intent -> Host-owned adapter`,
but that adapter must produce the current `CommandEditIntent` and is
not implemented merely because the semantic object is documented.

## Canonical execution authority locations

The numbered hierarchy is the durable domain and navigation layer. Current
execution authorities remain at fixed canonical paths:

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

## Stage3 planning entry

[创作产品范围](product-intelligence/CREATION_PRODUCT_SCOPE.md) · [历史工作包说明](work-orders/stage3/README.md) · DOC-006 文档执行记录（历史计划已移除）。仅目标规划，不提升当前能力状态。

## 可靠媒体与完整工作台执行

历史 DOC-007（历史计划已移除）记录当时的L0–L7、自动验证、GATE及P5接续；[P4工作包](program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-UX-001.md)维护24项真实操作；[Workspace Design](ux/WORKSPACE_DESIGN.md)定义行为；[demo](../demos/p4-workbench/README.md)提供唯一UI蓝图。这些资料不作为当前执行入口。

人工审核、审美/听感反馈可选，不是P4/P5完成或已授权工作继续执行的前提。保留运行权限、身份、数据保护与真实自动验证要求。

文档维护记录：DOC-010（历史计划已移除）。历史文档校正见 DOC-008（历史计划已移除）、DOC-009（历史计划已移除）；它们不提供当前包状态或写入权限。

## 当前方向与运行入口

产品方向见 [ADR-0059](decisions/ADR-0059-cloud-editing-direction.md)：全云端模型、允许云端渲染、本地部署暂缓。自动剪辑和精修对标见 [DOC-013 / DOC-014](product-intelligence/CLOUD_EDITING_RESEARCH.md)。

现有评估实例为 6085 全云模型、6084 保留原混合配置；两者的渲染仍为容器 Worker/FFmpeg，不是已交付的云渲染。通用 Compose 默认端口 6080 不代表本机验收入口。部署操作与实际代码边界见 [Docker guide](04-engineering/DOCKER_DESKTOP.md)。历史 Electron、Browser 和容器记录均仅证明对应构建，不能代替当前验收。

[DOC-017：完整实施执行合同与接续手册](product-intelligence/CLOUD_EDITING_RESEARCH.md#doc-017完整实施执行合同与接续手册) 将对标接入细化为效果登记、接口与状态合同、E00–E12执行单元和回归预期。它是历史研究，不构成当前执行计划，也不证明产品已实现。
