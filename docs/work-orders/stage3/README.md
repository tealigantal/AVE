# Stage3 工作单入口

本页只负责导航；活动包、完成状态、允许路径和依赖由 [Stage3 manifest](../../program/creative-assistant-stage3/EXECUTION_MANIFEST.yaml) 与 [generated WORK](../../current/WORK.md) 提供。已失效的候选允许路径、旧模型版本和阶段阻塞说明已从本入口移除，不能据此重新启动旧包。

## P4 直接执行入口

1. [P4 工作包：24项操作清单](../../program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-UX-001.md)。
2. [DOC-007：L0–L7、GATE、自动验证和P5](../../plans/2026-10-03-reliable-workbench-real-acceptance.md)。
3. [现行 Workspace Design](../../ux/WORKSPACE_DESIGN.md) 与 [demo说明](../../../demos/p4-workbench/README.md)。

先完成真实功能，再按固定demo重做UI；工程及自动交互验证决定完成，人工反馈可选。必要范围调整先记录manifest，不反复等待用户确认；产品运行权限/身份检查保留。

## 依赖包与既有范围

- [时间线工程子集](../../program/creative-assistant-stage3/work-packages/WP-S3-P4-TIMELINE-001.md)
- [批注持久化工程子集](../../program/creative-assistant-stage3/work-packages/WP-S3-P4-ANNOTATION-001.md)
- [回收站工程子集](../../program/creative-assistant-stage3/work-packages/WP-S3-P4-RECYCLE-001.md)
- [Stage3 产品总计划](../../product-intelligence/STAGE3_PLAN.md)：原 S3-01–06 的产品范围仍保留；具体实现登记以programme为准，不另启原候选。
- [模型服务配置](MODEL_SERVICES_SETUP.md)

当前P4不能仅凭三个依赖包的历史工程通过宣称全部接入；持续执行记录只写DOC-007。早期候选/失败事实查 [Evidence导航](../../evidence/README.md)，不从旧提交/模型身份推断现行要求。

- [2026-10-20 P4 Browser partial verification](../../evidence/runs/EVD-20261020-S3-P4-UX-BROWSER-PARTIAL.md): actual recovery/reopen checks and repaired material count; full P4 remains blocked.

- [2026-10-20 current-design gate correction](../../evidence/runs/EVD-20261020-S3-P4-UX-AUTHORIZATION-GATES.md): superseding causal audit, explicit historical validation debt and bounded external-call proposal; P4 remains blocked.

- [2026-10-20 authorized paid-model preflight](../../evidence/runs/EVD-20261020-S3-P4-UX-PAID-PREFLIGHT.md): actual configuration/prices and six-frame offline sample plan verified; zero paid sends because the CNY 5 cumulative bound is not yet enforceable.

- [2026-10-20 bounded paid Browser results](../../evidence/runs/EVD-20261020-S3-P4-UX-PAID-BROWSER.md): 9 calls within cap, real v4 export/reopen, annotation provenance failure and narrow tested source repair; rebuilt-image annotation/full P4 verification remains blocked.

- [2026-10-20 rebuilt Browser verification](../../evidence/runs/EVD-20261020-S3-P4-UX-REBUILT-WEB.md): current image/source/output binding, real Web provenance preservation through delete/render/reopen, offline causal check and exact two-round budget gap; v4 Library attachment delivered.

- [2026-10-22 annotation recovery and authorization blocker](../../evidence/runs/EVD-20261022-S3-P4-UX-ANNOTATION-REOPEN.md): focused canonical-JSON comparison repair and real Browser follow-up; prior request authorization expired, no new API calls, P4 remains blocked.

- [2026-11-03 P4 bounded grayscale and request recovery integration](../../evidence/runs/EVD-20261103-S3-P4-UX-GRAYSCALE-INTEGRATION.md): real paid v7/v8 outputs; full P4 remains blocked.

- [2026-11-03 scoped grayscale and obsolete-check cleanup](../../evidence/runs/EVD-20261103-S3-P4-UX-SCOPED-GRAYSCALE.md): bound local targets, four retired-check removals, actual v12 output and current verification.

- [2026-11-03 historical observation preservation](../../evidence/runs/EVD-20261103-S3-P4-UX-REVOCATION-HISTORY.md): full-check regression repaired; current P4 verification continues.

- [2026-11-03 P4 verification handoff](../../evidence/runs/EVD-20261103-S3-P4-UX-VERIFICATION-HANDOFF.md): push verified, current WIN09 recovery, partial paid WIN10 v1, preserved data and explicit call/data boundary.

- [P4 navigation engineering checkpoint](../../evidence/runs/EVD-20261103-S3-P4-UX-HARNESS-NAVIGATION.md): current harness navigation repair and unchanged historical revalidation debt; Browser continuation active.

- [P4 synthetic continuation and source-preview repair](../../evidence/runs/EVD-20261103-S3-P4-UX-SOURCE-PREVIEW.md): mixed-media/free-music v1, layout repair, preserved data, explicit budget and public-download blockers.
