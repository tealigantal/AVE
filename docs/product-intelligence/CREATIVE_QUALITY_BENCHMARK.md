# Creative Quality Benchmark

## Purpose, authority and status

This document defines how AVE should evaluate whether a video and its editing
process are useful, coherent, technically valid and acceptable to its creator.
It extends [Product Metrics](../product/PRODUCT_METRICS.md), the
[Quality Evaluation Pipeline](../pipeline/QUALITY_EVALUATION_PIPELINE.md) and
the existing editing-execution QC/acceptance authorities. It does not create a
second `QualityReport`, capability matrix or acceptance status system.

Benchmark results are evaluation evidence, not execution or publication
permission. Current capability status remains in `docs/program/` and
`docs/current/`; future creative benchmark scores cannot promote a capability.

## Quality model

AVE evaluates four distinct dimensions:

```text
Story Quality
  + Editing Quality
  + User Satisfaction
  + Technical Quality
  -> evidence-backed review, never one magic score
```

Hard gates run before weighted creative comparison. Invalid sources,
rights/privacy failures, unsupported semantics, failed QC, factual fabrication
or user rejection cannot be averaged away by a high aesthetic score.

## Story quality

| Signal | Question | Evidence |
| --- | --- | --- |
| coherence | Can the viewer follow people, events, time and causality? | beat/evidence coverage, continuity review, causal contradictions |
| emotional progression | Do evidenced state changes develop rather than jump arbitrarily? | reviewed emotional transitions, alternatives, human rubric |
| narrative completeness | Does the promised setup receive adequate development/payoff for the chosen form? | Story Plan roles, ending reserve, missing-beat diagnostics |
| factual fidelity | Does the story preserve what the material supports? | exact Evidence refs, contradiction and correction rate |
| creator identity | Does the result represent the creator as approved? | Contract/profile conflicts and human identity review |

Completeness is relative to the approved form and duration. A short observational
Vlog does not fail for lacking a conventional three-act structure when the
Creative Contract chose another form.

## Editing quality

| Signal | Question | Evidence |
| --- | --- | --- |
| pacing | Do shot, dialogue, pause and music durations serve the approved intent? | duration/rhythm measurements plus human review |
| shot selection | Does each shot provide the intended evidence, reaction or continuity? | decision/evidence refs and reviewer comparison |
| transition quality | Is the change motivated, technically correct and supported? | source handles, semantic execution and visual review |
| continuity | Are screen direction, action, audio, time and identity intelligible? | automated diagnostics plus human review |
| audio relationship | Are dialogue, music, silence and effects purposeful and intelligible? | loudness/true-peak/ducking facts and listening review |
| information design | Are captions/graphics readable, timely and non-misleading? | safe-area/timing checks and comprehension review |

A bounded tool passing its named test does not establish the full professional
quality of its family.

## User satisfaction

Required product signals include:

- modification rounds and time to first useful cut;
- suggestion/patch acceptance and rejection rate by context;
- user override rate and whether overrides repair basic errors;
- approval latency and explanation/evidence use;
- publish/delivery decision and stated reason;
- final qualitative rating of story, picture, sound and identity fit.

These signals need interpretation. Fewer modification rounds may mean good
alignment or user abandonment. A publish decision may reflect a deadline. An
acceptance rate must be segmented by project type, duration, creator experience,
model/Skill version and synthetic versus human-reviewed evaluation.

## Technical quality

Technical gates include:

- valid contracts, RationalTime, media identity and source ranges;
- atomic `CommandEditIR`/CommitPlan with correct base version and protected refs;
- target-specific Preview/Master RenderGraphs with equal target-neutral
  semantic payload/hash, one ExecutionPlan per graph and explicit resolver
  decisions;
- verified-Original Master, successful decode and output identity;
- audio loudness, true peak, clipping, silence and A/V sync;
- caption bounds, missing font/asset/LUT/backend diagnostics;
- render persistence, reopen/recovery and no silent semantic omission.

Technical success is necessary but not sufficient. AVE does not use
"successfully exported" as its final product metric. The final outcome is a
QC-valid, evidence-faithful work the creator explicitly chooses to deliver.

## Benchmark unit

A benchmark case should pin:

