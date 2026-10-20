---
evidence_id: EVD-20261009-S3-P4-RECYCLE-ENGINEERING
work_package_id: WP-S3-P4-RECYCLE-001
date: 2026-10-09
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: f574ce8baa56ddcc6f766ce1b7e9202d594efc327573f108959e16607eec9d27
scope_fingerprint: 6d38f9da80f7c5cc05bc09817e2579c2bf45614e2eb9a0e761921410f69338d2
capability_ids: [CAP-S3-P4-RECYCLE-001]
acceptance_ids: [ACC-S3-P4-RECYCLE-001]
result: engineering_passed_pending_global_docs_reconciliation
---

# P4 回收站工程验证

## 验证边界

回收站状态保存在 Main 用户导航索引中，索引从 v1 向后兼容升级到 v2；移入回收站不会移动项目文件。
逐项和批量操作使用明确的新路由。永久删除继续经过 Host 的项目身份、锁、专属目录及外来文件检查，
并把待清理意图持久保留以支持失败重试。外部原片不属于删除范围。

自动验证使用隔离项目，覆盖 Main 重启后的回收状态、恢复、取消、外来文件、物理清理、部分批量失败、
索引损坏和待清理重试。没有声称 Windows 实际交互、用户视觉接受、Stage Exit 或 Release。

## 验证结果

| 检查 | 结果 | 观察 |
| --- | --- | --- |
| `pnpm run stage3:p4-recycle:test` | 通过 | 覆盖 v1 索引升级、回收状态持久化、逐项/全部恢复与删除、取消、外来文件保护、部分失败、重试及外部原片保留。 |
| `pnpm run stage3:desktop:test` | 通过 | 最近项目、会话关闭、存储、生命周期、授权和启动回归通过。 |
| `pnpm run renderer:workbench:test` | 通过 | 验证回收站导航、逐项/批量操作路由、确认文案和旧直接删除路由移除。 |
| `pnpm run typecheck` | 通过 | 91 份生成合同通过 TypeScript 检查。 |
| `pnpm run architecture` | 通过 | 扫描 1490 个源码文件，架构边界检查通过。 |
| `pnpm run docs:sync` | 通过 | programme 状态与生成文档同步。 |
| `pnpm run docs:check` | 未通过 | 报告历史 Evidence applicability、当前交互接受指纹漂移，以及本次代码变更后需在整合阶段重录的能力证据；未改写历史 Evidence。 |

## 未关闭事项

回收站实现和本包自动检查通过。全局文档检查与跨包 Evidence 适用性在最终 P4 整合中重新核验；
Windows 实际操作及整体界面接受仍由用户完成。本记录不代表 Stage Exit 或 Release。
