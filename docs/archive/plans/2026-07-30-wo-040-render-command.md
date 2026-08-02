<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-040 Project Host Render/QC Command

## Outcome

原片路径由 Main 文件选择器提供，Project Host 调用 Render Service 生成 proxy/preview/master 和 proxy map，并运行结构化 Master QC；Renderer 只收到状态。

## Validation

- `npm run render-service:test`
- `npm run render-service:test`
- `npm run check`

## Evidence

真实 VFR Fixture 经过 FFmpeg 生成 Preview/Master，ffprobe 可解码，Master QC passed；proxy 路径作为 Master 被阻断。

## Remaining Risk

Electron runtime 尚未现场启动；真实桌面文件选择器和人工操作尚未执行，Render/QC 状态仍是会话缓存。
