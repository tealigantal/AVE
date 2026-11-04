# DOC-007 AVE 可靠媒体、完整交互与真实验收执行计划

## Purpose / Big Picture

把真实素材、对话创作、精修、版本、恢复与导出连成可持续使用的工作台。P4 的交付目标是 **demos/p4-workbench 的界面与可操作功能全部真实接入**。先完成内部功能与自动验证，再按 demo 重做 UI，最后完成自动集成验证。demo 固定数据、假回复和未连接/未注册占位不进入生产。

本计划是唯一执行顺序和检查点记录；[活动 P4 工作包](../program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-UX-001.md)拥有逐操作范围， [Workspace Design](../ux/WORKSPACE_DESIGN.md)拥有 UX 规则。机器状态只读 [current](../current/STATUS.md) 与 programme。这里的执行单元不是新 Work Package，不另开并行状态源。

## Context and Orientation

- 接续入口：`WP-S3-RELIABLE-UX-001`。每次恢复先读 generated WORK/STATUS，确认它仍为 active，再执行 `pnpm docs:start -- WP-S3-RELIABLE-UX-001`；若机器状态已经变化，按新活动包处理。
- P0–P3 的实现与接受记录保留在各正式包和不可变 Evidence；不重新实施已经关闭的工作，受本次变更影响的验证仍须重跑；不把旧构建的人工接受外推到新源码。三个 P4 前置子包的完成只证明其受限工程范围，不证明整个 demo 已实现。
- 本轮 2026-10-12 审查基线：源码存在旧预览阻断连续精修、音频/字幕/PiP 手势缺口、空白域落点截断、批注活动标记及模型处理缺口、批注 v1 新写、P4 专项未接总检查。它们是待修复事项。
- 编辑前 `docs:check` 基线为 34 项 Evidence applicability 失败；DOC-010 移除完成工具人审门槛后源码指纹变化，另有 Stage3 latest Evidence 身份过期，见 DOC-010 记录。它们不是 34 个已确认产品故障，也不能靠改摘要声明通过。依照下文 GATE 清单处理。
- 人工审核、审美/听感签字、重复询问授权不属于本计划完成门槛。Agent在既有任务范围内自行完成实现、检查及修复；产品运行时权限校验仍保留。
- 本工作区有大量既有未提交变更。开工保存当前差异清单，按当前字节阅读，不 reset、不回退、不提交别人的工作。

### 固定 UI 基准

以下三份文件是本次逐页/逐操作对照基准。核对内容摘要；如用户后续修改 demo，先列出差异、更新工作包清单与验证，不静默更换目标。README 是说明，不替代源文件。

| 文件 | SHA-256（2026-10-12） |
| --- | --- |
| `demos/p4-workbench/index.html` | `d109da0376611641632110d0bc12fd17175881d65d6473142b8c8b353c0a756b` |
| `demos/p4-workbench/demo.js` | `e1f0eb6f8686d907d78c8d4cf10bf71882abc995f779e2014f72c5e670c0b938` |
| `demos/p4-workbench/demo.css` | `92a067f61dcb9532870c1db611b85fd4317af0a41ae02d2a2f019e2795fd946b` |

不保留旧 HTML、旧侧栏、旧配色或其他软件布局要求。demo 的模拟业务不覆盖 Host 权威；同目标效果替换、项目安全删除等产品不变量仍按 Workspace Design 和合同执行。

## Progress

这些勾选仅记录本计划工作，不提升 programme 能力状态。下一执行者从第一项未完成单元开始，先跑其失败用例，完成实现与验证后更新本节；不要将本次文档整理勾成产品完成。

- [x] DOC-010 已将当前目标、审查缺口、逐操作清单及顺序整理为一个执行入口。
- [x] L0：把 P4 专项与工作台事件测试接入总检查，建立可运行失败回归。
- [x] L1：连续精修、观看/编辑版本分离、统一撤销/重做与空白时间域。
- [x] L2：逐对象拖动、修剪、分割、跨轨和轨道生命周期。
- [x] L3：字幕、文字、效果和转场完整操作及双目标输出。
- [x] L4：组合批注真实创作闭环、活动标记生命周期与当前写协议。
- [x] L5：素材、共享会话、历史、作品/回收站、问题与导出的完整接入复核。
- [ ] GATE：受影响工程验证与适用性证据更新，全仓必需检查通过。
- [x] L6：功能清单通过后，逐页复现 demo 界面和响应式行为。
- [ ] L7：当前完整构建的自动验证与工程复核。
- [ ] P4：当前构建的必需自动检查与真实结果证据通过后正式关闭，不等待人工签字。
- [ ] P5：依赖 P4 的最终打包与完整旅程接受，另行晋升正式包。

## Plan of Work

### P4 视觉与交互

以下顺序适用于 Luna 或其他 Coding Agent。每次只实现一个单元，但在已经授权的实施会话中连续推进，不停在首版代码。所有文件写入先在活动 manifest 的 allowed_paths 登记；任务内必要路径补充自行记录原因并同步，不设置额外人工审批。下表是查找入口，不授权无关扩展。

| 单元 / 前置 | 修改入口与明确任务 | 必须出现的可观察结果 | 验证与停止条件 |
| --- | --- | --- | --- |
| L0 / 当前基线 | `package.json`、`tests/integration/stage3-p4-integration.test.ts`；新建 `tests/integration/stage3-p4-workbench.test.mjs`。使 `stage3:check` 调用 `stage3:p4-integration:test`；把新工作台测试接入 P4 专项。复用现有 Electron 测试运行方式，挂载真实 Renderer 与 DOM 事件；隔离测试数据，不操控用户 Windows 窗口 | 从正式入口导入全部模块并实际挂载；错误可见。对 L1–L4 当前缺陷有能失败的行为用例，不能只 assert 源码字符串或复制实现条件 | 先记录当前失败，再在对应单元修复；总检查能到达新增专项。新测试命令只在 L0 注册后使用；后续单元逐步消除已记录失败 |
| L1 / L0 | `renderer/workbench/workbench.js` 的 `timelineEdit/timelineSeek/restoreContent`、`features/timeline-panel.js` 的 `canEdit/tickAt/update`、`state/workbench-state.js`。编辑目标独立于观看预览；统一按钮/快捷键可用条件；允许播放头与落点超出现有内容，播放器仅在可播放范围 seek | 观看 v1 后连续移动→分割→字幕修改，不必每次制作；撤销两次并重做一次，版本正确。旧预览继续明确标识且不抢播放。12秒内容可在20秒放 PiP/音频，字幕尾部也可定位 | P4 工作台行为测试、时间线/手动 Host 测试；旧版本写入、跨项目迟到回调仍拒绝。不得删除版本/权限检查来放开编辑 |
| L2 / L1 | `features/timeline-panel.js`、`features/p4-timeline-commands.js`、Host `editCreationDraft`、timeline-core。按工作包 OP-06–12 覆盖各对象手势，真实素材用 `precision.sources` 取得身份，边界按帧/采样校验 | 音频、字幕/文字和 PiP 均具与 demo 对应的移动/修边/分割/删除；有效落点才建轨；手动建空轨不立即丢失；删除/移走最后内容按规则清空；撤销/重开一致 | `stage3:p4-timeline:test`、P4 工作台测试、`timeline-core:test`、`timeline-render:test`；一次松手只提交一个逻辑版本；取消、碰撞、锁和失效版本不留半个状态 |
| L3 / L2 | `player-panel.js`、`creation-workspace.js`、timeline-panel、timeline-core、render-graph、Worker `render/`。按 OP-13–15 补齐字幕样式、效果删除/替换、转场选中/替换/删除；保留既有精修能力 | 字幕 Enter/失焦提交一次、Escape取消；灰度/黑白/模糊对所选片段真实生效，重复替换且可清除；交叉叠化只在合法剪辑点，删除与撤销恢复正确。Preview/Master实际画面一致 | 时间线、render graph、Worker协议与媒体正确性回归；用真实解码的合成媒体检查输出；不得把 CSS 或 graph JSON 当画面生效 |
| L4 / L1–L3 | `creation-workspace.js`、annotation queue、workbench；Main `creation.handlers.ts`；Host `sendTimelineAnnotationMessage` 与 Stage3 request/creative/planning 路径；annotation storage 与当前合同/codegen。按 OP-16–18 实现整体要求+批注数组一次提交并进入真实创作任务 | 消息保存、处理状态、实际修改结果分开。Host 提供有界结构化上下文，真实创作仍走现行规划/Command/Commit。发送失败保留草稿；处理失败可查和重试；成功处理撤下活动标记，历史可跳转。只允许当前版本新写；旧记录精确读回/重放，不允许新建 v1 消息 | `stage3:p4-annotation:test`、`stage3:request:test`、`stage3:generation:test`、`stage3:model:test`、P4工作台测试。验证消息/任务断线幂等、授权撤回、stale anchor、历史读回及模型失败无错误提交；必要的新合同/事件语义须新增 ADR，不改历史 ADR |
| L5 / L1–L4 | media-panel、creation-workspace、project-panel、export-dialog、error-dialog、workbench 及现有 Main/Host 查询。逐行核对 OP-01–05、19–24，不用底层测试代替用户入口 | 本地真实素材、库试听、共享输入、历史比较采用、回收恢复、持久问题及固定版本导出全部有入口与回执；取消不报伪故障。移除 dispatcher 无 handler 的 `project.delete` 死白名单 | `stage3:p4-integration:test`、`stage3:desktop:test`、`stage3:workspace:test`、`stage3:project-open:test`、`stage3:product:test`、`web:host:test`；受影响素材/音频/导出专项。需检查未知命令与真实物理删除安全没有放宽 |
| L6 / L1–L5功能清单通过 | renderer HTML/JS/CSS，逐页对照固定 demo。先保持真实接口和数据，再替换页面结构、导航、面板、控件位置、字号颜色与交互；去除生产旧 UI 路由/无调用渲染分支及其测试引用 | 九个页面、单一共享 composer、精修布局与 demo 一致；窄窗口、125%/150%、焦点/选区/输入、减少动态可用；不保留旧方案作为平行 UI | P4挂载/交互测试、renderer边界、响应式尺寸检查；普通 JavaScript 不在当前 tsc include 内，须实际导入和执行。功能入口不得在换皮时遗失 |
| L7 / L6、GATE | 按 manifest 完成自动检查，核对构建来源及产品入口，独立只读审查。使用与当前源码一致的隔离构建执行验证，记录运行身份与影响 | 当前实现、静态模块加载、Host提交、双目标媒体、重开和导出证据齐全；没有上述阻塞；自动完成当前构建的完整交互流程并保存实际结果 | WIN-09/WIN-10由自动化执行并记录实际结果；可选人工反馈不阻塞完成。工具无法执行的实际项目如实标明限制，不假装已验证 |

L2/L3 不要求实现 editing-execution-v1 的全部高级家族；但工作包清单列出的可操作项不能以整体 CAP blocked 为理由永久禁用。未注册占位按明确非范围项处理。

### 每个单元的工作方式

1. `git status --short`；核对 active/allowed_paths；查找表中函数及实际调用方。不要只阅读文件开头，也不要全量复制大型 Host 文件到上下文。
2. 选定工作包 OP 行，写清触发输入、预期版本/对象/输出和失败分支。先运行或补上能证明当前问题的用例。
3. 在真实入口→Host→提交/持久化→渲染/回读边界完成最小完整修复。同步消费者和合同；生成物只运行 codegen。
4. 跑单元专项及受影响回归。新增失败先定位根因，不削弱断言、不用无限重跑换绿。
5. 更新下面“执行检查点”和 OP 验证引用，再处理下一个单元。缺少实际输入时先使用许可明确的合成/公开fixture验证可完成部分；不把可选人评或重复授权作为停工理由。

### GATE：全局证据与旧模块处理

- L0 单独执行专项，避免 `check` 在 docs 前置失败后误以为下游测试已经跑过。最终 `check` 必须完整通过，不跳过 docs 门禁。
- 对每个 applicability 失败，读取 `capabilityScope` 对应文件、该能力 required_tests、历史 Evidence 和本次差异，列出需要重跑的边界。相同受影响检查可以一次执行绑定多个真实相关能力。
- DOC-008 已记录的 framing/crop/letterbox 媒体断言冲突必须先按产品语义定位并修复，再新增当前 Evidence；不能仅刷新 scope hash。`worker:render-correctness:test` 是必需检查。
- 跨programme适用性修复由同一执行者登记独立DOC工作范围后连续处理，无需再次等待人工授权。先运行受影响检查，再维护 `APPLICABILITY_INDEX.json` 和对应programme真实Debt/证据引用；保留单一实施active包、不改历史Evidence、不把失败检查改成通过。L1–L6可以继续，最终全仓检查仍须闭合。
- 当前写协议收敛与死入口移除属于 L4/L5；已有项目的历史 planning/render receipt 读取不是新执行协议，不盲删。删除历史读取器之前必须盘点真实数据并明确记录并验证无损旧数据保留策略，禁止隐式迁移或删除作品。
- Docker开发依赖裁剪、兼容 Compose 入口和未接产品的独立 adapter 不属于 P4 功能阻塞；后续有独立范围再处理，不作为此处新门槛。

