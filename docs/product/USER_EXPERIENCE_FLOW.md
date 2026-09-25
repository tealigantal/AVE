# User Experience Flow

## End-to-end journey

以下是 Stage3 目标，不是现有 Stage2 已运行状态。

| 阶段 | 用户操作 | AVE 工作 | 授权 / 版本 |
| --- | --- | --- | --- |
| 创建/导入 | 选择本地项目和素材，表达简短目标或直接开始 | 保存请求、分析真实来源 | 明确素材/预算/外部数据范围，不强制报告/问卷 |
| 制作 | 可随时输入新要求 | 内部选材/叙事/视听计划，生成完整主初稿 | 请求范围内草稿；不先选 Direction/Story |
| 调整 | 插话、改变方向、取消/暂停 | 合并意图、复用有效工作、作废过期候选 | 收到/调整中/已可观看分开，过期任务不提交 |
| 看片/精修 | 感受、多镜头声字幕要求、手动编辑 | Host 编译/校验/原子新草稿 | 满意/保护部分稳定，手动变化进入后续 base |
| 历史/采用 | 看旧版、比较、再试、组合选段、撤销 | 精确版本和源 PTS 对齐，新草稿不覆盖旧作品 | 播放/采用/最新草稿独立 |
| 学习 | 一次开启指定范围，纠正/例外/排除/遗忘 | 有来源情境原则，跨项目影响实际作品 | 假设不是明确确认，索引不是权威 |
| 导出 | 选定作品/目标 | 原片 Master 与 QC，真实持久化 | 导出不是发布；失败不能显示成功 |

## Interaction rules

The normal path is the accepted local video workspace with always-available input; cards and reports are optional inspection. Advanced users may open evidence, `CommandEditIR`,
commands and semantic hashes. Every proposed change states what will change,
what will not change, why, confidence and the rollback point.

## State machine

运行时的请求修订/可观看绑定见 [Creative Runtime](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md)；不再以 Contracted/Directed/StoryApproved 作为 Stage3 用户强制关卡。内部校验保留；草稿保存、采用、导出和发布分别记录。旧版可保留，失败任务不能覆盖它或把它标最新。真实恢复和 UI 基准见 [Workspace Design](../ux/WORKSPACE_DESIGN.md)。
