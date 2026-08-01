# WO-R21 桌面真实流程验证

## 目标

使用 `AVE_USER_REAL_PROJECT_DIR` 对应的用户真实项目验证 Electron 工作台能打开真实项目，并完成项目状态显示、Timeline/媒体查询、关闭与重开恢复。验证期间不复制、上传或提交用户媒体。

## 当前范围

- 以最小桌面 IPC 修复支撑验证；不扩大到模型、Adapter 或发布流程。
- 真实项目目录位于仓库外，作为现有验收产物使用。
- R20 的真实素材结果已由用户确认烧录正常；R21 关注桌面工作台可操作性。

## 验证里程碑

- [x] `pnpm run electron:runtime:test`：Electron 页面、Project API、工作台节点 smoke 通过。
- [x] `pnpm run workbench:host:test`：Host 工作台媒体与 Job 持久化测试通过。
- [x] `pnpm run renderer:workbench:test`、`pnpm run desktop:boundary`、`pnpm run project-api:boundary` 通过。
- [x] `verify-project`、`inspect-project`、`migrate-project` 对真实项目通过；integrity=`ok`，schema version=18。
- [x] 通过桌面“打开项目”进入真实项目并显示媒体、Timeline、渲染/QC 状态。
- [x] 关闭后重新打开真实项目并确认状态一致。

## 当前发现

临时 Electron 工作台可正常显示 `AVE 工作台`，Project Host 显示在线。首次定位发现原生选择器未绑定发起 IPC 的工作台窗口；修正后实际目录选择器能够定位到用户项目目录。随后发现 `project.open` 返回新项目 ID 后仍使用空请求 ID发布事件，修正该事件边界后真实项目打开成功。

## 已完成动作

- 原生目录/文件选择器统一绑定到 `BrowserWindow.fromWebContents(event.sender)` 返回的工作台窗口。
- `project.create`/`project.open` 的事件发布使用 Host 返回状态中的项目 ID，避免空 `project_id` 触发 `invalid project event`。
- 真实打开、关闭、再次打开均已通过；全程未复制、上传或提交用户媒体。

## 验收标准

真实项目成功打开，页面显示项目已连接并能查询已有状态；关闭后重开仍保持一致；全过程无未解释的错误提示或永久同步状态。
