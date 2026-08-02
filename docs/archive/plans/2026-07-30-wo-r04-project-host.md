<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R04 建立真正的 Project Host 包

## Purpose / Big Picture

把项目状态权威从 Electron Desktop 文件中抽离为可复用、可纯 Node 测试的 Platform Project Host，保证 Desktop 和 Dev CLI 使用同一套业务实现。

## Progress

- [x] 盘点现有 Host、Storage、API、CLI 和测试依赖。
- [x] 建立 `packages/platform/project-host/src/` 的 public、application、ports、use-cases 结构。
- [x] 移迁 Host 会话、Timeline、Evidence、Story、Assembly、Review、Delivery、Export 和 Render/QC 调度。
- [x] 更新 Desktop、CLI、集成测试到同一 public 入口。
- [x] 删除 Desktop 旧 Host，运行边界和完整回归。

## Surprises & Discoveries

- 原 Host 的所有业务用例集中在一个 Desktop 文件，测试也直接绑定 Desktop 路径。
- Project Storage 与 Render Service 已有 public 入口，迁移可保持现有运行行为。

## Decision Log

- 通过 ADR-0002 确认 Project Host 模块所有权迁移到 Platform。
- R05 单独处理 Electron Main/IPC，不在本单中混入安全协议和 Handler 拆分。

## Outcomes & Retrospective

R04 已完成。Host 包化、public 入口、Desktop/CLI 复用和纯 Node 回归均通过；未宣称 Electron IPC 已完成。

## Context and Orientation

Host 实现位于 `packages/platform/project-host/src/project-host.ts`；`apps/desktop/src/main.ts` 和 `apps/dev-cli/src/main.ts` 仅组合并调用 public Host。

## Plan of Work

1. 迁移实现并调整包内依赖路径。
2. 补齐 application/ports/use-cases 入口。
3. 更新所有调用方和测试。
4. 用边界检查、Node 集成和完整回归确认没有旧入口。

## Concrete Steps

- `npm run typecheck`
- `npm run architecture`
- `npm run project-host:boundary`
- `npm run project-host:test`
- `npm run dev-cli:test`
- `npm run check`

## Validation and Acceptance

- `apps/desktop/src/project-host.ts` 删除。
- Project Host 不依赖 Electron。
- Desktop 和 CLI 共用 `packages/platform/project-host/src/public.ts`。
- 纯 Node Host 集成测试通过。
- 完整回归通过。

## Idempotence and Recovery

迁移只改变源码归属和 import 入口，不修改项目数据库格式；Git 可恢复旧路径；测试使用临时项目并自动清理。

## Artifacts and Notes

- `packages/platform/project-host/src/public.ts`
- `packages/platform/project-host/src/application/`
- `packages/platform/project-host/src/ports/`
- `packages/platform/project-host/src/use-cases/`
- `docs/decisions/ADR-0002-project-host-package-ownership.md`

## Interfaces and Dependencies

Host 依赖 Core public、Project Storage public、Render Service public 和 Node runtime；R05 将在此边界上接入 IPC Handler，R06 再迁移媒体执行到 Worker。
