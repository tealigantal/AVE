# WP-S3-RELIABLE-ACCEPTANCE-001 — P5 当前构建端到端验收

## 目标与边界

本包接续 P4，在同一当前双服务构建上执行 DOC-007 P5：使用许可明确的 NPS/USGS 混合素材、当前配置的模型和实际 Worker/FFmpeg，完成 WIN-01–08、WIN-10 与 C1–C9 的真实界面流程，保存连续交互记录、Host状态、输入/输出摘要和完整运行身份。用户于 2026-11-06 接受 WIN-09 同名损坏素材恢复场景的未验证风险，将其移出 P4 与 P5 完成条件；这不证明该场景已通过，也不改变其他工作包的要求。为覆盖 C5 独立演出情境，另登记来源明确的美国 DVIDS 公共领域素材，保留其肖像、商标和不得暗示背书等限制；具体原件与衍生身份须另行验证。人工审美、故事与听感反馈不是关闭条件；必须如实记录实际机器播放与解码，不得伪称人工听评。

本包是最终验收和文档整理，不拥有新的运行时代码。若发现产品缺陷，保留失败和根因，把修复登记回对应能力包，再在修复后的新构建重跑受影响的步骤；不把模拟数据、API直调、旧构建、截图、健康检查、合成接受或历史 Evidence 充作当前产品验收。使用隔离测试项目与测试档案，绝不覆盖用户作品、Profile、配置、原片、上传、导出、Whisper模型或现有卷；不得读取或输出密钥。

## 来源与构建约束

- 既有输入从 `docs/evidence/assets/mixed-media-p5/review-manifest.json` 所列许可边界复用；C5 新增演出素材在本轮证据目录逐项登记官方来源、许可和使用限制。全部输入逐个记录实际路径、字节数、SHA-256、来源与用途。必须覆盖真实视频、图片、音频以及已准备的失败/重试样本。
- UI操作走正式 Workbench/系统选择器和产品授权对话；模型请求与取消、修订、比较/采用都由界面触发。Host只作只读状态核对；不直接写SQLite或绕过权限。
- WIN-03、WIN-04、WIN-06、WIN-07须保留实际播放声音的连续录音，并绑定实际解码/输出证据；静音录屏、波形图和音频指标不能替代真实声音捕获。人工听感保持可选。
- 交互记录绑定同一 `code_fingerprint`、build-input摘要、桌面与Whisper image IDs、运行文件清单、Worker/Python与FFmpeg身份、模型/配置来源和时间窗。公开Evidence不得含API Key或私人媒体路径。
- 全量检查使用项目锁定的Python/Worker依赖；默认Python环境下 Pillow 版本不匹配的失败保留为环境事实，不以重跑删改历史。最终 `pnpm run check`、`pnpm run acceptance:final:synthetic`、`pnpm run interaction-acceptance:test` 与 `pnpm run docs:check` 均需有本轮日志。

## DOC-011 适用性续验

本包更新的中英文 README 和 P4 工作包当前状态说明属于 DOC-011 已登记的部分 capability scope。为让当前文档门禁与证据索引保持一致，P5另行复核受影响 scope 的 required tests，并在 `docs/evidence/APPLICABILITY_INDEX.json` 以 index-only 关系登记新指纹；对应工作只能在本节明确的文档、Evidence、索引路径内进行。保留历史 Evidence 原文、产品状态和 Stage2 真实素材／完整时长活动债务；已移除的 `stage2-product-workspace:real` 不再作为当前执行门禁；索引关联只说明当前源码适用性，不将其转换为产品接受。

## 操作清单

| 步骤 | 正式界面操作与可观察结果 | 场景绑定 |
| --- | --- | --- |
| WIN-01 | 空项目通过系统文件选择器导入真实混合素材，核对逐项结果、方向、资产身份和授权边界。 | C1 |
| WIN-02 | 追加素材，取消一项，触发有根因的失败并只重试失败项；成功项不重复、失败项目录与恢复操作仍存在。 | C2、C9 |
| WIN-03 | 在正式预览中缩放图片、播放/seek/全屏视频、试听真实音频并快速切换；录下实际声音且确认无串流。 | C7、C8 |
| WIN-04 | 在产品授权对话后发起真实创作；制作期间输入、取消或修订请求，观察实际模型调用、进度、草稿和Host版本。 | C1、C2、C3 |
| WIN-05 | 多次精修/续改，保护既有内容，比较和采用版本，执行撤销/重做；至少验证同一来源不同意图的输出差异。 | C3、C4、C5 |
| WIN-06 | 在正式 Profile/音频入口试听并选择授权资源；先征求测试档案的学习授权，再在独立留出项目验证实际检索/应用、一次性例外、长期纠正、遗忘和遗忘后的新项目。 | C5、C6 |
| WIN-07 | 固定版本导出，打开真实下载文件，核对画面/声音、Host输出哈希、字幕/音频/署名附件与来源。 | C8 |
| WIN-08 | 刷新并通过作品管理正常关闭、重开，核对导入、输入、版本、问题和导出身份。只有确认无在途任务时才重启本任务的AVE服务；不触碰其它容器或卷。 | C4、C7、C8 |
| WIN-09 | 用户接受未验证风险；同名损坏来源与有效来源的恢复场景不再作为本包完成条件，不记为通过。 | 豁免；C2、C9 的其他要求保留 |
| WIN-10 | 从新空项目走到导出页；核对宽窄视口、125%/150%等效比例、键盘、IME、焦点和减少动态，并保留结果。 | C1、C7、C8 |

同一连续记录须包含 WIN-01–08、WIN-10 及 C1–C9。C5必须以同一批真实来源、不同自然语言意图产生可核对的镜头选择/顺序/节奏/视听差异，不输入时间码代替意图；C6必须在新的独立留出项目执行真实学习链，证明新项目此前未参与学习，测试档案与用户Profile分离，并在遗忘后验证排除结果。C7按本包当前正式运行面执行，不以旧版固定布局截图替代。C9必须保持不同失败根因，不把错误改写成成功。

## 关闭条件

