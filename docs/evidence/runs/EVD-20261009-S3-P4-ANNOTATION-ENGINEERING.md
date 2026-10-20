---
evidence_id: EVD-20261009-S3-P4-ANNOTATION-ENGINEERING
work_package_id: WP-S3-P4-ANNOTATION-001
date: 2026-10-09
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 896491f9f99b46e119f45858a7c328a6e89a0d81effc5ab16ea7d8813cfccf4f
scope_fingerprint: 4f625dfebde0ceda38fea6e433c8d6238cf8117bec2fb8a589f44ed3a33fefd0
capability_ids: [CAP-S3-P4-ANNOTATION-001]
acceptance_ids: [ACC-S3-P4-ANNOTATION-001]
result: engineering_passed_pending_global_docs_reconciliation
---

# P4 持久化时间线批注工程验证

## 验证边界

本记录绑定批注能力和当前工作包代码范围。批注使用版本化合同，经 Main/preload 进入 Project Host，
由 Host 验证权限、请求/草稿、当前 Timeline 和精确锚点；一批批注以 append-only 项目事件原子保存。
没有修改 project-format-v2 数据库基线。Renderer 将待发送批注与普通创作输入分开，并先持久保存
稳定操作身份，再发送；只有精确匹配 Host 回执后才清空队列。批注消息按 Host 事件序号进入共享会话。

自动化使用隔离项目与合成视频。没有声称 Windows 实际交互、用户视觉接受、Stage Exit 或 Release。

## 验证结果

| 检查 | 结果 | 观察 |
| --- | --- | --- |
| `pnpm run stage3:p4-annotation:test` | 通过 | 覆盖原子批量写、相同/冲突重试、事务中断、关闭重开、修订事件排序、无模型调用、越权/陈旧/缺失目标拒绝、Timeline 不变、移动/分割映射和删除后 unresolved；Renderer 队列辅助逻辑验证稳定身份、精确回执和编辑后新操作身份。 |
| `pnpm run contracts:check` | 通过 | 91 个 Schema 与 91 组有效/无效示例通过。 |
| `pnpm run typecheck` | 通过 | 生成 91 份合同产物；TypeScript 无错误。 |
| `pnpm run architecture` | 通过 | 扫描 1489 个源码文件。 |
| `pnpm run renderer:workbench:test` | 通过 | 检查右键锚点路径、Host 批注路由、回执门控和 Renderer 边界。 |
| `pnpm run docs:sync` | 通过 | programme 状态与生成文档同步。 |
| `pnpm run docs:check` | 未通过 | 既有 P3 交互接受记录与当前代码指纹不一致；报告多个历史能力 Evidence applicability 问题及 P4 时间线旧范围问题。未改写历史 Evidence。 |

## 未关闭事项

批注工程能力通过自动化。全局 `docs:check` 的历史 Evidence 适用性及当前界面指纹问题将在当前构建的
P4 工作台整合/真实界面接受阶段重新核验。Windows 实际操作与用户整体界面接受仍待用户按该包的人工流程完成；
本记录不代替此项，也不代表 Stage Exit 或 Release。
