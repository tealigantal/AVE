# WO-R11 真实 VFR ProxyMap

## 目标

删除固定 30 fps、固定 30 PTS 的伪 ProxyMap，使用真实 ffprobe 时间基、PTS、duration、VFR 信息和音频 sample timebase，建立原片与 Proxy 的双向分段映射。

## 验收

对授权 VFR Fixture 随机选择多个 Proxy 时间点，映射到原片后再映回，误差不超过规定帧容差；覆盖首尾帧、长视频累计误差、多段映射、VFR、30000/1001、23.976/25/30/50/59.94、混合素材和音频 sample rate。Master 回链只使用 ProxyMap，不使用固定 timescale。

## 当前实现

Core `ProxyMap` 已支持有序分段、原片→Proxy 与 Proxy→原片双向线性映射和 roundtrip 校验；Worker `media.probe.v1` 现在返回 stream time base、duration、packet/frame PTS、VFR 判定和 audio sample rate；`media.proxy.v1` 与 `media.proxy.map.v1` 返回真实映射。Project Host 在原片/proxy 路径不同且缺少 map 时自动请求 Worker map，并将其写入 RenderGraph/RenderResult。

## Outcome

2026-07-30 已完成。真实 VFR fixture 随机 roundtrip、帧率族、音频 sample rate、自动 map 的 Preview/Master 渲染和完整 `npm run check` 均通过；架构扫描 162 个源码文件。

## 边界

本工作单只修改媒体时间映射、ffprobe 适配、ProxyMap 合约/验证和对应测试；Object Store、数据库重构和后续产品 Feature 留给 R12 及之后。

## 验证命令

`npm run typecheck`、`npm run architecture`、`npm run check`，以及 R11 专用 ProxyMap roundtrip/边界测试。以上命令已实际通过。