1. WIN-01–08、WIN-10 结果均为 `pass`；WIN-09 记录为用户接受风险的未验证场景，不记为通过。必测步骤各具有录音段、日志、与对象身份及输入清单一致的Host状态。含声音步骤必须有声音捕获，WIN-07包含真实下载文件及输出哈希。
2. C1–C9均映射到对应实际步骤并通过交互记录工具检查；单一连续录音完整覆盖记录的开始和结束。
3. 当前构建和两服务身份与运行时文件清单完整绑定；C5、C6的真实对象/模型调用/档案事件可复核。
4. 完整工程检查、最终合成验收、交互记录校验、Evidence applicability、`docs:sync` 和 `docs:check` 通过；更新现行中英文使用、限制与恢复说明。
5. 生成 `EVD-*S3-RELIABLE-ACCEPTANCE*` 后，按程序工具正式关闭本包。Stage Exit 与 Release 另行报告，不由本包自动声明。

## 运行检查点

在此记录每个步骤的实际结果、当前构建身份、日志/录音/Host状态引用、失败及修复所属包、下一动作。未运行的步骤保持 `not-run`，不得用旧Evidence补写为本轮通过。

### 2026-11-05 当前构建准备

- P4 R22 已正式关闭；本次通过 `pnpm docs:start -- WP-S3-RELIABLE-ACCEPTANCE-001` 启动 P5。启动前已跟踪文件无未提交修改；大量既有未跟踪证据、工具和 output 全部保留。
- 按用户确认，工程与隔离基础设施先行，最终提供成片集中人工反馈；审美与听感不作为自动验收先决条件。本轮独立云调用费用保守预留上限 CNY 100，含调试、失败和正式运行，不含 P4 历史开销。
- manifest 登记 `scripts/p5/**`、P5 专项测试和本次证据目录，用于隔离启动、媒体身份、连续声画采集、模型调用预算及验证；产品缺陷须回到所属能力包修复。
- 只读核查：6080、6081 已由其他服务使用，须重新检查并使用独立端口；P4 desktop/whisper 镜像构建标签与当前输入匹配，但本轮仍需隔离运行身份验证。旧 P5 清单的 USGS 来源摘要与当前查到的原片摘要不同，须重新核对许可、原片与衍生链。
- 本轮 WIN-01–10、C1–C9 均为 `not-run`；尚未实际录屏、付费调用或执行真实旅程。下一步保存 dirty baseline，构建本地工具并做无付费预检。

### 2026-11-05 隔离环境与工具首轮

- `current-build-20261105/start-status.txt` 保存 P5 启动和范围登记后的工作区快照；原本已跟踪文件干净，既有未跟踪数据保留。README 中过期的 P4 阻塞描述已改为 P4 完成、P5 进行中。
- `scripts/p5/preflight.mjs` 检查隔离项目名、端口、镜像 build-input 标签和真实素材字节/哈希；用两份 NPS 原片完成只读预检，来源摘要与旧许可记录一致。USGS 音频/图片衍生链及完整 P5 来源清单仍待核实。
- 隔离 Compose `ave-p5-preflight-20261105` 使用 6082、独立配置/Profile/项目/上传/导出/Whisper 卷、CPU 及离线占位模型端点。原 Whisper 缓存只读复制至新卷，16 项文件/目录/链接清单一致，树摘要 `2806d6bd6ebfd8ef3f276c94077ddbd11f528cd46e28a46e94312043baf6016a`。两服务 healthy；真实浏览器创建了隔离离线作品。
- 当前双服务源码及运行文件身份检查通过，记录 `current-build-20261105/offline-runtime-identity.json`；build input `8333373a97765b947b9db01b93c21b32f2d90f1e272c7fbf86e81a28db991338`，runtime digest `3249f359f5572d19e43d8e9a51cff2ea0c32dd87db163d452091519bbf999d6f`。这是离线预检，不是最终 P5 运行身份。
- 连续录制辅助程序及 CNY100 持久预留账本已有本地实现；`node --test tests/integration/p5-budget.test.mjs tests/integration/p5-recorder.test.mjs tests/integration/p5-runtime.test.mjs` 5/5 通过。账本尚未接入模型请求拦截；真实录屏、声音采集和系统选择器尚未验证。离线 Compose 不持有真实模型密钥，不进行付费模型调用。
- 下一步：完成录制设备短预检、可验证的模型请求保护与计价上界、完整来源链和场景记录器；再启动真实创作。所有 WIN-01–10、C1–C9 仍为 `not-run`。

### 2026-11-05 非浏览器准备续接

- 幂等 `docs:start` 首次遇到另一个正常检查持有 programme publication 锁；未删除锁，待该检查结束后重试退出 0。已保留上一轮全部改动和历史数据。
- `sources.mjs` 重新核对已审阅来源收据与原片，生成主案例和独立留出的四段视频、一张图片、一份真实访谈音频；输入/衍生指令及哈希见 `current-build-20261105/inputs-manifest.json`。USGS 全原片已与官方直接下载流摘要 `e9d412e532077c0482df283a77e9efd2b56a3f131b32fc5dc1348c9bab1e635e` 对齐，不改写旧 excerpt 记录。
- 在无网络的一次性容器中，复用当前 Worker 与 Host 的帧选择策略生成 52 个真实视觉样本；来源、时间和内容哈希见 `samples-r1/receipt.json`。这些是发送白名单预检，不是产品创作结果。
- 新增 P5 工具专项命令并接入 `check`。Model Gateway 实际默认请求形状的离线测试确认：不插入 vision 输出限制，在实际发送前账本/head 已持久化，按官方默认最大回答长度预留；策略、计价证据、媒体、预算和重放检查保持失败关闭。专项 8/8 通过，未代表真实模型验收。
- `policy.mjs` 固定本工作包唯一 `budget/ledger`，所有调试、重建和正式运行复用同一 CNY100 账本，不按新项目另起额度。当前策略摘要 `c624e9897f9986320a47e7df8c3fb8c01f5fac9c95830e8bc42885b6db378b69`；无模型发送、预留为0。
- 双服务本轮新镜像的 build-input 为 `a41a95215dec70ae48e37bc5ded1ca2809e3e216ec6577e635c96c2d4ef7c375`。独立 `ave-p5-current-20261105` 已在6083健康启动；原6082离线面及其他用户服务保留。运行挂载、仅只读读取既有模型配置、凭据不进入环境、Guard启动策略/代码摘要和源码/运行文件身份均经 `run.mjs verify` 实测；日志见新 guarded-identity 记录。Docker Desktop的主机路径表示差异已按确切前缀转换后核对实际路径，未放宽挂载规则。
- 跨 programme 的实际 scope 变化与根因已写入 `applicability-audit-r1.json`；`EVD-20261105-DOC-011-P5-CLASSIFICATION-R1` 仅把已审阅的历史范围继续列为UNVERIFIED，不改写历史Evidence或索引，也不替代P4当前WIN-09/10证据。相关检查正在 `checks/nonbrowser-r1` 顺序运行；逐命令记录退出码、源码前后指纹、日志摘要。
- 浏览器真实导入、真实声画录制、真实模型流程及最终WIN/C矩阵仍未运行。非浏览器准备完成后恢复浏览器；人工审核留到真实流程与自动检查之后。

