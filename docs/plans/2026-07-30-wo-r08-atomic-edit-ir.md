# WO-R08 原子 Edit IR / CommitPlan

## Purpose

让 Assembly、Rough Cut、AI Patch 和手工批量编辑先完整解析、校验并在内存 Timeline 副本中模拟，再以一个 CommitPlan 在 Project Host 的单个 SQLite 事务中提交，杜绝逐条提交的半成功状态。

## Scope

- Timeline Core 增加 CommitPlan 字段、最终 Timeline 校验和多命令模拟。
- Project Storage 增加带 base-version 重读校验的单事务计划提交。
- Project Host 将单命令、Assembly、Rough Cut 和手工批量操作统一到 CommitPlan。
- Undo/Redo 识别批量计划并保持一次逻辑版本提交。

## Progress

- [x] 盘点现有逐条 Timeline 提交路径。
- [x] 实现多命令内存模拟、验证结果、affected ranges 和 plan hash。
- [x] 实现 Project Storage 单事务提交与并发 base-version 校验。
- [x] 接入 Assembly、Rough Cut、手工批量和 Undo/Redo。
- [x] 完成三操作失败原子性验收及完整检查。

## Decisions

- CommitPlan 的 `expected_final_version` 为 `base_version + 1`，无论计划包含多少 commands。
- 计划持久化为一条 `timeline_commands` 记录和一条 Timeline committed Event；commands 保存在计划内部。
- 计划哈希由 Project Host 对不含 `plan_hash` 的确定性 JSON 负载计算 SHA-256。
- Rebase 不修改旧计划的 base version；调用方必须重新读取、解析和模拟后创建新计划。

## Validation

`npm run typecheck`、`npm run architecture`、`npm run commit-plan:test`、Timeline/Assembly/Rough Cut/Undo-Redo 回归及 `npm run check`。

## Remaining Risk

Timeline Core 仍是最小 Clip/Track 模型；R09 才扩展 Sequence、Transition、Caption、Effect、Keyframe、Audio Routing 和完整命令集合。
