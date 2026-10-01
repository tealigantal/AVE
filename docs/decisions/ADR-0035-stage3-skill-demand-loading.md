# ADR-0035 — Structured Creative Skills and two-call planning

Date: 2026-10-01. Status: PR #28 correction technically tested; unmerged.

## Context and corrected conflicts
用户授权修订尚未进入 main 的本 ADR。原 PR 把 Stage2 V1 shape 放入 V2、从原文正则推测知识字段、把 applicable 等同必须编辑，并加入一个 index-only 模型轮次。这些设计被本决定替换。

## One current contract
SkillEvaluation 只保留 schema_version=2；context_kind 区分 creative-context（Stage2 Contract/MaterialPack 引用）与 creation-planning（Stage3 Request/Observation/Timeline/Profile/capability 绑定）。所有实际生产者、读者、fixture 和生成物共同替换；无 V1 reader、别名、转换或双读。旧对象字节不重写。

五种 result 为 applicable、not_applicable、insufficient_evidence、unsupported_capability、failure。非 applicable 的 disposition 为 none。applicable 的 decision_only 与 no_change 不要求编辑效果；只有 creation-planning 的 edit_proposed 要求非空实际 evidence/capabilities 和 Host 验证的 skill_effects。Stage2 的判断只产生 decision_only/no_change。SkillEvaluation 在 audit 中保留，SkillEffect 仅记录真实编辑提案。

SQLite 唯一开发 baseline 的 skill_evaluations CHECK 同步为五结果与 stale。依 ADR-0025 和现行单版本政策，不引入数据迁移、转换或兼容读。历史项目文件与作品保留；旧 schema 项目在当前 runtime 写入前明确拒绝，不宣称可继续兼容打开。真实验证建立新隔离项目，仅只读取已有公共素材授权来源。

## Structured source and truthful authorization
catalog-source.md 原始 64 篇正文与 SHA-256 完整保留。catalog.v1.json 是一次性人工语义映射的纯数据：明确 goal、contexts、evidence、rules、conflicts、failure cases、quality criteria、counterexample conditions、output kinds、完整 body、provenance 与 routing metadata。没有逐 Skill TS 执行代码；正文边界解析仅验证 ID、完整正文与 digest，运行时不从关键词推测语义字段。

治理状态 local_runtime_approved 仅表示本次用户请求授权该精确版本在本地 AVE Runtime 使用；trust_status=user_authorized，license_status=redistribution_not_granted。没有虚构 reviewer、reviewed_at、公开 publication 或法律发行许可证。

## Local candidates and two physical calls
本地 deterministic router 使用任务类型、当前请求的粗粒度内容域、明确平台/商业目标、素材观察类型、可执行能力、获准 Profile 维度、保护要求；只筛选最多 12 个候选，正常代表输入为 6–12 个。领域配额与 metadata 排序用于限制候选上下文，不输出适用性、Story、源顺序或时长。模型可以拒绝所有候选；没有固定剪辑 bundle 或兜底生成器。缺少专门能力的相关候选仍可被模型判为 unsupported_capability。

Call 1：完整候选正文与结构化证据/限制、当前创作上下文一起提交；此时模型才选择 Skill、给出正式 evaluation 和源/顺序/时长测量。Host 校验后计算 exact timing/feasibility。
Call 2：输入 canonical evaluations 和可行 receipt，省去整库及重复正文，生成最终 CreationDecision。Skill 不增加第三次调用；首轮不可行即明确失败，不能内部再测到绿色。非本任务历史 Planning receipt 的既有精确重建边界保持原样。

事实/权限/硬要求/保护 > 当前请求 > 项目例外 > 获准且适用 Profile > Skill > Platform/Trend。Common rules 仅首轮发送。Platform/Commercial/Knowledge 只在明确对应任务进入候选；不包含 Connector 或知识自动更新。

## Execution and failure boundaries
仅 edit_proposed 建立 definition pin + 实际 decision field + grounded evidence；Host 计算实际值摘要并验证能力、引用和字段。decision_only/no_change 可以合法零 effects，不为证明 Skill 使用而造改动。
Creation Planning → CreationDecision/CreationPlan → Project Host → CommandEditIntent/IR → simulate/validate → CommitPlan → Timeline/Preview/Master 不变。Model/Skill/Worker 没有直接写入权。损坏协议、非法引用和工具错误失败并保留根因，无非法项过滤、fallback、切模型或内部重试。

## Validation
A–F 组合 fixture、V2-only 身份与读者、no_change/decision_only、仅编辑需 effect、候选过滤/数量与实际两次 Gateway 调用先验证；稳定后一次授权公共素材真实模型操作、Preview/Master/QC/reopen，再最终 check/synthetic 与 PR CI。真实结果与真人创作/听评分开记录；本 ADR 不作验收证据。
