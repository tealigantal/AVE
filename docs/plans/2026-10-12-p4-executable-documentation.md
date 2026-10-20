# DOC-010 P4 可直接执行的文档整理

## Purpose / Big Picture

依据用户 2026-10-12 请求，将既有 P4 文档整理到 GPT6-luna max 可逐单元执行的程度，物理移除当前入口中的过期状态和互相冲突的旧要求。本次为文档、programme 范围/验证声明及完成工具中人工硬门槛维护，不实施功能、不接受 P4。产品计划继续使用 DOC-007，产品操作清单继续使用活动工作包，不创建第二套产品状态。

## Context and Orientation

工作区已有大量未提交实现。活动包是 `WP-S3-RELIABLE-UX-001`；其两个能力/验收仍 pending，三个前置子包仅覆盖各自工程子集。只读审查确认连续精修、对象手势、空白时间域、批注闭环、旧批注新写及测试链存在缺口。编辑前源码指纹为 `16d6d40dbb50abdec667f76c02c6b58c783a6b9daa7ec4eb283de241e8bc4983`。

## Scope and Boundaries

本 Work Order 由 docs/README 导航，属于文档执行记录层；独立记录本次变更及核查，不能由产品实施计划或历史 Evidence 替代。

允许文件：`AGENTS.md`、`README.md`、`README.zh-CN.md`、`docs/README.md`、`docs/07-work-orders/README.md`、`docs/work-orders/stage3/README.md`、`docs/evidence/README.md`、`docs/product/PRODUCT_VISION.md`、`docs/ux/WORKSPACE_DESIGN.md`、`demos/p4-workbench/README.md`、DOC-007、本计划、DOC-009 的历史导航说明、活动 P4 工作包文档，以及 Stage3 manifest 的活动包 allowed_paths/required_tests 与活动包验收矩阵中的断言/命令；`docs/04-engineering/AGENT_EXECUTION_RULES.md`、`docs/product-intelligence/STAGE3_PLAN.md`、`scripts/docs/interaction-acceptance.mjs` 及 `tests/architecture/interaction-acceptance.test.mjs`；`docs/product-intelligence/CREATIVE_QUALITY_BENCHMARK.md` 、`docs/work-orders/IMPLEMENTATION_WORK_ORDER_SPEC.md`、`docs/07-work-orders/WO_TEMPLATE.md` 和 Stage3 STATE 中现行人审债务（仅取消人审条件及修正旧状态）。新增本次 `EVD-20261012-DOC-010-P4-EXECUTION-HANDOFF.md`；生成 current/index 只通过 docs:sync 更新。

除上述完成工具与对应回归测试外，不得改产品源码、合同、测试实现、依赖、demo HTML/JS/CSS、历史 ADR/Evidence、适用性索引或用户数据；不改变 programme 活动包、能力状态、产品工作包完成状态或 latest_evidence 指针。范围声明补齐不等于实施、部署或开通云调用。保留旧证据及已完成工作包原范围；删除现行文字中的旧状态，不销毁历史事实。

## Plan of Work / Concrete Steps

1. 核对当前状态、文档、demo 和上一轮代码审查，保存编辑前文件摘要。
2. 重写 DOC-007 的现行任务顺序与检查点，保留 P0–P3 保证和 P5 十步验收要求，以 Evidence 链替代旧状态流水账。
3. 在活动包建立逐操作清单；明确现有入口、未完成结果、失败/撤销/重开/双目标验证。核对任务所需路径和现有脚本。
4. 整理 UX、demo README、导航与产品入口，删除旧视觉方案和过期“待晋升/无实现”状态。
5. 移除 P5 完成工具中的强制主观人审，保留真实交互、连续记录、输出与身份校验，并回归验证。串行运行文档生成/检查与治理测试；核对链接、路径、任务覆盖和产品源码/历史证据零变化。新增独立文档 Evidence。

## Validation and Acceptance

运行 `pnpm run docs:sync`、`pnpm run docs:sync -- --check`、`pnpm run docs:check`、`pnpm run docs:architecture:test`、`pnpm run docs:fingerprint:test`，共享 programme 锁的命令串行运行。检查本次 Markdown 本地链接和 manifest 路径、required_tests 实际存在；核对既有活动包/状态未变化、完成工具变更后的源码指纹、demo 源字节/历史 Evidence 未变化。`docs:check` 原有 34 项适用性失败和本次工具变更引入的身份漂移分别报告，不用文档 Evidence 冒充产品复验。

## Idempotence and Recovery

在现有文件内整合，不追加重复“最新覆盖旧版”段落。回退只按本次编辑前快照恢复本次差异，不运行 git reset/checkout，不覆盖既有未提交工作。生成文档从 programme 正常恢复，不手改。

## Interfaces and Dependencies

AGENTS 与 authority map 仍定义权威；UX 定义行为；P4 工作包定义范围/操作；DOC-007 定义顺序与执行记录；programme/current 定义状态。保留 Host、RationalTime、Command/Commit 和双目标渲染边界。

## Progress

- [x] 完成基线、指令和审查结论核对。
- [x] 整理现行规则、操作清单、顺序与范围。
- [x] 验证、独立只读复核与文档 Evidence（全局检查失败如实保留）。

## Surprises & Discoveries

入口仍写 P4 未晋升，活动计划同时要求先 UI 和先功能；批注保存被误当完整对话处理，P4 专项没有纳入总检查。旧状态累积使执行者反复裁决历史，故本次替换现行说明，而非再追加覆盖段落。

## Decision Log

- 复用 DOC-007 与活动 P4 工作包；不创建 Luna 专用的第二套产品规范。
- 本次“旧状态”限现行文档；运行时兼容清理登记为后续执行任务，历史数据读回不擅自删除。
- 不将任何审查缺口写成已修复；按用户最新要求移除 P4/P5 人工审核、等待确认与重复授权硬门槛；人工反馈可选，不伪造历史人工接受或全局检查通过。

## Outcomes & Retrospective

已完成现行入口清理、L0–L7/OP-01–24 拆分、路径/检查补齐和人工硬门槛移除。交互完成工具、文档架构和指纹回归通过；生成文档同步通过。`docs:check` 保留 34 项既有适用性及 1 项本轮工具变更后的 Stage3 latest 产品 Evidence 指纹差异。

独立复核发现并修复模板强制人审和全控件原子提交误约束；历史 Evidence/ADR/demo 源字节不变。FIRST-INPUTS 债务仅因用户取消人审要求而关闭，其他产品状态不提升。详细证据见 [DOC-010 Evidence](../evidence/runs/EVD-20261012-DOC-010-P4-EXECUTION-HANDOFF.md)。接续从 DOC-007 L0 开始，不再等待人工确认。
