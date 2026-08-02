<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-011：Edit IR

## 用户结果

AI 或用户提出的剪辑意图先被转换为可验证的 Edit IR，只有经过 Resolve、Simulate、Validate 的 CommitPlan 才能交给 Project Host 提交。

## 允许修改

`contracts/schemas/timeline/`、`packages/core/edit-ir/`、合同/属性测试和项目文档。

## 禁止修改

Renderer、Worker、SQLite、Timeline Repository 和任何模型 SDK。

## 不变量

- Edit IR 不是 Timeline，不能直接写入项目状态。
- 所有候选 Source Range 必须引用已知 Asset，并通过 Timeline Validator。
- Resolve、Simulate、Validate 任一步失败都不得产生 CommitPlan。
- base_version 冲突只能 Rebase 或明确要求用户选择。

## 必跑测试

`npm run typecheck`、`npm run contracts:check` 和 Edit IR property/contract tests。

## Definition of Done

Schema、Resolver、Compiler、Simulator、CommitPlan、Rebase 和失败路径测试均存在；不增加架构违规。
