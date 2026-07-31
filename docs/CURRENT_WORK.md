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

当前状态：验收暴露 QC 黑帧检测的阈值配置错误；先修复该检测并重跑用户授权真实素材。

停止条件：真实媒体验收完成并记录通过或明确阻断原因。若验收暴露不同画面规格媒体无法拼接，可仅修复渲染图编译器的统一画布/音频规格处理，并用既有集成测试覆盖；不修改依赖或其他运行时代码。
