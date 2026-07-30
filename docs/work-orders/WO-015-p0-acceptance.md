# WO-015：P0 真实垂直切片

## 用户结果

用户可以从真实 MP4 创建项目，完成最小 Timeline 编辑，生成 Preview、原片 Master 和 QC，并在关闭重开后保持项目状态。

## 必跑测试

`npm run p0:acceptance`、`npm run check`。

## Definition of Done

P0 顺序操作全部执行成功；任何一环失败都使命令失败并记录具体阶段，不使用空成功或代理 Master。
