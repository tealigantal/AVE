# WO-R05 拆分 Electron Main 和 IPC

## Purpose / Big Picture

将 Electron Main 从巨型业务分发文件收口为启动与组合根，并建立 `app://renderer`、窗口身份、frame URL、Project Session 和白名单 Handler 的安全 IPC 边界。

## Progress

- [x] 盘点 Main、Preload、IPC 和 sender 校验。
- [x] 建立 main/、ipc/、bootstrap、composition root、lifecycle、window manager、protocol handler、session manager。
- [x] 实现 app protocol 和 sender/session 校验。
- [x] 拆分 Project、Timeline、Media、Editorial、Render、QC、Jobs Handler。
- [x] 增加事件订阅、文件选择、目录选择 Preload API。
- [x] 运行边界、sender 和完整回归。

## Surprises & Discoveries

- 原 Main 为 112 行单文件并包含全部业务 command 分支。
- 原 sender 只检查 `file://` 前缀，无法确认窗口身份或当前项目会话。

## Decision Log

- 通过 ADR-0003 采用 privileged `app://renderer` 和显式 Handler 注册表。
- R06 单独处理 FFmpeg/Render/QC Worker 迁移，不在本单改变媒体执行拓扑。

## Outcomes & Retrospective

R05 已完成。Main/IPC 结构、协议、sender/session 校验、Preload API 和自动化边界检查均已落地；Electron runtime 人工窗口验收仍是后续环境风险。

## Context and Orientation

根入口 `apps/desktop/src/main.ts` 只导入 `main/main.ts`；组合根在 `main/composition-root.ts`；IPC 注册在 `main/ipc/register-ipc.ts`。

## Plan of Work

1. 把启动和窗口生命周期从业务 IPC 中分离。
2. 建立 app protocol 和安全 sender 验证。
3. 将每类 command/query 放入独立 Handler 文件。
4. 验证恶意 sender、事件订阅和完整回归。

## Concrete Steps

- `npm run ipc:boundary`
- `npm run ipc:sender:test`
- `npm run desktop:boundary`
- `npm run check`

## Validation and Acceptance

- Main 不含业务 command 分支。
- 不再使用宽泛 `file://` sender 判断。
- Handler 分组和 Preload API 存在且可静态/单元验证。
- sender URL、窗口身份和 session 校验失败路径通过。
- 完整回归通过。

## Idempotence and Recovery

IPC 拆分只改变 Electron 组合结构和协议入口；Project Host/Storage 数据格式不变。测试使用临时目录或纯 URL fixture，不产生外部副作用。

## Artifacts and Notes

- `apps/desktop/src/main/`
- `apps/desktop/src/main/ipc/`
- `apps/desktop/src/preload.ts`
- `docs/decisions/ADR-0003-electron-app-protocol-ipc-boundary.md`

## Interfaces and Dependencies

Main 依赖 Electron、Project API 和 Project Host public；Renderer 只依赖 Preload API；R06 将在 Project Host → Worker 边界处理媒体执行。
