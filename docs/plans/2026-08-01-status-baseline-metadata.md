# 状态基线元数据修正

## Purpose / Big Picture

消除 `docs/CURRENT_STATUS.md` 将提交前版本误称为“实际 HEAD”的自指问题，同时保留可追溯的状态内容基线。

## Context and Orientation

`docs/CURRENT_STATUS.md` 是当前状态唯一来源。提交会改变 Git HEAD，因此一个已提交的 Markdown 文件不能稳定保存“当前 HEAD”的精确值；该值只能在工作树中实时查询。

## Plan of Work

1. 将错误的“实际 HEAD”字段改为状态内容基线。
2. 明确实时 HEAD 的唯一查询方式。
3. 检查变更只触及状态元数据和本计划。

## Concrete Steps

1. 用 `git rev-parse HEAD` 核对文档中的提交与实际 HEAD 的关系。
2. 更新当前状态文件的元数据说明。
3. 用 `git diff --check` 和 `git diff --stat` 检查范围。

## Validation and Acceptance

- `docs/CURRENT_STATUS.md` 不再宣称保存实际 HEAD。
- 文档说明状态基线与实时 HEAD 的区别。
- 变更仅限本计划和当前状态文件。

## Idempotence and Recovery

重复执行不会引入新的提交自指。若需核对实时版本，运行 `git rev-parse HEAD`；无需再次编辑状态文档。

## Artifacts and Notes

- 当前状态：`docs/CURRENT_STATUS.md`
- Git 的实时工作树版本：`git rev-parse HEAD`

## Interfaces and Dependencies

不涉及运行时代码、外部服务、依赖、素材或发布。

## Progress

- [x] 确认文档记录的 SHA 是其后一次文档提交的父提交。
- [x] 改为稳定的状态内容基线语义。
- [x] 记录实时 HEAD 的查询边界。

## Surprises & Discoveries

- 一次只改文档元数据的提交也会改变 HEAD，因此“文件内实际 HEAD”没有稳定解。

## Decision Log

- 采用“状态内容基线”而非删除全部追溯信息：它能说明状态评估依据，同时不冒充实时 Git 状态。

## Outcomes & Retrospective

自指问题已消除。后续任务仅在需要时查询 Git，不再为了刷新 SHA 修改当前状态文件。