### P0–P3 已有保证

继续保留逐项导入与失败重试、内容去重/原子登记、EXIF方向、来源权限、浏览与严格分析分离、完整播放/seek/声音、制作中输入/取消、受保护精修、版本比较采用、音频来源署名、个人化例外/纠正/遗忘及正常重开。不得为了 P4 UI 删除这些功能。原包范围与 Evidence 由 Stage3 manifest 导航，本计划不重写历史结果。

### P5 最终打包与验收

`WP-S3-RELIABLE-ACCEPTANCE-001` 已在 P4 正式关闭后登记为待启动包，依赖 `WP-S3-RELIABLE-UX-001`；具体操作清单见[P5工作包](../program/creative-assistant-stage3/work-packages/WP-S3-RELIABLE-ACCEPTANCE-001.md)。最终两服务构建与运行清单须绑定合同、源码、生成绑定、完整 build-input、image IDs、运行文件、Worker/FFmpeg/模型身份；保留既有未提交改动、外部原片、独立导出和 configuration/profile/projects/uploads/Whisper models 数据。

执行完整 `pnpm run check`、`pnpm run acceptance:final:synthetic` 及受影响真实媒体链。实际模型/云调用遵守当前授权与费用边界。自动验证使用隔离数据及当前构建，保护已有服务和数据。修复回所属能力包，不借验收包无限扩展运行代码范围。

最终同一构建覆盖下列 WIN-01–10，另保留 C1–C9，尤其 C5 同源不同意图、C6 新项目留出案例；美学/故事/听感人工反馈为可选补充，不设通过门槛。更新使用、限制和恢复说明，按已验证范围分别报告核心完成、Stage Exit、Release。

## Concrete Steps

开工命令：`git status --short`、`pnpm docs:start -- WP-S3-RELIABLE-UX-001`。本计划修改不授权自动安装新依赖；先使用现有环境。每个 L 单元执行表列专项；新增工作台测试由 L0 注册后通过 `stage3:p4-integration:test` 运行。

P4 最终必需命令以 manifest 为准：`stage3:p4-integration:test`、`timeline-render:test`、`render-graph:test`、`worker:render-graph:test`、`worker:render-correctness:test`、`renderer:workbench:test`、`interaction-acceptance:test`、`stage3:request:test`、`stage3:generation:test`、`stage3:model:test`、`typecheck`、`contracts:check`、`architecture`、`docs:check`。跨模块最终执行 `pnpm run check` 和 `pnpm run acceptance:final:synthetic`；不得把直接 tsc 当包含合同生成的完整 typecheck。

正式关闭前：完成实际验证→新建不可变产品 EVD/更新对应矩阵→`pnpm run docs:sync` 使完成工具读取当前指纹→`pnpm docs:complete -- WP-S3-RELIABLE-UX-001 <真实EVIDENCE-ID>`→`pnpm run docs:sync`→`pnpm run docs:check`。每步串行；失败检查或缺必要身份绑定时不能执行完成；不要求人工确认。文档-only Evidence 不挂到产品能力。

## Validation and Acceptance

### 自动验证

OP 每行至少验证成功、非法目标/版本、取消/失败无半提交、撤销/重做和重开；涉及画面的项另验证 Preview/Master 实际输出。完整 DOM 事件测试覆盖连续手势和异步回调，不能只搜按钮文字。正式 Browser 入口及全部模块依赖可加载只是启动检查，还须实际挂载后操作。

保持十种状态：空项目、已导入、授权、制作、已保存待预览、可播放、比较、失败重试、重开恢复、导出。素材、声音、字幕、效果不能由 Renderer 伪造，成功必须绑定真实对象、版本和回执。故障注入及机器记录由 Agent 完成，不要求用户构造坏媒体或填写 JSON。

### 自动执行的完整交互场景（保留 WIN 标识）

| ID | 自动操作/观察 | 必需结果 |
| --- | --- | --- |
| WIN-01 | 空项目实际导入混合素材和有明确来源的问题样本 | 数量、方向、逐项状态与持久身份一致 |
| WIN-02 | 追加、取消、失败与重试 | 成功项保留，只重试失败项，没有误删/重复登记；无法实际触发的项写未运行 |
| WIN-03 | 图片缩放、视频播放/seek/全屏、音频试听、反复切换 | 真画面/声音，不串画面或残音，波形故障独立 |
| WIN-04 | 正常界面授权生成，制作中输入和修订 | 授权、请求修订、实际调用、进度、草稿与编码一致 |
| WIN-05 | 连续精修、语言续改、保护、比较、采用、撤销/重做 | 多对象视听变化、锁及版本链正确；观看不等于采用 |
| WIN-06 | 音频库、来源署名、学习/例外/纠正/排除/遗忘和留出 | 实际听音、资源回执、授权/删除事实；新项目不检索已排除来源 |
| WIN-07 | 固定版本导出，打开成片及附件 | 版本、hash、画面、声音、来源JSON和署名正确；Browser发起下载不冒充保存 |
| WIN-08 | 刷新、正常关闭/重开、获准的AVE服务重启 | 素材、输入、作品及问题恢复，任务幂等；保护原数据 |
| WIN-09 | 失败提示淡出，等待至少30秒，完成无关成功，再查问题/尝试恢复 | 同一持久问题仍可查，恢复真实成功或明确失败，不伪关闭 |
| WIN-10 | 完整空项目至导出页面旅程；宽窄、125%/150%、键盘、IME、减少动态 | 与demo页面/操作一致，输入/选区/焦点/播放器不中断；记录自动布局/交互检查结果 |

P4负责WIN-09/10；P5负责最终全部十步。WIN是现有场景ID，步骤保留真实应用入口、构建和输出约束，使用browser-automation/native-automation记录实际执行者。运行时产品授权对话由测试身份及实际UI流程验证，不能绕过Host权限；这不要求用户再次批准Agent开展已指派任务。

自动流程：使用可识别的隔离作品和已准备故障样本完成WIN-09；再从空项目导入许可明确素材→请求与产品权限流程→实际制作→观看→连续精修→组合批注处理→比较→刷新/重开→固定版本导出。逐页覆盖九个页面及十种工作台状态，校验缩放/键盘/IME/减少动态。安全删除使用测试拥有目录验证，不操作用户作品。声音以实际解码、采样/响度/同步和输出证据验证；不把这些技术指标写成人类听感接受。

自动化限制逐项记录，不伪造交互或结果。人工体验、故事/审美/听感反馈可随时补充，未提供或未评分不会阻止完成。Agent负责机器记录，不要求用户录屏、填写JSON或逐步签字。

### 证据与完成边界

记录真实执行者、时区与时间段、窗口/缩放/音频环境、源码与完整构建/两镜像/运行身份、素材许可与摘要、project/request/revision/draft/Timeline/manifest/两目标plan/render/QC/export身份。每步包含前提、动作、预期、实际、pass/fail/not-run、原因与恢复；首次失败→修复→新attempt可追溯。

连续过程/声音和产物证据保留在本地测试证据位置，公开只放脱敏摘要与可核对身份；不覆盖旧 Evidence，不外传私有媒体。完成工具验证 live 身份和记录，CI只验证公开收据完整性；JSON、hash、截图、HTTP、静音录像或波形都不证明人工操作/听评。完成以required steps、工程检查和可追溯结果为准，无需人工审核或再次确认。Stage Exit/Release分别报告，不能把可选反馈包装成已发生的人工接受。

## Idempotence and Recovery

相同效果/输入以同一 operation identity 安全重试；输入、策略或版本变化创建新身份。失败保持原 Timeline/项目权威，诊断可以追加；取消排空请求并释放资源。只清理本次创建且无 Host 引用的临时物，保留原片、已用资源、历史成片和用户未提交文本。跨窗口旧请求拒绝并同步当前项目，不能放宽身份检查。

## Interfaces and Dependencies

Renderer→受限API/Main→Project Host→当前CommandEditIntent/CommandEditIR→模拟/校验→CommitPlan/Commit→一份Semantic Render Manifest→Preview/Master各自Graph/ExecutionPlan→QC/输出。Worker不写SQLite；RationalTime/PTS/sample是权威。创作模型只产受限候选，批注正文不成为系统指令。跨边界字段同步Schema/examples/codegen/validator/实际消费者；新ADR记录新决策，不改历史ADR。

## Surprises & Discoveries

本次审查发现字符串边界测试与九项模拟集成通过仍不能发现连续编辑失效；普通Renderer JS也未被当前tsc完整检查。旧说明把持久化子集当作完整批注、把底层PiP命令当作完整手势。因此接续必须以真实入口事件和逐对象结果为单位。

## Decision Log

- 2026-10-12：物理移除本计划内旧状态流水账及失效UI约束；有效功能/恢复/自动验证要求保留在上文；人工审核与重复授权硬门槛已移除，历史事实继续查不可变Evidence。
- 先功能后UI；工作包OP清单为范围，L单元为顺序；不另建Luna专属规范或宽泛重构。
- 历史读取与当前新写分离；本次文档工作不宣称旧兼容代码已删除。

## 执行检查点

