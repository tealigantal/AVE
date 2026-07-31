# ADR-0003 Electron App Protocol and IPC Sender Boundary

- Status：Accepted
- Date：2026-07-30

## Context

旧 Electron Main 使用宽泛的 `file://` sender 判断，并在一个文件中维护所有 IPC 业务分支。Renderer 需要事件订阅和原生文件选择能力，同时不能获得任意 IPC channel、Node、SQLite 或文件路径写入权限。

## Considered Options

1. 继续使用 `file://` 并在巨型 Main 中追加分支。
2. 使用 `app://renderer` 安全协议、窗口/session/frame 校验和显式 Handler 注册表。
3. 让 Renderer 直接访问 Node 或 Project Storage 以减少 IPC 代码。

## Decision

采用选项 2。窗口通过 privileged `app://` 协议加载；sender 必须匹配 renderer host、窗口 WebContents 身份和当前 Project Session；IPC 仅注册 query、command、system 三类白名单入口，具体业务按 Handler 文件分组。

## Rationale

协议、窗口身份和当前会话形成多重边界；Preload 只暴露 typed query/command、事件订阅和文件/目录选择器，Renderer 无法构造任意 channel 或直接取得原生路径权限。

## Consequences

Main 启动职责分散到 bootstrap、composition root、lifecycle、window manager 和 protocol handler；后续新增 IPC 必须在对应 Handler 和边界测试中登记。当前 Renderer 只有最小协议页面，完整工作台属于 R16。

## Migration

已创建 `apps/desktop/src/main/` 和 `ipc/` 目录，迁移 project/timeline/media/editorial/render/qc/jobs Handler，Preload 增加 `subscribeProjectEvents`、`chooseFiles`、`chooseDirectory`，并删除根 Main 的业务分支。

## Rollback

可通过 Git 恢复旧 Main/Preload；不得回退到无 sender 校验的 IPC。若改变 origin、session 或 Renderer 权限边界，必须新建 ADR。
