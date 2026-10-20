---
evidence_id: EVD-20261009-DOC-009-P4-DEMO-GUIDANCE
work_order_id: DOC-009
date: 2026-10-09
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 3680003a4c0cfed42192f33479aa19f930be0fe540340b43a36eb4362f25a0a2
result: documentation_reconciled_docs_check_blocked_by_applicability
---

# P4 demo 指导与工作台计划校正

本记录属于独立文档执行 Evidence，归属 [DOC-009](../../plans/2026-10-09-p4-demo-guidance-reconciliation.md)。
本次仅更新文档，不修改产品代码、合同、programme manifest/matrix/state、生成 current、用户项目或媒体；
不启动、完成或接受 P4，不提交、推送、合并、部署或发布。代码指纹取自当前
`docs/program/creative-assistant-stage3/STATE.yaml`；它是本轮文档工作的运行基线，不是新产品验收身份。

## 交付内容

- 在 [WORKSPACE_DESIGN.md](../../ux/WORKSPACE_DESIGN.md) 中建立 P4 demo 蓝图定位和 UX 规则：
  素材整理与时间线写入分离；插入/重排保留片段完整性；吸附不改变时长；特效绑定目标片段且不静默叠加；
  转场绑定相邻片段剪辑点；批注成功清场但历史锚点保留。
- 在 [DOC-007](../../plans/2026-10-03-reliable-workbench-real-acceptance.md) 中补齐 P4 准入、分包、
  页面与对象联动、时间线切片、效果/转场、批注、整合/人工接受顺序，并分开列出当前能力、依赖和退出证据。
- 在 [demo README](../../../demos/p4-workbench/README.md) 中修正旧的“目标重叠时分割片段”规则，
  并记录 demo 仍可能在同一目标叠加特效的实际偏差；没有改 demo 代码。
- 从 [docs 首页](../../README.md) 链接 P4 UX 权威、demo 说明和 DOC-009 记录。

## 核对依据与限制

- 当前 programme 无活动 Work Package；P3 正式关闭及 P4 promotion 仍待处理。
- 当前 `CAP-S3-PRECISION-001` 为 tested 的受限 Host 编辑子集；编辑执行 programme 的
  `CAP-TL-001`、`CAP-COMP-001`、`CAP-TRANS-001` 为 blocked。此文档没有更改这些状态。
- demo 的 `addEffectToTimeline` 会向模拟特效轨追加实例；同一片段可能重复加入。P4 规则规定再次应用
  需替换或拒绝，并把目标时间范围与 Preview/Master 一致性作为验收项。
- 2026-10-09 查阅了 [CapCut 官方桌面转场帮助](https://www.capcut.com/help/transitions-in-capcut)：
  说明把转场放到相邻片段之间并调整时长。将其采用为剪辑点模型是设计推断，不是 AVE 当前合同事实，
  也不证明剪映专业版 11.5.0.14471 的所有手势相同；独立测试草稿中的剪映拖放仍待 P4 promotion 前确认。

## 文档验证

| 检查 | 结果 |
| --- | --- |
| `pnpm run docs:sync -- --check` | 通过，生成视图与当前 programme 源一致；未执行写入式同步。 |
| `git diff --check` | 通过；仅有仓库现存 LF/CRLF 提示。 |
| `pnpm run docs:check` | 与 docs:sync 并行时首次返回 `programme publication is already locked`；串行重跑后未通过，报告 29 个 capability Evidence applicability 条目：`CAP-RENDER-001`、`CAP-PRESET-001`、`CAP-FND-001`；`CAP-CA-GOV-001`、`CAP-CA-CONTEXT-001`、`CAP-CA-SKILL-001`、`CAP-CA-DURATION-001`、`CAP-CA-STORY-001`、`CAP-CA-PERMISSION-001`、`CAP-CA-PIPELINE-001`、`CAP-CA-FEEDBACK-001`、`CAP-CA-PRODUCT-001`、`CAP-CA-PRODUCT-002`、`CAP-CA-UX-001`、`CAP-CA-EXIT-001`、`CAP-CA-GOV-003`、`CAP-CA-SEC-001`；`CAP-S3-FIRST-LOOP-001`、`CAP-S3-SKILL-001`、`CAP-S3-WEB-001`、`CAP-S3-MEDIA-001`、`CAP-S3-AUDIO-PACK-001`、`CAP-S3-SOUNDTRACK-001`、`CAP-S3-PRECISION-001`、`CAP-S3-MEDIA-CLOSEOUT-001`、`CAP-S3-RELIABLE-IMPORT-001`、`CAP-S3-RELIABLE-PREVIEW-001`、`CAP-S3-RELIABLE-JOURNEY-001`、`CAP-S3-PROJECT-DELETE-001`。未修改 Evidence 索引或 programme 状态。 |
| 产品测试 / 浏览器人工接受 | 未运行；本次范围为文档校正。 |

当前 `docs:check` 失败仍是单独的 programme Evidence 适用性债务；这份文档 Evidence 不刷新、不覆盖或关闭它。