| 日期 / 单元 | 实际改动与检查 | 尚未完成 / 下一动作 |
| --- | --- | --- |
| 2026-10-12 / DOC-010 | 文档接续整理；产品源码未修改 | 从L0建立行为回归开始；L1–L7与GATE均未因此完成；人评可选 |
| 2026-10-12 / L0 | 在 `package.json` 将 `stage3:p4-integration:test` 接入 `stage3:check`，新增 `stage3:p4-workbench:test` 并接入 P4 专项。新测试以隔离 Electron BrowserWindow 加载正式 `index.html`/`app/main.js`，并对正式 `timelinePanel` 派发 DOM 事件。`pnpm run stage3:p4-workbench:test`：6项中2项通过、4项按预期复现当前缺陷：旧预览锁编辑/空白域截断；音频与字幕不可拖；字幕 Enter/失焦不提交且效果没有删除入口；批注引导文案排除创作模型。`pnpm docs:start -- WP-S3-RELIABLE-UX-001` 已执行。基线测试未被当作能力通过，也未生成产品 Evidence。 | L1：解除观看版与编辑目标耦合并扩展精确时间域；继续复用这组 Electron/DOM 回归。L2–L4 的对应红测暂保留，修复后逐单元转绿。 |
| 2026-10-12 / L1 | `timelinePanel.canEdit`、`workbench.timelineEdit` 与“精修镜头”入口只依据当前 Host 权威状态及当前草稿版本，不再要求播放器切到当前版本；保留 Host 侧版本校验。时间线游标保留非负精确 tick，实际播放器 seek 仍由媒体时长自行限界；标尺按当前内容/播放头后追加 8 秒空白，并在接近尾部时扩展。实际 DOM 用例确认 12 秒内容可见并定位到 20 秒、编辑 v2 时仍观看 v1。将 Host 集成序列改为两次撤销、一次重做并重开项目校验。验证：`pnpm run stage3:p4-workbench:test` 中 L1 行为项通过，完整专项仍有 3 项红测，分别属于 L2 拖动及 L3 字幕提交/效果移除、L4 批注创作路径；`pnpm run stage3:p4-timeline:test` 通过（命令编译属性测试与手动 Host 合成媒体、Preview/Master、重开、两撤一重）。本单元尚未单独产出 EVD。 | L2：实现音频、字幕/文字、PiP 移动/修边/分割/删除与合法空轨生命周期，并保持一次手势一个 Host 版本。 |
| 2026-10-12 / L2 | OP-06–12：时间线正式面板通过原生 DOM 拖放覆盖音频/字幕跨轨；真实键盘修剪和右键菜单分割/删除分别覆盖音频、PiP，文字属性区分割/删除也逐手势只触发一个编辑动作。`p4-timeline-commands.js` 为音频新增采样精确修剪/分割和跨轨迁移；跨音乐/音效/旁白轨时保持路由身份与增益/静音设置，并将总线映射到目标轨语义。字幕/文字移动、无词级时长修边、分割以及锁定/重叠失败关闭与现有 PIP 移动/修边/分割/轨道命令一起进入属性回归。验证：`pnpm run stage3:p4-timeline:test` 通过，含真实 Host 手动草稿合成媒体、音频/字幕/效果 Preview/Master、重开和 populated PIP 删除/撤销/重做/重开；`pnpm run stage3:p4-workbench:test` 的 L0–L2 DOM 结果 4/6 通过，剩余 2 项仍是下一单元 L3（字幕提交/效果移除）和 L4（批注创作路径）。当前没有单独产出产品 EVD，checkpoint 不是 package/能力接受。 | L3：先解决字幕 Enter/失焦单次提交和已应用效果移除，再完成效果替换、剪辑点转场选择/编辑/删除及 Preview/Master 解码一致性。 |
| 2026-10-12 / L3 | OP-13–15：字幕 Enter/失焦只提交一次且 Escape 还原；效果可替换/移除；交叉叠化选择、替换、删除均接入 Host 命令。Preview/Master 对所选效果和转场的实际画面由解码合成媒体回归覆盖。验证：`pnpm run stage3:p4-workbench:test` 6/6、`pnpm run stage3:p4-timeline:test`、`pnpm run timeline-render:test`、`pnpm run render-graph:test`、`pnpm run worker:render-graph:test` 全通过。此前 `pnpm run worker:render-correctness:test` 在 DOC-008 的 letterbox framing 断言处仍有独立语义分歧，列入 GATE；本单元的效果/转场解码结果已通过。 | L4：把整体要求与批注组成一个 v3 用户消息，接入真实 Host 创作链路，补齐持久处理状态、失败重试及活动标记清理。 |
| 2026-10-12 / L4 | OP-16–18：v3 一次提交同时绑定整体要求、保护引用、profile query 与批注；Host 校验权限/修订/草稿/Timeline/锚点，以有界结构化上下文调用现行 `produceCreation`，真实渲染回执才标记 resolved。存储追加 queued/processing/failed/resolved/superseded 状态；失败可精确重试，或显式重新打开并以新身份编辑/重定位，历史消息与根因保留；无本地草稿时也能从失败历史恢复编辑入口。v1/v2 只允许精确读回/重放。为了同步 v3 调用签名与 resolved 回执断言，manifest 增补 `tests/integration/stage3-p4-annotation.test.ts` 的 allowed path。验证：`pnpm run stage3:p4-annotation:test`、`pnpm run stage3:p4-workbench:test`（含恢复按钮真实 DOM 点击）、`pnpm run stage3:request:test`、`pnpm run stage3:generation:test`、`pnpm run stage3:model:test`、`pnpm run typecheck`、`pnpm run contracts:check` 通过。Host/生成器测试使用受控 provider/HTTP 与合成媒体，不声称真实云模型调用。 | L5：逐项检查素材、共享会话、历史、作品/回收站、问题与固定版本导出，并物理移除计划列明的无 handler `project.delete` 死白名单。 |
| 2026-10-12 / L5 | OP-02–05、19–23 首次复核与导出用户入口补测。正式素材/媒体/音频/共享会话/历史/问题/项目回收路径通过 `stage3:p4-integration:test`、`stage3:desktop:test`、`stage3:workspace:test`、`stage3:project-open:test`、`stage3:product:test`、`web:host:test`、`stage3:mixed-media:test`、`stage3:audio-pack:test`、`stage3:soundtrack:test`、`stage3:precision:test`、`media-browse:worker:test`、`media-browse:protocol:test`、`media-browse:host:test`、`export:host:test`、`export:persistence:test`、`export:test`、`export-capability:test` 全通过。Electron 实际工作台旅程现还从正式导出页测试原生取消与固定版本保存，验证落盘 MP4 字节/hash 与 QC Master 一致、Host 收到相同版本/摘要回执；再实际刷新/重开并验证 UI 与作品状态。关闭超时根因是系统级确认错误携带空项目身份，活动项目下被拒绝为 stale；派发器现绑定当前活动会话，专用回归与 Electron 保存关闭旅程通过。物理删除路径仍逐项验证外部原片/其他项目保护；旧 `project.delete` dispatcher 命令已确认回 `UNKNOWN_COMMAND`，无 handler 白名单已移除。隔离 Electron 保存对话框 fixture 为准确验证原生取消/保存新增 `tests/fixtures/stage3/desktop-dialog.ts` allowed path。材料/音频与模型使用合成/受控本地 provider，未声称真人听感或外部模型验收。 | GATE：先重跑 DOC-008 `worker:render-correctness:test` 并修复其 framing 语义冲突；再按适用性差异运行关联检查、更新当前 Evidence applicability，完成 `check` 前置门禁。L6 继续逐页复现 demo。 |
| 2026-10-12 / GATE 语义与媒体测试 | DOC-008 的旧断言要求 opacity-only 自动化把 20×12 源裁切成 64×64。现行渲染分支对无显式 Fit/Fill 执行等比 contain；P3 `EVD-20261005-S3-RELIABLE-JOURNEY-CLOSEOUT.md` 记录了默认原画幅与留边，并已有实际解码像素验证。先将 `apps/worker-host/tests/render_graph_media_correctness.py` 加入活动 manifest allowed paths，再把媒体回归改为严格验证 contain 留边、动画前后边界不变、透明度降低，以及显式 Fill 保持满画幅裁切。`$env:PATH` 前置 Codex 绑定 Python runtime 后运行 `pnpm run worker:render-correctness:test` 通过，报告 `render graph media correctness acceptance passed`；系统默认 Python 的 Pillow 为 11.2.1，绑定 runtime 为 12.3.0，因此不把默认解释器失败误记成源码问题。未改历史 Evidence。 | 继续 GATE：逐项处理 docs applicability 失败及新 Evidence 绑定，再完成完整必需检查；随后 L6。 |
| 2026-10-12 / GATE 合同版本盘点 | `docs:check` 发现 annotation submit/message 的v2与v3同时留在当前合同目录。依据活动P4包，v3是唯一当前新写协议；v1/v2仅历史读取/精确重放。将 `timeline-annotation-message.v2` 与 `timeline-annotation-submit.v2` 合同及valid/invalid示例物理归入 `legacy/`，保留原 `$id` 和生成validator；使用manifest已登记的identity codegen重新生成。`pnpm run contracts:generate`、`contracts:check`（97 schemas/97 valid/97 invalid）、`contracts:identity`、`contracts:clean` 与 `stage3:p4-annotation:test` 均通过，含历史读回和当前v3身份绑定。 | DOC-011：按适用能力执行其required tests，维护index-only applicability与programme债务；完成后再跑L7全量检查。 |
| 2026-10-12 / L6 | OP-01/24：正式工作台提供九个持久route；Projects与Help有独立真实页面，Recycle为独立route，保留单一composer；导航图标/文本与active状态可访问。清除生产Renderer的`state.home`、`projectListView`、`homeVisible`、旧home action/样式入口；Projects页真实接入现有新建/打开/关闭、最近项目、当前项目及回收站操作。补齐Help中的真实快捷键说明、IME快捷键保护、页面重排焦点保存/恢复、窄屏导航收折和减少动态。历史卡片只切换编辑目标；“观看此版”和播放器的新版本按钮显式切换预览，保持观看/编辑/采用身份分离。验证：`pnpm run stage3:p4-workbench:test` 6/6；`pnpm run stage3:p4-integration:test`通过，含Electron正式入口DOM 6/6、P4状态/Host集成10/10、手动草稿、批注存储/处理和回收/最近项目；`pnpm run renderer:workbench:test`与`pnpm run architecture`通过；另验证1440/1080/820/640/360及125%/150%等效视口无横向溢出，Project焦点保持，composer输入/选区保持，reduced-motion生效；`git diff --check`通过，旧Renderer home路由扫描为零。响应式几何测试在隐藏Electron harness中关闭网格过渡以观察最终断点尺寸，不将后台节流误记成产品布局结果。 | L7：DOC-011适用性范围完成后，按manifest执行完整`pnpm run check`、`pnpm run acceptance:final:synthetic`与当前隔离构建的WIN-09/WIN-10自动旅程；绑定实际build/source身份并记录工具未能执行的场景。 |
| 2026-10-12 / L7 检查与旧入口回归 | `stage2:check`与修复后的完整`stage3:check`均通过。Stage3首轮揭示 Electron 竞态fixture仍点击已删除的`历史`内页按钮、`data-action=home`及`.project-home`，以及历史卡把观看版和编辑版耦合的旧期待。将fixture迁到正式九页`history/projects`路由和当前Project管理DOM；成功创建/打开/最近项目并完成状态回读后回到“创作”；历史卡只选择编辑版，显式观看操作独立。`pnpm run stage3:desktop-workspace:test`通过（合成编码素材、真实Host/Worker与隔离Electron；不声称真实媒体/模型验收），`pnpm run renderer:workbench:test`通过。`stage2-workspace-renderer:test`也因新增文档外点监听暴露替身接口缺口；补齐`document`/事件发布替身并断言失败进入问题日志、销毁释放监听后通过。总检查至`worker:render-graph:test`通过；系统Python的Pillow 11.2.1不符合媒体测试固定的12.3.0，改用工作区绑定Python运行时后`pnpm run worker:render-correctness:test`通过。后续总检查发现音频/字幕媒体断言仍要求旧`fontcolor=white`拼法；当前Worker已按FFmpeg语法将`#ffffff`规范化为`0xffffff`。活动manifest登记必要测试路径后修正断言，`pnpm run timeline:audio-caption:test`通过，真实合成渲染/QC保持覆盖。此检查点无独立EVD；总检查从`proxy-time-map:test`继续。 | 完成总检查剩余项，再回到DOC-011 applicability差异、最终synthetic和当前构建WIN-09/WIN-10。 |
| 2026-10-12 / L7 当前 P4 重验与真实导出 | 13 项 P4 manifest 检查（`stage3:p4-integration:test`、`timeline-render:test`、`worker:render-graph:test`、`renderer:workbench:test`、`interaction-acceptance:test`、`typecheck`、`contracts:check`、`architecture`、`render-graph:test`、`worker:render-correctness:test`、`stage3:request:test`、`stage3:generation:test`、`stage3:model:test`）在当前源码状态全部退出 0，逐项日志位于 `docs/evidence/assets/p4-ux/current-run-20261012/p4-final-test-logs-20261012/`。当前正式工作台真实项目 v3 已采用并经比较器按同一源片定位；Preview/Master QC通过。实际导出 MP4、音频清单、署名文件已下载并归档到 `docs/evidence/assets/p4-ux/current-run-20261012/`，MP4 SHA256 为 `ed6e25ff17cfd8b672d477ad0b77c67d1d45a08861b5e9aeee527060ba6d6095`，与音频清单 `output_hash` 相同；ffprobe 为 12 秒 H.264 640×360/30fps 与 AAC 48kHz 双声道，静音扫描无连续 1 秒区间。`acceptance:basic-vlog:real-review` 用现有 NPS 实际视频片段、已许可 CC0 配乐和项目字幕生成隔离 Preview/Master，QC、响度及 ducking 检查通过；`acceptance:foundation:real` 用现有 USGS 实际采访片段完成导入、重链、Preview/Master QC、重开。DOC-011 的 37 个适用性指纹与 Stage3 latest Evidence 身份仍未闭合；未宣称 P4 关闭。 | 完成 DOC-011 可验证能力的 required_tests、真实缺项与 active Debt；当前 `docs:check` 通过后再执行完整 `pnpm run check`、`acceptance:final:synthetic`、当前构建 WIN-09/WIN-10 和 P4 EVD/`docs:complete`，随后晋升 P5。 |

| 2026-10-14 / L7 当前构建真实创作复核 | WIN-10 R2 从正式工作台新建隔离空项目并导入唯一授权六秒 H.264/AAC 测试片段。真实模型给出单一原片镜头、`embedded_gain_db: 0`、无外加音频/字幕；首次 Host 拒绝的根因是空音频基线被误当作已有音轨保护，项目没有半提交。修复前仅将 `stage3-feedback-goals.ts` 与属性回归文件加入活动 allowed_paths；空基线现在允许已授权视频素材原声进入首稿，同时仍逐字段保护已存在音轨及项目混音设置。`pnpm run stage3:generation:test`、`pnpm run typecheck`（97项合同）通过。按 `docs/04-engineering/DOCKER_DESKTOP.md` 使用 `node scripts/docker/build-reliable.mjs` 重建 desktop/whisper，再以 `docker compose up -d --no-build --wait` 启动；此前一次普通 `compose --build` 因缺少构建身份标签未用于验收。当前隔离构建身份见 `docs/evidence/assets/p4-ux/current-run-20261014-r2/current-build-identity.json`（build input `1f316e81ba1344e2cdf59c73b55b2a6c57116ad4bf792ae89bb7c1222c46d8f9`；desktop `sha256:d450dd2b064a21572c47d07dc095fdf333b196a7a1f6deccd54f8d843b35377e`；whisper `sha256:d8be1f20b8cbe83219c3047ed4e3c3ce726caa4b48b5de757737f8234cc2d574`；runtime digest `f9772fe5f8812ef0c59a845eb6860a22bebb4211c88aa2b298a1211c59186e9f`）。同一正式 UI 请求在项目 `4f34a1de-35c0-43f1-bb3e-e2efa8876c13` 成功提交：request `request:729c5c75-37c1-4d4b-9522-2fe8d2c909e1`、timeline v1/6秒/1镜头、Preview 与 Master QC 均通过；播放器自然结束，未静音，音频/视频解码字节分别 85,451/563,597。导出页用户确认后写入 MP4，Host receipt `4606be49-ef80-4cb1-9599-cd3acee476e7` 为 `file-written`；导出文件与 Host SHA256 一致：`d599893a3cd04f49da021708596d93be82170c3ee98d335052e4bd4faaec5bc6`，ffprobe 为 H.264 640×360/30fps + AAC 48kHz stereo、6秒，FFmpeg mean/max `-24.1/-19.2 dB`。Issues 页确认无未处理问题，失败尝试和恢复历史保留。媒体、截图与运行身份归档在上述 `current-run-20261014-r2/`。 | 继续以当前构建执行 WIN-09 持续失败/独立成功/同名重试恢复；完成 DOC-011 的37个适用性指纹与92项required_tests复核，再运行完整 `pnpm run check`、`pnpm run acceptance:final:synthetic`，创建当前 EVD 并通过 `docs:complete` 关闭 P4；P4未关闭前不启动P5。 |
| 2026-10-14 / L7 WIN-09 当前构建失败持续与恢复 | 当前隔离构建正式 UI 新建项目 `59011f90-52b6-42b1-8e39-25c87aff5d2f`。导入78字节无效MP4后批次保留 `MEDIA_SOURCE_REQUIRED` 与重选来源动作；等待31秒后导入旁路PNG成功，旧失败仍显示且可重试；从“仅重试失败项”选择同名1,511,738字节有效H.264/AAC MP4，登记为视频，原失败关联转入已处理历史，最终Issues页面显示无未处理问题。输入SHA256及完整UI/网络轨迹见 `docs/evidence/assets/p4-ux/current-run-20261014-r2/WIN-09/WIN-09-current-build-r2.receipt.json` 与同目录 `playwright-traces/`；当前build/runtime身份与WIN-10相同。项目初始化时额外观察到 `project.creation.ui.save` 的 `CREATION_UI_STALE`：工作台随后显示“输入已保存”，新项目从未填写待保存内容；已在UI标记已处理但保留错误历史，记为初始化并发事件，不归入媒体恢复链路。 | 完成 DOC-011 的37个适用性指纹与92项required_tests复核；保留退休Stage2真实命令及其活动债务；`docs:check`通过后运行完整 `pnpm run check`、`pnpm run acceptance:final:synthetic` 与交互收据校验，创建当前EVD并通过 `docs:complete` 关闭P4。 |

