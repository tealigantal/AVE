# WO-035：Project Host Session 与真实项目状态

## 用户结果

桌面 Project Host 能通过 Main 管理一个真实项目会话；Renderer 只能请求打开/关闭和查询，项目路径只能来自 Main 的原生选择器。

## 不变量

- Project Host 是 `project.sqlite` 的唯一打开者和写入者。
- Renderer 不接收项目路径，不直接使用 Node、文件系统或 SQLite。
- 未打开项目时查询和命令明确失败，不返回伪成功。
- 关闭后锁释放，重新打开能读到同一项目身份和 Timeline 版本。

## 验收

- `npm run project-host:test`
- `npm run desktop:boundary`
- `npm run project-host:test`
- `npm run check`
