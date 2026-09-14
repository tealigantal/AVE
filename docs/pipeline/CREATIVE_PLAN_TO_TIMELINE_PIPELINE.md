# Creative Plan to Timeline Pipeline

Stage3 目标：`RequestAuthorization + IntentRevision + Material Evidence Pack + 获准原则/档案 + 视听 Story Plan → semantic Edit Intent → Host adapter → CommandEditIntent → Resolve/Preconditions → CommandEditIR → simulation/validation → CommitPlan → 可撤回草稿提交`。普通请求无须再次批准 Story/Commit；越授权范围的变化按 Permission Model 询问。

The compiler binds every edit operation to beat and evidence IDs, protected
ranges and a reason. It uses RationalTime and the current Timeline version.
Conflicts, unavailable source identity or unsupported semantics fail closed;
successful commits retain undo/redo, provenance and a comparable prior version.

## 当前 Stage2 实现（不是 Stage3 上限）

The implemented v1 adapter is deliberately narrow: only `select_evidence`
compiles. It requires every approved Story Beat to be covered exactly once in
approved order; one Beat may use multiple non-overlapping Evidence ranges, but
their unit-speed RationalTime sum must equal that Beat's approved duration.
Missing or duplicate Beat coverage, overlapping ranges, insufficient source,
inexact timebase conversion, range overrides, `preserve_audio`, retime, loop,
freeze or fill block the whole execution. Proposal-only fields are never
silently omitted.

The source material stays on one disabled reference track. Ordinary `add_clip`
commands target one unambiguous, enabled and empty output video track whose
visual, transition, automation, lock and audio-routing state is neutral; an
enabled solo state elsewhere also blocks compilation. Product review and the
compiler share that predicate. The final render-active extent must therefore
equal the complete approved Story, after which Host preflights target-specific
Preview/Master plans against one semantic graph identity.

Semantic proposal approval and Timeline execution approval are separate. The
read-only preparation result exposes compiler/base/final/source/semantic
digests but no Commands. `editorial_edit_intent.execute` binds that complete
compiled effect through the Stage 2 human channel. Host resolves every exact
authority again before atomically retaining the execution Permission Decision,
CommandEditIR, Timeline and immutable execution record. Identical execution-ID
retries return that record; rebound IDs or effects fail closed.

Stage ownership, approval and fail-closed semantics are defined in
[`CREATIVE_INTELLIGENCE_RUNTIME.md`](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md).
The execution boundary decision is in
[`ADR-0022`](../decisions/ADR-0022-semantic-intent-execution-adapter.md).

## S3-04 必须接入的生成与编辑主链

素材理解复用分析/evidence feature、Worker 和 Host immutable originals；感受转化由 feedback feature 与 Gateway 产生 typed principle/plan；选材和整体视听计划替换 Host 固定 Story 模板。合法候选的创作评价与非法响应边界校验分开，不能删除非法项后接受整个响应。

将当前 select_evidence 与 inward-trim 的特殊限制替换为统一、显式能力的 Host 编译路径：选材插入/替换/重排/删除，多镜头 trim/move/ripple，关联音频/字幕随镜头移动，保护区保持，音画独立 source ranges 支持所需 J/L 衔接，字幕增删/内容/时序、gain/fade/ducking、必要静态 reframe 与基础色彩。已有基础操作复用；缺少的领域命令、resolver、Worker 执行和真实编码验证在同包同步补齐。不增加无关复杂特效作为前置。

目标输出可在同一作品手动编辑；stage2 reference-only 拓扑/open gate 和 execution lineage 约束需同步替换。自然语言、手动命令与跨版选段组合均基于当前 Timeline/保护/请求修订，通过模拟/CommitPlan，不允许模型直接输出任意可执行 Command 或 Renderer 写库。组合版本按素材身份/PTS 和用户所选内容生成新草稿，音频/字幕和保护冲突明确报出，不能简单拼对象引用。

Preview/Master 共享目标无关 Semantic Render Manifest，各自 Graph/ExecutionPlan；提交前 preflight 不支持语义明确失败，渲染阶段不丢弃效果。通过 C4/C5/C7/C8 证明实际成片，不以 Schema 枚举为能力证据。
