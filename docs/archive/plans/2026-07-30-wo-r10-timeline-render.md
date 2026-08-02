<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R10 真实 Timeline → RenderGraph → Render

## Purpose

让 Preview 和 Master 真正消费 Timeline 的 Clip 顺序、Source Range、Speed、Transform、Audio、Transition、Caption、Effect 和 Composite 语义；统一由 RenderGraph 描述，再由 Worker 编译为 FFmpeg filter graph。

## Current Repository Context

R09 已提供扩展 Timeline Core。当前 `packages/platform/render-service` 只创建 proxy 并把 proxy/original 整段 `-c copy` 为 preview/master；Worker 没有 Graph compiler，`render_runs` 也没有 Timeline/Graph/source/profile/hash 元数据。

## Milestones

- [x] Timeline Core → RenderGraph 构建器：节点链、源引用、局部范围、Capability Matrix 和确定性 Graph hash。
- [x] Worker `render.timeline.v1`：显式 source refs，Graph → FFmpeg filter graph；Master 强制 original，Preview 允许 proxy/fallback。
- [x] Project Host `renderTimeline`：Preview/Master 复用同一 Graph 语义，真实 Job/QC 和 RenderResult 持久化。
- [x] 双素材前后半段裁剪/换序验收，检查 Master 首帧来源和输出时长；补充 Master proxy/缺失原片阻断。
- [x] 更新架构/ADR/Validation，并运行完整 `npm run check`。

## Outcome

2026-07-30 已完成。双素材真实 FFmpeg 验收通过：交换后的 Clip B 首帧先输出；Master 缺失显式原片 ref 被阻断；Worker filter graph、RenderResult 元数据和关闭重开读取均通过。`npm run check` 全量通过，架构扫描 158 个源码文件。

## Acceptance

两个 Clip 分别取前半段和后半段并交换顺序，Master 输出必须反映新的裁剪和顺序。Master 找不到显式原片 ref 时必须阻断；不能通过文件名或路径字符串推断 proxy。RenderResult 必须可读取 Timeline version、Graph hash、source refs、profile、Worker/FFmpeg version 和 output hash。

## Decision Log

- Graph 节点携带显式 `asset_ref`、`source_ref` 和 `source_kind`；路径是 Project Host 解析后的 object/original/proxy ref，不由 Worker 猜测。
- Preview 与 Master 使用同一个 Graph builder；仅 source selection/target capability 不同。
- RenderGraph compiler 保持在 Python Worker，Core 不引入 FFmpeg、shell 或 Node runtime。

## Rollback and Risks

新增 `render_results` 表，不改写旧 `render_runs` 行；旧 `render()` 保留作为无 Timeline 的兼容路径。R11 再补 VFR/ProxyMap 精确映射；R10 仅使用显式 source timescale 和 filter graph。

## Validation Commands

`npm run timeline-render:test`、`npm run worker:render-graph:test`、`npm run typecheck`、`npm run architecture`、`npm run check`。
