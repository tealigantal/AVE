# WO-R06 将 FFmpeg、Render 和 QC 迁入 Worker Host

## Purpose / Big Picture

恢复 Electron/Project Host/Worker Host 的三进程媒体边界：Node 侧只提交带相关 ID 的 Worker Job，并在结果返回后验证、登记候选产物；Python Worker 才能启动 FFmpeg/FFprobe、写临时工作区和输出结构化协议消息。

## Progress

- [x] 盘点现有 Node Render Service、Project Host、Worker 协议和媒体 fixture 链路。
- [x] 建立 Worker Registry、runtime、adapters、media/render/qc handlers。
- [x] 将 Worker Client 与 Project Host Render/QC 链路接通。
- [x] 验证取消、超时、stderr 隔离、临时目录清理和结果收集。
- [x] 更新治理文件并运行完整回归。

## Surprises & Discoveries

- R05 后 `packages/platform/render-service/src/render-service.mjs` 仍直接导入 `node:child_process`，Project Host 直接调用它。
- Worker 当前的 `main.py` 只支持结构化分析记录，现有 protocol smoke 对无 payload job 的预期也与实现不一致；R06 将统一为显式 task registry。

## Decision Log

- 本单采用 Python Worker 执行媒体子进程，Node `worker-client` 保留唯一 Worker 进程启动/协议路由入口。
- Render、QC 结果先返回为候选路径/报告；Project Host 在验证路径、哈希和 QC 状态后才登记 SQLite。
- R07 单独处理持久化 Job 状态、重启恢复和重试策略，不在本单伪造 Job Engine。

## Outcomes & Retrospective

R06 已完成。平台侧和应用侧不再直接启动 Render/QC 媒体子进程；真实 VFR fixture 已通过 Worker 完成 probe、fingerprint、proxy、preview、master 和 QC，结构化来源错误会阻断 QC。Job 持久化恢复留给 R07。

## Context and Orientation

Worker 入口为 `apps/worker-host/src/worker_host/main.py`；协议版本为 v1；Node 侧 Worker Client 为 `packages/platform/worker-client/src/public.ts`；当前 Render Service 为 `packages/platform/render-service/src/render-service.mjs`，Project Host 为 `packages/platform/project-host/src/project-host.ts`。

## Plan of Work

1. 在 Worker 内建立显式 registry 和运行时协议循环。
2. 将 FFmpeg/FFprobe 命令封装到 Python adapters，并实现媒体、Render、QC handlers。
3. 让 Node Worker Client 管理 handshake、progress、result、stderr、timeout 和 cancellation。
4. 通过 WorkerJobPort 改造 Render Service/Project Host，保留 Host 结果验收和 SQLite 登记。
5. 运行静态边界、Python smoke、真实媒体 fixture 和完整 `npm run check`。

## Concrete Steps

- `python apps/worker-host/tests/protocol_smoke.py`
- `python apps/worker-host/tests/media_protocol_smoke.py`
- `npm run worker:media:test`
- `npm run worker:boundary`
- `npm run check`

## Validation and Acceptance

- `apps/desktop`、`packages/platform/project-host`、`packages/platform/render-service` 不含 FFmpeg/FFprobe 或 `node:child_process` 执行。
- Registry 含 `media.probe.v1`、`media.proxy.v1`、`render.preview.v1`、`render.master.v1`、`qc.master.v1`。
- Worker stdout 只有协议 JSON；stderr 单独收集。
- handshake、progress、structured error、cancel、timeout、临时工作区和 cleanup 有实际测试。
- Project Host 通过 Worker 生成 preview/master/QC，并在成功后登记；非法/失败结果不登记。

## Idempotence and Recovery

每个 Worker Job 使用独立临时工作区和 job ID；成功结果复制/登记前不触碰 SQLite。取消、超时或 Worker 崩溃清理临时目录并返回结构化失败；R07 再把失败状态持久化为可恢复 Job。

## Artifacts and Notes

- `apps/worker-host/src/worker_host/registry.py`
- `apps/worker-host/src/worker_host/runtime/`
- `apps/worker-host/src/worker_host/handlers/`
- `apps/worker-host/src/worker_host/adapters/`
- `packages/platform/worker-client/src/public.ts`
- `packages/platform/render-service/src/render-service.mjs`
- `docs/decisions/ADR-0004-worker-media-boundary.md`

## Interfaces and Dependencies

Worker 协议沿用 `contracts/schemas/worker/worker-envelope.v1.schema.json` 的 v1 Envelope；Node 仅依赖 `WorkerJobPort`，Project Host 继续拥有 SQLite 写入权；Python Worker 不导入 SQLite、Project Storage 或 Electron。
