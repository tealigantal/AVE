<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# Research Log

## Initial architecture references

- Question：三进程安全边界、JSON Schema 2020-12、SQLite 原子提交和 OTIO 是否适合作为方向？
- Checked Date：2026-07-29
- Applicable Version：蓝图 v2.0
- Official Sources：蓝图第 31 节列出的 Electron、JSON Schema、Kubernetes、OTIO、SQLite 官方资料；本轮未在线复核。
- Open-source Implementations Compared：未比较。
- Maintenance and Release Status：未核验。
- License：未核验。
- Relevant Architecture or Pattern：Renderer/Host/Worker 权限隔离、Schema 单源、Desired/Current/Reconcile、内容寻址对象和事务提交。
- Limitations：本轮只是仓库基座，尚未证明运行时方案。
- Applicability to This Repository：作为待实现的约束和后续 ADR 输入。
- Decision or Follow-up：WO-001 先固化边界；在引入具体依赖和运行时前补充版本化研究。

## R20 remote CI evidence audit

- Question：本地 R19 Workflow 是否已经在 GitHub 远端产生可引用的 Check 证据？
- Checked Date：2026-07-31
- Applicable Version：远端 `main` 最新提交 `f88180ac8809d8792319da7b888313046fce3dee`。
- Official Sources：GitHub repository metadata、commit workflow-runs 查询和 commit combined-status 查询。
- Maintenance and Release Status：仓库存在且默认分支为 `main`；远端最新提交为 `chore: establish AVE project foundation`。
- Relevant Architecture or Pattern：本地 `.github/workflows/` 静态门禁不能替代 GitHub Actions 实际运行证据。
- Limitations：本地未推送的 R19/R20 工作树变更不属于该远端提交；本次只读审计未触发 Workflow、提交或推送。
- Applicability to This Repository：远端 workflow runs 与 commit statuses 均为空，因此 R20 不能宣称 CI 已运行或蓝图最终验收完成。
- Decision or Follow-up：保留 R20 的远端 CI 阻断；只有在用户授权发布本地变更后，才能通过实际远端 Check 补齐该证据。
