# 当前工作

## WO-R23 真实成片 QC 复核（已完成本地真实项目范围）

目标：复核用户真实项目的可见成片与数据库 QC 结论是否一致，修复已证明会漏检黑帧的 QC 阈值并复跑本地门禁；仅通过 Project Host 更新用户项目 Timeline/渲染记录，不复制、上传或提交用户媒体。

## Allowed Paths

- `docs/CURRENT_WORK.md`
- `docs/CURRENT_STATUS.md`
- `docs/VALIDATION.md`
- `docs/plans/2026-07-31-wo-r20-final-acceptance.md`
- `docs/plans/2026-08-01-wo-r21-desktop-real-flow.md`
- `apps/desktop/src/electron.d.ts`
- `apps/desktop/src/main/ipc/dialog.ts`
- `apps/desktop/src/main/ipc/project.handlers.ts`
- `apps/desktop/src/main/ipc/media.handlers.ts`
- `apps/desktop/src/main/ipc/render.handlers.ts`
- `apps/desktop/src/main/ipc/register-ipc.ts`
- `apps/worker-host/src/worker_host/render/graph_compiler.py`
- `apps/worker-host/src/worker_host/handlers/qc_master.py`
- `apps/worker-host/src/worker_host/handlers/render_timeline.py`
- `apps/worker-host/tests/media_protocol_smoke.py`
- `.github/workflows/security.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/worker.yml`
- `tests/integration/timeline-render.test.ts`
- `tests/integration/desktop-workbench-host.test.ts`
- `apps/worker-host/tests/proxy_map_protocol_smoke.py`
- `apps/worker-host/src/worker_host/render/graph_compiler.py`
- `tests/integration/electron-runtime.test.mjs`
- `docs/plans/2026-08-01-wo-r22-final-acceptance-audit.md`
- `docs/plans/2026-08-01-wo-r23-real-output-qc.md`

## 停止条件

当前状态：R23 已通过 Project Host 将未解释的 1 秒空档消除并生成第二版真实输出；Worker QC、FFmpeg 黑帧/冻结检测、Preview/Master 音频时长、输出规格和关闭重开均已通过。

停止条件：用户项目重新渲染后，FFmpeg 黑帧检测、Worker QC、输出规格和持久化结果一致通过；同时不复制、上传或提交用户媒体。已满足本工作单的本地可执行范围。