| 2026-10-14 / L7 DOC-011 当前命令复核与测试入口修正 | 沿用本机既有清单重跑 Basic Vlog、Foundation real、Intelligence pipeline，三项当前结果均通过并保存于 `docs/evidence/assets/doc-011/current-rerun-20261014/real/attempt2-*.log`。去重命令复核到53/86时，`stage2-product-workspace:real`按预期以`STAGE2_DESKTOP_REVIEW_RETIRED`失败并保留债务；另发现`stage2-workspace-renderer:test`仍按旧DOM子节点位置取导出按钮，实际按钮已嵌入`layout/form`，故测试未触发提交。为使正式导出身份断言继续覆盖真实入口，先在活动P4 manifest中登记`tests/property/stage2-workspace.test.mjs`，再修正测试桩的多类名CSS匹配和按钮选择器；该文件也属于可靠导入工作包的现有范围。修复后`pnpm run stage2-workspace-renderer:test`及`pnpm run stage2:check`通过。Electron fixture 原按旧文本“关闭导出”查找专用页面按钮，现改用真实`.export-dismiss`控件并断言页面标签“返回创作”；Renderer同时将导出页焦点交由导出surface自身管理，避免路由焦点微任务抢回焦点。修复后`pnpm run stage3:desktop-workspace:test`退出0（完整脱敏日志见`docs/evidence/assets/doc-011/current-rerun-20261014/commands-r1/attempt2-stage3-desktop-workspace-test.log`）。 | 重新捕获完整`pnpm run stage3:check`并确认成功，再续跑DOC-011命令并补齐这些共享测试路径影响的所有scope required_tests。 |

| 2026-10-14 / L7 收尾源码与运行构建身份复核 | DOC-011 的89项去重测试命令已执行，88项退出0；旧Stage2真实入口明确拒绝并保留活动债务。`docs:sync`、同步后的`docs:check`已通过；全量`pnpm run check`正在Stage3检查序列执行。正式关闭审查发现WIN-09/WIN-10 R2记录的`code_fingerprint`为`8414546d…`，而完成导出焦点修正后的当前源码为`30d4731e…`；R2交互仍是有效历史，不绑定最终源码，不能用于关闭P4。 | 等全量检查结束并跑`acceptance:final:synthetic`；按Docker Desktop文档用`node scripts/docker/build-reliable.mjs`重建两服务，不清除或替换项目/模型/profile数据，再以`docker compose up -d --no-build --wait`启动；捕获新隔离构建身份并重跑WIN-09/WIN-10，生成真实交互记录/收据后创建P4 EVD、校验并正式关闭。 |

| 2026-10-15 / L7 R3 当前构建交互与 DOC-011 收尾 | 当前源码指纹 `30d4731e157742f8a1c7c0d004ac044dc7609b0f622c699d826ae1a62b49adae`、build-input `c558d1edffc7a549d76586bff3549a4dc65367cd0f55e67133ec5f1916a3c398`。正式界面 WIN-09 验证 `MEDIA_SOURCE_REQUIRED` 在等待及无关导入后仍可查，以同名有效 H.264/AAC 源重试成功并保留恢复历史；WIN-10 使用真实 Qwen 请求生成 v1，Preview/Master QC 通过，播放器完整播放并 seek，导出 Host `file-written` 与下载文件 SHA-256 一致，关闭后重开仍恢复 v1 和导出历史。`interaction-acceptance` 对两个步骤的当前构建记录通过；导出为6秒 H.264/AAC、640×360、30fps、657,113字节，SHA-256 `d599893a3cd04f49da021708596d93be82170c3ee98d335052e4bd4faaec5bc6`。录制仅捕获屏幕，未声称人工听感或美学接受。DOC-011索引后 `docs:sync`、`docs:check`、固定Python 3.12.14/Pillow 12.3.0 下完整 `pnpm run check` 及 `pnpm run acceptance:final:synthetic` 均有成功日志；默认 Python 的一次检查因 Pillow 版本不符失败，原始失败已保留。为回填 DOC-011 已明确延期的 post-index 结果，先记录这项独立文档收尾理由，再在活动P4 manifest中明列DOC-011计划、Evidence和日志路径；不改写适用性判断、历史记录或Stage2真人债务。P4 EVD已登记、矩阵引用已更新，`docs:complete` 退出0，完成后 `docs:sync` 与 `docs:check` 退出0。 | 登记并启动依赖P4的P5，按WIN-01–10与C1–C9完成同一当前构建验收；P5未完成前不报告Stage Exit或Release。 |

| 2026-10-15 / P5 起始与 DOC-011 当前发现 | 已运行 `pnpm docs:start -- WP-S3-RELIABLE-ACCEPTANCE-001`；保留的起始 dirty baseline 为 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-start-dirty-baseline.txt`。当前桌面与Whisper服务均 healthy，image IDs 分别为 `sha256:df69a9c24ba3f3207b565a63adcf5cec1e08a923945d0eee10d77d5a2b20eb0b`、`sha256:2a6c53ddf1513f1cd2d1a3b81b56a0a57cd4e1124b0ee5ac32c67725d27a422b`，build-input digest 与P4 R3相同。首轮 `docs:check` 退出1，12项均为已变更README/P4包文档关联的适用性指纹；失败日志SHA-256 `F14171672661848F8031C7FF83CA323571AE2C63BC20EE6F8D4A1EA226740B04`。P5交互步骤当前均未运行；无源文件或服务被重启/替换。 | 先完成 DOC-011 受影响 scope 的 required-tests 复核与 index-only 证据；随后在该双服务构建、隔离项目/档案上执行 WIN-01–10/C1–C9，保存连续交互、声音、Host 状态和导出证据。 |

| 2026-10-15 / P5 隔离运行面 | 为避免触碰用户/P4数据，启动 `ave-p5-current-20261015` 独立双服务运行面（127.0.0.1:6081），固定桌面与Whisper image IDs及 `c558d1ed…` build-input；P5 profile、projects、uploads、exports使用新隔离卷，原模型配置只由本机 `.env` 供测试容器按产品启动脚本加载，Whisper模型缓存复制到新的可写测试卷（原卷只读且未修改）。内容树SHA256/大小一致见 `p5-whisper-cache-copy-verification.log`（SHA-256 `28EEB98A4A289FB36A6A51C851CADE3C54414CF854DC354947465DF7481B7421`）；四容器运行身份见 `p5-runtime-identities-20261015.json`（SHA-256 `56DC4DCF924F010557ED4801DA16B86D7630B9A2897006582962C9490573D1E5`）。在 P5 空库中新建了隔离空作品；未导入素材、未执行模型调用，WIN-01–10/C1–C9交互仍未开始。 | 先完成 DOC-011 required tests 和索引复核；之后从新空作品开始连续录制，再按正式界面执行完整 WIN-01–10/C1–C9。 |

每完成一个单元在此添加一行：变更入口、OP编号、实际命令/结果、新EVD、失败根因/阻塞与下一动作；没有跑过的检查明确写未运行。

## Artifacts and Notes

历史接受和失败事实从 [Evidence导航](../evidence/README.md) 与 Stage3 programme 的 evidence_ids 查阅；P3正式关闭见 [EVD-20261009-S3-RELIABLE-JOURNEY-FORMAL-CLOSEOUT](../evidence/runs/EVD-20261009-S3-RELIABLE-JOURNEY-FORMAL-CLOSEOUT.md)。既有P4加载修复见 [EVD-20261012-S3-P4-UX-LOAD-FIX-R1](../evidence/runs/EVD-20261012-S3-P4-UX-LOAD-FIX-R1.md)，仅证明其记录范围。本次文档整理由 [DOC-010](2026-10-12-p4-executable-documentation.md)记录，不替代这些产品Evidence。

## Outcomes & Retrospective

当前 P4 因正式 UI 与唯一 demo 参照不一致而重新打开；本轮实现与必要自检已记录，等待父任务安排独立审核和当前构建验收。旧 R3 通过结论仅适用于其记录的源码和构建，不能覆盖本轮修改。P4 当前保持 active，P5 pending，矩阵回到 pending 复验状态；没有新增人工签收门槛。

## 2026-10-14 delegated P4 implementation reopening

User-authorized Windows implementation review found the current renderer still uses a navigation rail, separate conversation column and bottom dock instead of the sole demo reference. Reopen P4 for OP-01/05/16/17/24 and complete the nine-page layout around existing real operations. P5 is pending while its dependency is repaired. Existing R3 Evidence remains historical and is not reused to claim this modified source passed. Baseline: LAPTOP-59PJIFQS, branch codex/p4-stage-start-20261009, HEAD b600b38f2afe280f0152c1811e6b2d928e5e3a95; pre-existing dirty files and exact edited-file backups recorded under the local temporary ave-p4-implementation-baseline-20261014 directory. No .agents directory exists. Runtime and tests stay within the existing P4 allowed paths. This phase performs targeted self-checks; independent review and full current-build acceptance are delegated by the parent after implementation.

## 2026-10-15 implementation handoff checkpoint

本轮完成九页统一导航/布局、全局气泡与唯一 composer、独立批注编辑对话框和队列、历史消息/任务状态/重试与草稿保护、当前片段范围、素材分类与资源标签及属性栏显示修复。沿用现有 Host、Timeline、渲染、导出、回收站功能链，不重写 24 项底层操作。

针对性结果、每个 OP 的复用/变更/待复验范围、实际命令与环境限制、源码身份、修改文件与审核入口见 [本轮实现交接 Evidence](../evidence/runs/EVD-20261015-S3-P4-UX-IMPLEMENTATION-HANDOFF.md)。截图全部为受控 UI fixture，不是外部模型或真实媒体接受证据；本轮没有重新构建部署，不复用历史 R3 镜像。当前阶段停在 L6 实现与必要自检之后，L7 的独立工程/交互复核及 GATE 的当前证据重绑定由父任务继续；P5 WIN-01–10/C1–C9 没有在本轮运行。

下一动作：独立 reviewer 先阅读该 Evidence 与 source-identity.json，审核 scope→annotation 语义、跨页焦点/输入、失败恢复、播放器与资源目录，再执行列出的 required tests 与当前构建交互。只有新的有效 Evidence 满足包门禁后才运行 docs:complete；本轮不调用该命令。开始时保存在沙箱临时目录的基线副本在后续工具调用中未能重新定位，不能作为可交付基线；交接文件明确列出本轮触碰路径，既有 Git dirty 状态整体保留。

收尾实际结果：Electron DOM 7/7、annotation queue 4/4、Host annotation、协议辅助、stage2 workspace、TypeScript、architecture、renderer boundary 通过；docs:sync exit 0，docs:check 本机 exit 1（31 项 evidence applicability，详见交接日志）。最终源码指纹 `1eeeff98739b426976a8bf4f1ce65e35492aa42f75ebca74c629b81cb829488f`；没有当前构建交互或完整 required-tests 结果，因此 P4 不完成。

## 2026-10-14 independent review checkpoint

Independent review Evidence `EVD-20261014-S3-P4-UX-INDEPENDENT-REVIEW` is blocked, not an acceptance. The 14 implementation handoff source-file hashes match the current checkout. Direct Node checks passed for the workbench DOM suite (7/7), annotation queue (4/4), P4 integration (10/10), annotation protocol, timeline-command properties, recycle-bin, TypeScript, contracts, architecture, Renderer boundary, and build identity. Recycle-bin passed with a permitted `TEMP`/`TMP` path; its default-sandbox attempt failed on an environment EPERM.

The Host annotation test cannot reach its project operation because the sandbox denies immutable-original hard links. `docs:check` reports 31 applicability mismatches and three repository-root `realpath` EPERMs; none were relabeled or fingerprinted away. P4 has no new production build, live UI screenshot, real-media annotation round trip, WIN-09/WIN-10 receipt, or full P4 suite result. The current browser launcher is unavailable, Docker Engine access is denied, and 127.0.0.1:6081 is not serving the isolated P5 build. P5 WIN-01–10 and C1–C9 remain not-run. P4 is marked blocked and P5 stays pending; do not run `docs:complete`. Next action: resume P4 current-build UI and real-media acceptance in an authorized Windows environment with Electron, Docker, and immutable-original support, then proceed to the dependent P5 run.

## 2026-10-15 superseding execution target (DOC-012)

The prior independent-review checkpoint's next-action sentence called for an authorized run with Electron, Docker, and immutable-original support. That sentence is historical to its checkpoint and is superseded for this task by the user's confirmed deployment scope: the Compose Browser at `http://127.0.0.1:6080/`. Do not launch Electron for this P4 closeout or treat the earlier Electron-only Preview failure as a verified Browser defect. The remaining P4 UI gate is current-build automated Browser interaction for WIN-09/WIN-10, plus the package's other still-open required evidence. Browser health/source routing does not satisfy that UI gate. P5 remains pending and P4 remains open.

