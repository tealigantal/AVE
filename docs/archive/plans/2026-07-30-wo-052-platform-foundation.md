<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-052 Platform Foundation

## Objective

补齐蓝图中位于 Project Host 与外部 Worker/模型之间的最小平台基础边界，并提供无 UI 验证入口。

## Implemented

- `packages/platform/job-engine/src/public.ts`：显式状态机、合法迁移、attempt 计数和终态判断。
- `packages/platform/worker-client/src/public.ts`：子进程 JSON-lines 发送、逐行校验和停止边界。
- `packages/platform/observability/src/public.ts`：payload SHA-256 审计摘要。
- `packages/platform/model-gateway/src/public.ts`：provider/model/prompt/privacy 元数据和敏感输入 fail-closed 门控；不伪造具体 provider。
- `apps/dev-cli/src/main.ts`：`create-project`、`inspect-project`、`verify-project` JSON 输出入口，复用 Project Storage，不绕过 Project Host 写入边界。
- `inspect-media` 使用 FFprobe 输出媒体流信息和 SHA-256 身份；`import-media` 将原片复制到 `originals/` 并写入 Object Store。
- `create-timeline` 与 `render-preview` 通过 `ProjectHostSession` 执行 Timeline 初始化、Preview/Master、QC 和持久化，不允许 CLI 直连 SQLite。
- `apply-command` 通过 `base_version` 调用 Project Host Timeline Command/Commit；JSON 中的 `0n` 等 RationalTime 表示会在 CLI 边界恢复为 BigInt。
- `render-master`、`run-qc` 已提供独立 CLI 入口；`verify-project` 现在实际打开项目并返回 SQLite `integrity_check` 结果。
- `migrate-project` 复用 Project Storage 的登记迁移集合，并报告当前 schema version 与 integrity 结果。
- `analyze` 通过真实 Python Worker dispatch ASR/OCR/Scene job，并将 terminal outputs 通过 Project Host 注册为 Evidence；`inspect-evidence` 验证重开后的记录。
- `propose-story` 只基于已知 Evidence 生成候选 StoryProposal；`approve-story` 通过 Project Host 的 Evidence 引用门控持久化 ApprovedStoryPlan。
- `register-assembly` 通过已批准 Story Plan/Evidence 门控保存 validated Assembly Cut；`compile-assembly` 通过 Project Host 编译并提交 Timeline。
- `apply-rough-cut` 通过 Project Host 校验 patch base version、Clip、PTS 和 J/L 音频边界后提交 Timeline。
- `review-diagnosis`、`compare-review`、`reaction-review` 通过 Project Host 持久化 Review Artifact，并校验 Compare 关系与 Reaction PTS/类型。
- `approve-privacy`、`approve-rights`、`create-delivery`、`validate-export`、`register-export` 已接通 Delivery/Export Host Gate，并登记真实 Master 文件 SHA-256。
- Project Storage 打开失败时释放锁；非法 PID 和已退出 PID 的锁可安全回收，避免崩溃后永久阻断项目重开。
- Observability 已提供递归敏感字段脱敏和结构化日志格式；Worker Client 已提供按 `request_id` 等待响应的关联能力。
- Job Engine 已通过真实 Python Worker 子进程完成 job dispatch，能区分 progress 与 terminal `job_result`，并将失败映射为可重试状态。

## Validation

`npm run typecheck`、`npm run architecture`、`npm run platform:foundation:test`、`npm run project-recovery:test`、`npm run dev-cli:test` 和最新全量 `npm run check` 通过；Worker Client 测试使用真实 Node/Python 子进程回环。

## Remaining Risk

真实 Worker 调度重启策略、模型 provider、完整审计输出、媒体迁移 CLI 命令和 Electron runtime 仍需后续工作单及现场条件。
