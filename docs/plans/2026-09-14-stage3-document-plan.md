# DOC-006 Stage3 正式文档规划

## Purpose / Big Picture

纯文档实施：把用户 2026-09-14 的确定要求落为完整个人化创作闭环的统一目标、设计、候选工作单与验收；不是功能实施或新的长期治理阶段。本记录属于工程执行记录层，由 docs/README.md 导航；既有 Stage2 ExecPlan 不负责此独立文档任务。

## Context and Orientation

仓库已初始化为重要项目。起始 HEAD 为 `1434d0060a23b321fb43290f48f71e348979cf79`，初始工作区干净，generated WORK 无 active package。两份桌面资料文件头为 v2.1/v2.0，属于背景快照；当前代码事实另行核对。仅核对 Stage3 直接依赖，不重开 PR26。

## Plan of Work / Progress

- [x] 按 AGENTS 权威链读取，定位输入和实际创作入口，委派只读代码/文档审查。
- [x] 更新产品、运行时、记忆/档案、UX、错误与质量权威，并记录新 ADR。
- [x] 建立候选工作单、范围映射、依赖及代表性验收场景。
- [x] 核对指定 UI 原件或如实记录缺失，不使用相似稿替代。
- [x] 运行文档门禁、独立复核并形成独立 Evidence；本地提交为最终 Git 检查点，不推送或启动开发。

## Concrete Steps

依次执行 `pnpm run docs:sync`、`pnpm run docs:check`、`pnpm run docs:architecture:test`、`pnpm run docs:fingerprint:test`、`git diff --check`；文档工具有共享发布锁，相关命令顺序运行。不运行全量媒体回归，不启动 `docs:start` 或 `docs:complete` 去推进无关实施包。

## Validation and Acceptance

每项产品要求须对应设计、候选包和可观察验收。检查当前代码/目标/原型/未来验收区分、旧默认流程消除、原型精确摘要、无源代码和历史 Evidence 修改。文档通过不意味着 Stage3 tested/accepted。

## Allowed scope / Interfaces and Dependencies

仅 `PROJECT_GOAL.md`、直接相关的 `docs/product/`、`docs/01-product/`、`docs/02-intelligence/`、`docs/intelligence/`、`docs/product-intelligence/`、`docs/pipeline/`、`docs/ux/`、`docs/architecture/` 中目标衔接、必要新 `docs/decisions/ADR-0028-*`、`docs/work-orders/stage3/`、导航、此计划及独立 EVD。生成导航/状态仅工具更新。禁止 runtime、Schema、generated types、业务测试、依赖、CI、许可证、历史 ADR/已完成包/Evidence 修改。

## Idempotence and Recovery

根代理唯一写入；保持用户已有工作。可重复运行文档工具，失败保留原始原因而不更改检查器。需要撤回时仅反向本任务的明确 diff，不清空工作区或用户数据。不推送、PR、合并、发布或启动开发。

## Surprises & Discoveries

当前主产品生成仍采用固定候选及等长 Evidence 分配；单镜头 inward trim 不能满足 Stage3。Model Gateway 存在不等于已进入主生成链。指定 HTML 暂未定位，继续查找并保留准确缺口。首次 docs:check 报 CAP-CA-EXIT-001 applicability：本轮曾改 PROJECT_GOAL.md，而它属于历史退出能力 scope。复核后长期目标/用户决定权没有变化，撤回本轮该处非必要改写，将 Stage3 请求授权语义保留在产品/授权文档；不改历史 Evidence/index、能力状态或检查器。

## Decision Log

- 以现行设计文件承载细节；新增 Stage3 总计划仅负责范围/依赖映射，候选清单不复制 programme 状态。
- 请求授权、用户采用、导出与发布分开；本轮记录目标替换而不改变运行权限。

## Artifacts and Notes

总入口为 `docs/product-intelligence/STAGE3_PLAN.md`；检查和最终结果记录于 [DOC-006 Evidence](../evidence/runs/EVD-20260914-DOC-006-STAGE3-PLAN.md)，包含实际修改文件清单。

## Outcomes & Retrospective

已完成一致的目标、候选六包、C1–C9 与错误/授权/版本设计。独立复核发现并修正现有消费者测试范围、残留审批默认及删除/提交 TOCTOU。指定 HTML 未找到，因此未实查、不伪造视觉尺寸或可操作性；缺口已写入 Workspace Design。最终检查与本地提交为最后步骤。
