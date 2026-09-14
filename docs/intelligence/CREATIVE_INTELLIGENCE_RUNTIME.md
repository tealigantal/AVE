# Creative Intelligence Runtime

## Scope and invariant

这是 Stage3 目标运行时；当前 Stage2 固定候选、selected Direction/approved Story 与 exact execution approval 事实见稳定架构，不因本文改变。Stage3 用请求授权内的主初稿和修订替代逐级审批，实施归 S3-01/04。详见 [总计划](../product-intelligence/STAGE3_PLAN.md) 和 [ADR-0028](../decisions/ADR-0028-stage3-request-drafts-and-local-profile.md)。

```text
用户导入 + 开始制作/修改（Host 保存请求授权、目标和修订）
 -> Evidence + 获准记忆/参考快照
 -> 原话/对象上下文 -> 适用剪辑原则
 -> 选材、叙事、节奏、声画字幕整体计划（内部候选可比较）
 -> 边界合同/事实/权限/能力校验 + 有预算创作评价
 -> Host semantic adapter -> CommandEditIntent -> CommandEditIR
 -> simulate/validate -> CommitPlan -> 可撤回草稿 Timeline
 -> Semantic Render Manifest
      -> Preview RenderGraph / Preview ExecutionPlan
      -> Master RenderGraph / Master ExecutionPlan
 -> 自检 -> 可观看版本 -> 用户反馈/手动调整 -> successor revision
```

Project Host 编排、校验并持久化；Feature/Core 不直接跨 Feature 调用或写库；Worker/Model Gateway 只产候选。没有任何生成阶段能直接写 Timeline。默认一个主初稿，不要求用户读所有内部候选。

## Run identity and state

复用现有 run/job，增加 request ID、单调 intent revision、base Timeline、授权代次、记忆快照、输入依赖摘要和幂等键。运行状态目标为 received / adjusting / rendering / watchable / paused / cancelled / failed / superseded；这是待实施语义而非现有 Schema 枚举。watchable 必须绑定实际输出及同一修订；已收到不是已应用。工作成果按阶段保存不可变引用，任务开始不证明完成。

| 更新事件 | Host 行为 | 提交/观看结果 |
| --- | --- | --- |
| 制作中补要求 | 保存原话及 successor；仅合并冲突字段，其余意图保留 | 旧依赖仍有效的 probe/转录等复用；计划受影响部分重做 |
| 旧模型响应晚到 | 对比 request revision、base、权限代次 | 记录 superseded；不提交到新要求 |
| 连续“快一点”又“慢一点” | 两次分别递增 revision，不用文字相等复用过期代次 | 只有最后有效修订可提交 |
| 生成中手动编辑 | 手动命令同样经 Host 提交，改变 base；保持用户修改/锁 | 旧候选失效，重规划受影响差异；不能盲 rebase |
| 取消后收到结果 | cancellation generation 在提交锁内复核，停止可取消 Job | 已合法提交保留且标旧；未提交结果不晋升 |
| 预览滞后 | request revision、Timeline、manifest、output 精确绑定 | 播放器明示正在看旧版；新版本就绪不替换播放 |
| 暂停/退出/重开 | 保存完成阶段及未完成清单，释放资源 | 不完整模型流/临时 render 必须重新执行，不能称已恢复成功 |

只用 Host 单调修订与现有 Job 取消，不新建多层调度系统。复用键含 source content/PTS、分析器/策略、授权和所需输入摘要；意图改变不让无关媒体分析失效，语义计划/模型上下文改变必须新产物。提交前版本/锁/权限检查不能因入口已校验而省略。

## Stage contract

| 阶段 | 输入 / 输出 | 验证和停止 |
| --- | --- | --- |
| 请求 | 原话、素材、预算/隐私、保护 -> 授权及要求版本 | 只问阻断可执行性的缺项；不强制访谈 |
| 素材 | 原片身份/获准分析 -> Material Evidence Pack | 外部/持久化边界验证来源、RationalTime/PTS、覆盖；事实不足明确指出 |
| 记忆 | scope/consent/current intent -> 有来源快照 | 关闭/首次无档案/成功无匹配是正常；DB/索引/版本故障失败 |
| 创作 | 有界上下文 -> 主 Story/声画计划/semantic Intent | 整个模型响应验证；非法项不删掉后继续成功 |
| 执行 | 合法计划 + 当前 base -> 草稿提交 | 授权/保护/版本复核，编译/模拟/原子提交 |
| 产片 | committed Timeline -> Preview/Master/QC | 技术或事实失败不得展示最新可交付；旧版单独标识 |
| 反馈 | 原话/例子/手动差异 -> 修订及获准学习信号 | 普通反馈直接做草稿；越授权边界再次询问 |

## Context bundle

Candidate generation receives a bounded `CreativeContextBundle`, not direct
database or filesystem access. It contains exact refs/digests for the request-bound
Creative Contract, Material Evidence Pack, selected Skill Evaluations, exact consented memory/profile snapshot, optional
Style Profile and Trend Pack, Duration Blueprint, policy version and capability
snapshot. Project Host resolves the referenced content, removes unauthorized
fields and enforces a size budget before calling Model Gateway.

Knowledge retrieval is deterministic for a fixed catalog snapshot and query:

