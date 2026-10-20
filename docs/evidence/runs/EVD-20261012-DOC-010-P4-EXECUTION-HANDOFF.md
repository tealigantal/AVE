---
evidence_id: EVD-20261012-DOC-010-P4-EXECUTION-HANDOFF
work_order_id: DOC-010
date: 2026-10-12
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 630e45b15abff2aed99c7a8362896deff89e85266c892c723934d4b99cb31cd7
result: documentation_and_completion_policy_updated_global_docs_check_blocked
---

# DOC-010 P4 可执行文档与旧状态清理

本记录属于独立文档/完成政策维护，由 [DOC-010](../../plans/2026-10-12-p4-executable-documentation.md) 管理；不绑定或提升产品能力，不完成活动 P4 包。产品执行仍从 [DOC-007](../../plans/2026-10-03-reliable-workbench-real-acceptance.md) 的 L0 开始。

## 实际改动

- 复用 DOC-007 建立 L0–L7 顺序、GATE 证据修复和 P5 接续；活动 P4 工作包保存 OP-01–24 的操作、入口、结果与缺口。demo 三源文件的固定摘要随计划保存。
- 物理替换现行文档的过期状态流水账、P4 未晋升、旧 HTML/视觉方向和先 UI 后功能要求；同步入口、UX、Stage3 产品计划与导航。DOC-009 保留历史导航，其原 Evidence 未改。
- 补齐当前 P4 manifest 的真实请求/模型/存储/合同消费路径与必需测试；新 DOM 工作台测试和新批注处理 ADR 是明确的待创建路径，不是假称已有产物。历史 ADR-0045 不再放在活动包可改路径。
- 按用户 2026-10-12 最新要求，移除现行 P4/P5、工作单规范/模板和质量流程中的强制人审/签字/重复授权条件。Stage3 的 FIRST-INPUTS 人审专属债务因要求取消而关闭，LEARNING 债务保留工程/自动交互验证部分。未伪造任何人工接受。
- `interaction-acceptance.mjs` 移除 P5 强制 `subjective_acceptance` 检查；连续录制、真实步骤、构建身份、输出/Host 状态、失败恢复、独立观察和产品内权限均保留，独立观察可由 Agent 完成。
- 回归增加自动执行/Agent 观察的完整 P5 记录不含人工接受仍通过、缺步骤拒绝、录像不覆盖全程拒绝。使用生成视频/音频和合成状态，仅证明校验器边界，不是产品实际交互接受。

## 验证

| 检查 | 本轮结果 |
| --- | --- |
| `pnpm run interaction-acceptance:test` | 通过；原身份/失败拒绝/事务零写测试和新增 P5 无人审路径均通过 |
| `pnpm run docs:architecture:test` | 文档结构、多 programme 转移与失败零写通过 |
| `pnpm run docs:fingerprint:test` | 仓库指纹、债务/能力渲染、scope Evidence 与接口漂移回归通过 |
| `pnpm run docs:sync` 和 `pnpm run docs:sync -- --check` | 生成入口、current 与各 programme 指纹；生成一致性通过 |
| 本次 Markdown 相对文件链接/manifest命令检查 | 本地目标存在；required_tests 均对应现存 package scripts；两条不存在路径明确是 L0/L4 待建文件 |
| `pnpm run docs:check` | 未通过：34 项既有 Evidence applicability；另有本轮治理脚本/测试改变指纹导致 `latest evidence fingerprint mismatch creative-assistant-stage3` |
| 独立只读复核 | 工作单人工门槛、所有控件误要求 Timeline commit 两项冲突已修复；没有产品完成声明 |
| 保护边界 | 对编辑前 SHA-256 快照核对：既有 Evidence、ADR 与 demo HTML/JS/CSS 均未改变；产品源码、合同、依赖与用户数据没有被本任务修改 |

编辑前全源码指纹为 `16d6d40dbb50abdec667f76c02c6b58c783a6b9daa7ec4eb283de241e8bc4983`；本轮变化限治理脚本/测试，因此当前指纹见 header。没有改历史 Evidence 或用本记录替换 Stage3 的 latest 产品 Evidence；原 latest 记录只证明其原源码。此额外身份差异需后续真实工程复验和新产品 Evidence 闭合，已写入 DOC-007 GATE。

`docs:check` 的 35 个诊断不是 35 个运行时缺陷。既有 34 项能力范围包含 editing-execution-v1 的 RENDER/PRESET/FND、creative-assistant-v1 的共享创作链以及 Stage3 非当前 P4 的历史能力；本轮未重跑其所有产品测试，因此不刷新 APPLICABILITY_INDEX。

## 未实施部分

连续编辑、PiP/音频/字幕完整手势、空白时间域、字幕/效果/转场补齐、批注真实创作闭环和旧 v1 新写入口等问题仍由 L0–L7 实施。无 handler 的 `project.delete` 白名单和旧 UI 分支待在对应单元物理清理；历史 planning/render 收据读取器不盲删。Docker 兼容入口及打包依赖优化不是本轮 P4 必需前置。

本轮没有运行完整 `check`、最终合成/真实媒体旅程或部署，不宣称 demo 全部功能已接入。文档接续与完成政策调整已经交付；活动包、能力与验收状态没有被提升。未提交、推送、合并或发布。
