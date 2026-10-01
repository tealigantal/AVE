# WP-S3-SKILL-001 — Supplied Skill Catalog runtime

用户授权本次补全 Stage3 现有创作能力；依赖已完成 WP-S3-INTEGRATION-001。
范围与 allowed_paths 以同 programme EXECUTION_MANIFEST 为唯一机器权威。
完整内容仅来自内置原文，不缩写/合并/改写，不建立第二知识体系。

目标为 64 单元可解析、immutable definition pin、Level1 selection / Level2 details、真实 Planner 的字段级 effect 及现有 Host CommandEditIR/CommitPlan 链。
四种失败语义分别记录；非法字段/引用、权限/保护冲突与下游能力缺口不得通过过滤/模板/换模型/内部重试转成功。

执行计划：[Stage3 Skill Runtime](../../../plans/2026-10-01-stage3-skill-runtime.md)。
接口决策：[ADR-0035](../../../decisions/ADR-0035-stage3-skill-demand-loading.md)。
验证从纯 fixture A–F 与 Planner/Host 开始，稳定后才真实 Planner 和 Preview/Master，最后 contracts/typecheck/architecture/docs/check/acceptance:final:synthetic。
缺失的编辑能力不在本包假实现；未完成验证不能标 completed。无提交、推送、合并、发布、下一阶段或未来 Creator Platform 建设。