### 2026-11-05 非浏览器核验与桌面控制检查

- 6083 隔离双服务仍为 healthy；`run.mjs verify 20261105-r1` 对运行挂载、源码和 guard 启动身份验证通过，账本预留为 0。随后以网络禁用、只读容器逐项比较正式和预检 Whisper 缓存，16 项、486,214,410 文件字节和树摘要一致；可复现命令、结果及退出码保存在 `current-build-20261105/whisper-cache-compare-20261105-r1.json`。
- `checks/preflight-final-r1/results.json` 记录：最终合成验收与交互记录工具测试退出 0；`pnpm run check` 在 `docs:check` 的现有 P4 交互记录源码指纹和两个适用性失配处退出 1，后续检查未执行；单独 `docs:check` 同样退出 1。新构建的真实 WIN-09/10 证据仍须完成，不能用离线检查替代。
- 当前 Host 模型发送路径使用 guard 包装的全局 fetch；账本和模拟请求检查通过，但尚无真实模型调用。视觉及文本 token 的预算上界包含工程估计，并非供应商承诺的严格上限。
- Windows 原生浏览器窗口的工具校验仍无法可靠识别当前 URL，工具因此中止交互；用户确认地址栏可见，原因尚未定位。不得将此描述为地址栏隐藏，也不得将其余检查当作真实交互验收。WIN-01–10、C1–C9 仍为 `not-run`；下一步恢复合规原生交互、录制真实声音并完成正式流程。

### 2026-11-05 浏览器非正式预检

- 用户确认可直接打开工作台，无需强制经 Docker 页面。本轮 6083 页面首次事件流报 `无法连接 AVE Host`；诊断性重新加载后 `/api/session`、`/api/events` 返回 200，工作台正常显示，首次失败根因未确认。
- 在隔离服务中新建 `P5 页面预检 20261105`，浏览器正式导入入口和文件选择器先后导入 1 张公开图片及 2 段视频、1 段音频；两个批次分别为 1/1、3/3，刷新以及作品管理正常关闭、重新打开后四项仍存在。重复导入同一图片报告 1 项重复，素材总数仍为 4。音频预览由播放切换为暂停，浏览器截图显示视频首帧；没有连续录音或声学验证，不能证明正式声音验收。
- 本次为无付费预检，浏览器文件选择器通过受支持的自动选择接口提供文件，并未验证 Windows 原生系统对话框操作。正式 WIN-01–10/C1–C9 仍为 `not-run`；留出素材未导入，模型请求未发起。下一步确保能安全采集同一连续屏幕与真实系统声音，再从新空作品执行正式流程。

### 2026-11-05 连续录制预检

- `recording-preflight-r1` 在真实桌面录制和播放测试音频后，停止标记写入期间出现 Windows `EBUSY`；保留未完整封口的原始文件，未将其作为通过。修复录制器对明确共享冲突的有界重试，其他错误及格式错误仍失败；P5 工具测试 10/10 通过。
- `recording-preflight-r2` 正常 `started`、播放音频、`stopped` 退出 0，最终文件包含音视频，时长 38.125 秒；录音与导入源音频的绝对归一化相关约 0.686，结果在该目录 `audio-match.json`。r1 提取的画面显示目标 6083 工作台；汇总收据为 `recording-preflight-receipt-r1.json`。这些均为录制预检，不代表人工听评或正式 WIN/C 验收。
- 修复后 `run.mjs verify 20261105-r1` 确认当前镜像输入和运行文件身份仍一致、guard 账本预留为 0。最终交互证据及必需检查必须绑定修复后的源码指纹。
- C5 要求独立演出情境，现有输入尚不覆盖；候选素材须先核验具体许可、来源和模型使用范围。当前素材白名单和账本策略绑定，扩展不得换账本、重置预留或削弱上限。WIN-09 同名坏/好测试副本的准备命令曾被自动审核以 `blocked by policy` 拒绝，未给具体原因；未创建该副本。
- 登记 `tests/integration/p5-run-resume.test.mjs`：验证零使用策略扩展后的隔离服务恢复会拒绝活动服务、挂载漂移及未决账本，并保留旧护栏快照和既有卷。
- C5 新增 DVIDS 公开演出候选原片和 8 秒衍生的来源与限制见 `performance-fixture-r1/receipt-r2.json`；保留首次错误生成的 `receipt.json`，不得用于验收。当前镜像 Worker 在离线容器中为衍生片段生成 3 个有来源绑定的样本，原 52 个样本保留。候选策略在临时环境校验，不表示正式账本已经切换或该情境已验收。
- 隔离 Host 已关闭预检作品后停止；desktop 包装进程退出 143、Whisper 退出 0、无 OOM、账本锁释放。独立同镜像无网模拟证实 bash 等待被 SIGTERM 中断时，即使 Host 清理完成也可返回 143；这不是对真实 Host 完整性的单独证明。受控零调用切换保留了旧 head/策略和同一空账本，7 份素材/55 抽帧的新策略上限仍为 CNY100。恢复后双服务 healthy，guard 实际 READY 与构建身份核对通过，预检作品重开后 4 份素材和 3 个批次仍在。
- `resume` 实际启动成功但清理自身锁时报 Windows 文件身份比较错误、命令退出 1；该锁在核验创建时间和无对应进程后移至本轮证据目录保留。修复后的锁逻辑以临时文件验证 Windows 文件身份、并发及替换失败关闭；当前 P5 工具测试 24/24 通过。这不是正式交互记录或模型调用。

