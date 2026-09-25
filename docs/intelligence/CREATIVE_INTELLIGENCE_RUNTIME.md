# Creative Intelligence Runtime

## Scope and invariant

这是 Stage3 目标运行时；当前 Stage2 固定候选、selected Direction/approved Story 与 exact execution approval 事实见稳定架构，不因本文改变。Stage3 用请求授权内的主初稿和修订替代逐级审批，实施归 S3-01/04。详见 [总计划](../product-intelligence/STAGE3_PLAN.md) 和 [ADR-0028](../decisions/ADR-0028-stage3-request-drafts-and-local-profile.md)。

```text
用户导入 + 开始制作/修改（Host 保存请求授权、目标和修订）
 -> Evidence + 获准记忆/参考快照
 -> 原话/对象上下文 -> 适用剪辑原则
 -> 选材、叙事、节奏、声画字幕整体计划（内部候选可比较）
 -> 边界合同/事实/权限/能力校验 + 可审计创作评价
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
| 请求 | 原话、素材、调用记录/隐私、保护 -> 授权及要求版本 | 只问阻断可执行性的缺项；不强制访谈 |
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
fields and validates their declared media capabilities before calling Model Gateway.

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

请求授权由 Host 可信用户通道保存，不伪造 Contract/Story/Commit 人审。草稿保存、用户采用某版、最终导出和对外发布分别记录。新素材/敏感处理/外部数据范围或保护解除越界时才重新询问。内部校验永远保留。详见 [Permission Model](../product-intelligence/AI_AGENT_PERMISSION_MODEL.md)。

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

内部类型、引用、版本和不变量错误不重试。只有临时外部失败可由一个显式策略有限重试；开发诊断/严格回归默认 0 次，产品建议上限 2 次且每次独立登记，每次失败保留，供应商和请求不变。正常创作探索单独记录，不算错误恢复。

## Observability and privacy

Every stage records start/end time, input/output refs, status, policy and
tool/model versions, actual token/resource usage and unknown values, diagnostics and
correlation ID. Logs redact private media paths and content. External retrieval
receives only the minimum authorized metadata; private project media is not
uploaded for style or trend matching by default.

## 模型使用、成本与错误透明

推荐复用现有 Model Gateway，接一条明确配置的结构化创作调用主线。素材 probe、哈希、时间换算、候选范围/权限验证、计划编译和 QC 采用确定性计算；用户感受归因、选材、叙事和视听取舍需要模型判断。素材理解中确定性探测与模型转录/观察分别有 provenance，模型观察不是自动批准的事实。

上下文仅包含当前要求、必要证据片段/转录、所选范围的参考、适用原则及最小档案字段。按用户 2026-09-24 明确要求和 [ADR-0029](../decisions/ADR-0029-stage3-model-accounting-and-capabilities.md)，当前接口不设产品层发送数据、累计调用或费用上限；保留实际用量和未知项。供应商不报告费用就标未知，不能报零。Host 在每次发出前检查素材、字段、精确模型部署（接收端/能力摘要）与当前授权，持久记录对应调用后才发送。模型配置缺失或错误如实拒绝，不自动切换供应商或降级为文本观察。

正常创作探索与技术故障重试分别记录；当前 Main 每次操作只尝试一次，有限重试由显式技术策略控制。已通过且身份未变的媒体分析和中间结果增量复用；取消向 Gateway/Job 传递，远端不能取消时丢弃过期结果并记录可能已计费。模型上下文窗口、截断与超时均明确失败，不能转换成不完整的成功。


信任边界为用户/IPC、模型响应、持久化载入、跨项目授权；在各边界验证并形成明确内部类型，不逐层重复全量检查/日志。非法引用、参数越界或缺失必需对象直接失败；禁止补值、修引用、截参、丢模型项、空对象伪成功，禁止隐藏切换模型、旧生成器、模板、无记忆或旧渲染。

catch 仅用于资源清理、事务回滚、明确任务/IPC/UI 失败转换或已设计测试的恢复。保留 cause、stack、run/job、输入版本、已发生副作用和提交状态；清理失败不覆盖首个业务错误。统一边界报告一次，异步错误必须传播。普通失败只终止受影响操作；损坏写入不变量时停止相关项目写入，不关闭所有无关项目。

本地诊断可在授权与保留期限内保存原话、原始模型响应和所用依据，密钥不入日志、私人数据不入 Git，不要求提供模型私有思考过程。开发证据是可核对的输入、选择、规则、操作和结果。已保存响应的回放是确定性排错，不是实时模型效果验证。

## Implementation slices

2026-09-18 的 `WP-S3-INTEGRATION-001` 已登记首条联调范围。当前源码新增请求/修订/草稿持久化、独立用户档案的授权与遗忘协调、结构化声画字幕计划编译，以及 Gateway 的发送前限制和失败用量记录；受控测试已走过编译 → Host Edit IR → 原子提交 → 重开。`content_preserved` 校验实际前后内容及字幕相对位置，硬授权保护和轨道/范围锁仍独立生效。

2026-09-24 按 ADR-0029 替换原预算接口：调用账本保留不可变 run/revision/profile、wire digest、实际字节、结算和失败原因；未知 usage/cost 保持 null。修订和重开保留所有历史调用，但没有累计额度门槛。旧预算实验记录仍保留于原 Evidence，不作为现行接口。

2026-09-23 已接公开 Host 生成路径：固定已授权 immutable 素材、档案快照及模型输入，持久化模型结果，再经编译、双目标预检和提交前重查保存草稿。2026-09-24 的观察集成已将直接 Evidence 引用替换为下述完整观察凭证入口。实际编码合成素材、Worker、Host 和 SQLite 路径已用本地模型响应夹具验证。取消后的探测不继续产生调用或提交，项目打开、创建和关闭共用串行生命周期。

2026-09-24 已补可信素材准备入口：按本请求和选定导入位置验证实际素材，生成不可变副本，原子保存位置权限及引用真实初始请求的凭证。凭证不授权跨项目学习；后续生成仍重查当前请求、权限和素材。取消等待复制及补偿收尾，旧操作不能覆盖新拒绝；不同请求对同内容不同位置的选择按各自凭证解析。

2026-09-24 已接保存草稿的双目标渲染：按该草稿的 Timeline、生成凭证、素材身份和 Plan ID 执行实际 Preview/Master，分别运行 QC，再原子登记输出、QC、草稿凭证和 `watchable`。采用与观看指针保持独立；播放核验该版实际对象引用和文件哈希。当前首批生成计划显式固定既有编码基线 30 fps，QC 从实际目标图读取尺寸、帧率和 RationalTime 时长；浮点换算仅用于现有测量边界。流时长差检查不证明感知同步或内容质量。

Worker 终止由独立本地监督进程持有生产者树：Windows Job、Linux subreaper。主动取消、超时或崩溃必须确认树已退出，才能重试或释放资源；无法确认时保留原始终止原因、临时目录、素材句柄和项目 session，拒绝重开及新创作。已提交作品后的清理失败追加独立诊断，合法结果仍可复用。上述路径通过真实编码合成素材、SQLite 和实际 Worker 的针对性验证，模型响应仍为本地夹具。

2026-09-24 新增 `media.sample.v1`：从指定原片流提取有实际 PTS、来源/样本哈希的 PNG 和 PCM16 WAV，复核画面解码身份、音频连续样本及精确源时基。稀疏帧仅代表所列实际显示范围，不证明整段动作；无法精确映射到样本网格的音频和未定义 HDR 转换明确拒绝。取消或批次失败清理本次输出；处理与清理同时失败时，Worker 协议保留各个具体原因和 traceback。

Gateway 当前统一输入为 `ModelInput { context, media }`，拒绝任意旧输入。媒体接受带样本 ID、摘要的 inline PNG/WAV；Host 自动增加 `frames`/`audio` 权限要求。模型模态能力独立声明，wire digest 对应实际 HTTP body。Main 支持显式 OpenAI 兼容接收端、精确模型、JSON/SSE 与 structured-output 模式；配置摘要进入授权，HTTP 重定向拒绝。没有声明的模态或音频 wire 格式在发送前拒绝。协议测试通过不表示每个部署或真实模型已经验收。

2026-09-24 新增 `media.scene_scan.v1` 与 Host 观察调用：实际解码帧的像素变化产生候选范围，原生 PTS 和时基保持不变；候选范围不表示模型已理解整段素材。Host 按实际范围提取 PNG/WAV，核对描述符与字节，固定完整输入后才建立模型票据。响应必须覆盖确切样本 ID；画面观察不得包含转录。ModelRun、样本对象、派生 Evidence、观察凭证和请求状态在同一持久化事务中发布，观察不改变草稿或采用/观看指针。确认回滚才清理新建无引用对象；提交后的确认异常保留已提交文件，清理错误保留原始原因。

生成当前只接受 `observation_refs`，计划源使用 `span_id`。可剪辑范围和实际视觉/音频/转录依据分开保存；完整凭证与模型输入、响应及调用账本绑定，拒绝旧入口、重复范围和替换凭证。对白字幕须与确切转录文本、源时间和实际播放音轨一致；明确的音轨锚点支持跨镜头声画错位，剪出播放范围或静音的对白不能借转录存在而通过。编辑字幕不冒充对白。观察→生成→实际 Preview/Master 的工程回归使用本地响应夹具；故障覆盖零发送、无错误提交、回滚、取消和保存重开。

2026-09-24 已接 Host 学习入口：从指定历史版本、原话和实际差分建立固定事件，排除旧模型/档案解释；音频路由、轨道顺序、内容保留与严格未变分别核对。独立档案所有者在发送前核验来源、数据类型、供应商及授权/删除代际。调用身份先保存，实际响应持久化后原子发布提取结果和请求完成，再单独登记档案。无足够依据时保存明确原因；有调用账本而无持久响应时拒绝自动重发。写入失败、提交确认丢失和实际进程退出的恢复均复用原身份/响应；取消、修订、关闭及遗忘仍在真正登记前检查。

2026-09-24 已接长期纠错：可信输入选定精确旧原则及其登记摘要，控制引用只保留在本地许可中；模型取得原话、实际差分和控制摘要，不取得旧原则正文作为新事实。档案事务原子追加有来源的 successor 和停用关系，旧结果不改写，旧快照失效。并发纠正同一前驱明确冲突；没有足够依据形成 successor 时保留提取结果并报告登记失败，不擅自撤回原原则。历史重放复用原登记，不重新激活被替换内容。遗忘沿实际事件依赖清除可复用正文，保留无正文的事件排除和停用标记；删除后继来源不能使旧错误复活，关联项目中的无关事件不被一并清除。

受控联调已验证认可的字幕删除进入学习事件，并影响未参与学习的新项目 Timeline；本次例外保留长期假设，明确纠正后新增场景说明字幕并保持原镜头与音轨，实际 Master 随之改变，各版 Preview/Master 均通过 QC。遗忘前重开留出项目核对 Timeline 和三版草稿版本；遗忘后另一个新项目不再收到该假设并生成不同字幕，该新项目尚未在本用例重开。素材为独立编码的运动测试源，模型响应为夹具，不能作为真实个人化创作验收。桌面单版本入口替换和首条真实创作检查点仍未完成。随后 Desktop 单版本接线进展见下文；设计符合性仍需原件核对。进展、输入阻塞和验证记录见 [执行计划](../plans/2026-09-18-stage3-first-personal-creation.md)。

按 [候选 S3-01..06](../work-orders/stage3/README.md) 早期联调；完整验收见 [C1–C9](../product-intelligence/CREATIVE_QUALITY_BENCHMARK.md)。Host 主路径已调用实际 adapter 的本地传输夹具；现有 provider 配置与这些测试仍未证明真实远端模型创作，必须完成获准调用及作品验证。

2026-09-24 桌面 Main 已接入单一持久 ProfileRepository，并为 IPC 操作固定项目及会话代次；原生等待失效后不能再进入 Host。切项目等待实际操作收尾，退出依次关闭 Host 与档案；关闭失败保留资源状态供重试。已通过真实 SQLite 故障测试和 Electron 自然退出检查；当前请求/草稿的工作台主入口替换仍未完成，不构成真实创作验收。

2026-09-24 Host 已接正式手动草稿来源：模型与手动来源在同一当前契约中严格区分，统一草稿执行凭证替代生成专用的渲染引用。手动操作保留原话、真实 EditIR、父版本和保护项，不创建模型调用或档案快照；相同意图下可以连续追加手动后继。提交前中断旧工作并核对实际结果中的素材权限、源区间及双目标计划，Timeline、IR、草稿和凭证原子发布。实际解码的连续音频样本可证明未声明容器起点的 WAV 时间区间，不能默认零点。受控测试覆盖独立音轨/字幕、双输出 QC、重开、晚到模型拒绝、保护与权限拒绝、事务故障及确认丢失恢复；桌面调用方和真实创作验收仍待接通。

2026-09-24 Host 已提供持久工作区读取：采用引用来自真实历史操作，草稿携带实际执行与编辑引用、独立渲染及 QC 摘要。档案在一次队列读取中返回当前适用原则、纠正前驱结果摘要，以及未登记/已登记/已遗忘状态；项目提取结果不等于可复用偏好。跨档案等待后的旧项目响应明确拒绝。原始上下文、路径、采样字节和已遗忘正文不进入该投影。时间字段恢复已与用户文本分开，字面字幕 1n 经实际合成素材编辑、双输出及重开回归保持原样。此为 Host 接通，桌面产品入口及真实个人化创作验收仍未完成。


2026-09-24 当前 Desktop 已替换为 Creation 请求／素材／草稿／档案 IPC；旧 Stage2 UI、原生逐级确认和 reference-only 命令入口已移除。Main 独占确认凭据，按精确素材、原话、数据、模型部署及有效期确认；确认后与 Profile 队列内再检查会话和内容。打开项目先校验 Timeline 结构、版本／对象身份及创建历史，再恢复 Job，不伪造历史授权。旧 Stage2 领域回归保留，旧 Desktop real 命令明确以 `STAGE2_DESKTOP_REVIEW_RETIRED` 拒绝，不生成通过报告或作品。

现行工程工作台保留输入和播放器节点，播放／采用分开；显式镜头手动修改经 Host 发布新草稿，后台完成新稿不打断已加载作品。只有最新一致读取恢复依赖操作，过期或失败的刷新不能放行旧修订；已确认失败的渲染保留原身份，用户明确开始新尝试才换 ID。实际 Electron 工程旅程验证合成编码素材、两个镜头的音量和字面字幕修改、真实 Preview/Master/QC、精确测试授权、取消及独立进程重开；另用受控 IPC 在真实 DOM 中验证刷新交错和重试身份。模型响应和原生确认响应仍为明确测试夹具，未调用真实外部模型，也未完成设计忠实性或真实个人化验收。Main 已接入显式模型与采样策略，并按 ADR-0029 移除产品预算和预估计价前提；真实多模态调用仍需可用配置，协议夹具或已配置密钥不能替代实际验收。


未选择三路配置文件时，显式单模型部署仍可由本机环境提供：`AVE_MODEL_PROVIDER`、`AVE_MODEL_NAME`、
`AVE_MODEL_BASE_URL`（Qwen/DeepSeek 已知端点可省略）、`AVE_MODEL_API_KEY`。
Qwen 同时读取已有 `QWEN_API_KEY` / `DASHSCOPE_API_KEY`，DeepSeek 读取
`DEEPSEEK_API_KEY`；不把密钥写入项目或文档。模态用 `AVE_MODEL_MEDIA_TYPES`
明确填写 `image/png,audio/wav` 中实际支持的项；音频另指定
`AVE_MODEL_AUDIO_FORMAT=base64|data-url`。`AVE_MODEL_RESPONSE_MODE=json|sse`
与 `AVE_MODEL_STRUCTURED_OUTPUT=json_object|validated_json` 固定请求格式，
`validated_json` 仍经过应用契约验证。Ollama/vLLM/SGLang/llama.cpp 可使用
同一可配置协议入口，但每个精确模型的实际能力必须另验；没有品牌级兼容承诺。
本机回环部署可无密钥；其他接收端必须显式提供认证。改变部署配置需新请求授权。


2026-09-24 当前 Main 支持用户选定的三路服务配置：Qwen 画面、Whisper 转录和独立原始音频理解；规划默认复用视觉服务的文本能力。参见 [配置说明](../work-orders/stage3/MODEL_SERVICES_SETUP.md) 和 [ADR-0030](../decisions/ADR-0030-stage3-split-model-services.md)。每次物理发送分别获得 Host 授权检查、持久调用身份和不可变结算；编排不冒充一次供应商调用。融合证明保存各路原始结构化输出及摘要，发布和重开均按样本与精确 RationalTime 重新构造，并核对实际调用账本。取消等待子调用结算，已报告用量不被外层未知值覆盖。任一路失败不发布半份观察、不提交草稿；已发生调用仍保留。当前新增路径通过真实编码夹具和受控 HTTP 响应验证，未完成真实供应商质量或用户作品验收。
