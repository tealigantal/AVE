# WP-S3-SKILL-001 — Supplied Skill Catalog runtime

用户授权本次补全 Stage3 现有创作能力；依赖已完成 WP-S3-INTEGRATION-001。
范围与 allowed_paths 以同 programme EXECUTION_MANIFEST 为唯一机器权威。
完整内容仅来自内置原文，不缩写/合并/改写，不建立第二知识体系。

目标为 64 单元可解析、immutable definition pin、本地 Level1 候选过滤 / Level2 正文评价、两次 Planner 调用、独立判断与真实编辑的字段级 effect 及现有 Host CommandEditIR/CommitPlan 链。
四种失败语义分别记录；非法字段/引用、权限/保护冲突与下游能力缺口不得通过过滤/模板/换模型/内部重试转成功。

执行计划：[Stage3 Skill Runtime](../../../plans/2026-10-01-stage3-skill-runtime.md)。
接口决策：[ADR-0035](../../../decisions/ADR-0035-stage3-skill-demand-loading.md)。
验证从纯 fixture A–F 与 Planner/Host 开始，稳定后才真实 Planner 和 Preview/Master，最后 contracts/typecheck/architecture/docs/check/acceptance:final:synthetic。
缺失的编辑能力不在本包假实现；未完成验证不能标 completed。本任务授权提交、推送和更新 PR #28；禁止合并、发布、下一阶段或未来 Creator Platform 建设。

PR #28 修复范围：唯一 V2 全调用方与 SQLite 当前 baseline、静态结构化 64 条 Catalog、真实本地使用授权、评估/编辑效果分离、本地候选过滤与两次 Planner 调用、PR 内机器路径清理。用户已授权本分支提交/推送与更新 PR，不合并。一次真实模型操作须在定点稳定后执行，最终完整门禁与远程 verify/check、verify/security 均通过才结束。
