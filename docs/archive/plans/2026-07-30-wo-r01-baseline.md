<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R01 清理仓库与建立真实基线

## Purpose / Big Picture

建立可信的仓库基线：删除错误命名和机器相关生成物，统一当前状态来源，并让 README、治理文件与实际 P0 原型阶段一致。

## Context and Orientation

仓库已是重要项目，现有历史计划、进度和验证记录较多；本工作单只处理基线文档与生成物，不修改业务源码，不进入 R02/R03。

## Plan of Work

1. 清理错误命名 UX 文件和已跟踪机器生成 JSON。
2. 更新忽略规则、README、PROJECT_GOAL 与 AGENTS。
3. 将历史计划和旧进度快照移入 `docs/archive/`，以 `docs/STATUS.md` 作为唯一当前状态。
4. 搜索绝对路径、生成物和文档矛盾并运行基线验收。

## Validation and Acceptance

- 全仓搜索 Windows 与 Unix 用户目录形式的绝对路径无命中。
- 错误命名文件不存在，两个 JSON 生成物不再被跟踪。
- `docs/STATUS.md` 存在且 README 链接到它。
- `git status --short` 不包含视频或运行时输出。
- `npm run check` 作为回归检查实际运行并记录结果。

## Idempotence and Recovery

清理只删除明确列出的错误命名/生成文件，历史文档通过 Git 可恢复；不触碰用户未提交源码改动。

## Progress

- [x] 只读盘点与范围确认。
- [x] 文件清理和文档收口。
- [x] 验收与状态记录。

## Surprises & Discoveries

- 当前仓库无未提交改动，但两个 JSON 生成物已被 Git 跟踪并含绝对路径。

## Decision Log

- 不把 `tests/golden/` 建为空目录；R01 没有确定性 Golden Fixture 需要迁移。

## Outcomes & Retrospective

R01 已完成。仓库状态、历史计划和旧进度已分离；回归检查通过，未引入 ADR。

## Artifacts and Notes

当前状态唯一来源：`docs/STATUS.md`。历史计划归档于 `docs/archive/plans/`。

## Interfaces and Dependencies

仅依赖 Git、PowerShell、现有项目文档和 package scripts；不新增生产依赖。
