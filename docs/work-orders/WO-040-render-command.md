# WO-040：Project Host Render/QC Command

## 用户结果

用户从工作台选择原片后，Project Host 在项目内生成 Preview、原片 Master 和 QC 报告，界面显示真实通过/阻断状态。

## 不变量

- 原片路径不经过 Renderer，不写入 Renderer 状态。
- FFmpeg/ffprobe 仅由 Project Host Render Service 执行。
- Master 不得使用 proxy；QC blocked 不得显示 passed。

## 验收

- `npm run render-service:test`
- `npm run check`