The proposed move of detailed creation permissions into global settings is an unresolved product choice, not an approved change. See the DOC-012 follow-up Evidence and the current P4 package clarification.
## 2026-10-20 current Compose Browser P4 revalidation

The user authorized WIN-09/WIN-10 acceptance and necessary repairs on
`codex/p4-stage-start-20261009` at `99aeecee096a9424eb1df465f5546b297b90b0b9`.
This phase does not push changes, merge main, start P5, or start WP-XFORM-002.
The first unfinished unit is GATE/L7: current-build Browser interaction and
required affected engineering/evidence verification. Earlier checked units
and the historical R3 closure do not prove this build passed.

Activation prerequisite: P4 is blocked with no active package; its three
engineering dependencies remain completed. Reopen only P4 to ready, then run
`pnpm docs:start -- WP-S3-RELIABLE-UX-001`. Existing debt remains until its
actual blocker is resolved. No capability or acceptance status is promoted.

Initial local state: the saved branch has one retained local plan-hostname
difference and 1480 excluded untracked artifacts. Preserve these, user media,
configuration, project data and unrelated services. Baseline inventories and
hashes are retained in the local temporary phase directory. Both existing
AVE Compose containers are stopped; other project services are running.
Use isolated test-owned projects/volumes at the Browser acceptance entry.
Source/build identity must be checked before interpreting interactions.

Scope extension before capture: `output/playwright/p4-20261020/**` stores this
phase's isolated CLI browser configuration, screenshots and traces per the
Playwright skill. Public evidence remains in the package-owned evidence
locations; no private material or credentials enter portable records.
No specific external-model/data/fee authorization has yet been established
for this run; configured credentials alone do not authorize calls. Continue
local-only checks and report any unexercised model-dependent boundaries.

### Current-run repair: original asset count

The real Browser recovery run imported two distinct assets but the project card displayed three materials after a duplicate upload. The media gallery already deduplicates original locations by asset_id. Within the active renderer allowed path, the project card now uses that same distinct-asset semantics. This changes display only; it does not mutate Host records. Rebuild and actual duplicate/reopen Browser verification are required before calling this repair verified.

### 2026-10-20 checkpoint: partial Browser evidence, P4 blocked

[EVD-20261020-S3-P4-UX-BROWSER-PARTIAL](../evidence/runs/EVD-20261020-S3-P4-UX-BROWSER-PARTIAL.md) records actual import failure persistence, unrelated-success retention, failed-only recovery, close/reopen, multi-page multiline draft preservation, partial layout/reduced motion, the distinct-asset count repair and rebuilt-image regression. Current repaired image is `sha256:8d937f9ed613ee1f0743cd0f41fad86896d4437cd50dc459679ac25512e1e75a`; 910 source and 747 output hashes match, with no extra source paths. Initial engineering ledger: 14/15 commands passed; pinned-container retry of the sole Pillow dependency failure passed; post-fix renderer/typecheck/architecture passed. The aggregate P4 command invoked its existing Electron fixture harness, recorded as an execution-scope deviation, never Browser acceptance.

Full WIN-10 and remaining populated-timeline/annotation/version/export OPs require an authorized provider/data scope; no external inference was made. Do not close P4 or start P5. Next action: establish that specific scope, resume the full Browser journey on one current source identity, and reconcile only evidence-backed applicability entries. The task-owned Browser recording was finalized; temporary service cleanup retains all test volumes and source evidence.

Final run gates: `docs:sync` exit 0; `docs:check` exit 1 with 36 Evidence applicability findings and one latest Stage3 Evidence fingerprint mismatch (37 total; three more than the starting baseline after the renderer repair); `check` exit 1 at that same documentation gate, so its downstream sequence was not run as a full suite. The independently executed check ledger remains valid within its stated scope. Automatic docs sync updated programme current-source fingerprints and generated debt/validation views; historical Evidence fingerprints and applicability entries were not changed. Final inventory confirms all 1480 initial excluded files unchanged and no missing originals. Task-owned Browser and Compose services are stopped with test volumes retained; original AVE services remain stopped. Branch/HEAD/upstream unchanged; no staged changes, commit, push, PR or merge in this phase.

### 2026-10-20 follow-up: authorization scope and independent gate work

The parent requested a precise non-secret external-call authorization proposal and independent gate work without restarting the full suite or services. The P4 allowed paths now include `README.md` because the actual `docs:architecture:test` failure is its missing generated-current-status navigation link (docs-governance assertion). Repair is limited to that navigation link; no product scope or acceptance assertion changes. New follow-up evidence records this result; the earlier partial-run Evidence remains immutable. External calls remain zero.

### Superseding 2026-10-20 governance correction

The user explicitly directed current approved design to govern acceptance, and allowed correcting stale gates themselves without changing historical Evidence or faking tests. The earlier follow-up manifest-only dependency grouping is diagnostic, not a mandate to rerun retired designs. Necessary P4 scope extensions: `scripts/docs/check.mjs`, `scripts/docs/complete-work.mjs`, and new `scripts/docs/evidence-applicability.mjs` separate a documented historical applicability debt from current completion; `tests/architecture/docs-fingerprint.test.mjs` covers fail-closed classification and completion; `docs/04-engineering/AGENT_EXECUTION_RULES.md` records the current gate meaning; the other two programme STATE files register exact affected historical scopes without advancing their work. Existing fingerprints/index/Evidence remain unchanged. No product rollback, acceptance promotion, Stage2 debt removal or P5 work is authorized by this correction.


### 2026-10-20 follow-up outcome and corrected causality

[EVD-20261020-S3-P4-UX-AUTHORIZATION-GATES](../evidence/runs/EVD-20261020-S3-P4-UX-AUTHORIZATION-GATES.md) supersedes the causal assertion in the earlier checkpoint: the three Docker/Web/clean mismatches do not include workbench.js, and remain when this run's workbench/README edits are virtually restored to HEAD. DOC-012's dated count was not a fresh baseline; attributing +3 to the renderer repair was incorrect. Historical Evidence is preserved with this correction linked separately.

A: removed the obsolete Electron aggregate as the mandatory current Browser engineering entry, and separated document consistency from explicitly documented historical applicability debt. B: current Browser OP/WIN journey and historical capability revalidation remain unverified. C: the real material-count and README-link defects are repaired, with actual checks; hash differences alone are not product failures. The governance change itself affects CAP-S3-RELIABLE-BASELINE-001, so the exact current classification has 37 unverified scopes (3 editing, 14 creative-v1, 20 Stage3). No old index/evidence hash was refreshed.

Follow-up local ledgers: initial 11 passes plus a README assertion failure repaired and rechecked; six focused tests passed. Post-governance fingerprint/docs architecture/architecture/interaction tests passed, including fail-closed and zero-write completion negatives. The first interaction test hit sandbox temporary-Git write permissions; approved retry passed. docs:sync and default docs:check pass with 37 explicit UNVERIFIED warnings. Strict evidence mode still fails those same 37; full check was not repeated. This is documentation consistency only, not P4 acceptance. The latest Stage3 Evidence now truthfully points to the current blocked supplement.

All 1480 excluded originals remain byte-identical; HEAD/upstream unchanged and no staging, commit, push, service restart, external inference or P5. Next: establish the concrete synthetic-only DashScope authorization and enforceable price/sample/budget bounds in the linked checklist, then execute outstanding Browser operations on one bound build. Do not convert a historical manifest command list into a current-design rollback requirement.


### 2026-10-20 09:20 authorization continuation: CNY 5 ceiling

The user confirmed DashScope qwen3-vl-plus and qwen3.7-max-2026-05-20 for the existing synthetic-only Browser acceptance, subject to a strict total CNY 5 ceiling established before any API call. Existing credentials may be used only by the original authentication mechanism, never printed or persisted elsewhere. Reopened the blocked P4 package to pending solely to start this authorized preflight through docs:start. Prior successful unaffected checks are reused. No governance redesign, new product features, original-service restart, P5, commit or push. Existing allowed evidence/output paths cover non-secret configuration, pricing and offline sample-count records. Actual non-secret original configuration matches the authorized provider, models and DashScope endpoint; the isolated test configuration still uses dummy loopback endpoints. No API inference has been sent.


Paid preflight outcome: [EVD-20261020-S3-P4-UX-PAID-PREFLIGHT](../evidence/runs/EVD-20261020-S3-P4-UX-PAID-PREFLIGHT.md). Actual provider/model/domain match; official Beijing prices verified; exact Worker scans plus Host sampler select six frames (three per 640x360 synthetic video). Current vision lacks explicit output cap; planner input costs and cumulative revision/retry costs have no verified pre-send CNY limit. The user explicitly required no call without a guaranteed CNY 5 ceiling, so execution stopped before any model request. Actual paid sends 0, API cost CNY 0; complete-journey upper bound unavailable. No product code, credentials, original services, previous tests or acceptance statuses were altered. P4 returned to blocked with updated existing debt. Next prerequisite: verified per-physical-send worst-case cost reservation/refusal or equivalent provider hard cap, then the authorized current Browser journey; no duplicate authorization request is needed.


### 2026-10-20 scoped budget harness continuation

