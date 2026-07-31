# WO-R15 Feature 包拆分

## 目标

把集中在 `editorial-core/public.ts` 和 Project Host 中的业务能力拆分为可独立验证的 Feature 包，并保持 Feature 之间不内部互调。

## 必须建立

`project-interview`、`reference-analysis`、`media-ingestion`、`evidence-building`、`material-sufficiency`、`story-planning`、`assembly-cut`、`feedback`、`rough-cut`、`fine-cut`、`sponsor`、`privacy`、`delivery`；每个包至少有 `src/public.ts`、`commands/`、`queries/`、`use-cases/`、`policies/`、`validators/`、`prompts/`、`ports/`。

## 边界

Feature 通过公开合同和 Project Host 协作；不得互相深层导入；Core 只保存纯领域对象和算法。

## 验证命令

Feature 边界/入口测试、`npm run typecheck`、`npm run architecture` 和完整 `npm run check`。

## 当前进度

- [x] 建立 13 个 Feature 包及统一分层目录。
- [x] 为每个 Feature 建立 `src/public.ts` 公开合同入口。
- [x] 增加 Feature 数量、层目录、公开入口和跨包导入检查。
- [x] 将 Feature 包纳入通用架构包边界扫描。
- [x] 将现有 `editorial-core` 业务校验/审批逻辑迁移到对应 Feature 公开入口，并让 Project Host 与属性测试改用 Feature 合同。
- [x] 通过 Feature 行为测试证明原有证据、故事、剪辑、反馈、隐私、交付和导出规则未丢失。
- [x] 将尚无历史业务实现的 `fine-cut`、`sponsor`、`media-ingestion` 保留为明确的公开边界，不伪造不存在的业务实现；后续端到端接线属于对应用户流程工作单。

## Outcome

R15 已完成。13 个 Feature 包均存在要求的分层目录和公开入口；已有 P1–P4 业务逻辑已从 `editorial-core/public.ts` 迁移到相应 Feature，Project Host 仅做编排并通过 Feature 公开合同调用。Feature 间没有内部互调，Core 只保留领域类型。

## Validation Evidence

`npm run feature-boundary:test`、`npm run feature-behavior:test`、`npm run typecheck`、`npm run architecture` 和完整 `npm run check` 均于 2026-07-30 通过。
