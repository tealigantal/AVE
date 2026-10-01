# Quality Evaluation Pipeline

Evaluation combines deterministic checks and human review. Story checks cover
evidence coverage, coherence, character continuity and emotional curve. Editing
checks cover pacing, selection, audio, continuity and transition intent.
Technical checks cover `CommandEditIR` validity, Timeline version, Semantic
Render Manifest equality across target-specific Preview/Master execution,
output manifests and Master QC.

The result is a Quality Report with metric definitions, evidence, thresholds,
uncertainty, blockers and reviewer decisions. A score cannot override a failed
QC, missing evidence, license issue or user rejection.

## Stage3 交片前自检

先确定性校验来源/事实引用、句子与声音边界、字幕文本/时序、重复片段、关键要求、保护、解码/A-V sync/响度及已注册技术 QC；模型可提供创作复核建议，不替代事实和用户接受。计划和实际渲染各验证一次相应边界，重复片段允许明确有意重现并保留理由。

正常创作改进建议最多两轮且受请求费用/调用/时间预算控制，每轮记录修改范围和实际结果；不通过时标未完成和根因，不无限重剪、不丢非法项、不偷偷用旧版交片。失败恢复与创作探索分开计数。Preview/Master 绑定同一 committed Timeline 和目标无关 manifest、分别执行各自 Plan；技术绿不等于审美接受。具体预期/产物见 [C1–C9](../product-intelligence/CREATIVE_QUALITY_BENCHMARK.md)。