1. filter by trust, rights, status and expiration;
2. filter by Creative Contract and material applicability;
3. compute compatibility and evidence sufficiency;
4. rank with an explicit policy version;
5. return exact refs, scores, reasons, conflicts and rejected alternatives.

Retrieval never silently upgrades a version and never downloads runtime code.

## Candidate and evaluation rules

Generation may explore alternatives, but every factual claim and Story Beat
must bind to evidence. Evaluation runs hard gates before ranking:

- request-bound Creative Contract and evidence sufficiency;
- privacy, rights and protected-reference constraints;
- beat evidence and duration feasibility;
- Skill conflict rules and Style/Trend compatibility;
- current executable capability or an explicit non-executable proposal status.

Ranking records dimension scores, weights, policy version and rejected reasons.
Model self-evaluation may be one signal but cannot satisfy deterministic gates.
The user can compare candidates without creating Timeline versions.

## Approval and execution boundary

请求授权由 Host 可信用户通道保存，不伪造 Contract/Story/Commit 人审。草稿保存、用户采用某版、最终导出和对外发布分别记录。新素材/敏感处理/外部数据范围/费用预算或保护解除越界时才重新询问。内部校验永远保留。详见 [Permission Model](../product-intelligence/AI_AGENT_PERMISSION_MODEL.md)。

## Failure taxonomy

- `INPUT_STALE`: referenced contract, evidence, knowledge or Timeline changed.
- `EVIDENCE_INSUFFICIENT`: hard requirement or beat lacks approved evidence.
- `KNOWLEDGE_UNAVAILABLE`: exact version, trust, rights or expiration invalid.
- `CANDIDATE_INVALID`: output fails schema or contains unknown evidence.
- `NO_COMPATIBLE_CANDIDATE`: every candidate fails a hard gate.
- `APPROVAL_REQUIRED` / `APPROVAL_STALE`: no valid user/policy approval.
- `INTENT_UNSUPPORTED`: semantic operation cannot map without loss.
- `EXECUTION_BLOCKED`: existing resolver/Preview/Master path cannot execute.
- `TRANSIENT_PROVIDER_FAILURE`: retryable model/provider error.

内部类型、引用、版本和不变量错误不重试。只有临时外部失败可由一个显式策略有限重试；开发诊断/严格回归默认 0 次，产品建议上限 2 次且受同一预算约束，每次失败保留，供应商和请求不变。正常创作探索单独记录，不算错误恢复。

## Observability and privacy

Every stage records start/end time, input/output refs, status, policy and
tool/model versions, token/resource budget where relevant, diagnostics and
correlation ID. Logs redact private media paths and content. External retrieval
receives only the minimum authorized metadata; private project media is not
uploaded for style or trend matching by default.

## 模型使用、成本与错误透明

推荐复用现有 Model Gateway，接一条明确配置的结构化创作调用主线。素材 probe、哈希、时间换算、候选范围/权限验证、计划编译和 QC 采用确定性计算；用户感受归因、选材、叙事和视听取舍需要模型判断。素材理解中确定性探测与模型转录/观察分别有 provenance，模型观察不是自动批准的事实。

上下文仅包含当前要求、必要证据片段/转录、所选范围的参考、适用原则及最小档案字段。Host 在发出前检查媒体/字段/供应商授权和体积；费用政策记录时长/调用/token/媒体字节预算及预估，记录实际用量和未知项。供应商不报告费用就标未知，不能报零。预算未配置时显示必要配置，不偷偷使用任意外部模型；本地部署不等于全离线。模型名不在规划写死，不建任意模型空接口。本轮未执行真实模型调用。

建议正常创作探索最多主计划加一次替代、交付前自检改进最多两轮，实际调用/费用上限由请求授权固定；达到预算交付合法已完成草稿或明确说明未完成，不能无限重剪。已通过的媒体分析和未受影响中间结果增量复用；取消向 Gateway/Job 传递，远端不能取消时丢弃过期结果并记录可能已计费。

信任边界为用户/IPC、模型响应、持久化载入、跨项目授权；在各边界验证并形成明确内部类型，不逐层重复全量检查/日志。非法引用、参数越界或缺失必需对象直接失败；禁止补值、修引用、截参、丢模型项、空对象伪成功，禁止隐藏切换模型、旧生成器、模板、无记忆或旧渲染。

catch 仅用于资源清理、事务回滚、明确任务/IPC/UI 失败转换或已设计测试的恢复。保留 cause、stack、run/job、输入版本、已发生副作用和提交状态；清理失败不覆盖首个业务错误。统一边界报告一次，异步错误必须传播。普通失败只终止受影响操作；损坏写入不变量时停止相关项目写入，不关闭所有无关项目。

本地诊断可在授权与保留期限内保存原话、原始模型响应和所用依据，密钥不入日志、私人数据不入 Git，不要求提供模型私有思考过程。开发证据是可核对的输入、选择、规则、操作和结果。已保存响应的回放是确定性排错，不是实时模型效果验证。

## Implementation slices

按 [候选 S3-01..06](../work-orders/stage3/README.md) 早期联调；完整验收见 [C1–C9](../product-intelligence/CREATIVE_QUALITY_BENCHMARK.md)。现有 provider 配置未证明 Host 主生成调用，本阶段必须实接，不以 Mock 替代。
