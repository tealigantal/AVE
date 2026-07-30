# WO-041：Render/QC Persistence

## 用户结果

Preview/Master/QC 完成后，项目重开仍能显示最近一次真实 Render 和 QC 状态。

## 不变量

- Render Run、输出路径和 QC 报告由 Project Host 同一事务登记。
- QC `blocked` 原样持久化，不能被 UI 转成 passed。
- Renderer 不持久化文件路径或 QC 结果。

## 验收

- `npm run render-persistence:test`
- `npm run check`
