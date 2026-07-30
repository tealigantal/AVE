# WO-041 Render/QC Persistence

## Outcome

Project Host 将每次 Render Run 的原片、proxy、Preview、Master 路径和 QC 报告在同一事务写入项目；重开后恢复最近状态。

## Validation

- `npm run render-persistence:test`
- `npm run render-service:test`
- `npm run check`

## Evidence

`render_runs` migration、`render.completed` event、QC passed/block 状态和关闭重开读取均通过。

## Remaining Risk

尚未进行 Electron runtime 现场操作；发布导出和平台格式验收仍待后续 P4 工作单。