- case ID/version, rights and representative cohort;
- approved Creative Contract, source/evidence snapshot and base Timeline;
- expected story/editing questions, not a single prescribed cut;
- capability snapshot and allowed/blocked semantics;
- baseline(s), candidate versions and evaluator blinding where practical;
- automated measurements and exact tool/policy versions;
- human-review rubric, reviewer context and disagreement protocol;
- result distribution, confidence, failure examples and retained artifacts;
- privacy/retention policy and Evidence record.

Cases should include positive examples, near misses, counterexamples, ambiguous
material and explicit insufficiency. A benchmark that rewards output generation
but never tests refusal/blocking will train unsafe behavior.

## Review protocol

1. Validate source identity, rights, Contract and benchmark version.
2. Run deterministic contract, execution and technical QC gates.
3. Present comparable outputs without hiding blockers or fallbacks.
4. Collect human story/editing/identity and audio-visual review separately.
5. Record disagreement, reasons and unresolved uncertainty.
6. Aggregate only within compatible segments and rubric versions.
7. Publish an immutable result snapshot; never overwrite prior baselines.

Creator identity, sensitive representation, factuality, subjective story quality
and final delivery always require human review. Automated critique may assist but
cannot substitute for these decisions.

## Thresholds and regression

Thresholds are versioned by use case. Technical blockers are pass/fail. Creative
dimensions are distributions and comparative judgments, with minimum safeguards
for factuality and identity. A new model/Skill/editor version must not regress
hard gates, failure closure or representative human-reviewed cases even if its
average engagement proxy improves.

Benchmark improvement should report effect size, confidence, subgroup results,
counterexamples and changed cost/latency. Popularity or retention data is
contextual evidence, not proof of creative quality or causality.

## Failure and anti-gaming rules

- Never optimize acceptance rate by hiding alternatives or asking fewer
  meaningful approval questions.
- Never reduce modification rounds by silently committing broader changes.
- Never mark absent human review as a passing subjective score.
- Never average QC/rights/privacy/factual blockers into a composite score.
- Never reuse private media outside its declared benchmark consent.
- Never claim general capability from one montage, fixture or reviewed Master.

## Work Order implications

Stage3 使用以下九组代表性案例，替换旧“两 Story + 单 patch”首切片作为本阶段范围。保留上文质量维度作解释，不新增庞大综合评分体系。既有 Stage2 证据不重写。

## Stage3 C1–C9 验收计划（全部待实施验证）

共同记录：确切提交、合同/策略/模型配置、授权、原片内容摘要、请求及修订、Timeline/manifest/Preview/Master 身份、步骤、预期/实际、费用、根因、用户原话与保留理由。Fixture 验证、真实模型/媒体联调、直接 Electron/真人接受分列，不以一层通过推出下一层。

