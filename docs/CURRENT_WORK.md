# 当前工作

## WO-R20 真实素材最终验收

目标：使用用户授权的本地真实媒体运行最终验收，记录实际结果；不复制、上传或提交媒体。

## Allowed Paths

- `docs/CURRENT_WORK.md`
- `docs/CURRENT_STATUS.md`
- `docs/VALIDATION.md`
- `docs/plans/2026-07-31-wo-r20-final-acceptance.md`
- `apps/worker-host/src/worker_host/render/graph_compiler.py`
- `apps/worker-host/src/worker_host/handlers/qc_master.py`
- `tests/integration/timeline-render.test.ts`

## 停止条件

当前状态：已使用用户提供的两段真实媒体完成正式最终验收；Timeline 空隙作为计划内黑场传入 QC 后通过。

停止条件：已满足。真实媒体验收通过并记录；未上传、复制或提交用户媒体。

## WO-P0-TIMELINE Timeline 与音频渲染正确性

目标：让已提交 Timeline 的位置、空隙、媒体种类、独立音轨、裁切、增益和画布适配真实进入 RenderGraph → Worker → Master/Preview 链路，并让契约、Host 验收和检查门覆盖这些语义。

## Allowed Paths

- `docs/CURRENT_WORK.md`
- `docs/CURRENT_STATUS.md`
- `docs/VALIDATION.md`
- `docs/PROGRESS.md`
- `docs/DEBT.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/RESEARCH_LOG.md`
- `docs/plans/2026-07-31-wo-r20-final-acceptance.md`
- `docs/plans/2026-08-01-p0-timeline-audio-render.md`
- `docs/adr/README.md`
- `package.json`
- `contracts/schemas/render/render-graph.v1.schema.json`
- `contracts/examples/valid/render/render-graph.v1.json`
- `contracts/examples/invalid/render/render-graph.v1.json`
- `contracts/generated/`
- `packages/core/render-graph/src/public.ts`
- `packages/platform/project-host/src/project-host.ts`
- `packages/platform/worker-client/src/`
- `apps/worker-host/src/worker_host/render/graph_compiler.py`
- `apps/worker-host/src/worker_host/handlers/qc_master.py`
- `apps/worker-host/src/worker_host/handlers/render_timeline.py`
- `apps/worker-host/tests/render_graph_protocol_smoke.py`
- `apps/worker-host/tests/qc_master_protocol_smoke.py`
- `tests/integration/timeline-audio-caption.test.ts`
- `tests/integration/timeline-render.test.ts`
- `tests/integration/real-media-final-acceptance.test.ts`
- `tests/integration/final-acceptance.mjs`

## P0-TIMELINE 停止条件

当前已完成 RenderGraph contract examples/codegen-clean、QC 三类黑帧回归、Timeline 位置/空隙/独立音频/画布回归、Project Host 真实验收入口和关闭重开证据；多视频轨重叠和未实现 Transition 仍结构化阻断。完整多音轨矩阵仍是后续工作。
