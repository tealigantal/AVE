# WO-036：Project Host Timeline Command API

## 用户结果

Renderer 可提交版本化 Timeline Command，由 Project Host 应用并事务写入 snapshot/command/event；冲突或非法命令不会改变项目。

## 不变量

- 所有修改都带 `base_version`，版本不一致时 fail closed。
- Timeline 输入对象不原地修改；提交通过 `applyCommand` 和 `commitTimeline`。
- Project Host 是 SQLite 唯一写入者，Renderer 不能传入数据库路径。

## 验收

- `npm run timeline:host:test`
- `npm run check`
