---
evidence_id: EVD-20261005-DOC-008-CURRENT-REPOSITORY
work_order_id: DOC-008
date: 2026-10-05
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: d55645a47bd8f0c8991f3e939da33fb1120ea37b0c4832f576a7fabd7b3399b8
result: blocked
---

# 当前仓库文档校正与有界 Evidence 适用性复核

本记录属于独立文档执行 Evidence，拥有计划为 [DOC-008](../../plans/2026-10-05-current-repository-document-reconciliation.md)。用户要求“修正文档，按照当前仓库”。不关闭实施包、不改业务代码或测试、不部署、不用文档通过代替产品接受。

## 已校正文档

AGENTS的活跃Stage2描述改为当前Stage3及P3用户人工确认/正式关闭登记待补的实际边界。中英文README补充可靠媒体人工接受范围，旧mixed-media-p5图对应的独立主观门槛保留。Work Orders导航指向现行Stage3 programme；Evidence首页不再将9月real60称作最新用户确认。UX现行说明删除旧回收站/仅隐藏导航流程，统一project.delete数据保留边界；自动三文件下载改为三个显式链接，准备/发起/保存分开；历史P2失败不覆盖后来人工通过，P3人工通过与正式工作包登记分开。User Experience Flow明确目标表与当前实现的关系。长期PROJECT_GOAL、历史ADR/Evidence、Stage2独立corrected-duration/real-media门槛均不改写。

## 来源与验证

旧来源清单no-alias-current-runtime.json与旧full-ledger-attempt05.json指纹均为b4c1aa…。70条旧命令exit0及全部日志SHA256重新核对通过。当前生产输入相对此基线有37项变化，逐项文件/前后哈希及28项能力当前include/scope/hash记录在 `docs/evidence/assets/doc-008/source-audit.json`。代码指纹始终为d55645…，仅文档与审计资产改变，不重建已由用户接受的运行镜像。

当前相称离线复核22组命令中21组通过、1组失败；另外media-import:host:test通过。通过组覆盖Stage2和完整Stage3工程链、类型/合同、文档治理/指纹/交互记录/构建身份、存储、Worker取消恢复、基础状态恢复、Host工作台与导出/渲染持久化、问题记录、项目删除、浏览器独立下载和架构。实际退出码、日志哈希见ledger.json及applicability-decisions.json；不能把这些受控fixture检查写成新真人验收或新的私有素材/云模型旅程。

唯一失败：worker:render-correctness:test在render_graph_media_correctness.py:879断言失败。opacity-framing无明确reframe、20×12来源进入64×64画布，测试要求baseline/animated均(0,0,63,63)且后续要求increase+crop；实测三者均为(0,12,63,49)，符合当前默认保持原画幅并留边。该结果证明测试期望与当前默认构图行为存在冲突，不能仅凭此决定哪方需要修正，更不能弱化断言或伪称渲染回归全绿。没有重跑制造通过，没有改实现/测试。完整首次失败日志保留在worker-render-correctness-test.log。

## 适用性处理

逐能力选择必需复核命令并验证exit0及日志哈希，14项不涉及本次graph_compiler变化的范围更新当前工程适用性索引：Stage2治理、上下文、Skill、时长、故事、反馈、工作台、适用性治理与依赖安全；Stage3 Skill、Web、可靠导入、可靠浏览、项目删除。当前索引对同一能力/evidence绑定维持一个现行值；旧绑定保存在index-before-reconciliation.json及其SHA256引用中，历史Evidence不修改。更新项引用本次来源影响审计、账本和精确选用的命令。只确认工程证据在有界增量下的适用性，不给旧人工确认新运行身份、不提升能力状态。

README/AGENTS文案修正额外影响CAP-CA-GOV-002、CAP-S3-DOCKER-001、CAP-S3-DOCKER-CLEAN-001三个文档范围。其产品构建输入未变，当前来源审计/构建身份检查及最终文档治理检查支持文案变化，另外登记doc-only-scope-adjustments.json；不以文案改动重新声称Docker/UI/听音验收。

其余14项scope包含改变的graph_compiler，保守保留失配：CAP-RENDER-001、CAP-PRESET-001、CAP-FND-001、CAP-CA-PERMISSION-001、CAP-CA-PIPELINE-001、CAP-CA-PRODUCT-002、CAP-CA-UX-001、CAP-CA-EXIT-001、CAP-S3-FIRST-LOOP-001、CAP-S3-MEDIA-001、CAP-S3-AUDIO-PACK-001、CAP-S3-SOUNDTRACK-001、CAP-S3-PRECISION-001、CAP-S3-MEDIA-CLOSEOUT-001。这不是断言14项产品都坏了，而是共享变更边界尚有未通过的验证，不为它们更新摘要。新增独立Debt保留这一真实阻塞，不撤销原构建上的用户人工反馈，也不把阶段验收、工作包完成或Release写成通过。

最终docs:sync、docs:check及文档治理的原始结果见本轮doc-008资产；本次文案校正与14项适用性已完成，全局工程/文档门禁仍因上述14项保持blocked。

最终docs:sync exit0；docs:check exit1，恰为上述14项适用性失配，没有当前指纹/生成漂移报错。最终docs:architecture:test串行exit0。首次把两个文档检查并行运行触发programme publication共享锁，保留docs-architecture-final.log失败；随后串行检查是消除本次调度冲突，不修改断言。首次追加重复索引绑定时检查器find命中旧值，且文案又使三项原先匹配的scope过期；保留docs-check-final.log的29项中间失败，保存旧索引快照后校正唯一现行绑定，最终docs-check-closed.log为14项。所有中间失败及未通过渲染断言保留。
