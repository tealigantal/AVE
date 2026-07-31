# Coding Agent Instructions

## Fixed document reading order

每次进入本仓库，Coding Agent 必须按以下顺序读取，并以较新的专用文档覆盖较旧的概括：

1. `AGENTS.md`
2. `PROJECT_GOAL.md`
3. `docs/ARCHITECTURE.md`
4. `docs/CURRENT_STATUS.md`
5. `docs/CURRENT_WORK.md`

`docs/DOCUMENT_INDEX.md` 用于了解其他文档的职责；历史 Work Order、归档计划和旧状态记录只能作为证据，不能覆盖上述当前文档。

## Current source of truth

- 长期产品目标：`PROJECT_GOAL.md`
- 稳定架构、不变量和边界：`docs/ARCHITECTURE.md`
- 唯一当前状态：`docs/CURRENT_STATUS.md`
- 唯一当前任务：`docs/CURRENT_WORK.md`
- 核心文档职责：`docs/DOCUMENT_INDEX.md`

所有“已完成”“已验证”声明必须能指向仓库中的代码、测试或实际命令记录。无法确认时必须写“尚未验证”，不得用目录存在、接口存在、smoke test 或 Schema 存在推断产品能力已完成。

## Scope rules

除非用户明确授权，Coding Agent 不得把当前任务扩展为后续代码、配置、测试、Schema、数据库或工作流工作。当前项目基座任务只允许在 `AGENTS.md`、`README.md`、`PROJECT_GOAL.md`、`docs/ARCHITECTURE.md`、`docs/DOCUMENT_INDEX.md`、`docs/CURRENT_STATUS.md`、`docs/CURRENT_WORK.md` 这些文档范围内整理。

不得删除、移动、重命名或覆盖历史文档。不得创建完整 Work Order 列表，不得把历史 Work Order 改写成当前状态来源。

## Stable engineering invariants

- Project Host 是项目状态唯一权威，SQLite 只有 Project Host 写入。
- Contracts 是跨语言协议唯一来源；`contracts/generated/` 中的生成文件不得手工修改。
- 所有权威时间使用 RationalTime，不使用浮点秒作为协议时间。
- Renderer 不直连 SQLite、原片、shell、FFmpeg 或模型 SDK。
- Worker 不打开或修改 `project.sqlite`，stdout 只输出结构化协议消息。
- Timeline 只能通过 Command/Commit 流程修改。

## Verified command vocabulary

仓库当前记录的根包管理器是 pnpm。除非重新验证，不得把旧文档中的 `npm` 命令当作当前命令来源。常用检查包括：

```text
pnpm install --frozen-lockfile
pnpm run check
pnpm run typecheck
pnpm run architecture
pnpm run contracts:check
pnpm run contracts:clean
pnpm run acceptance:final:synthetic
```

具体命令是否适用于当前任务，必须以实际脚本和当前状态为准。
