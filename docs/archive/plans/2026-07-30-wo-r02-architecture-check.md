<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R02 重建有效的架构检查

## Purpose / Big Picture

让架构检查覆盖仓库真实源码，而不是只读取三个固定文件；对 Core、Renderer、Worker Host、SQLite 写入者、FFmpeg 入口和跨包公开入口建立可执行失败门。

## Progress

- [x] 盘点现有检查器与依赖缺口。
- [x] 实现全仓源码扫描和关键边界规则。
- [x] 将文件指纹从 Core 移至 Platform，并补齐公开入口。
- [x] 增加违规回归夹具。
- [x] 完整 `npm run check` 回归与治理记录。

## Surprises & Discoveries

- 原检查器只扫描三个 `public.ts` 文件。
- Storage 和 Render 的运行时实现没有公开 TypeScript 入口，导致现有应用直接深层导入内部实现。

## Decision Log

- 采用仓库内零新增依赖的静态扫描器作为 CI 入口；`dependency-cruiser.cjs` 同步保留规则声明。
- 文件哈希属于 Platform `media-filesystem`，Core 只保留 fingerprint 类型和纯 Asset ID 函数。

## Outcomes & Retrospective

R02 已完成。全仓检查、违规回归夹具、类型检查和既有集成回归均通过；未引入 ADR。

## Context and Orientation

当前源码位于 `packages/core/`、`packages/platform/` 和 `apps/`；历史集成测试保留内部实现导入，但生产包之间必须通过 `src/public.*` 入口。

## Plan of Work

1. 解析 TS/JS/Python 源码的 imports 和关键资源调用。
2. 根据目录归属执行禁止依赖、公开入口和单一入口规则。
3. 用临时 fixture 验证违规代码确实使检查失败。

## Concrete Steps

- `npm run architecture`
- `npm run architecture:test`
- `npm run typecheck`
- `npm run check`
- `git diff --check`

## Validation and Acceptance

- Core 引入 `node:fs` 失败。
- Renderer 引入 Project Storage 失败。
- Worker 使用 SQLite 失败。
- Core 依赖 Platform 失败。
- 多个 FFmpeg 命令构造文件失败。
- 当前源码扫描和 TypeScript 检查通过。

## Idempotence and Recovery

检查器只读扫描；fixture 使用临时目录并在 finally 中删除。源码迁移可由 Git 恢复，未修改数据库或外部资源。

## Artifacts and Notes

- `tools/architecture-check/check.mjs`
- `dependency-cruiser.cjs`
- `tests/architecture/architecture-check.test.mjs`
- `packages/platform/media-filesystem/src/public.ts`

## Interfaces and Dependencies

不新增生产依赖；使用 Node 内置 `fs/promises`、`path` 和现有 TypeScript/Node runtime。