The parent relayed explicit authorization to resolve the recoverable CNY 5 blocker with a minimal isolated acceptance harness. No product billing feature or provider/model change. The existing allowed docs/evidence/assets/p4-ux/** path owns a temporary Node fetch wrapper, offline negative tests, non-secret durable reservations and source/config identity records; output/playwright/p4-20261020/** owns new Browser artifacts. The wrapper runs inside the existing Host process, before its original fetch; credentials and destination are unchanged, with no proxy or new credential recipient. An ephemeral tmpfs config applies explicit output limits through the existing config contract; original configuration remains read-only. Exact sample allowlist, conservative input bounds, reasoning-inclusive reservation and shared cumulative cap must pass offline tests before any send. Unknown outcomes retain reservation and duplicate-wire blind retry is denied. No API call before that validation.

### 2026-10-20 paid Browser provenance regression (in progress)

Actual v1 contained source evidence sidecars. Browser projection omits them; deleting the second clip through restore_track produced v2/v4 with the unchanged first clip provenance lost. A later actual annotation planner response was rejected as CREATION_LAYOUT_REBOUND. Before editing, project-host.ts and stage3-manual-draft-host.test.ts were clean; other existing dirty files are retained. Both files are already in P4 allowed paths. Narrow repair: Host retains its own omitted sidecar only for the same existing track/clip and exact source range, through the ordinary prepare/commit path. Add an actual Browser projection regression and source-change negative assertion. No new paid retry, billing feature, or acceptance promotion. Current 9 sends reserve CNY 3.740346/5.

The proposed Host command hydration was rejected by CREATION_MANUAL_EXECUTION_REBOUND in the real storage regression and removed before delivery: exact input/IR binding must remain. The narrower final candidate changes creation.handlers.ts (previously clean, already allowed) to project only semantic_id/labels/evidence_refs, without arbitrary metadata. The actual Browser projection -> delete -> commit -> reopen regression checks retained evidence and metadata exclusion; no storage/commit contract is relaxed.

### 2026-10-20 bounded paid Browser checkpoint

See [new immutable Evidence](../evidence/runs/EVD-20261020-S3-P4-UX-PAID-BROWSER.md). Nine calls all HTTP 200, nonrefundable worst-case reservation CNY 3.740346 under 5. v1 static blue correctly failed freeze QC; actual precision delete/undo/redo reached v4, QC passed, real MP4 downloaded/decoded/hash-matched, close/reopen preserved v4 and failed annotation. Annotation failed after response because whole-track Browser edit lost evidence refs. Final minimal projection allowlist fix and actual Host/reopen regression pass, as do typecheck/architecture/web:host:test. Host-hydration candidate removed after exact receipt guard rejected it. No new image or paid annotation retry; do not call the repaired Browser flow accepted. 24 changed historical scopes stay UNVERIFIED under explicit updated debt classification. P4 blocked/P5 pending. Next action: rebuild and verify source-evidence preservation, then a fully budgeted annotation journey and remaining OP/WIN checks. All test services stopped; originals/exclusions retained; no commit or push.

### 2026-10-20 isolated rebuild continuation

Parent explicitly continued free isolated Browser rebuild and local verification, then exact remaining-budget feasibility without refunds or automatic retry, plus v4 Library attachment. Existing dirty state was recorded; no new product scope. docs:start rejects blocked, so the source package is returned to ready solely to start this authorized verification; its acceptance debt remains active. Reuse test volumes only, preserve all original services/volumes and the 9-call ledger. Rebuild under a new isolated tag, run without external model credentials/egress for free verification, and restore a historical source-bearing draft through normal UI before exercising the fixed projection. Do not silently migrate stored provenance.

### 2026-10-20 rebuilt Web results

[New Evidence](../evidence/runs/EVD-20261020-S3-P4-UX-REBUILT-WEB.md): isolated image e757ad48 rebuilt; 910 source/747 output hashes match. Actual Browser Undo restored source-bearing v5, Delete committed v6 with evidence refs preserved, Preview/Master passed, refresh/close/reopen retained v6. Same old model measurement rejects old context but passes actual v6 offline. No new paid sends: first round is measure-only and final requires its receipt; automatic retry was already disabled. Unchanged nine-call ledger reserves 3.740346/5, remaining1.259654. At current caps two rounds reserve3.499776, requiring2.240122 extra ceiling(total7.240122); no cap raised. v4 saved to Library with returned identity; Windows local xattr helper unavailable, upload succeeded. No product code changed this continuation. P4 remains blocked only for remaining real annotation/full OP/WIN acceptance and other recorded defects; next paid attempt must satisfy whole-run budget. No P5/commit/push.


### P4 resumption checkpoint (2026-10-22)

The authorized continuation resumes `WP-S3-RELIABLE-UX-001` from `blocked` without advancing P5. Preflight reread the current repository instructions, package, plan, current state, and active manifest; recorded the pre-existing dirty worktree before any edits; confirmed the Oct 20 isolated synthetic project and Browser build evidence, the real paid-call ledger, and the exact required test list. Ledger reservations total CNY 3.740346 across nine provider calls; the user raised the cumulative ceiling to CNY 8.000000, so the harness ceiling and offline assertions must be updated before any external call. Current Docker CLI access to its Linux engine is denied and host 6081 currently accepts no TCP connection; recheck an actual bind and request access only through the managed approval path before attempting the isolated runtime. Next: update the budget guard/evidence and start the package through `pnpm docs:start`; run offline budget/unit checks, then attempt the existing isolated workflow only if the approved Docker path is available. Preserve prior failed annotation evidence, all source media, project state, and unrelated dirty files.


The live Browser opened the already-existing synthetic project at Timeline v6 and verified its two authorized source assets. It surfaced the retained v4 failed grayscale annotation. The UI recovery control refused to reopen it with “local annotation differs” although the persisted queue and bound submission contain the same annotation values; the canonical SQLite JSON changes object-key order, while the renderer compares `JSON.stringify` output. No model request was sent. Repair the equality check in the existing annotation queue helper and its P4 renderer callers using order-independent JSON structure comparison, add a focused regression test, rebuild the isolated Browser image, then recheck recovery before paid calls.


### P4 checkpoint (2026-10-22)

Fixed the canonical-JSON key-order false mismatch in `timeline-annotation-queue.js` and the failed-task recovery caller. The focused regression (5/5), `renderer:workbench:test`, `typecheck`, and offline CNY 8 budget-guard check passed; a Browser image rebuilt to `sha256:1ca0291e91b023a16c919c4b2a8bdfab9a313548c767dd36158f70ea1a4a63df`. On the actual v6 Browser, the recovery action passed the fixed comparison but the existing v4 request was denied by the Host because its in-app grant expired at `2026-10-21T17:41`. No fresh request was submitted and no model API call was made. The ledger is unchanged: 9 reserved calls / 18 records, CNY 3.740346 retained, CNY 4.259654 available under the authorized CNY 8 cumulative ceiling. The attempted unsent-draft fill in the isolated paid Compose runtime was denied by automatic approval review after the user's instruction to use an existing local development environment; no retry or indirect alternative was attempted. See [EVD-20261022-S3-P4-UX-ANNOTATION-REOPEN](../evidence/runs/EVD-20261022-S3-P4-UX-ANNOTATION-REOPEN.md).

P4 remains blocked. Resume only against an existing AVE local Browser runtime on a non-conflicting port with a fresh in-app grant, then complete the two authorized real model rounds, timeline mutation, Preview/Master render and QC, export, failure/retry, undo/redo, reopen, and remaining OP/WIN coverage within the cumulative cap. Port 6080 is occupied by WeChat and must not be disturbed. Do not start another isolated deployment, enter P5, or claim completion from the focused repair. The already-running isolated verification remains intact pending the user's next direction.

#### 2026-10-22 actual request diagnosis

The live saved failure `request:b012bb1c-48a6-4aa0-b54c-6a3f95715d3f` is not an annotation attempt: its planner returned a 2.5-second target (75 ticks) while retaining the bound 3-second v6 whole-work layout (90 ticks), so `CREATION_LAYOUT_REBOUND` correctly rejected it before any draft committed. Do not retry it. The earlier v4 grayscale annotation remains in request `request:b4b635c9-3484-4ade-9dbc-aae9679a6bf8`; its anchor maps uniquely to `shot_1` in v6, but the v6 player preview is not loaded. Reopening the failed message requires Host supersede, which is currently blocked by b4's expired grant; b012's fresh grant cannot be transferred. The seven new calls reserve CNY 1.366338, bringing cumulative reserve to CNY 5.106684 / 8.000000; CNY 2.893316 remains. No further model call or permission bypass is authorized. Continue only through a supported fresh authorization bound to the existing annotation request, or after the user decides on a compliant alternative within budget. See the EVD-20261022 addendum.


### P4 same-request reauthorization continuation (2026-10-22)

See [EVD-20261022-S3-P4-UX-REAUTH-BLOCKED](../evidence/runs/EVD-20261022-S3-P4-UX-REAUTH-BLOCKED.md). Implemented append-only same-request authorization renewal and historical receipt reads through the normal contract, Project Host, storage, and desktop confirmation path. Host and manual-draft integration coverage, typecheck, contract validation, renderer boundary, annotation queue regression, and the offline CNY 12 guard passed. The managed existing 6081 Browser stack was rebuilt in place, and the actual renewed project reopened at v6 with its two synthetic assets and real preview loaded. No new provider calls; ledger remains 16 reserved calls / 32 records, CNY 5.106684 reserved of the cumulative CNY 12 ceiling.

The remaining v4 failed-annotation editor is locked. Both visible recovery controls share a handler that first sends a Host `annotation.supersede` mutation and then restores the old annotation draft. The user had explicitly forbidden the failed-task recovery write and any API/database substitute. Automatic review rejected the separate “重新打开编辑” UI action as potentially performing that same prohibited supersede write; it did not execute. Do not retry either recovery control or route around Host. P4 remains blocked until a compliant product-approved continuation can unlock the existing request; do not use another request's grant, enter P5, or claim real model/timeline/render/QC/export completion.


#### 2026-10-22 explicitly authorized recovery attempt

The user then explicitly approved the exact UI action to reopen editing on the original request. One click was performed in the existing 6081 Browser. The product guard stopped before the Host `project.creation.annotation.supersede` command because a separate unsent overall requirement was present in the composer. The task remains failed; no supersede, draft restoration, or provider call occurred. The composer contains an appended clip-reference phrase from the earlier UI reference action and is disabled while recovery is locked; it was not submitted or cleared. The ledger remains CNY 5.106684 reserved of CNY 12. The current blocker is this unsent-composer guard; resume only when the draft can be safely removed through an enabled product UI control without losing the historical annotation. See the addendum in [EVD-20261022-S3-P4-UX-REAUTH-BLOCKED](../evidence/runs/EVD-20261022-S3-P4-UX-REAUTH-BLOCKED.md).

#### 2026-10-22 recovered annotation and reauthorization material failure

The renderer guard is now corrected to retain the existing composer text while restoring the old comment. The explicitly authorized “重新打开编辑” action succeeded in the existing 6081 UI: Host superseded the old failed operation, retained its history, and restored the comment into an editable queue. The text was read and traced to the original v4 requirement plus the previously-added v6 clip reference; it was preserved. The first normal UI submission was attempted once and failed before any model call with `CREATION_MATERIAL_AUTHORIZATION_REBOUND`. The local ledger remains 16 reservations / CNY 5.106684; no provider request or new reservation occurred. Host workspace evidence shows the same request has one saved observation with six samples across its two authorized source assets, while the user-requested grayscale edit targets the retained three-second clip. Next, fix the generation-specific material receipt binding so a renewed authorization can prepare a new receipt without reusing stale-generation material; add a Host/storage regression, then retry the annotation only through the normal UI after rechecking the budget. `tests/integration/stage3-material-host.test.ts` is added to the package's allowed paths for this exact storage-boundary regression. Do not raise the 12-call vision or 6-call planner limits, discard composer text, submit the old failed operation as a retry, or enter P5.

#### 2026-10-22 authorized retry after material binding fix

The existing Desktop and Whisper services were healthy on 6081 and the actual Browser reopened the same v6 project. The normal UI `重试此任务` control for the saved `CREATION_MATERIAL_AUTHORIZATION_REBOUND` operation was clicked once after explicit authorization. It still returned the same error; the provider ledger remained 16 reservations / CNY 5.106684 (12 vision, 4 planner), so no model call or reservation occurred. Stop retries and inspect the persisted Host diagnostic before any further attempt. The two real annotation rounds and timeline/Preview/Master/QC/undo/redo/reopen/export checks remain incomplete; P4 remains blocked. See the EVD addendum.

#### 2026-10-22 persisted response diagnosis and guard

The authorized retry passed material authorization and renderer recovery, then failed at Host commit with `EDIT_INTENT_INVALID`. The saved planner response has one shot with `color: null` despite the explicit grayscale request; Host builds the other required intent fields itself, leaving an empty compiled edit as the failing condition. Added a grayscale goal assertion to reject this response as `CREATION_COLOR_GOAL_UNMET` before commit. Replayed the actual persisted revision and shot-color field through the new guard in memory; the saved response is rejected, unchanged. Focused feedback-goal property test passed. The guard is not yet deployed; no further model calls, timeline writes, or export checks occurred. The 18-entry ledger has no pending response, retains CNY 7.519752 in upper-bound reservations, and estimates CNY 1.773868 from recorded usage and price rates. Two successful generations would need at least four planner calls if existing observations are reusable, with a further upper-bound reserve of CNY 4.826136; total retained reserve would exceed the CNY 12 limit, and any new visual observations would exceed the already-full 12-call cap. Await the user's decision before changing caps. P4 remains blocked.


#### 2026-10-22 authorized budget continuation blocked by local runtime access

The cumulative API ceiling is now user-authorized at CNY 13 with a 10-call planner cap; vision remains capped at 12 with no new calls. Source inspection confirms current revisions and `timeline_annotation_batch` are placed in the Host model request. The actual stored request and running 6081 UI could not be verified in this turn: the Docker Desktop named pipe returned `Access is denied`, and a direct local HTTP GET to 6081 failed. No permission change/escalation, deployment, restart, provider call or reservation was attempted. The existing grayscale guard has passed its focused property test and in-memory replay using the saved response fields, but this is not a real retry. Continue real acceptance only after the existing local runtime is accessible; P4 remains blocked.
#### 2026-10-22 live grayscale continuation

The actual model response confirms the corrected request now returns the
requested saturation-0 grayscale edit instead of omitting it. Host compilation
then rejects the plan with `CREATION_COLOR_CONTEXT_MISSING:shot_1`; the only
authorized 640x360 H.264 synthetic clip has no color metadata from which the
required `ColorContext` can be established. Preserve this guard rather than
assigning unverified source color facts. Focused feedback-goal test, base
TypeScript check, and `git diff --check` passed. The 6081 Desktop and Whisper
services were rebuilt in place and are healthy. The provider ledger is 44
entries, CNY 12.367836 retained reservations, 10/10 planner calls and 12/12
visual calls, with no pending or uncertain response; recorded token usage
prices to CNY 3.024484 (estimate, not an invoice). No further model call was
made. P4 remains blocked; two real successful model rounds and all resulting
timeline, Preview/Master, QC, export, undo/redo, and reopen checks remain
unverified. Do not enter P5, commit, or push.

### 2026-11-03 repair and integration continuation

User authorized current P4 repairs, integration commit, and an additional CNY 20 (cumulative ceiling CNY 33). Preserve existing worktree and ledger. No push/merge/release is included. Start package succeeded. Extend allowed paths to creation-plan.ts and its existing stage3-edit property test: compile strictly neutral grayscale through the registered grayscale effect without inventing source ColorContext, including consecutive edits and protection. Validate offline before paid Browser checks. Original 36 modified tracked files and untracked Evidence/output were inspected; historical acceptance and P5 remain separate.

Validation found an existing renewal regression test still matching the retired new-request-only error text. Add stage3-draft-storage.test.ts to allowed paths and assert the stable REQUEST_AUTHORIZATION_IMMUTABLE code; its unchanged-state assertion remains. Worker pixel checks require bundled Python/Pillow 12.3.0; default Python mismatch is not a product failure.

Second paid round failed before commit. Read-only persisted diagnostic proves Host sent target_duration_ticks const 180 while current output is 90 ticks: latest phrase 保持当前3秒时长 was not recognized, so the old six-second goal leaked into the new request. Add the existing stage3-source property test to allowed paths, recognize this explicit whole-work duration phrase, preserve local-shot exclusion, and verify before retry. This is a Host constraint bug, not model noncompliance.

Integration path audit adds the already-modified creation-confirmation.ts: it is the normal UI same-request renewal confirmation caller required by this repair. No other out-of-scope tracked paths were found.

Final bounded outcome: real UI retry now commits v8; both Preview/Master QC pass, downloaded v7/v8 are 3-second grayscale H.264/AAC outputs, measured audio change -6.0064 dB. Five new planner calls retain CNY 6.052776; total CNY 18.420612/33, no pending response. Full P4 OP/WIN and multi-shot local grayscale remain outside this verified slice, P5 not entered. Current evidence: EVD-20261103-S3-P4-UX-GRAYSCALE-INTEGRATION.

### 2026-11-03 scoped grayscale follow-up

User authorized pushing the existing integration, then continuing the known local grayscale defect; stop if human-only input is required and give concrete assistance steps. Pushed 995e29d to origin/codex/p4-stage-start-20261009. Resume P4 for this bounded repair (blocked -> pending -> docs:start); full OP/WIN and P5 remain independent. Tracked tree started clean; existing untracked artifacts are preserved. Reuse Host-validated v3 annotation resolutions and current Timeline identity for local color targets. Verify explicit first-shot text, selected-clip annotation, unchanged other shots, ambiguous/stale targets, wrong-model outputs and actual two-shot render. No new provider/data scope or monetary ceiling; remaining cumulative CNY33 budget only if a real paid verification is necessary.

Implementation follow-up: Host now binds grayscale scope after persisted v3 annotation verification, or resolves one explicit ordinal per positive action clause against the actually viewed current Timeline. Missing/stale/ambiguous/conflicting targets fail before model dispatch. Local application preserves all other executed content and validates simulation, not only the model color field. Preserve-existing-grayscale is separate and permits explicit audio adjustment. Regression review found and fixed mixed-clause target expansion, global/local exceptions and unrelated gain/geometry/caption edits. Controlled two-shot Host annotations reject all-shot output without a Timeline write, then retry succeeds; decoded Preview/Master channel spreads [0, 128.466064453125], reopen and preserve-gray/audio follow-up pass. Plain-text first-shot Host integration also passes.

Actual Browser continuation restored old v1 as new v9 (known static blue FREEZE_FRAME correctly blocked), restored dynamic v4 as v10, then split through the real timeline at frame45 into v11 (two 1.5-second clips). Preview/Master passed; original v8 remains historical. The initial ordinal send before actual playback was rejected for viewed/current mismatch with no paid call. Actual playback followed by a new revision establishes the binding. No manually edited project state or bypassed QC. The standard image rebuild hit a public YAMNet download disconnection; the recorded scoped Dockerfile uses the normal frozen install/codegen/build and reuses the exact prior runtime by digest, with both sound asset SHA-256 checks. Scoped image manifest list: bb0212b4b97ef0bc33b31d2e22b4a05c799d811b270c0daaa16f0eff79da153f. Paid result remains pending at this checkpoint.

User follow-up requests removal of obsolete checks without changing current functionality. Bounded cleanup first removes layout retention dependence on historical semantic_sidecar evidence_refs: currently authorized source identity/rational range, picture identity and placement already establish retention. Add tests/property/stage3-precision.test.ts to allowed paths before editing to prove old clips without these optional markers retain gaps/placement and unauthorized or changed sources remain rejected. Current playback-based ordinal scope is being reviewed separately; no blanket removal of data, transaction or authorization invariants.

User clarified repository-wide obsolete-check cleanup. Inventory covers apps/packages/scripts/tools/tests plus current programme command consumers. Confirmed retired Stage2 Desktop real entry is only an unconditional throw, still advertised in package and required-test lists despite removal of that UI. Remove that command and stub, its dedicated stub assertion, and obsolete current command references; retain existing historical Evidence and Stage2 real-media/complete-duration debt, without treating command removal as acceptance. Allowed paths above are expanded for the exact test, package, and current-authority consumers. Legacy persisted planning/annotation validation remains necessary to reopen old data, and current race/permission/media/transaction validation is not obsolete.

Additional current blockers share the retired span-ID dependency: independent audio retention and Skill-grounded audio removal. Current authorized same-asset exact source coverage can replace old provenance IDs; audio association, gains, fades, actual evidence and range checks remain. Add creative-skill-runtime.mjs and its property test before changing the latter.

Final follow-up: four obsolete-check cleanups and all focused generation/precision/source/Skill/Stage2-entry regressions pass. Real Browser same-revision retry on image 55260a70ae1f4fc5768767b18b8d4283a2b7e839e4b4540598abe750eea0162c commits v12; Preview/Master QC pass. Downloaded 3-second H.264/AAC has grayscale first 1.5-second shot and colored second shot (decoded RGB differences 0 and 493.3878732638889). Reload restores v12/export. Three follow-up planner calls reserve CNY3.629208; total CNY22.049820/33, zero pending. No human-only blocker. Whole P4 remains blocked only on outstanding full OP/WIN/current-build coverage; no P5, Stage Exit or Release claim. New bounded evidence: EVD-20261103-S3-P4-UX-SCOPED-GRAYSCALE. Next action is the remaining DOC-007 current Browser interaction coverage, not repeating removed retired checks.

### 2026-11-03 remaining P4 verification

User requested push then finish remaining P4 verification while preserving current functions/data and stop only for human-required assistance. Pushed b62655a to origin/codex/p4-stage-start-20261009. Tracked worktree started clean; historical untracked Evidence/output retained. Resume P4 via pending -> docs:start. Scope: current-build OP-01..24 coverage, WIN-09/10 Browser interaction records, required engineering checks and truthful build/receipt binding; no P5/Release promotion. Use separately named test-owned projects and synthetic sources; existing paid ceiling CNY33 and provider/data allowlist unchanged. Do not delete existing user projects or expand model scope.

Current full `pnpm check` exposed `CREATION_OBSERVATION_MODEL_REBOUND` when reading a historical observation after authorization revocation. Revocation increments the invalidation generation without creating a new grant; the historical reader incorrectly treated that increment as a renewal. Add the existing observation Host regression and this run's Playwright output path to P4 allowed paths before repair. Preserve immutable grant/run/ledger validation and all live revoked-request checks. WIN-09 on the pre-repair build recovered an invalid same-name upload after a successful unrelated import; its recording is bounded evidence and will need current-build revalidation after the source repair.

Focused real-media Host regression and independent read-only review passed. [Bounded checkpoint](../evidence/runs/EVD-20261103-S3-P4-UX-REVOCATION-HISTORY.md) retains the failed full-check cause and classifies affected historical scopes as UNVERIFIED; no capability is promoted. Continue full engineering and rebuilt Browser verification.

### 2026-11-03 verification handoff

[Current bounded Evidence](../evidence/runs/EVD-20261103-S3-P4-UX-VERIFICATION-HANDOFF.md): current-build WIN09 recovery completed; WIN10 reached actual paid v1/dual passed QC, mixed import, partial media/layout checks. Synthetic final acceptance passed. Full check stopped at the Electron fixture's initial `观看此版` lookup, with no current Browser failure inferred from that harness. Remaining OP operations, annotations, full versions/reopen/download and formal receipt are incomplete. Existing two projects' identities/Timeline counts and all four exports are preserved; a normal original-project UI save and three test-only projects are explicitly recorded.

Stop further verification at the user's human-assistance boundary: conservative retained CNY26.079624/33, planner21/22, vision24/24, no pending paid calls; current data allowlist remains two synthetic sources/six PNGs. Need clarification for bounded additional call counts within the same total ceiling and the newly generated synthetic PNG/WAV plus selected free-audio resource scope. Do not silently expand either limit. P4 marked blocked with active Debt; no completion/P5/Release claim. After clarification, repair the observed Electron fixture startup/navigation cause, then continue the actual current Browser OP/WIN and required checks. Latest repair remains local; requested b62655a was already pushed.

### 2026-11-03 authorized continuation

User now explicitly permits necessary additional call counts and new purely synthetic images/audio plus built-in free audio, keeping cumulative CNY33 as the hard maximum. Resume P4; preserve the existing dirty worktree, test projects, recordings, exports and shared volumes. Extend exact synthetic allowlists from measured local bytes and pinned library metadata; keep reservation-before-send, original providers/endpoints, no refunds and no personal profile. First fix the observed Electron fixture/navigation cause, then finish actual current Browser OP/WIN with engineering evidence. No new user authorization is needed for these approved operations; stop only for a real remaining human-only boundary or insufficient total budget.

[Navigation checkpoint](../evidence/runs/EVD-20261103-S3-P4-UX-HARNESS-NAVIGATION.md): focused desktop engineering passed after current-route locator repair. Browser mixed-source generation reached selected free-audio download, then the acceptance guard denied its previously unlisted public transport. Exact pinned download allowance and negative offline checks added; CNY27.561504 retained. Remaining planner limits lowered to 4096 output / 2048 reasoning without changing model/endpoint or CNY33 total. Continue real Browser production recovery and OP coverage.

### 2026-11-03 source-preview repair and bounded stop

[Execution evidence](../evidence/runs/EVD-20261103-S3-P4-UX-SOURCE-PREVIEW.md) records successful synthetic video/PNG/WAV plus free-music v1 and the actual offscreen source-preview defect. Clear inherited grid placement; six source-layout states and all seven mounted-workbench tests passed. Desktop rebuild twice failed at pinned public sound download; old healthy runtime and all existing data retained. Ledger: CNY30.014364/33 reserved, zero pending. Full current-build WIN10 needs a new initial generation plus combined annotations beyond the remaining CNY2.985636; stop further paid calls. Required assistance: explicit budget-ceiling decision and Docker access to the pinned raw.githubusercontent.com class map. P4 remains blocked; do not promote previous-build recordings or advance P5.

Full check subsequently reached ipc-sender.test.ts and exposed its obsolete sidecar fixture containing metadata but omitting required semantic_id/labels/evidence_refs. Add that exact test path before repair; supply a valid current sidecar and retain/strengthen safe-projection privacy assertions. Product projection and permission checks remain unchanged. Run the failed entry and the remaining exact check suffix; do not rerun completed unrelated expensive suites solely to manufacture a green aggregate.

Closing free checks: ipc-sender repair passed; every remaining check command through foundation synthetic acceptance exited0, as did final synthetic and final docs:check. Original aggregate exit1 is retained and distinguished from resumed passing coverage. Latest source fingerprint 55295d370d04f2fc8d30142a594364b0b8ca0288e6b1ecd20ed69eb53e46a187. Current Browser remains healthy r2 because r3 standard desktop build failed public-artifact download. No further paid calls; no P4 completion claim.

### 2026-11-03 / CNY36 authorized continuation

User explicitly raised the cumulative ceiling to CNY36 and authorized bounded Docker download recovery. Prior reservations CNY30.014364 remain retained, with no pending calls. Both host/container class-map downloads and the unchanged container download-sound.py now pass pinned hashes. No proxy or hash-check changes. P4 is reopened from blocked through pending then docs:start; next: rebuild both standard images, preserve mounts, verify current-build WIN09/WIN10 and all outstanding OP coverage. Existing projects, exports and historical Evidence remain preserved.

R4 standard builds and exact runtime provenance passed; source audio actual play/pause and WIN09 recovered correctly. Before any paid call, WIN10 found scaled PNG intercepting reset controls. Add scoped control stacking and pointer-hit regression (3 widths, two navigation states, 1.5x/4x); initial failure retained, final seven tests passed. A subsequent r5 rebuild reproduced RemoteDisconnected. Extend P4 allowed paths to docker/Dockerfile, docker/download-sound.py and its exact regression test to bound transient download retries and cache verified immutable artifacts before application COPY. Preserve URLs/digests, reject permanent HTTP/hash failures, retain previous runtime/data.

R6 download recovery: bounded direct attempts exhausted; existing Windows proxy 127.0.0.1:12450 is reachable as host.docker.internal:12450. Original Python downloader verified both original hashes through that proxy. Standard desktop Dockerfile succeeded with HTTPS_PROXY supplied only to this build; no global proxy/runtime model configuration changed. Both r6 services recreated retaining mounts; exact provenance passed. Browser actual image reset at 1440/820/360 and 1.5x/4x plus fullscreen enter/exit passed. Final r6 WIN09/WIN10 continues; no paid dispatch yet.

R6 final bounded checkpoint: WIN09 failure persistence/recovery passed; mixed synthetic WIN10 generated paid v1 with CC0 music and dual QC. Three free precision edits reached v4 while old v1 remained viewable; local v4 dual QC and v4/v1 comparison passed. Two annotations plus overall grayscale request reached two real planner rounds but failed: first-round Q01 was decision_only, second-round effects schema required zero entries, yet model returned a Q01 color effect. Valid rejection preserved v4 and committed no draft. Cumulative retained reservations CNY34.826196/36, zero pending, CNY1.173804 left; no further paid calls. Human budget decision is required for a normal two-round retry; Docker no longer needs human network repair. Both recordings stopped. Six prior project identities/Timeline counts and four prior export hashes are preserved. [Current blocked evidence](../evidence/runs/EVD-20261103-S3-P4-UX-BUDGET36.md) records actual coverage and remaining OP/WIN gaps; do not mark P4 complete or advance P5. Default-Python aggregate failed its pinned Pillow assertion; pinned-runtime check is separate and must be reported by actual exit status.

Final engineering closeout: pinned-runtime pnpm check exited0 through foundation synthetic acceptance; final docs:sync/docs:check passed with explicitly retained historical applicability debt. Preserve the failed default-Python invocation. No additional paid calls or new UI workflow after the budget stop. Commit/push the reviewed download/image-control repairs and blocked execution record to the existing branch; no merge, P4 completion, P5 or release claim.

### 2026-11-03 / CNY40 single-retry continuation

User authorizes total CNY40, first repair contradictory two-round output, then exactly one combined-annotation retry; continue remaining P4 only if that retry passes, otherwise stop. Baseline commit1201153 and reservations CNY34.826196 are retained. Existing tracked tree is clean; untracked historical Evidence/output remain untouched. P4 reopened through pending and docs:start. Necessary existing allowed paths cover Host creative_skills root, creative-skill-runtime, skill-runtime regression, current intelligence runtime documentation and budget harness. New requests will identify their strengthened projection explicitly; legacy roots must retain byte-identical prompts/projections because stored success/failure proofs reconstruct physical inputs. Keep all effect/pin/evidence checks and physical-call ceilings. Offline regression must cover old projections, direct authorized grayscale with zero Skill attribution, contradiction rejection, and actual two-call transport before paid retry. No raw output repair, silent fallback, new personal media or historical-data rewrite.

Final bounded checkpoint: versioned projection and legacy-proof compatibility regressions, Host generation suite, typecheck and budget guard pass. Standard r7 builds/provenance pass. Exactly one real UI annotation retry succeeds, producing v5 with dual passed QC; all 90 frames are grayscale and decoded audio is identical to v4, retaining source/timing/captions/gain/fades. Retained reservations are CNY37.244568/40, leaving CNY2.755432 with no pending calls. This is cross-build recovery, not the same-current-build empty-project WIN10 journey. Four planner calls for fresh generation plus annotations need about CNY4.8 before new observations, so stop further verification at the user's budget-decision boundary. Export automation stopped at the ordinary confirmation, which was canceled; no new export file or export-completion claim. Ten old project identities and four export hashes are preserved, with only the authorized retry adding v5. Recordings stopped; P4 remains blocked and P5 is not entered.

The full check exited1 at the Electron review fixture's 90-second shutdown limit after native journey progress. Cause is not confirmed; do not call it a harmless flake or claim the aggregate passed. On authorized resumption, diagnose this free check and finish free interactions/fixes before the final build's one fresh full journey. Suggested CNY45 total is only a proposal, not an applied cap. See [current execution evidence](../evidence/runs/EVD-20261103-S3-P4-UX-SKILL-BINDINGS.md). Close out and push this bounded repair to the existing branch; no main merge or release.

### 2026-11-03 / remaining allowance continuation

User authorizes use of all available allowance without repeated authorization requests. Resume all independent free P4 verification and necessary repairs; preserve the CNY40 recorded ceiling until an actual available allowance is established, with no invented unlimited balance. Baseline fae0b79 tracked tree is clean; prior untracked artifacts/data retained. P4 reopened through pending and docs:start. First distinguish the Electron whole-process watchdog from actual shutdown: prior log never reached the final review marker or captures, so add bounded stage diagnostics before choosing a fix. Existing allowed paths cover the harness and its fixture. Continue actual Browser OP coverage on current r7; only changed production build inputs require a rebuild. Record paid capacity from the durable ledger before dispatch, and do not ask again for already authorized capacity.

Free continuation downloaded v5 MP4 plus audio list/credits through actual Browser links; MP4 hash matches the approved Master. The first diagnostic Electron run completed, so historical timeout is not claimed fixed. A bounded follow-up exposed export page close waiting; actual Browser navigation also failed because inherited fixed modal overlay intercepts sidebar pointers. Extended mounted Renderer regression fails on navigation reachability (6/7 pass). Repair page-mode export layout and immediate page return while retaining modal behavior; existing allowed Renderer/test paths cover this exact current-user defect. Preserve failed logs and run targeted engineering plus rebuilt Browser checks before further paid work.

R8 actual Browser navigation/return/reopen passes at 1440/820/360 and all nine routes. Free optional-track add/undo/redo/undo commits v6-v9, then authorized synthetic-image PiP insertion commits v10. Actual one-frame image trim is rejected without a commit: the helper wrongly maps a static one-frame source through its 90-frame display interval. Existing allowed p4-timeline-commands.js/property paths cover repair of image display trim/split while retaining source identity, video/audio exact mapping, locks and transition/effect guards. Full check independently stopped in renderer-races at explicit-null profile restore; add exact close acknowledgement and stored-state diagnostics, preserving assertions and deadlines, and reconcile any demonstrated fixture contract drift.

R9 reproduces image trim rejection despite corrected helper: creationTimelineProjection omits image kind and most editing semantics. Add the shared Host-owned creation-timeline-projection.ts to P4 allowed paths before editing. It owns safe complete editing projection and restoration of hidden metadata/paths from the exact Host base before manual simulation; raw input receipts/idempotency remain unchanged. Actual rendering fields, locks, effects, transitions, routing and caption styles must survive whole-track commands. Arbitrary metadata, LUT/font paths remain private. Add regression for valid short image fades that would otherwise be duplicated at a split.

Projection repair checkpoint: actual Host regression exposed the existing storage requirement that recorded commands exactly match executed IR. Preserve that invariant: the dedicated Renderer method resolves private-field references against its immutable selected parent draft before entering the unchanged manual commit path. This yields stable normalized input/IR/digest on retry after the live version advances. It never mixes current state into historical restoration. Opaque, parent-bound references retain metadata, private font/LUT paths and non-public effect parameters even for new copied/split IDs; foreign references and injected private fields are rejected. Expanded IPC regressions, same-parent real Host retry, typecheck and architecture pass; complete resumed mandatory check suffix passes. Electron fixture now returns the real save-ui {version,value} contract; final actual Electron journey/shutdown/reopen passes. No historical timeout root-cause claim. R10 rebuild will verify the actual Browser image trim and retained rendering semantics.

R10 current-project recycle failed with DESKTOP_RECENT_NOT_FOUND: Renderer sends the project UUID where the lifecycle route requires the opaque recent-entry UUID. Extend existing P4 allowed paths to recent-projects.ts and its real Host test; project-api is already allowed. Project summaries will carry the non-path project identity so the current card can select exactly one matching navigation reference; ambiguous/missing references must not target a different project. Verify on this turns newly created WIN09 test project only. Prior ten projects remain untouched by recycle.

R11 recycle/restore mapping succeeds on the new test project. Closing it cancels an in-flight media preparation, but the generic Worker CANCELLED error was projected as QUERY_FAILED and journaled after close. Narrow existing ProjectSessionManager.run handling to classify only a Worker cancellation whose operation was explicitly invalidated by a lifecycle transition as DESKTOP_SESSION_STALE, retaining the original Worker error as cause and draining the actual promise. Current-session errors remain unchanged. Add bounded lifecycle regression; no failure assertions removed.

Final R12: standard desktop/whisper build provenance passed. Actual current-card recycle/restore/reopen succeeds without stale-cancellation error; a new empty synthetic project repeats the full >30s failed-import persistence/unrelated-success/dismissed-filter/reselected-source recovery sequence. Prior10 project identities and7 existing export hashes verified; synthetic edit project alone gains v6-v16 and its undo returns every v10 field. No paid call or budget increase. CNY2.755432 remaining conservative allowance cannot fund the four-call fresh same-build WIN10; do not ask again or fabricate closure. P4 is blocked with current Evidence and active Debt; remaining work is fresh WIN10 plus outstanding OP/formal receipt closure. Commit and push this tested bounded continuation on the existing branch; no main merge/P5/release.

### 2026-11-04 / CNY70 continuation

User explicitly raises total model budget to CNY70 and requires no further authorization below it. Baseline46a189b tracked tree is clean, old untracked artifacts/data preserved. Retain CNY37.244568 reservations; allowance CNY32.755432. Continue P4 complete fresh-project WIN10, current-build WIN09, OP matrix, engineering and formal receipt closure. Update only the active acceptance harness ceiling/necessary call counts, preserving immutable ledger, original transport/model/token bounds, synthetic-media allowlist and truncation checks. Official DashScope pricing reverified2026-11-04. Existing R12 code remains current; verify live build identity after restarting the owned desktop harness to load the new cap. No P5/main merge/release scope expansion.

Current-runtime checkpoints: owned desktop restart required recreating only its Whisper sidecar to join the new shared network namespace; both recovered without volume changes. Recorded WIN09 passes failure persistence/recovery. Fresh WIN10 generated v1 (four vision and two planner calls); conservative reservations now CNY39.705888. Free edits reached v21 with trim/effect/transition render, reorder and real main/PiP drag roundtrip. Full check stopped at required Pillow12.3.0 because the shell selected user Pillow11.2.1; restore an isolated pinned dependency, do not weaken the assertion. Right-click copy twice failed before Host submission: UI-save broadcast starts a full authority refresh while the menu remains clickable. Existing allowed Renderer and mounted-fixture paths cover suppressing pure UI-save refresh plus invalidating menus on real authority/version changes. Preserve the failed WIN10 video/Host states; regression-test the actual event sequence, rebuild, then record a fresh same-build WIN09/WIN10. No P4 completion claimed.

R13 OP-09 found an actual source-grid boundary: synthetic WAV prepared audio spans 240640/48000 seconds; default full-span drop rejects its non-frame-aligned tail. Keep the exact source/sample and no-silent-truncation contracts. Add explicit in-product range confirmation before any track/clip commit, using the largest frame-and-source-grid-aligned range; cancellation/stale ownership submits nothing. Existing requestedDuration compiler path remains authoritative. Renderer, p4 command property tests and mounted workbench tests are already allowed. Rebuild after focused negative/cancel/confirm/stale regressions; R13 remains supplementary evidence and final WIN09/WIN10 must bind the new build.

R14 full check and actual audio cancel/confirm pass. Free operations reach v71 with dual QC, and owned disposable-project recycle/restore/delete plus timeline navigation pass. Final WIN09 core failure persistence/recovery passes. Fresh paid WIN10 produces v1, but input typed immediately after authorization disappears from the visible composer when begin binds its new request. The old empty-request form scope retains it; navigation exposes the missing handoff. Repair the exact begin-to-request scope transition, including broadcast-before-command-result, without transferring drafts across projects or overwriting another request. Keep the failed recording and new project; use controlled mounted regressions before another current-build journey. P4 remains incomplete.

R15 exact build provenance and WIN09 pass. Composer handoff, cancellation and saved-input regressions pass; full check is running. Before another paid generation, OP audit found OP-10 has button-based text creation and existing-caption dragging but lacks the demo's new subtitle/title resource drag. Cancel the pending authorization without a model call and retain the empty imported project. Add editable text resources, exact drag ownership, matching existing/new text-track targets and atomic track+caption insertion through the existing timelineEdit path. Current Renderer/test allowed paths cover this missing P4 operation. Verify hover/cancel/stale/locked/mismatched targets and real Browser drag/render before the final same-build journey. R14 library audition/replacement, independent version playback/source alignment, adoption undo/redo and two-version combination with dual QC are retained as R14 evidence.


R16 bounded stop: native subtitle/title resource drag and dual render pass; exact standard runtime provenance, WIN09 recovery, fresh initial generation, composer navigation/reload persistence and three local edits through rendered v4 pass. The single combined annotation submission fails before model calls: whole-work grayscale plus valid anchors is unconditionally rejected by stage3-feedback-goals.ts:136. No v5 or partial edit; failure retains both annotations and v4. Stop further source repair and paid retries under the user's failed-retest instruction. Final frozen-source pnpm check exits0. CNY44.580732/70 reserved, zero pending; 12 old project identities/Timeline counts and seven old export hashes are unchanged. [Current blocked evidence](../evidence/runs/EVD-20261104-S3-P4-UX-CNY70-BLOCKED.md) preserves exact artifacts and prior-build supplementary OP coverage. Next work is the scope reconciliation regression/repair, then current-build successful annotation/media/export/reopen and formal receipts. No P4 closure or P5. Commit/push the completed bounded repairs and truthful blocked checkpoint on the existing branch.

Final engineering closeout: current-source render-graph property suite, final synthetic acceptance and budget guard tests exit0; docs:sync/docs:check pass with historical applicability debt explicitly retained. Full R16 aggregate check also exits0. Independent read-only review found no additional blocker in the completed Renderer repairs and confirmed no annotation call/commit, while correcting model-run terminology to observation and generation. These checks do not override the observed combined-annotation failure or close P4. Final hashed command records are in docs/evidence/assets/p4-ux/verification-20261104/r16-final-checks.json.
