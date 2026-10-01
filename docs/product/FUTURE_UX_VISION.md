# Future UX Vision

## Product position

AVE 不是“带 AI 功能的视频编辑器”，而是可对话的 AI Vlog 剪辑师。时间线是高级模式和执行层，不是普通用户的主要入口；用户不应为了修正 AI 的基础错误而被迫进入专业时间线。

## Primary journey

素材导入 + 目标（可简短）→ 请求授权内直接完整主初稿 → 制作中随时插话/改方向 → 看片自然语言多镜头视听修改及手动精修 → 可撤回版本/比较/组合 → 自检/采用/导出。获准学习在反馈后更新情境原则并用于新项目，可例外/纠正/遗忘。

素材理解、Direction/Story/Skill 可作为内部工作和可选查看，不是用户必经审批。视觉和连续动效仅采用 [指定 HTML 基准](../ux/WORKSPACE_DESIGN.md)，不重新设计网站式界面。反馈经 Host semantic adapter → CommandEditIntent/CommandEditIR/CommitPlan，满意部分保持稳定。

## Experience limits

普通 Vlog 目标不超过三轮修改，复杂或广告项目不超过五轮。缺证据、能力或素材时必须解释并提出选择，而非伪造结果。高级用户可检查 Timeline、`CommandEditIR` 和依据；这不转移普通用户的修正负担。
