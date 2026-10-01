# ADR-0035 — Stage3 Creative Skill demand loading

Date: 2026-10-01. Status: implementation under validation.

## Context and concrete conflicts
用户要求唯一内容源 `AVE_Creative_Skill_Catalog_Source.md` 接入现有 Stage3，不建立第二套 Skill 系统。
现行 CreativeSkillDefinitionV1 的小写 ID 正则不能表达 S01 等源 ID；结构化 reasoning/evidence/conflict 字段没有完整原文入口。
现行 SkillEvaluationV1 的 Stage2 Contract/MaterialPack pin 不能代表 Stage3 Request/IntentRevision/Observation/Timeline/Profile 固定输入，且 blocked 混合不同原因。
现行三轮 measured-receipt Planner 不加载 Skill；首轮 source measurement 缺乏 Skill 正文依据。

## Decision
保留源文件原字节与 SHA-256，Core 只做纯解析和无损映射；Platform 读取内置只读知识文件。新增 definition `catalog_content` 保留完整正文，扩展 ID 正则，不重写知识、不手编 64 个执行函数。源未提供结构化 evidence/capability 列表，不能编造逐 Skill 数据；全文中的要求由选择/规划模型在固定上下文中判断，Host 校验引用和实际能力。

Stage3 的精简 SkillEvaluation 提案只作为现有 planning exchange transport DTO。Host 将其绑定并验证为正式 SkillEvaluationV2（唯一现行 Stage3 评价合同），固定 evaluation identity/input fingerprint 以及 Request、Observation、Timeline、Profile、executable capabilities 的独立摘要，并随第二/三轮输入保存在正式 Planning audit。五种状态的唯一语义来源为该合同；唯一当前 skill-evaluation.v2 合同内的 schema_version=1 兼容分支保留 Stage2/不可变历史读取（旧 schema/examples/generated bindings 已替换），不参与 Stage3 选择。完整 root input digest 将 Request revision、授权 Profile、Observation、Timeline、hard/protected 状态与 definition versions 固定。旧 Stage2 evaluation 及历史 built-in definitions 继续用于其既有兼容调用/历史读取，不能进入 Stage3 的唯一 Catalog。没有另一套知识服务或可写 Skill 状态。

同一三个物理调用：Level1 index + explicit evaluations → Level2 selected verbatim bodies + source measurement → final decision。第一轮仅供选择，不能作为最终 source receipt；第二轮不能替换 Skill。最多 12 个候选判断；不同未选状态保留在实际响应账本，不非法过滤后宣称成功。Knowledge/Commercial/Platform 仅在对应当前请求出现时进入候选索引。

最终每个 applicable Skill 必须绑定实际可执行决定字段的 JSON pointer、定义 pin、证据与原因；Host 从实际值计算摘要。模型不负责计算散列；若声明了错误摘要则失败，不能修正后继续。选择/解释文字本身不能算 effect。CreationDecision 到 CreationPlan 保留绑定，并继续由 Host 编译、simulate/validate、CommitPlan、Preview/Master；Skill 没有 Commands/SQLite/RenderGraph 权限。

`not_applicable`、`insufficient_evidence`、`unsupported_capability` 是明确的候选评价状态；协议损坏、错误引用和工具失败为 failure。已选正文揭示无法执行的必需效果时，整个本次规划失败，不换 Skill/模型、不内部重试。已有 request-level external rerun 必须是用户新动作，原失败保留。

## Consequences and limits
版本增加必须明确采用新源，不能自动更新 Trend 或学习覆写知识。源使用授权仅来自本次用户对本地 Runtime 的接入请求，不代表公开发行许可证。
底层不存在的 dynamic tracking、复杂转场、速度映射、声音修复、隐私蒙版等不能因为有 Skill 正文就变成 executable capability。真实模型和真实媒体验证须单列，不以 fixture 冒充。

最终模型响应 schema 按已选 definition_ref 和实际测量后的可绑定路径收紧为 const/enum；Host 不生成创作字段值、不修复非法输出。集合路径必须绑定实际来源/字幕证据；空集合只有删除此前有来源证据的内容时才算效果。纯 fixture 验证传输/编译/拒绝语义，不冒充真实模型因果或真人成片评价。
