<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R12 数据库与 Object Store 重构

## 目标

补全蓝图要求的数据模型，让 Transcript、Evidence Graph、Story Proposal/Plan、Assembly Cut、Timeline Snapshot、Edit IR、RenderGraph、Model Input/Output 和 QC Report 等大对象进入内容寻址 Object Store；SQLite 只保存 hash、object ref、version、relation、current head 和 metadata。

## 必须验证

- Object 临时写入、fsync、原子 rename 后才写数据库引用；
- 失败时数据库不留下悬空引用；
- Object hash 读取时校验；
- 孤儿 Object 可识别并由 GC 清理；
- requirements、decisions、approvals、locks、artifact graph、jobs、model runs、QC issues、privacy ledger、rights ledger 等数据模型具备真实迁移和验证。

## 边界

本工作单只处理 Project Storage/Object Store 与其事务边界；Model Gateway、真实模型调用和后续 Feature 留给 R13 及之后。

## 验证命令

`npm run typecheck`、`npm run architecture`、Object Store 专用测试和完整 `npm run check`。

## Outcome

2026-07-30 已完成。0018 migration 建立蓝图数据模型和 object store/object refs；Timeline Snapshot、Story Plan、Assembly Cut、Review Artifact、Delivery/Privacy/Rights、RenderResult 已写入内容寻址对象并通过读取/回填；fsync、原子 rename、事务失败、hash 校验、关闭重开和孤儿 GC 测试均通过。完整 `npm run check` 通过，架构扫描 163 个源码文件。
