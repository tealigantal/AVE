# ADR-0002 Project Host Package Ownership

- Status：Accepted
- Date：2026-07-30

## Context

`apps/desktop/src/project-host.ts` 同时承载项目会话、Timeline、Evidence、Story、Assembly、Review、Delivery、Export 和 Render/QC 调度。这样 Desktop 应用成为业务状态的隐式所有者，Dev CLI 无法复用同一个 Host 实现。

## Considered Options

1. 保留 Desktop 内部 Host，并让 CLI 继续深层导入 Desktop。
2. 将 Project Host 提升为 `packages/platform/project-host`，以 public 入口供 Desktop 和 CLI 组合使用。
3. 复制一份 Host 到 CLI，再通过测试保持行为一致。

## Decision

采用选项 2。Project Host 的业务实现、应用服务、ports 和 use-cases 位于 `packages/platform/project-host/src/`；Desktop Main 和 Dev CLI 只通过 `src/public.ts` 使用 `ProjectHostSession`。

## Rationale

模块所有权与运行宿主解耦，保证 Project Host 可以在纯 Node 集成测试中运行，并为后续 Electron Main/IPC 拆分保留明确 composition root。

## Consequences

Desktop 不再拥有 Project Host 源码；跨包只能经过 public 入口。当前 Render Service 仍是后续 R06 才迁移到 Worker 的过渡路径，不在本 ADR 中提前改变。

## Migration

已移动 `apps/desktop/src/project-host.ts` 至 `packages/platform/project-host/src/project-host.ts`，补充 `application/`、`ports/`、`use-cases/` 和 `public.ts`，并更新 Desktop、CLI 与 Host 集成测试入口。

## Rollback

可通过 Git 恢复旧文件和入口；若要改变 Project Host 权威边界，必须新建 ADR，并重新验证 SQLite 单写入者和三进程约束。