### 2026-11-05 真实创作页面预检与工具调查

- 在隔离预检项目 `24ca5dcc-37f2-479b-812f-91241989d248` 中，于本地时间约 17:52 授权以四份已登记的公开素材发起真实创作；应用在素材准备阶段返回 `CREATION_ORIGINAL_AMBIGUOUS`，未进入模型调用，四份已登记素材仍保留。重复导入同一图片后登记多个原片位置与失败路径高度吻合，但本次项目的实际位置数量尚未动态确认，不能将其作为已证实根因。
- 账本当时 head sequence 为 0、保守预留 CNY 0；这次没有模型调用。保留失败记录，不自动重试。下一步核实原片位置身份与授权，按所属能力处理根因后再验证。
- 辅助录制 `current-build-20261105/real-model-preflight-r1/journey.webm` 从 `2026-11-05T09:51:37.988Z` 至 `2026-11-05T09:55:39.766Z`，时长 242.081 秒，存在音轨与视频轨，SHA-256 为 `6fe8a527b80fbe39aaf855eaf657ff9c716fddc8efb8dcc792ac26f77dce630d`；原始录制与失败均保留。这是页面预检，导入使用浏览器文件选择器自动选择接口，未验证系统原生选择器，也不是覆盖 WIN-01–10/C1–C9 的正式连续验收。
- 外部调查发现 [openai/codex #51524](https://github.com/openai/codex/issues/51524) 和 [#54532](https://github.com/openai/codex/issues/54532) 涉及类似的中文 Windows 浏览器 URL 识别问题；公开报告不证明本机具体根因，未修改官方二进制。正式 WIN-01–10 与 C1–C9 仍为 `not-run`。
- 同类历史失败已在 `EVD-20261020-S3-P4-UX-PAID-BROWSER` 留存；代码检查表明重复素材可有同一内容身份下的不同原片位置，而自动制作在准备和后续时序覆盖阶段均要求恰好一个位置。当前创作授权只携带素材身份，界面去重显示，无法证明用户选定了哪一个位置。本次项目的具体位置数量仍待只读核实。为完成 P5 暴露的真实产品缺陷处理，manifest 登记创作会话 contract、实际 Host/确认与工作台调用方及相应测试的具体路径；这是对应创作和素材能力的定点修复，不表示产品修复或验收已完成。实施前应明确历史请求、精确来源选择和授权绑定方案，保留原对象哈希、权限及失败记录；不同物理来源、已拒绝或已变更的来源不得因内容相同而合并授权。若涉及稳定架构变更，先按规则登记 ADR，相关新增必要路径另行登记。
- 同步登记原片绑定专项回归、工作台真实交互回归及八个原先只使用模拟资产的直接调用测试：新授权必须基于可核验来源，相关 fixture 需随调用契约更新。实际测试与修复结果仍待验证。
- 同一预检作品另建请求 `4484cb5a-0d19-40f3-8bfe-d75afa0834c1`，仅选择未重复的两段视频和一份音频。请求进入真实画面/声音分析后于本地时间 18:03 返回 `MODEL_PROVIDER_FAILED`，作品仍为 v0，问题保留；具体根因待调查。账本最终记录 27 笔预留和 27 笔响应，保守预留 CNY 28.774764，非供应商最终账单；本次未重复付费请求。辅助录制 `real-model-preflight-r3/journey.webm` 从 `2026-11-05T10:00:02.455Z` 到 `2026-11-05T10:03:32.162Z`，时长 210.265 秒，有音轨和视频轨，SHA-256 `ce10caefc08cc92bb88e6545cdaf0f6bf9b1d939cd3612fe1f04cde9b6e35c30`。r2 因启动方式未获得有效录制、原始文件为空并结束其独立录制进程，目录保留。上述均非正式 WIN/C 验收。
- 持久化失败对象 `57fc62817e3ecf5795fed92c18e32bd2f129060ee300f28bcd5366f8b8a2f516` 显示生成阶段触发本地 `P5_GUARD: text byte bound`，在预留及发送该生成请求之前被拦截；不能据此断言供应商失败。保存的规划 transport 约 136,436 字节，旧 planner 文本限额 100,000，按现有字节估算法加帧保留量也超过旧输入上限 131,072。官方模型页列出更高的思考模式输入限制；需保留既有账本与 CNY 100 总限额，以崩溃安全、拒绝未决状态的方式验证策略迁移后才可继续。本项目已有一次观察和三份素材准备记录，能否复用仍须按授权和覆盖规则实际核验。
- 隔离项目的只读位置计数进一步确认：`coast-photo.png` 的内容 SHA-256 为 `27e21b979822cd88f9f92fa1cc463cb4b931930ef5bb269c3f5a052c194e6bb5`，对应两个 original；其余三份各一个。这与首次素材准备阶段歧义、排除该图片后进入模型链的实际表现一致，证实了此前的具体歧义来源。
- 已用当前产品源码构建隔离镜像 `20261105-r2`，build-input 摘要 `1af87b9430b8bf656c51d109fabd31ec4e1b994581f3efb662a3abbebb1e8b64`；通过作品管理正常关闭预检作品，只停止本包两项容器。受控策略迁移从 `8c54e1274ec1e68d551e7226ea7e83ecfb358129b7b48e586fbe635f4234c50a` 到 `f669127989a8cd5436cd82e05acf483bf1418c4876290274f7438d427d3bcb35`，保留 CNY 28.774764 预留，迁移未发模型调用。首次 `resume` 因 CLI 顶层 await 与循环模块导入相互等待而退出，两个旧容器仍处于停止态、保留本次 resume 锁；修复及锁归属核实完成前不重试、不删除锁。
- 已拆除上述循环并以 CLI 子进程回归验证；复核锁哈希、进程及 helper 状态后，将本次异常锁移至 `resume-cycle-failed-owner-r2` 保留。第二次 `resume 20261105-r2` 退出 0，双服务 healthy，`guarded-identity-1793875374154.json` 证明启动 guard 的策略、CNY 100 上限、27 笔/CNY 28.774764 预留和零 pending。真实重开原预检作品，从产品“继续制作可播放版本”续作，界面显示复用已有 3 份准备、10 个片段、37 份采样和 30 条证据，进入初稿生成；一次规划请求后于 18:45 再次返回 `MODEL_PROVIDER_FAILED`，作品仍 v0，根因待核实。账本 28 次预留、28 次响应、CNY 30.961884。续作辅助录像 `real-model-preflight-r4/journey.webm` 时长 140.539 秒，含音视频轨，SHA-256 `0a19ddef43b0b16ba24562e5e3d0d69a9baec504645bebe1d5ccdc88e0b9e001`；非正式 WIN/C 验收。
- 第二次失败对象 `6e647d1c160ad0c3aa2ab8240c05b7c8b5ad72b7df9562550d299fd80cc32628` 证明第一轮规划收到响应后，第二轮 150,355 字节的输入被新设 150,000 字节本地限额在预留和发送前拦截。先前扩容未考虑多轮增长；不应以重复小幅扩容或删减证据替代有依据的全流程预算。第一轮诊断已持久化，但现有 provider 不支持安全续跑该轮；再次提交可能重新计费，未声称其可复用。
- 续跑需要 Host 以可信构造路径绑定实际预加载 guard 与同一原子账本，而非信任 Renderer 或环境变量的声明。为此登记 `apps/desktop/src/main/host-context.ts` 和 `model-configuration.ts`；是否能够完成可验证的能力注入仍待实施和测试，不能凭路径登记宣称可恢复。
- 为解决上述已完成首轮不能安全复用的问题，新增 [ADR-0048](../../../decisions/ADR-0048-stage3-planning-resume.md) 并在本包 manifest 登记版本化续跑 contract、代码生成、相关 Host/存储/Model Gateway、稳定架构和定向测试路径；P5 guard 与账本代码已由 `scripts/p5/**` 覆盖。拟用受验证的跨 run lineage 和受信任的原子 wire 去重边界保存真实 provenance，禁止改写旧失败、settlement 或预留；guard、权限、部署或发送状态不能证明时失败关闭。缺少音频库跨 run 校验时该分支不可续跑；原 v3 记录仍按原规则读取。本条仅登记决策及实施范围，未实现续跑、未改账本、未证明本次请求符合恢复条件；后续必须先完成实现与工程验证，再核验该请求与隔离 guard 的实际身份。
- 冻结的原片绑定实现及真实 DOM 测试修正后，`pnpm run stage3:check` 退出 0（完整日志 `current-build-20261105/stage3-check-after-binding.log`），`pnpm run typecheck` 与 `pnpm run contracts:check` 退出 0。`pnpm run docs:sync` 退出 0；随后 `pnpm run docs:check` 退出 1，当前 P4 交互源码指纹及多 programme Evidence applicability 与 latest fingerprint 失配，完整列表见 `docs-check-after-binding.log`，尚未处理。
- 在同一隔离运行面新建演出预检项目 `8e79ece2-b06e-44bf-8d24-69ff8b5f287a`，浏览器自动文件选择导入 `piccolo-performance.mp4` 1/1；授权确认展示具体原片位置和身份。使用真实服务生成 v1，Preview/Master 检查均显示通过，产品预览实际播放；随后提交更紧凑的第二种自然语言意图生成 v2。产品版本比较界面显示 v1 约 8 秒、v2 约 5 秒，截图 `performance-preflight-r1/v1-v2-compare.png`；实际版本对象与差异已按下一条只读核对。v1 Host 导出收据为 `file-written`，952847 字节，SHA-256 `14b1ff54ca1e495868b9311851c1baafcbaa9f9cd41eae609459eebaa79fa65f`；浏览器下载目录 `.crdownload` 字节数及摘要与 Host 完全一致，ffprobe 识别 8 秒 H.264/AAC，但浏览器仍未确认保存完成，原因未知。此案例没有系统原生选择器或覆盖 WIN-01–10 的完整连续记录，不作为 P5 通过。
- 只读核对实际版本对象：两版均为两个镜头、源顺序相同，但源区间与时长不同；v1 为 8 秒，v2 为 5 秒。两版 Preview/Master QC 均 passed 且 issues=[]，实际 Master 哈希分别为 `14b1ff54ca1e495868b9311851c1baafcbaa9f9cd41eae609459eebaa79fa65f` 和 `862c2cd07359b1d2c3e869b7431fb58263861b8d956aeb1602eda2996a138ecf`。这只是旧构建预检，不提升为正式 C5 验收。
- 演出预检辅助录像 `performance-preflight-r1/journey.webm` 记录 `2026-11-05T10:51:38.428Z` 至 `2026-11-05T11:05:24.195Z`，时长 826.184 秒，含音视频轨，SHA-256 `497d272780e4cfbdfc1cb68f2a9bfe090cd1fcb691a179bfb2691bf71581a059`；不代表人工听评。该次结束时累计 35 笔预留与响应、保守预留 CNY 38.610516，无 pending。
- 已按 ADR-0048 实施待验证的跨 run 续跑及第二代守卫策略；独立审查只读重算真实旧失败的首轮、ticket、授权与待发 wire，未见已知结构不兼容，且待发 wire 在现有账本中无预留。隔离 Host/Worker、网关与同账本模拟测试、硬杀锁保留及无网 guard 安装通过；冻结后 `typecheck`、98 份 `contracts:check` 和 P5 工具 40/40 通过。续跑与生产镜像注册尚未实际执行，冻结后的产品回归正在运行。
- 修复公开包类型引用后 `architecture` 通过，完整产品专项退出 0；新镜像 `20261105-r3` build-input 摘要为 `ad74ad65447d7b975663fbf051dd46b3f58322955940ba78e2d2b29e6e887399`。正常关闭演出作品并仅停止本包两服务后，第二代策略由 `f669127989a8cd5436cd82e05acf483bf1418c4876290274f7438d427d3bcb35` 迁移至 `a3f30c577188d26dd52ab3cc23eb50607e675d71e3f3fa859dc59ef449583089`，原 CNY 38.610516 预留不变且迁移未发模型调用。`resume 20261105-r3` 退出 0、双服务 healthy；`guarded-identity-1793879372476.json` 记录新 guard 与零 pending。真实旧请求能否在新 Host 重建一致 root、注册能力并续跑仍待操作验证。
- 真实重开原混合作品后，从产品入口续跑原请求。新账本唯一新增的 wire 与旧失败中 pending 第二轮 wire 摘要完全一致，新增一笔 CNY 2.354148 预留并收到响应，旧第一轮未重发；真实生成提交 v1，后续以 `CREATION_RENDER_QC_BLOCKED` 终止，当前不可观看，具体 QC 根因待核实。账本累计 36 笔预留/36 笔响应、CNY 40.964664、无 pending。`real-planning-resume-r1/journey.webm` 记录 182.727 秒、有音视频轨，SHA-256 `97b5864062e5476180fba33d21b8d011b4cb59835306b80d73195d18999e75b9`；这证明一次真实续跑边界，不代表整包验收通过。
- QC 根因核对：模型 v1 的四段视频共 5 秒，方案未安排独立 WAV；两段视频的源音轨为数字静音，WAV 非静音。Preview/Master 均因 0–5.01333 秒 `SILENCE` 阻断，render `committed:false`、staging 已清理，v1 Timeline 及证明保留。Host 将未进入渲染图的 WAV 也作为来源证据，违反 Worker 要求的图来源一一对应；登记实际图源选择的 Host 回归，修复不得放松参与渲染的非静音来源丢失检测。
- 独立审查进一步复现图内已静音视频原片仍影响另一活跃音轨静音判定。为修正同一 QC 边界，登记目标 RenderGraph/ExecutionPlan 的版本化音频上下文、Worker 校验及回归路径；缺上下文仍保守处理，来源身份、参与片段和真实丢音阻断不得弱化。复杂时间映射若不能可靠反算则保持保守，实际支持范围待测试。
- 在 r3 预检中通过正式精修入口选择已获准的 0–12 秒独立 WAV，放到第 0 帧形成 v2，再以第 150 帧裁剪结束得到 5 秒 v3；未调用模型。v3 实际 Preview 播放，Host 回执确认 Preview/Master QC 均 passed、issues=[]；两目标文件均为 H.264 640×360、30fps/150 帧、AAC 双声道 5 秒，SHA-256 `fe1fdffb1f0c80d095efb27e93caa641c0d6255bc05ced8dd93392fd16a31d6c`。解码音频与 WAV 前 5 秒各 220500 样本、Pearson 相关约 0.999079；Host 导出文件哈希一致，浏览器实际保存尚未确认。这是手工音频实验，不代表模型自动 v1 或音频与画面有事实关联，也不代表人工听评。录制 `audio-manual-preflight-r1/journey.webm` 时长 282.907 秒，含音视频轨，SHA-256 `cb149ede12e071c358af5121d3d4af7055b2a51f0ed0b4e438a01c8bdca8df84`。
- 为便于离线核验，将隔离容器的 v3 Host 导出只读复制至 `audio-manual-preflight-r1/host-v3.mp4`，复制后 SHA-256 与上面的 Host 回执一致；此副本不是浏览器下载完成的证据。
- QC 修复后的 `20261105-r4` 镜像 build-input 摘要 `77968b2edf69432670d2ecb21012f31ca4fc041396518ebfb744a555d387f829`；正常关闭作品并仅重建本包容器后，`resume` 退出 0、两服务 healthy，`guarded-identity-1793882332337.json` 保留 36 笔/CNY 40.964664、零 pending。产品历史入口重渲染原始 v1，Preview/Master 均通过并以非阻断警告提示静音；两个输出及四个实际参与渲染的原片区间解码均为数字零。两目标各自使用不同图与执行计划，共享语义哈希与 payload 相符；输出 SHA-256 均为 `9da4904d24b17618eda908bdfc66e865461967f33b1cb4f4244eb08a79d3744e`。v3 有声音频文件仍保留且哈希不变，账本未增加模型调用。`real-qc-fix-r1/journey.webm` 时长 128.244 秒，含音视频轨，SHA-256 `43283a7daf8a579216e911745bdc44ce587fe1624281e3ff67c79d7f2f1bb4bc`。这不是正式 WIN/C 全旅程。
- 留出预检从档案视图提交新作品时，授权缺项反馈写入被隐藏的对话视图，页面看似无响应；通过手动打开新创作要求后可见缺项。为修复本包真实流程，使用已列入 allowed paths 的 `creation-workspace.js` 与 `stage3-p4-workbench.test.mjs`：缺项时显示对话并保留输入、档案查询及显式授权。`pnpm run stage3:p4-workbench:test` 退出 0；真实工作台的隔离 DOM 事件回归覆盖从档案和制作视图提交、素材缺项焦点及提示、仅缺原文的焦点、无自动授权/请求和已应用情境保留。这不是当前构建真实交互验收。
- r5 的真实页面复验确认焦点可到素材控件，但缺项文字仍在滚动视口之外（`composer-r5-preflight-r1/missing-authorization.png`）；为在共享输入附近显示既有反馈并限制小屏占用，P5 登记 `apps/desktop/src/renderer/styles/workbench.css`，同步修改已登记的 Renderer 和测试。`stage3:p4-workbench:test` 与 `stage3:desktop-workspace:test` 均退出 0，前者检查桌面及 360×700 视口内提示可见，后者检查切项目清理旧提示；窄屏首次模拟未触发 resize 导致失败，按浏览器实际窗口变化补发该事件并等待布局后通过，未改变可见性断言。新源码仍须在真实页面复验。

### 2026-11-05 留出学习预检与质检回归

- 登记 `tests/integration/web-host.test.ts`：排查真实浏览器下载停留在临时文件时，以受控合成媒体经真实 Browser Host 导出和下载路由验证 HTTP 长度、摘要、响应结束和会话隔离；上游媒体读取及登记采用受控测试边界，结果不能替代浏览器实际保存或 WIN-07 验收。
- `pnpm run web:host:test` 通过：生成 H.264 MP4 后，经真实导出 handler 写入，再由实际下载路由完整接收并检查 Content-Length、字节内容、SHA-256、HTTP 消息结束与跨会话隔离。首次运行因测试变量重名而在编译期失败，修正命名后通过；两次日志分别保留在 `browser-download-r6-preflight-r1/web-host-transfer-test-initial-failure.log` 和 `web-host-transfer-test.log`。该结果未确定 Edge 临时下载未完成的原因。

- 遗忘后新作品的浏览器下载预检：Host 已准备成片，点击实际下载链接后浏览器完成事件 30 秒内未返回；下载目录保留 962072 字节 `.crdownload`，SHA-256 与 Host 文件一致，不能据此声称保存完成。Edge 配置启用每次询问保存位置，但未观察到另存为窗口，原因未确认；未改用户设置或重命名临时文件。辅助录像 `browser-download-r6-preflight-r1/journey.webm` 321.428 秒、含音视频，SHA-256 `71db3e597d76dcad7b712e69750bf09964a947be9316572bbbaeb9da7f064f16`。当前账本 76 次预留与响应、CNY 90.958896、无 pending，保守预留不是实际账单。
- r6 源码 `stage3:check`、`typecheck`、`contracts:check`、`architecture`、`acceptance:final:synthetic` 和 `interaction-acceptance:test` 均退出 0；其中交互记录工具测试不是正式真实交互验收。`docs:sync` 退出 0，`docs:check` / `check` 因两项 P4 当前交互证据代码指纹漂移仍退出 1，历史适用性债务保留 UNVERIFIED；完整 P5 不得关闭。
- 用户确认后，正式界面遗忘上述隔离来源的 3 条经验及 4 条原则（含依赖纠正）。界面显示三条学习记录已排除，作品 v5 可重开；只读核对档案 v5 的 deletion_generation=1，来源与三条事件有排除标记、四条原则不再可用。新项目 `6ff338e2-4581-46ed-8d0d-acce42598068` 查询旧及新情境为空，以独立 DVIDS 演出素材真实生成 v1，双目标 QC passed、issues=[]，实际输出 SHA-256 `127e3968015ee9bb9ae8f2433e926a70121dcfc7b7c960e3130dcaee3165a77f`，8 秒/240 帧，音轨非数字静音。真实两轮规划输入 profile=null，均不包含被遗忘来源及四个原则 ID，最终 applied_principle_ids=[]；本次后台学习关闭。重新打开原请求及 v5，尝试手动学习该已排除反馈，界面返回 `PROFILE_EVENT_EXCLUDED`，前后账本序号均为 152、无额外模型调用。只读记录 `profile-forget-r6-preflight-r1/readonly-verification.json` SHA-256 `9f4c86526a622e2eb65aa9aea0a63ed7c622504034948295059e551c337ea2ea`；辅助录像 `journey.webm` 537.687 秒、含音视频，SHA-256 `362e200fc38c5133035f79a5fb1731030b1c05215160568d560d7f70d8c6f61f`。旧快照未在真实界面重放；纠正后在新项目的应用先于遗忘未完成，不能以此关闭 C6 或拼接成正式旅程。
- r6 留出作品一次性排除慢节奏原则，查询仍保留声音原则；带相反要求生成的 10 秒 v2 有八个镜头（v1 六个）。两轮规划输入均排除慢节奏原则、保留声音原则，模型输出亦仅列后者；原档案两条原则当时仍存在且未禁用。v2 双目标 QC 均 passed 并保留静音提示，解码音频全零，SHA-256 均为 `6fd38ebd314ce5500dadb4531432a8d2fcbcc2dd4f38eb8460f63912a10c0d62`；同时改变了用户要求，不能将镜头差异单独归因于例外。录制 `profile-exception-r6-preflight-r1/journey.webm` 209.638 秒，SHA-256 `39289abce8c4d5d6c0c1f76ba489e670708080e94f33509bcbea339e4530ca72`。
- 原作品 revision 3 首次因 `REQUEST_DATA_DENIED` 失败并保留；证据支持原因是原请求未授权发送当前选中的 profile，模型调用前即被拒绝。通过“仅查看项目”移除本次档案输入后，在原范围续作生成 v5；显式学习该真实反馈并选择原慢节奏原则作纠正。档案 v4 将原原则保留为历史 hypothesis 并标记禁用，新紧凑节奏 hypothesis 绑定 revision 3 原话及纠正前驱，旧声音原则未禁用；v5 先生成、后学习，不能声称其受新原则影响。查询情境是精确匹配，旧名称不会返回新节奏；模型生成的新情境之一比原话更宽，不能声称泛化已验证。录制 `profile-correction-r6-preflight-r1/journey.webm` 464.902 秒，SHA-256 `9b348c9e91405264ffe927a4601ab95a47ed42e788daf02a9a621410c5ae0738`；两段录像均有音视频轨。新项目中纠正后应用仍未完成；遗忘后预检见上。此阶段账本 71 笔预留和响应、CNY 85.622508、零 pending，属保守预留而非实际账单。
- `20261105-r6` build-input 摘要 `dd07d6e5f86e9a7177a50affc7849da2fe0da080ea976c5ac2ee5780fd17338e`，同一账本和卷恢复后双服务 healthy，guard 显示 66 笔、CNY 76.281024、零 pending。真实页面重开 r5 预检作品，从档案页提交未授权请求后切回对话、聚焦缺失素材，原输入保留，缺项提示在输入框上方真实可见；未创建请求或调用模型。截图 `composer-r6-preflight-r1/missing-authorization.png`；录制 `journey.webm` 41.849 秒、含音视频轨，SHA-256 `ad4d6e8f4a97d96a4d34900e94eac609f04f914eb7174068d0cd932b0955ae30`。这是定向预检，不替代正式完整交互验收。
- r4 学习预检显式授权隔离源作品的反馈、手动精修、采用和 30 天保留范围；采用事件未产生习惯，真实反馈生成 8 秒 v4，学习后得到两条 `coastal observation` 情境经验。未授权为学习来源的留出项目 `0ac6ee3f-3e59-402d-a7b4-18597f63964d` 读取经验，显式授权个性化原则并关闭本作品后台反馈学习。两轮规划输入包含 profile v3 两条原则，输出 `applied_principle_ids` 列出两者；这不单独证明节奏选择的因果关系。
- 留出项目 v1 为 10 秒、六镜头、640×360/30fps/300 帧，Preview/Master QC 通过并有静音非阻断警告，两输出 SHA-256 均为 `b41615d69a9d7863288fa8d3b24d0e27b8ba1ccbb97a81a5da157e979516b670`，解码音频全零，未实现可听环境声。留出片段与训练片段是同一原视频的不同区间，不能声称跨原视频泛化；纠正、例外及遗忘链仍未完成。此次使用浏览器文件选择接口，不是系统原生选择器。`learning-preflight-r1/journey.webm` 时长 810.184 秒，含音视频轨，SHA-256 `b3ff74f4558b72716decc5b8d904b7f4323504f950cac409d7266d717288d976`。账本 66 笔预留与响应、保守预留 CNY 76.281024、无 pending，非供应商最终账单。
- 源码检查 r1 在合法 0–3 秒静音后遇到 3.000146 秒编码边界而失败，原日志保留。修复后 `worker:qc:test`、Python lint、`stage3:precision:test` 通过。原有 50ms 边界容差内部分缺音、低于检测阈值的缺音和其他音轨掩盖单轨缺失仍不能可靠识别；r4 是修复前构建，不能作为最终源码验收。

### 2026-10-15 起始（历史记录）

- P5 已通过 `pnpm docs:start -- WP-S3-RELIABLE-ACCEPTANCE-001` 启动；起始 dirty baseline 保存在 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-start-dirty-baseline.txt`。
- 当前 desktop/Whisper 服务均 healthy，image IDs 为 `sha256:df69a9c24ba3f3207b565a63adcf5cec1e08a923945d0eee10d77d5a2b20eb0b`、`sha256:2a6c53ddf1513f1cd2d1a3b81b56a0a57cd4e1124b0ee5ac32c67725d27a422b`，build-input digest `c558d1edffc7a549d76586bff3549a4dc65367cd0f55e67133ec5f1916a3c398`；未重启或替换服务。
- P5 已起独立双服务运行面 `ave-p5-current-20261015`（6081），其 profile/project/upload/export 使用独立新卷，模型配置取本机 `.env` 注入到测试容器，Whisper 缓存从现有卷复制到新卷后使用；源缓存与副本文件内容聚合哈希、树哈希、大小均一致，验证日志哈希 `28EEB98A4A289FB36A6A51C851CADE3C54414CF854DC354947465DF7481B7421`。原 `ave-desktop` 两容器仍健康，未被重启或挂载写入。当前 runtime 身份文件 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-runtime-identities-20261015.json` SHA-256 `56DC4DCF924F010557ED4801DA16B86D7630B9A2897006582962C9490573D1E5`，四个服务记录的 build-input digest 均为 `c558d1ed…`。
- 初始化遇到两项真实环境要求并已修复：desktop 启动脚本需要模型环境变量；Whisper 需要可写缓存和GPU reservation。修复只作用于 P5 隔离面。P5 desktop 页面目前显示空作品库；已在新隔离卷创建一项空作品。后续开始交互记录时会从该空作品导入开始；其余 WIN 步骤与 C1–C9 仍为 `not-run`。
- 首轮 `pnpm run docs:check` 退出1，发现 12 个 applicability 指纹：10 个历史 scope（`CAP-CA-EXIT-001`、`CAP-CA-GOV-002`、`CAP-S3-DOCKER-001`、`CAP-S3-WEB-001`、`CAP-S3-DOCKER-CLEAN-001`、`CAP-S3-MEDIA-001`、`CAP-S3-AUDIO-PACK-001`、`CAP-S3-SOUNDTRACK-001`、`CAP-S3-PRECISION-001`、`CAP-S3-MEDIA-CLOSEOUT-001`）及2个 P4 scope（`CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001`）。日志 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-docs-check-applicability-failure.log`，SHA-256 `F14171672661848F8031C7FF83CA323571AE2C63BC20EE6F8D4A1EA226740B04`。
- 本轮 WIN-01–10、C1–C9 均为 `not-run`。下一步按 DOC-011 对当前指纹对应的 required tests 逐项验证；退役命令的历史失败记录保留，当前不再执行其占位检查；Stage2 真实素材／完整时长债务仍未通过。完成该复核后在同一双服务构建上执行真实媒体与模型交互。

### 2026-11-05 P5 当前状态阻断

本轮客观状态为 blocked；详见 [本包 blocked Evidence](../../../evidence/runs/EVD-20261105-S3-RELIABLE-ACCEPTANCE-BLOCKED-R1.md) 与 active debt DEBT-S3-P5-CURRENT-REAL-JOURNEY。上轮 Windows 原生控制因无法可靠确认 URL 而停止，本次续接尚未重试原生窗口；WIN-09 损坏/有效同名素材准备遭自动审批拒绝，浏览器下载保存仍未确认。真实遗忘后预检及工程回归保留，不能拼接为正式同构建连续旅程。账本 76 次预留与响应、CNY 90.958896、无 pending；所有费用为保守预留。恢复条件和未完成清单以 Evidence 与 debt 为准。

### 2026-11-06 用户手工测试与创作区反馈

- 用户反馈成片下载、素材导入和系统文件选择操作正常；其后对播放、素材切换、刷新及作品关闭重开、窄窗口和键盘/中文输入检查反馈均正常。以上为用户报告，尚未取得保存路径、输出哈希及连续声画记录，不将其提升为本包正式验收通过，也不改写先前运行记录。
- 用户反馈：在工作区「创作」里的素材小方框点击素材时直接跳转到「素材」页面，无法在创作区内直接操作；例如希望在视频素材和音频库之间切换，但无法在此处完成，也无法从该素材区域拖入素材。用户期望在创作区直接切换素材类别、选择并拖入素材，减少页面跳转。上述为用户实际使用反馈，具体触发范围、目标位置与根因尚待复现确认；本次仅记录，未修复、未验收。
- 用户补充：创作区素材面板与独立素材页面应共用同一素材及选择状态，但保持各自独立界面；创作区应可直接切换视频素材与音频库并拖入素材。该澄清不改变既有授权和素材身份边界，具体交互及实现仍待核验。
- 静态核对发现工作台在创作、素材和精修页面复用同一 `mediaPanel(actions,state)` 节点；素材卡点击调用 `selectAsset`，该操作无条件设置 `workspacePage="assets"`。精修拖放使用当前请求获准片段，不能将普通浏览自动等同于授权。此为源码定位，不代表已在当前构建完成复现或修复。2026-11-06 执行 `pnpm docs:start -- WP-S3-RELIABLE-ACCEPTANCE-001` 返回 `work package cannot start from blocked`；包状态与原阻断保留。下一步应按本包缺陷协议登记对应 UX 能力修复并验证共享状态、独立视图、真实拖放及权限，再重建并继续 P5。
