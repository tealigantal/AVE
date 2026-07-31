# Debt

## P0 Timeline 语义矩阵未闭合

- Description：已实现显式视频/音频编译、位置、空隙、增益和画布适配，但完整多轨、多采样率/声道、真实 VFR 与关闭重开矩阵尚未完成。
- Reason It Was Accepted：先修复已确认的假绿和旧 concat 语义，避免继续以通过的局部 smoke 宣称 P0 完成。
- Affected User or System Behavior：部分复杂 Timeline 仍可能被阻断，真实用户媒体最终通过尚无证据。
- Risk：未验证的边界可能在最终 Master/QC 现场暴露。
- Scope：RenderGraph v1、Worker compiler、Project Host final acceptance。
- Removal Condition：P0-TIMELINE 验收顺序中的全部定向、合成、真实和重开检查通过。
- Intended Milestone：WO-P0-TIMELINE。
- Status：Open；本轮真实 P0 验收已通过，完整多音轨/无音轨矩阵仍待补齐。

## R06 Worker Job 持久化缺口（已关闭）

- Description：R06 时 Worker Client 每个提交创建独立 Worker 进程，关键 Job 状态仍由调用栈持有，尚无 `jobs`/`job_attempts` 的崩溃恢复。
- Reason It Was Accepted：任务清单将可恢复 Job Engine 明确放在下一工作单 R07；R06 先恢复媒体执行边界，避免用内存状态伪装持久化。
- Affected User or System Behavior：Worker 崩溃或 Host 重启时，媒体任务不会自动恢复，用户需要重新提交。
- Risk：长任务中断后没有可靠的 attempt/output ref 记录。
- Scope：`packages/platform/worker-client`、当前 Project Host Render/QC 调用链。
- Removal Condition：R07 持久化 Job、attempt、idempotency、crash recovery、cancel 和 retry 验收通过。
- Intended Milestone：WO-R07。
- Status：Removed by WO-R07; persistent Job/attempt, idempotency and recovery checks passed.