| Case / 包 | 实际步骤与输入 | 必须观察的结果 | 保留产物 |
| --- | --- | --- | --- |
| C1 无档案直接完整初稿 / 01/04/05 | 新用户、正常无档案；导入获准真实含现场声/对白的素材，目标可简短或不详细；点击制作 | 不强制报告/问卷/Direction/Story 审批；选材、结构、节奏、声字幕和必要画面处理形成完整片；常规镜头不足能诚实收尾，硬目标无证据则具体说明 | UI 操作记录、原请求、主计划、真实片/QC；冷启动单独状态 |
| C2 制作中控制 / 01/04/05 | 模型/渲染进行时插话；“更快”后“更慢”；人为延迟旧响应；生成中手动编辑；取消后返结果；暂停退出重开 | 新话只替换冲突意图；received/adjusting/watchable 真实；晚到/取消/旧 base 无提交；合法完成成果保留；未完成步骤明确重跑 | 可控时序 Fixture 与真实 UI 各一次，事件/版本/提交差异，重开清单 |
| C3 感受到剪法 / 02/03/04 | 用有额外总结句的日常结尾，说“不要那种煽情的结尾”，再纠正“夕阳留着，我只是不喜欢那句话” | 实际分析结尾的字幕/旁白/音乐而非抽象形容词；保留夕阳，去掉所指句；不泛化禁止音乐/慢镜头；原话、假设、反例及长期纠正可追溯 | 两轮片段对照、原话/原则/具体操作链、后续适用测试和真人判断 |
| C4 多镜头视听和版本 / 01/02/04/05 | “开头两镜头更紧、保留最后反应、这一段不要配乐”；锁住满意段，再手动改字幕，语言续改；撤销/再试方向/组合两版选段 | 修改多个镜头及联动声音字幕，一次原子逻辑版本；保护和手动改动不丢；旧版可看/撤销，组合新版本有血缘且不越权 | Timeline diff、锁校验、编码对照、重开与组合 provenance |
| C5 同素材不同意图 / 02/03/04 | 同一素材分别“日常观察、留白”与“朋友出游轻快”；另用演出片检查情境 | 实际选材/顺序/时长/声音字幕/约定构图色彩出现与意图相关差异；不只标题/评分；不为个性化虚构反应，所有范围真实 | 源片映射、两版成片/manifest、各维预期与实测、反例 |
| C6 学习与留出 / 02/03/04 | 指定获准历史/参考形成假设；不同未参与学习的新项目使用；测试当前反向要求、这次例外、长期纠正、排除、遗忘后再建项目 | 用户级授权与项目隔离；新片实际采用适用原则；当前要求优先；遗忘后正文/摘要/索引/缓存及旧快照不进入新检索，不能从排除项目重学 | 训练/留出来源清单、快照、前后影片、删除清单、排除反例/真人保留理由 |
| C7 工作台和恢复 / 01/05 | 正确 HTML 摘要及浏览器逐页实查后，真实 Electron 从列表到新建/看片/素材/对话/精修/历史/导出；收起输入、连续点击/键盘/减少动态；保存退出重开；素材失联 | 保持认可布局/文案/动效；输入和焦点稳定；新版不打断播放，旧版不自动采用；按内容 PTS 对齐，删除内容明确无对应；真实保存状态和需重跑步骤无谎报 | 原件引用/实测摘要、浏览器操作矩阵、Electron 录屏、重开版本/输入记录 |
| C8 自检和交片 / 04/05/06 | 实际对白/字幕/音乐/画面，做两轮预算内自检并导出所选版；缺镜头及超预算反例 | 检查事实/引用、句声边界、字幕、重复、硬要求、技术 QC；无无限重剪；Preview/Master 同 semantic manifest、各自 Plan，Master 用 Original；主观质量用户决定 | 精确成片哈希、QC/字幕/声音测量、预算实际、真人完整观看听评 |
| C9 错误透明 / 01/03/04/06 | 注入档案 DB/索引损坏、授权撤销、版本错、模型非法引用/参数、外部临时失败、渲染失败及持久化失败 | 精确交错“读旧代次→删除先确认→提交”必须拒绝；反序仅保留删除前历史。每种错误准确 cause/stack/run/job/input revision/副作用/commit 状态；无非法项过滤、补空值/截参、隐藏模型或模板/无记忆回退；受影响任务失败且无错误提交；合法关闭/无档案/无匹配仍独立成功 | expected/actual 错误码和原因、事务前后快照、每次有限重试记录、旧输出标旧 |

每组只需合理的代表数据和必要反例，不以任意样本数写死产品协议。C3 对话中的素材情节是测试条件，输入不含这些情节时不能捏造。C5 固定创作差异维度，不要求所有高级特效；C6 的留出目标及人工答案不能泄漏进历史学习。

### 真实输入与验收流程

由用户提供或确认可用的历史项目/参考、至少覆盖日常/旅行/演出的新素材及对白/音乐使用权；保存来源、范围和删除期限，不把私有媒体入 Git。配置明确供应商/数据范围/预算，在运行记录固定实际 model identity，但不在长期计划写死模型名。真人审阅标明所看片段/完整版、画面与声音、版本/哈希、接受与反例；没拿到意见不能写 accepted。

先执行合同/领域/Host/Storage Fixture 与竞态故障注入，再运行真实模型媒体完整链，最后 Electron/真人看精确结果。机械事实（源引用、时长、保护、版本/QC）必须通过；审美不设模型自评分替代。错误用指定根因和无错误提交断言，不用泛化 throws、Mock 成功或反复重跑掩盖缺陷。

首次真实联调从 C1/C2/C3/C6 的串联开始，其他案例同步建设，不等单一场景零缺陷。Development Integration 与 Stage3 Exit、Release 三门分开；缺外部输入仅如实阻断对应接受项，不添加全量媒体回归给本轮文档工作。
