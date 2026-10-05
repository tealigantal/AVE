---
evidence_id: EVD-20261005-S3-RELIABLE-JOURNEY-FORGET
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-05
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: a0928ac1b2e4a53cd583c32feabe53af0031adf4b9d095f6a7e662e5ad26f02a
scope_fingerprint: 634a216e2bfb514984d5cde21ecfdd321fe624bc7e931ba9f804944299c1f2db
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# 已确认的测试经验遗忘

本记录是前一收尾 Evidence 的后续执行事实，不改写其当时待确认状态。用户在已展示精确影响范围后回复“确认”，授权执行最终“确认遗忘”。正常6080页面的审查仍为同一对象：仅自建来源作品 `47c3f68b-aa03-4ab5-9e49-af86c88e0706`（P3独立验收-20261005-续验-189d976e）产生的1条经验、1条原则，内容为验收情境图片停留3秒。未操作其他来源或作品删除入口。

公开按钮执行完成，确认窗口关闭，状态显示“本次操作已完成，其他未处理问题仍保留”。刷新后仍是当前作品v4，中文未提交输入保留，撤回经验列表为空且按钮禁用。[刷新后截图](../assets/reliable-journey/p3-forget-confirmed.png)。

Host拥有的档案SQLite仅以readOnly读取验证：profile v6、deletion_generation=1、learning_enabled=false、remaining_principles=0；确切来源在excluded_sources，原学习事件在excluded_events，确切原则在disabled_principle_ids。不是仅凭学习停用造成查询为空推断遗忘成功。[排除身份验证](../assets/reliable-journey/p3-forget-confirmed.json)。此经验之后不可重新用于个性化，审计历史不伪装物理删除。

原来源作品目录和project.json保留，timeline_versions含v0至v4共5条，3项素材仍登记。当前新作品刷新仍v4，无新增版本、云创作或学习提交。[来源作品保留验证](../assets/reliable-journey/p3-forget-work-preserved.json)。此前已经过验证的个性化成稿保留，不撤销其历史来源说明。

本次没有代码、颜色、容器、模型配置或挂载修改，不重跑已通过的媒体工程检查。永久遗忘及刷新持久性项目已通过；P3仍因音乐署名完整公开导出未覆盖及27项历史文档适用性门禁而blocked，不宣称P3正式完成、Stage Exit或Release。
