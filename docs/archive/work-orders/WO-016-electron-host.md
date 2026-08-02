<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-016：Electron Project Host 边界

## 用户结果

桌面应用有安全的 Main/Preload/Renderer 权限边界，Renderer 只能通过窄 Project API 请求项目操作。

## 不变量

`contextIsolation`、sandbox、`nodeIntegration: false`、CSP 和 IPC sender 校验必须保持；Renderer 不得访问 SQLite、原片、shell、FFmpeg 或模型 SDK。

## 必跑测试

`npm run desktop:boundary`、`npm run typecheck`、`npm run check`。

## Definition of Done

Main、Preload、Renderer 最小入口存在，安全边界测试通过，且不引入通用 IPC。
