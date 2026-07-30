# WO-035 Project Host Session

## Outcome

Main 持有真实 Project Storage 会话；Renderer 通过版本化命令请求打开/关闭，项目路径只由原生选择器提供，状态查询返回真实项目身份和 Timeline/Render/QC 状态。

## Validation

- `npm run project-host:test`
- `npm run desktop:boundary`
- `npm run project-host:test`
- `npm run check`

## Remaining Risk

Electron runtime 未现场启动；当前状态面板缓存项目身份，真实 Timeline/Render/QC 状态刷新和项目创建向导仍需后续工作单。
