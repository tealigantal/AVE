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
