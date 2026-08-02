<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R07 补全 Worker Client 和 Job Engine

## Purpose / Big Picture

把 Worker 任务从调用栈中的临时 Promise 提升为 Project Host 持有的可恢复 Job：每个 Job 和 attempt 写入项目 SQLite，输入 hash 与 idempotency key 防止重复结果，Host 重启能够恢复 RUNNING 状态，取消/超时/Worker 崩溃能够留下结构化失败，而只有临时错误可以进入重试。

## Progress

- [x] 盘点 R06 Worker Client、Job Engine 和 Project Storage 的现状。
- [x] 增加 `jobs`/`job_attempts` migration 与 Project Storage 持久化 API。
- [x] 补全 Job 状态机、输入 hash、幂等和错误分类。
- [x] 让 Worker Client 支持可控任务、取消、超时和崩溃检测。
- [x] 将 Project Host 媒体任务接入持久化 Job 并验证恢复。
- [x] 更新治理文件并运行完整回归。

## Surprises & Discoveries

- R06 的 `createLocalWorkerJobPort().submit()` 每次创建独立 Worker 进程，无法由调用者取消或把 attempt 写回项目。
- 现有 `job-engine` 只有内存状态机，`Project Storage` migration 版本停在 14，没有 `jobs`/`job_attempts`。

## Decision Log

- Job 表由 Project Storage migration 创建，但只能通过 Project Host 持有的 session 写入；Worker 不接触 SQLite。
- `idempotency_key` 在同一 project 内唯一；已成功 Job 的重复提交返回原结果，不再启动 Worker。
- `TEMPORARY_PROVIDER_ERROR`、`RESOURCE_EXHAUSTED` 才允许进入 `RETRYABLE_FAILED`；非法输入、协议错误和 Worker 代码错误进入 `BLOCKED`。
- R08 单独实现 CommitPlan/Atomic Edit IR，不在本单改变 Timeline 提交语义。

## Outcomes & Retrospective

R07 已完成。强退 Worker、关闭重开 Host、重复 idempotency key、取消/超时、临时错误重试、非法输入阻断和 Project Host 真实媒体 Job 均有持久化可观察结果；R08 负责原子 Edit IR。

## Context and Orientation

Project Storage runtime 为 `packages/platform/project-storage/src/project-storage.mjs`，migration 由 `openProject` 固定列表执行；Job 状态机在 `packages/platform/job-engine/src/public.ts`；Worker JSON-lines client 在 `packages/platform/worker-client/src/runtime.mjs`；Project Host Render 调用在 `packages/platform/project-host/src/project-host.ts`。

## Plan of Work

1. 创建 migration 0015 和事务安全的 Job CRUD/attempt API。
2. 用明确状态转移和错误分类重写 Job Engine，并保留既有基础测试兼容性。
3. 扩展 Worker Client 控制面，支持 job ID、progress、AbortSignal、timeout 和 child exit。
4. 在 Project Host 建立持久化 Worker Job facade，接通媒体 Render/QC。
5. 用真实 Worker/fixture 和临时项目覆盖 crash、restart、idempotency、cancel、retry/block。

## Concrete Steps

- `npm run job-engine:test`
- `npm run job-persistence:test`
- `npm run worker:client:test`
- `npm run project-recovery:test`
- `npm run check`

## Validation and Acceptance

- SQLite 包含 `jobs`、`job_attempts`，字段覆盖 job_id、task_type、idempotency_key、input_hash、attempt、state、progress、error class、output refs 和 created/started/completed time。
- 所有合法状态：`PENDING`、`READY`、`RUNNING`、`PAUSED`、`WAITING_FOR_USER`、`RETRYABLE_FAILED`、`BLOCKED`、`SUCCEEDED`、`CANCELLED`。
- 强退 Worker 后 Job 进入可观察失败/恢复状态；Host 重启将 RUNNING → RECOVERING 后按幂等性恢复或阻断。
- 相同 idempotency key 不重复产生 Worker 输出；取消能终止 Worker 子进程，非法输入不自动重试。

## Idempotence and Recovery

所有 Job 写入使用 project + idempotency 唯一约束和事务；attempt 先写 RUNNING，再写终态。Host 打开项目时将遗留 RUNNING 标记为 RECOVERING，幂等任务可重新提交，非幂等任务 BLOCKED。失败恢复不得删除已有成功 output refs。

## Artifacts and Notes

- `database/migrations/0015_jobs.sql`
- `packages/platform/project-storage/src/project-storage.mjs`
- `packages/platform/job-engine/src/public.ts`
- `packages/platform/worker-client/src/runtime.mjs`
- `tests/integration/job-persistence.test.mjs`
- `docs/decisions/ADR-0005-persistent-job-engine.md`

## Interfaces and Dependencies

Project Host 是唯一 SQLite writer；Job Engine 通过明确 Store Port 使用 Host session；Worker Client 只负责子进程和协议，不能读写 `project.sqlite`。R07 不新增生产依赖，不改变 Contract 主版本。
