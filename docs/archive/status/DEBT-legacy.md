<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# Debt

## R06 Worker Job 持久化缺口（已关闭）

- Description：R06 时 Worker Client 每个提交创建独立 Worker 进程，关键 Job 状态仍由调用栈持有，尚无 `jobs`/`job_attempts` 的崩溃恢复。
- Reason It Was Accepted：任务清单将可恢复 Job Engine 明确放在下一工作单 R07；R06 先恢复媒体执行边界，避免用内存状态伪装持久化。
- Affected User or System Behavior：Worker 崩溃或 Host 重启时，媒体任务不会自动恢复，用户需要重新提交。
- Risk：长任务中断后没有可靠的 attempt/output ref 记录。
- Scope：`packages/platform/worker-client`、当前 Project Host Render/QC 调用链。
- Removal Condition：R07 持久化 Job、attempt、idempotency、crash recovery、cancel 和 retry 验收通过。
- Intended Milestone：WO-R07。
- Status：Removed by WO-R07; persistent Job/attempt, idempotency and recovery checks passed.
