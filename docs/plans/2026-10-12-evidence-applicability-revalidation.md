# DOC-011 当前源码适用性复核

本独立文档工作范围承接 [DOC-007 GATE](2026-10-03-reliable-workbench-real-acceptance.md#gate全局证据与旧模块处理)。DOC-007 管理本次 P4/P5 产品实施；它不能单独维护本轮已受影响的 editing-execution-v1、creative-assistant-v1 与 Stage3 历史 Evidence applicability，因此依照 GATE 建立此独立范围。这里的结果仅证明所列当前源码范围重新通过其 required tests，不更新历史 Evidence、不接受产品/能力、不关闭 Stage Exit 或 Release。

## 目标

针对 `pnpm docs:check` 实际列出的 applicability 与 latest Evidence 指纹失败，按 capabilityScope 对应实现路径、所属包 required_tests、历史 Evidence 与本轮源码差异，保存当前审计、命令日志及哈希；仅在对应验证完整通过时向 `APPLICABILITY_INDEX.json` 增加 index-only 关联，并在来源 programme STATE 更新相应债务与 Evidence 引用。不得刷新未验证的范围或降低能力状态。

## 允许修改

- 本 ExecPlan、`docs/07-work-orders/README.md`、`docs/evidence/README.md`
- `docs/evidence/APPLICABILITY_INDEX.json`
- `docs/evidence/assets/doc-011/**`
- `docs/evidence/runs/EVD-20261012-DOC-011-EVIDENCE-APPLICABILITY-REVALIDATION.md`
- `docs/program/editing-execution-v1/STATE.yaml`
- `docs/program/creative-assistant-v1/STATE.yaml`
- `docs/program/creative-assistant-stage3/STATE.yaml`
- `docs/current/**` 与 `docs/DOCUMENT_INDEX.md` 仅由 `pnpm docs:sync` 生成

实际产品源码和测试仍归其原工作包；DOC-011 不扩大其修改权。历史 Evidence、历史决策、归档文档、产品源码、合同及 generated bindings 均不可由本 DOC 范围修改。

## 执行步骤

1. 保存 docs:check 失败清单；计算当前受影响 capabilityScope、旧/当前源码指纹差异和每个 scope 的所需验证边界。首轮完整失败输出保存在 `docs/evidence/assets/doc-011/docs-check-failures-20261012-at-start.txt`；包含37个过期 capability scope、latest Stage3 Evidence身份、两项generated drift及一个annotation submit v2/v3当前合同歧义。
2. 对同一必需命令去重后执行；日志逐条保存退出码与 SHA-256。外部模型或私有真实素材不可用时记录缺项，不以索引或默认值伪造通过。
3. 生成 DOC-011 Evidence。每个能力只通过完整覆盖其适用 required_tests 的日志重新登记 applicability；历史人评、Stage Exit、产品完成及其原 Evidence 均保持原意。
4. 更新对应 programme 的 DOC-008 相关 Debt 与 Evidence 引用，运行 `docs:sync` 和 `docs:check`，确认生成结果与真实适用性一致。

## 完成条件

所有本轮 docs:check applicability 与 latest Evidence 身份失败均有当前哈希绑定且 required tests 已验证；合同当前版本歧义单独在所属产品包修复；受影响的正式检查及 DOC-011 审计均通过；历史记录未改写，未验证范围保持显式债务。Evidence 只主张工程适用性复核。

## 2026-10-14 执行检查点

- 已按当前 programmes 重算原 37 个受影响 scope；28 个指纹相较 2026-10-12 审计变化。完整 scope 与所需命令见 `docs/evidence/assets/doc-011/scope-audit-20261014-current.json`。
- 89 个唯一测试命令均已执行：88 项退出码为 0；`stage2-product-workspace:real` 返回明确 `STAGE2_DESKTOP_REVIEW_RETIRED`，按退役入口记录，不写成通过，Stage2 真人审阅债务保持 active。三项本机真实输入复核通过；其日志、每次重试和哈希见 `commands-final-20261014.json`。
- 旧 Stage2 Renderer selector 与 Stage3 导出焦点断言已按现行 UI 修正；相关重试及完整 `stage3:check` 通过。Worker render correctness 使用固定 Python 运行时通过，现行默认留边/显式 crop 断言均保留。
- DOC-011 Evidence 已登记当前指纹关联，索引后的 `pnpm docs:sync` 与 `pnpm run docs:check` 退出码为 0。默认 Python 下的全量检查因 Pillow 版本不符失败；固定 Python 3.12.14/Pillow 12.3.0 后完整 `pnpm run check` 退出码为 0；`pnpm run acceptance:final:synthetic` 退出码为 0，明确只接受合成切片。退出码及日志 SHA-256 见 `docs/evidence/assets/doc-011/current-rerun-20261014/post-index-verification.json`。退役的 Stage2 真人入口保持活动债务，不计入通过。

下一步：DOC-011 的索引后复核已按真实运行结果收尾；P4已由 `EVD-20261015-S3-P4-UX-CURRENT-R3` 正式关闭并完成关闭后的 `docs:sync`/`docs:check`。Stage2 真人审阅债务仍保留；执行范围已交回 DOC-007 接续 P5。DOC-011 不关闭Stage Exit或Release。

