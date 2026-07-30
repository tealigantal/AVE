# WO-039：Project Render Service Preview/Master/QC

## 用户结果

Project Host 可以对明确选择的真实媒体生成 Preview、原片 Master 和结构化 QC；代理不能被用于 Master。

## 不变量

- Preview 从 proxy 生成，Master 从 original 生成。
- FFmpeg 只在 Project Host/Render Service 执行，Renderer 不执行 shell。
- QC 失败返回 blocked，不伪造 passed。

## 验收

- `npm run render-service:test`
- `npm run media:qc`
- `npm run check`
