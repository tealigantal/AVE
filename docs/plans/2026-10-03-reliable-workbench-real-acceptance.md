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

2026-11-05 接续：依次完成 M0 范围和数据基线、M1 隔离运行/录制/费用保护、M2 真实首个闭环、M3 全部场景及必要修复、M4 冻结构建连续验收、M5 工程关闭并集中交付可选人工反馈。本轮新增模型调用保守预留上限 CNY 100；未运行的步骤不得沿用旧构建结果。具体状态与路径登记见 P5 工作包当前运行检查点。

2026-11-05 追加：r4 完成有声手工预检及同源分段留出学习预检；r6 验证一次性例外和长期纠正的档案记录，用户确认遗忘后，新独立项目生成未包含被遗忘原则，重学原事件被拒且无新模型调用。纠正后、遗忘前的新项目实际应用仍缺；历史版本的旧快照未在真实界面重放。正式连续旅程和浏览器完成下载仍待验证。QC 边界回归与授权缺项提示已修复，保留检测限制和构建证据边界。当前保守预留 CNY 90.958896/100，无 pending；最新详情见 P5 工作包。

当前 M2 非正式预检：四素材请求因重复原片位置失败；排除重复图片后，真实观察完成，规划先后两次被本包文本限额挡住。原片绑定修复已通过 Stage3 全量回归；跨 run 规划续跑按 ADR-0048 实施，原失败和账本保留。独立演出素材生成 v1、v2，产品比较显示约 8 秒与 5 秒，v1 Preview/Master 检查通过且 Host 成片与浏览器未完成下载字节哈希一致。累计保守预留 CNY 38.610516，均为非正式预检，不能替代 WIN/C 的系统原生导入及完整连续验收。

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

P4执行 WIN-10；P5执行 WIN-01–08 与 WIN-10。用户于 2026-11-06 接受 WIN-09 同名损坏素材恢复场景在 P4 和 P5 中的未验证风险；其他工作包的要求仍独立。WIN是现有场景ID，步骤保留真实应用入口、构建和输出约束，使用browser-automation/native-automation记录实际执行者。运行时产品授权对话由测试身份及实际UI流程验证，不能绕过Host权限；这不要求用户再次批准Agent开展已指派任务。

自动流程：P5 从空项目导入许可明确素材→请求与产品权限流程→实际制作→观看→连续精修→组合批注处理→比较→刷新/重开→固定版本导出。逐页覆盖九个页面及十种工作台状态，校验缩放/键盘/IME/减少动态。安全删除使用测试拥有目录验证，不操作用户作品。声音以实际解码、采样/响度/同步和输出证据验证；不把这些技术指标写成人类听感接受。

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


### 2026-11-04 / User retry recovery

User reports the suggested edited-text workaround also fails and asks the agent to investigate and repair. This resumes authorized work within cumulative CNY70; current reservations remain CNY44.580732, no new calls. Baseline39e0aad is pushed and tracked tree clean; all existing untracked Evidence/output and data retained. Actual Host snapshot r16-user-retry-host.json records two new TIMELINE_ANNOTATION_DRAFT_MISMATCH failures at11:55Z: the failed original batch already appended request revision2, while the retained current v4 draft belongs to revision1. Strict revision equality wrongly conflates request concurrency with draft identity. Reopen P4 and repair exact current-draft binding plus consistent whole-work/anchor grayscale scope, preserving stale/foreign/current Timeline, authorization, protection and atomic commit boundaries. Existing allowed Host/feedback/property/annotation integration paths cover these fixes. Reproduce both faults offline before patching; rebuild and verify actual current-project recovery before broader paid acceptance.

The new real Host regression reproduced a third downstream failure before paid retry: multiple preflight-failed batches share a target revision/text/base, so generation incorrectly treats them all as the revision owner. Bind annotation context to the exact existing journal processing-to-revision edge, using the validated first state event for that revision; never infer ownership from matching text. Add project-storage/src/public.ts to allowed paths solely to export the storage-owned read helper. No new schema, direct Host database write, history rewrite, or ignored ambiguity. Extend negative and reopen/replay coverage.

Read-only review rejected adjacency as the sole binding proof: processing and revision are separate transactions and recovery can interleave events. Replace the unverified draft helper with an explicit optional annotation_operation_id in the existing creation.state.saved event, written atomically with a new revision; null marks ordinary new revisions. Legacy events remain read-only and only uniquely provable matching context is accepted. Add project-storage.mjs and its existing draft-storage regression path for atomic persistence/rollback validation. Ordinary/annotation revision entry points keep existing public payloads.

R17 actual recovery succeeds on the existing project and on a fresh WIN10 project: both combined batches resolve to v5 with independent Preview/Master QC, all90 decoded frames grayscale and unchanged decoded PCM. Fresh WIN09, input persistence, seven responsive viewports, full v1/v5 playback, comparison, download and reopen pass; full check, render-graph property and final synthetic acceptance exit0. Reservations CNY51.905340/70, zero pending. The two user retry failures were retries of the same operation, not two distinct messages. Preserve refresh-time MEDIA_BROWSE_SOURCE_CHANGED and old-connection DESKTOP_WINDOW_CLOSED issues for explicit current-source verification; successful generation alone does not prove source browsing.

Current-build OP supplementation reveals a native drag defect before P4 closure: authorized media carries effectAllowed=copy; the existing clip's bubbling dragover unconditionally sets dropEffect=move, causing Chromium dragend=none with no drop over the occupied clip. The empty-lane drop reaches the application and correctly rejects a ripple cut through an existing PiP; no Timeline mutation occurs. Existing allowed timeline-panel and mounted P4 fixture paths cover a narrow event-ownership fix. Reproduce copy/move negotiation in the mounted DOM, let the typed lane handler own registered payload dragover, retain legacy clip movement and all ownership/ripple checks, then rebuild and verify native source/effect/transition drops before the final paid current-build journey. R17 recordings remain truthful prior-build evidence, not final closure.

R18 native media insertion over an occupied clip, video/image/audio editing and dual renders through v45 pass; full check exits0. Audio-track solo then produces v47 with no video: its button incorrectly invokes the existing global Track.solo contract. Preserve that contract and its regression assertion. Extend the existing Host PrecisionEditV1 audio solo with optional validated track_id selecting every clip of that audio track; retain clip callers and reversible gain/routing state. Add precision-edit schema/example/Host adapter paths before editing; regenerate bindings and validators. Expose only validated selected-state metadata to the Renderer, not gain/routing recovery state. Preserve cancellation of historical global solo. Prevent render-and-watch from loading a preview after rendering failed so the actual QC error remains visible. No paid calls during repair; reserved CNY51.905340/70. Retain failing video/Host snapshot and bind the final fresh journey to the repaired build.

R19 Browser solo reaches v48 after canceling historical global solo, then rejects optional missing sidecars on P4-inserted media. R20 uses only private reversible bookkeeping, no invented evidence, and restores absent sidecars when untouched by subsequent edits. All-manual red/green regression, typecheck and readonly review pass; final current-build live verification remains required.

R20 audio solo and cancellation now both commit/render successfully (v49/v50), retaining all251 decoded picture frames; both SFX segments are audible, unrelated audio is suppressed and restored afterward. Native transition insertion passes at a legal cut (v54), but dropping again on its actual marker is rejected: the UI resolver only recognizes non-overlapping adjacent clips, whereas a committed dissolve creates an overlap. Fix only the existing Renderer target resolver to bind a current transition marker or its cut to its from-clip; retain Host replacement/handles/ripple checks. Add mounted regression before rebuilding. No model calls; keep failed native drop evidence.

R21 native replacement commits v55, but selecting its marker loses keyboard focus before Delete. Renderer stores its change signature with display-sorted tracks while comparing it against authoritative track order, rebuilding lanes on every update when orders differ. R22 changes only the signature input to the same authoritative order. Mounted unordered-track focus regression fails before repair; verify focus, native Delete/undo/redo/render afterward. R21 aggregate remains an intermediate check; final frozen R22 check is required. No paid calls or data migration.

R22 final verification: exact standard runtime provenance, fresh WIN09/WIN10, one real combined annotation resolving v5, full90-frame grayscale and unchanged PCM, actual three-file download/comparison/reopen, seven focused responsive viewports, source browsing and supplemental transition/audio controls pass. Frozen pnpm check, final synthetic and render-graph tests exit0; independent recording review and immutable interaction receipt pass. CNY56.740812/70 retained, zero pending; baseline data/export hashes preserved. Evidence EVD-20261104-S3-P4-UX-FINAL-R22 owns the24-row build-scoped operation ledger. Resolve only P4 current-UI debt and complete this package through docs:complete, then sync/check and authorized current-branch commit/push. P5 remains pending; no main merge/release or historical-debt promotion.

P4 docs:complete succeeds. The following docs:check exposes temporary output allowlist entries entering capabilityScope, so logging changes applicability and a clean clone cannot reproduce it. Retire only the three completed output/playwright test-run write scopes at closeout; retain every implementation/test path and every original output file. Actual evidence remains bound through external hashes and the immutable interaction receipt. Recompute both P4 capability scope identities in this new, uncommitted final Evidence; leave historical Evidence and checker code untouched. This is execution-metadata cleanup, not a product-scope or acceptance reduction. Readonly review confirms the cause and boundary.

Publish the sanitized interaction record itself alongside its unchanged receipt so default static/CI validation can read it without a local external-root variable. Exact bytes/hash are preserved; bulky recordings/source/output artifacts remain local and their already verified metadata is carried by the receipt. No private provider credentials or real user media are included.

Closeout completed: docs:complete marks P4 completed; final docs:sync and default docs:check pass after exact public-record publication and temporary-output scope retirement. Both P4 capabilities/acceptances are accepted; P4 current-UI debt resolved. P5 remains pending/ready and is not started. Original reported project is reopened at its recovered playable v5. Authorized branch commit/push is the remaining delivery action.

2026-11-05 当前状态：P5 因原生操作、WIN-09 审批与实际保存及连续旅程证据缺口标记 blocked，依据 EVD-20261105-S3-RELIABLE-ACCEPTANCE-BLOCKED-R1 和 DEBT-S3-P5-CURRENT-REAL-JOURNEY；保留 r6 真实预检、遗忘结果与全部数据，待恢复后按工作包重新执行，不提升任何验收状态。

2026-11-06：用户指出创作区素材点击会跳页，要求创作区和素材页共用素材及选择状态、使用独立界面，能切换素材/音频库并拖放。源码已定位共用面板及 `selectAsset` 强制跳页；重新开启既有 P4 UX 包以修复此缺陷，保留 R22 历史 Evidence 和 P5 blocked 状态。先按正式包启动，之后实现并验证独立视图、共享状态、授权范围及真实拖放；不以用户反馈替代源码指纹、连续声画及完整交互证据。

2026-11-06 UX 修复进展：创作、素材与精修切页创建独立面板实例，当前项目内共享素材、选中项、来源和类型选择；创作区点击素材保持当前页面并开放音频库。读取当前请求获准片段后，唯一匹配素材可拖至创作镜头区，音频库拖放走既有授权绑定与 Host 应用链，项目变更重置选择。已扩展正式 Renderer 挂载测试，覆盖独立节点、切页同步、无授权素材禁止拖动、获准视频及音频库在播放头落点、过期编辑状态拒绝。`stage3:p4-workbench:test` 8/8、`stage3:p4-integration:test`、`renderer:workbench:test`、`typecheck`、`architecture` 和 `git diff --check` 均退出 0；一次新增断言污染已有结果对象使工作台测试失败，拆分结果后修复，保留失败记录于执行输出。测试为受控 DOM/Host 证据，并非真实浏览器拖放或最终验收。`docs:check` 因当前证据适用性和源码指纹漂移退出 1；生成文档需最终同步后重查。当前 6083 仍为旧构建，未重建或更改其运行实例。下一步补充当前构建真实浏览器交互与音频库授权/资源释放验证，处理构建身份和 guard 续接，再重跑受影响的正式旅程与文档门禁；P5 仍 blocked，WIN-09 的原自动审批拒绝未解除。

续接登记：为了在同一隔离测试环境验证新 UX，P4 修复包扩展允许 `scripts/p5/run.mjs`、`scripts/p5/used2-policy-runtime.mjs`、对应 `p5-run-resume.test.mjs` 和当前 P5 构建证据目录。仅用于把经核验的 r6 配置、Compose、构建和运行身份逐项固定为新构建的前驱，并保留现有预算账本、挂载、停止状态、helper 和策略检查；任何未决账本或身份不符均拒绝续接。原 P5 操作记录、用户数据及已存在服务保持不变，完成有针对性的故障回归和新镜像身份验证后才能启动新运行面。

2026-11-06 当前构建实测：`p5-run-resume.test.mjs` 13/13 通过，含 r6 四份记录各自被篡改时拒绝。隔离镜像 `20261106-ux-r7` 构建成功，build-input `14f7325110473c77f02b77db53dd00b9b6fc0a9b3ada43f5b5aacfdb5b0b8c6a`；首次 `plan` 因旧服务持有账本锁返回 EEXIST，未删锁。用户隔离作品输入已保存，后台任务均显示完成后经界面正常关闭，停本包两服务并保留卷；第二次 plan 及 resume 成功，双服务 healthy，运行身份 `guarded-identity-1793972738420.json`，账本仍 76 笔预留、CNY 90.958896、0 pending。重开原隔离作品 v2：创作区点击素材保持创作页，音频库能打开，切素材页后资源来源与选中素材保留。读取当前获准片段后，通过“添加到播放头”将素材实际提交为 v3；未调用模型。真实浏览器三次从素材卡或获准片段拖至镜头带均未观察到提交或错误；相同浏览器在独立本地对照页成功触发标准及同 MIME 类型拖放，因此不把该失败归因于工具，也不声称此项通过。已请用户在新版隔离界面验证拖放；后续定位并修复真实事件链，再重新构建并验收。该预检非连续 P5 验收，历史版本和用户手工生成的 v2 保留。

补充：用户要求由代理自行操作，故继续自动排查；第四次真实拖放仍未观察到提交，等待后仍为 v3。命中测试确认源是 `draggable` 的获准片段卡、目标是镜头带，真实页面精确编辑器显示 editable，重新读取获准片段按钮可用。使用相同生产 mediaPanel 和 timelinePanel 组件的本地隔离状态及同一浏览器执行拖放，观察到 dragstart、dragover、drop 和提交调用；它只能证明隔离状态的组件事件链，并不能证明真实作品流程。真实上下文中未提交的根因仍待查明，P4 此项和 P5 连续验收均未完成。自动审批先前拒绝准备 WIN-09 同名损坏及有效素材，返回理由为 `blocked by policy`；保留该阻断，不改用其他路径规避。

2026-11-06 后续：在同一 r7 隔离构建恢复 v3 后重新读取获准片段，按当前画面从已授权视频素材卡拖入镜头带，真实 Host 提交 v4；刷新后仍为 v4，精修轨道显示新增的 8 秒视频片段；点击“制作并观看当前版”后界面显示 v4 的四镜头实际预览。早先未提交的原因未确认，不将其归因于工具或源码缺陷。该请求未授权音频库，音频库加入按钮禁用，故未扩大授权或声称音频库真实拖放通过；受控挂载测试仍是该分支的现有证据。该单项结果不替代 P4 当前构建的完整验收或 P5 连续旅程。再次运行 `docs:check` 退出 1，除活动历史 applicability 债务提示外，多个能力 scope 与 programme 最新 Evidence 身份仍不匹配。

随后真实音频库试听长时间处于获取状态；点击停止后提示仍显示正在获取。复现测试先于修复失败于 `explicit stop updates status`；修复显式停止的状态提示，并用 generation 防止旧取消完成覆盖新的试听状态，保留失败原因与迟到响应保护。该测试命令意外打开仓库 Electron 测试窗口，用户要求继续仅通过 Docker 打开 AVE，后续遵照；修复尚待新 Docker 构建实际验证。续接 r8 仅接受四份 SHA-256 固定的 r7 配置、Compose、构建及运行身份，沿用同一账本和既有停止/挂载检查；相关测试 14/14，通过前首次因手抄 identity 摘要错误失败，核对原文件并更正后重跑通过。

r8 镜像构建完成，build-input `62481c9a46c565e9c7c3e6b6c27685cfa5bd670a096ff86c974a719b46fb480c`；在只读使用 r8 镜像中实际 audio-library 模块的独立 Docker 测试页上，受控延迟请求期间点击停止，状态变为“试听已停止”，再返回迟到音频结果时状态不变且播放器数量为 0。这是受控组件验证，不是正式 AVE 试听成功或真实音频验收。临时容器已停止；原 6083 隔离作品 v4 输入已保存、预览 QC passed，但后台仍有一项 `media.browse.v1` 显示运行中，因此未停止或替换该实例。`stage3:p5-tools:test` 46/46、`architecture`、`typecheck` 和 `git diff --check` 通过；Electron 容器外回归尚未重跑，正式构建切换与真实界面复验仍待完成。

切换完成：重新连接后的真实后台列表显示 51 项均已完成，之前运行中显示已过期；正常关闭已保存作品后仅停止该 P5 隔离服务，`plan` 保持 CNY 90.958896、76 次预留、0 pending，r8 双服务健康并核验身份 `guarded-identity-1793974675775.json`，runtime digest `0d3f7f4cfce2d0b5f5e579cc0f9f68876be0aae169e5dd08b857c9610cd0db98`。重开原隔离作品后 v4 与实际预览保留，在真实创作页发起音频试听并停止，提示正确显示“试听已停止”。另一已有留出项目同样未授权音频库，未扩大授权或声称真实音频拖放通过；已恢复原隔离作品。P5 正式连续验收和当前证据适用性门禁仍未通过。

2026-11-06 用户接受 P5 的 WIN-09 同名损坏素材恢复场景未验证风险，并同意取消该场景作为 P5 完成条件。只调整 P5 工作包的固定步骤注册、对应 manifest、矩阵和范围说明，保留 WIN-02、C9 的其他失败处理要求与全部历史记录；不声称 WIN-09 已通过，不改 P4 或历史包的检查。P5 范围为此添加 `scripts/docs/interaction-acceptance.mjs` 和 `tests/architecture/interaction-acceptance.test.mjs`，以便真实验证精确豁免及其他工作包不受影响。先修改及验证，再同步当前状态；原自动审核拒绝的操作不重试或绕行。

执行结果：P5 的必测步骤为 WIN-01–08、WIN-10，C1–C9 和连续记录仍必需；注册策略回归验证 P4 仍要求 WIN-09，P5 不能再省略 WIN-02。`interaction-acceptance:test`、直接 P4 集成测试 10/10、`docs:sync`、`git diff --check` 通过；`docs:check` 仍因多个能力适用性及各 programme 最新 Evidence 指纹不符退出 1。`run.mjs verify 20261106-ux-r8` 成功，guard 保持 76 次预留、CNY 90.958896、0 pending。P5 尚未通过；其 P4 依赖的 WIN-09 要求并未随 P5 豁免改变。

2026-11-06 用户进一步接受该 WIN-09 场景风险并要求继续，不再让 P4 的同一验收步骤阻塞。保留实际拒绝和未验证事实及 R22 历史记录；只从 P4 当前交互注册与 manifest 中移除 WIN-09，保留 WIN-10 和其他实际功能、失败边界、授权与数据保护。将 P4 从 blocked 调整为 pending，通过 `docs:start` 恢复本包后核对相应调用方、测试和当前文档，不把豁免写成测试通过。

继续结果：P4/P5 当前注册策略已移除 WIN-09，历史 JOURNEY 工作包仍保留原要求；`interaction-acceptance:test` 通过。r8 Docker 中对隔离作品撤销 v4 得到 v5，重做得到 v6；v6 四个片段与 v4 对应，预览可制作、切换并显示。导出 v6 的预览与成片 QC 显示通过；下载落盘 `AVE-v6 (1).mp4`，2,894,883 字节，24 秒 H.264/AAC，SHA-256 `a929800d9463d7e4386eaf7741396dd0cf08dadd7d289c59e5db91e834a4a8e7`，与该次 Host 准备文件相同。无新模型调用。这些是定向真实操作，不是连续 WIN-10 或 P5 关闭证据。

实际导出中曾等待 30 秒：发起导出的标签没有确认框，另一个打开同一工作台的标签却显示该次“下载作品”确认；完成该确认后，发起标签出现下载入口并成功保存。源码显示同浏览器的同源标签复用 cookie 会话，后续事件连接替换该会话的事件流；记录为多标签交互问题，尚未修复或证明所有竞态影响。单标签实际操作可继续；不得以此现象归咎用户操作，也不将历史下载问题直接断言为同一根因。

当前修复范围：同一浏览器、同一来源暂只允许一个工作台标签持有事件连接，其他标签显示等待提示并在前一标签退出后自动连接；浏览器不支持协调时明确提示，不绕过既有会话、CSRF 或 Host 授权。此为有意限制并非多标签并行能力；不改变不同浏览器/来源的会话隔离。登记 `tests/architecture/browser-session-lock.test.mjs` 与 ADR-0050；现有 Renderer、package.json 和决策导航均在 P4 允许范围。先验证排队、释放及失败，随后仅重建 P5 隔离 Docker 运行面并用两个真实标签核对事件路由。

实现检查：独占锁在请求浏览器会话之前取得，等待页说明关闭原标签后自动连接；退出页释放，BFCache 恢复时重新加载并取得锁。单元测试覆盖排队、接管、等待中关闭与不支持/失败，`web:host:test`、`architecture` 和 r8→r9 四项身份逐项固定及篡改拒绝测试通过；没有改变 Host 会话/授权。`20261106-ux-r9` 必须由验证过的 r8 精确前驱续接，延续原有账本和隔离卷。真实 Docker 双标签验证尚未完成。

r9 双标签实测：第二标签等待，第一个标签发起导出时确认留在第一个；取消并关闭第一个后，第二个自动接管并能收到自己的导出确认。进一步检查发现，关闭旧标签与新事件流连接可能在服务端交错，旧待决对话不应因此留在新连接上。为精确处理事件流交接中的取消语义，P4 添加 `apps/web/src/server.ts` 和 `tests/integration/web-host.test.ts`；用 Host 真实事件流回归验证旧操作中止与确认不可复用，再做定点修复，原 Origin/CSRF/会话授权保持不变。r9 为中间构建，不作为此交接竞态已修复的证据。

交接回归先在真实 Host 测试中失败于 `REPLACED_STREAM_OPERATION_NOT_CANCELLED`；定点修复在安装替代事件流前注销旧窗口、取消其操作与待决对话，随后 `web:host:test` 退出 0。`typecheck`、`architecture` 和 r9→r10 精确身份/篡改拒绝测试 16/16 通过。r10 继续使用固定 r9 前驱、同一账本和隔离卷，重建后仍须验证实际浏览器及交接时的关闭行为。

r10 `build_input_digest=9ea95a307a412e85fa39326d337c36ae29c361853e81428aceffdebaf182a0ed`，两服务 healthy，身份 `guarded-identity-1793979134442.json`，runtime digest `c4d21b1ff7475254ed9898df26f663a5e45ba878cf41187a78abc7ea932c141d`；账本 76 次预留、CNY 90.958896、0 pending。实际 Docker 同源双标签验证：第二标签等待，第一标签打开 v7 导出确认后直接关闭，第二标签自动接管且没有收到旧确认；其自身再次发起导出时正确出现新确认，取消后作品保留。为确认安全交接没有提交这次测试导出。当前策略只支持同源一个活动标签，旧构建已加载的标签须关闭或刷新；不声称多标签同时编辑已支持。未发生新模型调用。

r10 创作区定向复验：点击素材保持创作页，切换音频库后前往素材页仍选中音频库，切回我的素材时此前选择的素材仍为选中。返回创作页读取获准片段后尝试拖入，Host 返回 `REQUEST_EXPIRED`，v7 未改变；该请求授权已过期，不能把这次拒绝写成拖放成功或绕过产品授权。此前 r7 的获准拖放成功记录仍仅属于当时构建和当时授权状态。

过期入口调查：Host 已提供保持原范围、需明确确认的请求续期能力，但当前界面仅在到期且失败的批注任务旁提供续期按钮，普通素材拖放遇到过期时只有错误提示，缺少直接续期入口。记录为后续体验缺口；不绕过授权、不把客户端时间当作 Host 权限判断，也不将其加入用户已接受的 WIN-09 风险豁免。

2026-11-07：用户将本次模型调用累计上限从 CNY 100 增至 CNY 200。原账本及既有保守预留继续计入，不能初始化新账本或手工重置。P4 仅为安全续接该既有隔离测试运行登记预算 guard、ledger、启动校验、专用续期工具及相应回归路径；先验证完整历史、无在途调用和可恢复的上限变更，再恢复同一 Docker 环境并继续 P5，不改变模型、素材、价格或权限范围。

预算续接结果：正式 `stage3:p5-tools:test` 49/49 通过，包含旧账本字节前缀、新上限和篡改拒绝；直接用 `node --test` 的一次尝试因未加载 TypeScript 运行器失败，保留该事实，随后采用项目正式命令。隔离作品输入已保存且 89 项后台任务完成后正常关闭；仅停止并恢复该任务 desktop/whisper。独立离线 helper 保存旧 head 和账本快照，guard 启动日志确认 `limitMicroCny=200000000`、`reservedMicroCny=90958896`、76 笔、0 pending，双服务 healthy。策略中的素材、模型、价格规则保持原值，新增预算证明单独约束累计上限。过渡中断会保留 pending 并拒绝启动，不能声称自动恢复。

正式旅程起点：2026-11-07 在 r10 同一 Docker 环境建立新隔离作品，连续声画采集已启动；正式导入两段视频、一张图片、一段音频，界面 4/4 成功；播放音频、加载图片和视频后，明确授权公开测试素材及数据范围并提交海岸探访要求，当前正在分析，生成中输入的补充文本已保留。文件选择经浏览器 chooser，不能描述为已验证原生系统选择器；其他步骤及最终录制内容仍需实际核对。

2026-11-08 续查：该项目请求的素材分析已完成，但模型选择的图片及视频窗口可用容量共 181 ticks，未达到其自选目标 300 ticks；用户没有给出固定目标。保留生产失败对象与 v0，不能推断整个素材库不足。旧 Skill 投影只允许一次测量，模型无法根据该测量修正选集。新 `effect-bindings-v3` 按 ADR-0051 仅在首测不可行时允许一次带完整 Skill 规则及测量缺口的重测，最终严格绑定可行测量与评估；旧投影不改变。受控 Skill Gateway、Host/SQLite 证据重建、generation、product-loop、planning-resume、typecheck、architecture 通过；不代表真实模型复验。账本只读核对 105 笔、CNY 123.016728、0 pending，属于保守预留。Chrome 已接入；旧录制拍到 Codex 窗口，不能作为工作台录像。200 元账本后续 plan/verify/resume 兼容已修复并受控测试，r11 仅允许固定 r10 前驱。下一步以修复后 Docker 构建在原隔离项目显式继续并观察实际结果。

r11 真实复验：build input `7ceb24a6637a50e0c2951f8bd621332e3f467d04d17398e313e727cf18286bbf`，runtime `a412c79783b7fc3c31d0d0b303f3483df03d463ee2127a1f0fce780ac3ac541b`；两服务 healthy，预算旧账本续接无未决。原作品经 Chrome 显式继续生成 v1，八镜头，预览播放至 14.83 秒，Preview/Master QC 均 passed 但显示 SILENCE 警告；Chrome 实际下载 `AVE-v1 (2).mp4` 615994 字节，SHA-256 `6d5cc8f69fe5d3d89855323d79ecdd2051a731120b7dd242c56b8cb32572b24c`，与 Host 输出一致。真实规划首测 445/524 ticks 可行、第二轮 final，未触发新增重测分支；受控回归验证该分支。成片 PCM 全零，模型 audio=[]，没有安排获准且本身有声的采访素材，选入的视频原声全零；明确要求的采访与环境声未完成，不能将 QC 通过当作声音正常。继续排查语义约束，保留 v1 和输出。预算累计 107 笔保守预留 CNY 127.610940，0 pending。

采访要求丢失的修复范围：为绑定模型对原请求及已授权音频证据的结构化判断，在本包登记现有 planning-exchange v3 schema、对应正反样例及 property 测试；其余调用方、Host、生成代码和测试沿用本包既有允许路径。仅在可验证的明确意图与证据范围内校验实际决策，不把授权音频本身当作用户要求，不按关键词自动选材或补音，旧根和历史证明不改写；语义判断的不确定性须诚实保留。

v2 试听修订故障：真实模型已选用 0–12 秒有声采访，Timeline 持久为 v2；总长 14.848 秒，尾部 12–14.848 秒只有原片本身数字零音轨。QC 使用全局 all_zero，未保留已验证源的时间局部参与，导致该段被当作非预期静音阻断。为修复本次实际故障，本包登记既有 `qc_master.py` 和其 protocol smoke；只对源窗口已精确证明数字零、且该时间段无其他有声贡献的静音分类作修正，缺失证据或潜在混音错误仍阻断。来源静音警告不证明满足环境声语义。

2026-11-08 r12 定向复验：隔离 Docker 构建输入摘要 `b67809a7b3a9b581440e1a9a6c7bfe77f78c30c847a7cab6ec778b31aed81d55`、运行摘要 `ee1c59254a360937e50a25df1387a172452036b4f7088fe21c959de3ec04600f`。Chrome 打开保留的 v2 并重新制作，Preview 和 Master QC 均为 passed，仍显示 SILENCE 警告；无需新的模型调用。Chrome 下载的 `AVE-v2.mp4` 为 805020 字节，SHA-256 `2fddbabd92802b12f2987d8bfa9e6859ec6046a5d0da9b211307dc31c0949191`，媒体探测时长 14.833333 秒，视频 H.264、音频 AAC 48 kHz。解码后的 1–9 秒采访信号与获准采访源同区间相关度约 0.99915；这证明输出包含对应采访信号，不证明人工听感或环境声要求已满足。当前没有可绑定非静音区间的结构化环境声证据；音频意图约束也仍依赖模型对原请求的判断，不能把本次局部修复或 QC 通过写成环境声能力已完成。预算守护续接时为 109 笔、CNY 132.358596 保守预留、0 pending；P5 其他流程及当前构建适用证据仍需继续核验，不能据此宣称 P5 完成。

为将浏览器会话边界链接到稳定架构，P4 添加 `docs/architecture/SYSTEM_ARCHITECTURE.md`，仅指向 ADR-0050 并说明当前单活动标签限制，不改变 Project Host 唯一状态权威。

后续 `stage3:generation:test` 与 `stage3:model:test` 在受控响应下均退出 0；没有发起真实付费请求。多标签记录后关闭本轮多余测试标签，保留单一工作台并刷新，v6 的导出历史与保存状态仍可见；这只是避免继续触发已知问题，不代表问题已修复。当前 P4 仍在执行，WIN-10 及其他未完成的真实流程和证据范围仍须按实际记录，不把已完成的几个定向操作写成完整验收。

单标签继续：在隔离作品 v6 的精修属性中添加字幕“演出片段”，Host 创建 v7，字幕轨与三秒对象在时间线上可见；制作并观看后界面显示 v7 实际预览，选中字幕时可见该文字及编辑边框。尚未对成片解码逐帧核验该字幕，也未将此单项记为完整 OP 或 WIN-10 通过。全部操作未发送模型请求，v6 导出文件和历史版本保留。

真实版本历史中选中 v7、选择 v6 进行比较；两个 24 秒实际预览均显示并可分别播放，左侧 v7 可见新增字幕，右侧 v6 为原画面；播放进度相互独立，结束比较正常返回。此界面观察不代替成片逐帧对比或完整 P5 流程。

2026-11-06 后续非 WIN-09 核验：`web:host:test`、`stage3:p4-timeline:test`、`stage3:p4-annotation:test`、`stage3:p4-recycle:test`、`stage3:request:test`、`stage3:workspace:test`、`stage3:product:test`、`stage3:precision:test`、`stage3:audio-pack:test`、`stage3:soundtrack:test`、`media-browse:host:test`、`workspace-issues.test.ts` 和 `acceptance:final:synthetic` 退出 0，均不作为真实连续旅程验收。真实 r8 Docker 创作页载入 Revelation 音频，显示校验完成并创建 15 秒播放器；点击播放后播放器时间推进至约 12 秒、无媒体错误，停止后播放器被移除并显示“试听已停止”。未录系统声音或完成人工听评。Host 日志显示取消下载的 AggregateError，已有专项实际 IPC 测试确认其保留 `AUDIO_LIBRARY_CANCELLED` 控制结果且不新增持久问题；完整性错误仍作为失败处理。音频应用仍受请求授权约束。

2026-11-08 个人化情境查询故障修复：真实页面空情境查询曾先持久化空数组，再被 Host 严格拒绝，使后续修订无法读取工作区。渲染端现先校验候选查询，空情境保留既有生效查询及表单内容；历史已保存的非法空查询不向 Host 发送，也不自动替换，显示原因并要求用户填写情境或明确选择‘仅查看项目’恢复。Host 校验保持不变。已加入隔离回归；测试与当前构建实测结果待继续核验，不据此宣称 P4/P5 完成。

2026-11-08 r12 Chrome 后续定向操作：在同一隔离作品比较 v2（左）与 v1（右），界面提示同一来源片段的内容定位成功；先后采用 v1 和 v2，界面确认已采用 v2，刷新后仍显示采用 v2。创作页点击音频素材后保持在创作页，并操作素材/音频库切换；本项没有证明实际听感或音频拖放。上述操作是定向界面观察，不代替当前构建完整 WIN/C 旅程。

同一隔离作品的 v2 反馈经界面学习后，隔离 Profile 内容摘要核对一致，反馈事件已保存但返回零条长期原则；模型将添加指定采访、尽量维持画面和不编造声音判断为本次要求，故没有可查询的学习情境。空情境查询返回 `CREATION_WORKSPACE_INPUT_INVALID`，之后提交反馈也遇到相同错误；点击“仅查看项目”后界面恢复，续改得以进入模型规划。此处不把空结果写成学习偏好，也不重复学习同一反馈。

随后真实 revision 3 的模型规划被 `MODEL_OUTPUT_INVALID` 拒绝：失败记录摘要 `d0db999701dadce67753a1e7fbf3e13ea8dc4eefefe6c9b5b0a195ea5a983a0b` 已只读核对，A01 评价引用采访 observation 的前缀而缺少具体证据 ID 后缀，Host 在首轮按现有合同拒绝；实际输入和 Host 可用集合各有相同的 41 个证据 ID，不能擅自猜选或修补模型引用。该轮没有完成可复用的规划轮次，失败和 v2 均保留。账本链只读校验为 111 笔、保守预留 CNY 135.472752 / 200、0 pending；本次增加 CNY 2.317260 为预留而非供应商实际账单。用户此前接受 WIN-09 同名损坏素材恢复未验证风险，该项不记为通过；其余 P5 流程、当前构建证据及必要检查仍未完成。

2026-11-08 r13 续接准备：保留同一 CNY 200 守护账本，脚本只允许命名构建 `20261108-profile-r13` 以已核验的 r12 四份固定身份文件作为前驱；配置、Compose、构建和运行身份分别固定 SHA-256，原有隔离路径、服务映像、停机与账本锁等校验继续生效。`node --import tsx --test tests/integration/p5-run-resume.test.mjs` 20/20 通过，覆盖四文件分别篡改、错误目录及近似构建名拒绝，`git diff --check` 通过。本步仅准备代码与受控测试，没有停止或启动容器、修改账本，也未证明 r13 已构建或运行。

个人化空情境修复的隔离自动验证：`stage3:p4-workbench:test` 8/8 和 `stage2-workspace-renderer:test` 通过；新构建的真实界面验证仍待完成。

2026-11-08 Skill 证据 ID 修复：新规划 root 按 ADR-0053 写入 `skill_evidence_projection: observation-ids-v1`，将当前授权 observation 的完整 ID 枚举到每轮 Skill 测量响应 schema，并明确要求复制末尾编号；无 observation 时证据列表限定为空。Host 仍严格拒绝未知或不完整 ID，不自动猜测、重试或扩大预算。受控 Skill 属性和 Gateway 传输测试已通过，覆盖完整 ID、前缀、零 observation、旧 root 投影、失败审计和一次发送；真实模型是否遵守尚未验证。已持久化 revision 3 的旧 root 续跑不获得新投影，真实复验必须确认使用新建且带标记的 root；本记录不声称该修复完成真实创作或 P5。

2026-11-08 r13 留出项目无修改故障：新请求在已有 v2 的项目中得到完全保留现有布局的规划，Host 编译结果无任何 Timeline 命令，通用编辑入口按非空不变量拒绝，未生成新草稿；该结果不证明新作品或个性化要求已满足。Host 在通过现有校验后以 CREATION_NO_EDIT 明确说明没有可提交修改、提示补充要求，保留原 Timeline、模型输入输出和失败记录，未伪造版本或放宽 edit-ir。受控真实 Host 合成媒体生产回归通过，核对 Timeline 内容及版本、draft 数、模型输入输出和失败对象；工作台隔离交互测试 8/8、stage2-workspace-renderer:test、tsc --noEmit 和 git diff --check 通过。尚未以新构建对真实页面复验，不能据此宣布 P5 完成。

无修改错误消息映射补充：只读核查发现 Main 端允许 CREATION_NO_EDIT 代码通过，但未在 creation-errors 的安全消息表登记，实际弹窗和问题记录因此只显示通用原因；登记该 Main 文件及现有 desktop authorization 映射回归到本包允许路径，以传达未生成新版本和下一步，同时不暴露原始模型或请求详情。
Main 安全映射已补充 CREATION_NO_EDIT 的明确中文原因及操作建议，现有 desktop authorization 映射测试确认错误码保留、提示未生成版本且不泄露原始细节；该测试、tsc --noEmit 与 git diff --check 均通过。

2026-11-08 r14 续接准备：新增唯一 build ID `20261108-noop-r14`，只允许该构建继承 r13 的配置、Compose、构建和 `guarded-identity-1794129207329.json` 四份固定 SHA-256 身份；原有目录、映像、停机、账本和锁校验不变。`node --import tsx --test tests/integration/p5-run-resume.test.mjs` 21/21 通过，覆盖四文件逐项篡改、错误目录及近似构建名拒绝。本步只准备和测试脚本，没有启停容器或修改账本，也未证明 r14 已构建或运行。后续受控构建命令为 `node scripts/p5/build.mjs 20261108-noop-r14`，符合停机和账本前置条件后使用 `node scripts/p5/run.mjs resume 20261108-noop-r14`。

2026-11-08 r13 QC 连续片段边界故障：留出作品 v3 在 1/30 时间基下八个视频片段精确连续覆盖 0–300 帧，实际源码音轨逐段检验为严格数字零；QC 以二进制浮点先分别转换 start 和 duration 再求和，使第 171 帧产生极小伪间隙，Preview/Master 误报阻断。拟仅对通过可执行图核验的片段覆盖使用精确有理数，silencedetect 的十进制边界及既有仅输出末尾 50ms 编码容差保持明确界限；真实内部缺口、未知来源和有声重叠仍阻断。现有 QC handler 与 protocol smoke 已在本包允许路径；测试与真实构建复验待执行。

2026-11-08 r15 续接准备：r14 已构建但未运行，新增唯一 build ID `20261108-qc-r15` 直接继承正在运行的 r13 四份固定身份，不将 r14 作为前驱；r13 原四文件 SHA-256、项目/目录、映像、停机、账本和锁校验均不变。受控续接测试涵盖两种允许的 r13 后继、近似名称拒绝以及 r13 四文件逐项篡改和错误目录拒绝。本步未启停容器或修改账本，也不证明 r15 已构建或运行。后续命令为 `node scripts/p5/build.mjs 20261108-qc-r15`，满足既有前置条件后执行 `node scripts/p5/run.mjs resume 20261108-qc-r15`。

2026-11-08 r13 Docker/Chrome 定向复验：隔离双服务构建输入摘要 `24a0e37b374787d97353e458c65ded41017912f89c667997806ae58ae701a38c`，运行摘要 `e4d9b889689dac55471d6789888623ed8095d17891c094389c24f9e36ab337a1`，身份记录 `guarded-identity-1794129207329.json`。真实界面空情境查询显示明确提示后，源作品正常续作；revision 4 的实际持久化规划 root 带 `skill_evidence_projection: observation-ids-v1`，生成 Timeline v3，Preview/Master 输出及 Master QC passed。Host 输出 SHA-256 `da8922de9611de03ba6f60b71358c8114a920c8070b755408271da56dc998902`，12.267 秒、715451 字节，解码 1–9 秒与获准采访源同区间相关度约 0.999153；这证明相应采访信号存在，不证明人工听感、环境声满足或浏览器下载完成。

r13 档案与留出定向检查：源作品 revision 4 的真实反馈自动学习得到舒缓节奏与真实采访两项中文情境假设；revision 5 生成 v4 后，自动学习新增英语情境的紧凑节奏及采访假设，但未自动纠正旧原则。随后界面显式选择 v4 反馈和旧舒缓原则执行学习，Profile v10 的 correction 绑定旧原则 `principle:5fc91577bad0bb0bf4bf22013405d9a69171ba2b54c3e67cc2bf77fde316f560` 与其原来源事件，禁用该旧原则并新增中文情境紧凑节奏后继 `principle:df0c932b6e6e22953ec01656955b803a6d461a4014a8a7fd84fab26d77be8939`；中文采访原则和英语情境两项原则仍有效。档案内容摘要及关联只读核对通过，这本身不证明新作品效果或跨情境泛化。

本次未完成从新空项目导入留出素材；原记录将原因断定为 Chrome 扩展文件上传权限未启用，但没有可复核证据支持，原因未确定，见后续更正。改用既有隔离留出项目 `0ac6ee3f-3e59-402d-a7b4-18597f63964d`，它先前已参与 r6 预检，不是本轮全新项目，但未列入本次档案授权学习来源，processed events 和原则均无该项目来源。原请求过期后经正式界面新建并授权两个留出视频及 profile，未授权 feedback 学习。该新请求初次计划保留旧 v2 不变，提交失败；随后补充实际画面顺序调整，revision 2 的真实模型输入包含新纠正原则及中文采访原则、排除已禁用旧原则，输出 `applied_principle_ids` 列出二者，并提交 Timeline v3。Preview/Master 被 `CREATION_RENDER_QC_BLOCKED` / `SILENCE` 阻断，未形成可用新成片；失败对象 `bb43ebc28f281b45ec30e1dd06959c8b6be79d89f8a5088876b46a5b167243df` 保留。源视频各使用区间测得数字零，具体连续帧伪间隙根因及受控修复见上方 QC 记录；不得将模型列出原则写成可用成片已证明应用。账本本次检查为 146 笔、CNY 181.290204 / 200 保守预留、0 pending，并非供应商账单。用户接受 WIN-09 未验证风险，不记为通过；本次非单一连续完整旅程，P4/P5 完成和当前构建受影响验证仍待执行。

QC 连续边界修复验证：先用真实 Worker 协议与合成媒体复现原错误，再将可执行图的片段时间和区间覆盖改为 Fraction；Preview/Master 连续零源不再误阻断，真实一帧内部缺口、有声重叠仍阻断，未知/缺失来源与篡改仍失败。补充不同时间基精确相邻、1/30000 秒真实内部间隙、尾部恰好 50ms 和超限边界；完整 qc_master_protocol_smoke.py 与 git diff --check 通过。本次未触碰 Docker 或真实项目；新构建真实重渲染仍待验证。

2026-11-08 r15 Docker/Chrome 定向复验：隔离双服务构建输入摘要 `0a325fbe179714fe4890eb9e4a140be71c3641ffbeb4ebe59451ddc6d7d24535`，运行摘要 `5437c93a07c1dec00e4180258d9a71c69d00806a2fa0630515cad94809cf9331`，身份记录 `guarded-identity-1794132139246.json`。留出作品保留的 Timeline v3 经真实界面重渲染，Preview/Master QC passed 并保留非阻断 SILENCE 警告。只读快照核对显示 1/30 时间基的八片段连续覆盖 300 帧，实际顺序相对 v2 从 `sel_1,2,3,4,5,6,7,8` 改为 `sel_3,4,5,6,8,1,2,7`；模型输入和输出使用纠正原则的事实见前述 r13 记录，不单凭顺序变化推断偏好的因果作用。

Host Master 对象哈希 `f82f4c62f82b299c78f5ce25d3daa88115c96b936fc0aadf1942ae13031e1395` 核对一致，560531 字节、10 秒、H.264/AAC 48 kHz 双声道。实际解码的 PCM 全为数字零，QC 逐段确认使用的八个源音频区间均为数字零；这只说明输出与已测来源一致，不证明环境声、采访或人工听感要求满足。Chrome 下载事件完成，`C:\Users\24179\Downloads\AVE-v3 (1).mp4` 实际 560531 字节，SHA-256 同 Host。账本只读链校验为 146 笔、CNY 181.290204 / 200 保守预留、0 pending；不是供应商账单。本次为原留出项目的定向重渲染与下载，非 P5 完整连续验收，也不宣称 P5 完成。

r15 Chrome 窄屏定向观察：临时将视口设为 390×844，版本历史与创作页面能够渲染；键盘空格可开始及暂停留出 v3 播放，观察到播放进度由 0 推进至 3.18 秒。操作后已重置视口。该观察未覆盖完整 WIN-10，也没有连续录像，不记为全面通过。

r15 留出作品主轨定向交互：v3 首两段依次为 `sel_3`、`sel_4`；通过真实界面移动后 v4 互换，撤销得到 v5 并恢复原顺序，重做得到 v6 再次互换，随后再次撤销得到 v7 并恢复原顺序。这是针对主轨移动和撤销/重做的局部真实操作，不代表整项 OP 或 P4/P5 完整验收通过。

2026-11-08 r16 续接准备：为验证新音频合同构建的旧项目兼容性，精确构建 ID 20261108-audio-r16 将直接继承运行中的 r15 四份固定身份；沿用现有停止服务、无 helper、所有者锁、账本无 pending 和已修订 harness 守护，不放宽边界或允许近似 ID。当前只准备脚本与离线回归，不停止/启动容器、不修改账本；本步不证明 r16 已构建或运行，也不证明真实音频语义有效。

2026-11-08 环境声事件证据：按 ADR-0054 增加 observation v2 的有界、采样格点对齐声音事件，保留声学及转录各自的不确定性，原片流索引、样本摘要和 PCM 区间均受 Host/Storage 绑定；存储重读从已授权 observation 和 WAV 重建事件与测量，而非相信规划输入的标签。仅 v2 模型标为 ambient 且不确定性为 false、对应区间非零，才可作为模型观察进入本次请求的音频要求；音量和实际 Timeline 源区间仍须通过校验。受控 Host/SQLite fixture 覆盖首稿、已有 Timeline 续改、静音和错误证据拒绝、旧/新 deployment、重开及篡改；模型标注和非零 PCM 均不保证真实环境声或可听质量。模型将实际要求误判为 not_requested 仍不能可靠拦截。当前产品未注册或提供 v2 选择，本地 YAMNet 只返回 v1 描述且非零输入的分类不确定，不能证明环境声能力已接通。未调用真实模型或操作 Docker；r16 守护定向测试 22/22 通过，实际构建、真实素材和产品入口验收另行记录。

事件校验范围补充：对 v2 要求，旧轨的 time_map、变速、音频淡入淡出、自动化及其他无法证明事件实际通过的处理均保守拒绝；受控 Host 测试覆盖 hold 和淡入旧轨不能冒充目标事件。现有链仅证明源区间参与，混音可能相互抵消，短于 QC 检测窗口的静音也可能漏检；尚无渲染后对应事件区间的信号证据，不能声明最终事件非零或可听，真实 P5 仍未完成。

v2 只检查已解释的正向声音证据，不验证“必须静音”等负向要求，不能描述为完整音频意图能力；未经证明的源区间与时间线播放时长不一致也会保守拒绝，避免把播放范围以外的声音当作已参与。

事件证据受控回归结果：`stage3:observation:test`（包含 v2 合同和 PCM 属性测试）、`stage3:generation:test`、`stage3:product:test`、`tests/integration/stage3-split-model.test.ts`、`typecheck`、`contracts:check`（100 合同）和 `architecture` 均通过；以上模型为受控 fixture，并非真实模型或真实环境声验证。新增 Host 续改回归覆盖错误证据、静音、time_map hold、淡入和源时长超出实际播放范围均不提交，符合要求的源参与则可提交并重开。现有产品入口和本地声音服务仍不提供此 v2 事件能力，渲染后事件区间信号、负向静音要求和真实 P5 均未验收。

观察输出合同归档：将 v1 schema 及其正反例原样移入 legacy，保留原合同 ID 和旧版读取/重放；v2 为唯一现行 major。由生成器迁移对应 TypeScript/Python 绑定并清理旧位置，`contracts:check`、`contracts:identity`（含 100 项跨语言 roundtrip）、`contracts:clean`、`stage3:observation:test` 与受控 split Host 新旧观察重开均通过。`docs:check` 不再报告合同 major 冲突；本次路径迁移改变适用性指纹，当前仍报告历史 Evidence 与 programme 指纹不匹配，须重新分类，不将其当作通过。

2026-11-08 r16 Docker/Chrome 旧观察兼容定向检查：隔离双服务构建输入摘要 `efbb920dfdcf71f9f3cdad0b47d48d0a07c50541d1526b01dc581d95f4d6a34c`、运行摘要 `c60f4661611cc3207ac545e7f134d75c737d3fcaa5c6f7f8c4e07915ff03ea34`，身份记录 `guarded-identity-1794136093791.json`。Chrome 重开源作品 v4，界面显示 4 个素材、11 片段、38 采样和 30 条证据，实际预览播放至 12/12 秒；截图 `r16-source-compat-20261108.jpg` 为 154743 字节，SHA-256 `7f5243fefe91a6bc9566b52b9152a65faccef012224a30fe35563eb1f5ca969c`，图中可见 v4、4/4 素材与播放终点。对隔离项目只读核对：旧 `creation_observation` 外层 schema_version=1，内容哈希 `3dc2d938d06016cacb9644267ba54b4f9154d586d602608547e4c5eb4d488060` 一致，含 4 素材、11 片段、38 采样、30 evidence_refs；关联旧描述型输出对象 `680f9ce1281c007d9d93434bd4b9e59f8c99a3b663c5a3853e81d3f1cfb3c08a` 内容哈希一致。账本只读校验为 146 笔、CNY 181.290204 / 200 保守预留、0 pending；未发起新模型调用。本次只证明旧观察可读与既有作品定向重开播放，未对真实 observation v2 声音事件、环境声语义或 P5 完成作验证。

2026-11-08 r16 手动草稿状态误导：手动修改保存后，持久状态机使用 rendering 表示草稿等待渲染，并不证明 Worker 正在运行；工作台直接译为‘正在渲染’，容易误导。拟保留持久状态机，使用 Host 已有直接渲染活动投影区分进行中的渲染；无活动且草稿未制作时显示已保存待制作，附受控 Host 和工作台回归。当前仅实施与验证，不声称真实构建已复验。

2026-11-08 r16 灰度效果定向验证：源隔离作品通过界面对首镜 `sel_1` 应用灰度并提交 v5，手动触发制作后看到灰度预览；再选择无效果提交 v6 并制作，界面看到彩色预览。只读核对两个 Timeline 快照摘要一致：v5 `video-main` 对 `sel_1` 有启用的 grayscale 效果，v6 无效果；两版 Preview/Master 均有实际输出和 QC passed、issues=[]。v5 输出 SHA-256 `7562c187f7863f10f29942a4b707ee3a461499593a142a83377cc0cb5ae342b5`，v6 为 `68498b352b4d8bd8b1715e2eb41efc02149b53bae4133d5120b0eaffbc7cbb25`，文件摘要核对一致。对 Master 0.5 秒单帧解码，v5 RGB 通道平均绝对差为 0，v6 约 28.29；这是对应帧的客观颜色检查，非全片逐帧证明。彩色 v6 截图 `r16-effect-removed-20261108.jpg` 为 131359 字节、SHA-256 `aff1f74bf42d74d0fc2fe8fbc3843cdfe58817c79dc86cf107709c7aeac7753b`。账本仍 146 笔、CNY 181.290204 / 200 保守预留、0 pending；此为灰度应用和移除的定向操作，不声称 OP-14 完整验收或 P5 完成。
直接渲染状态需要在真实 Host 异步渲染期间验证，因此本包补充登记现有 tests/integration/stage3-render-host.test.ts，在其受控 Worker 流程中核对活动投影和结束清理。
2026-11-08 手动草稿状态投影验证：保存后的 rendering 状态在没有实际制作任务时显示“已保存 · 待制作”；Host 只在直接渲染操作实际存续时投影当前 revision 的制作阶段，完成后清除，未更改持久状态机。真实 Host 测试在渲染进行中读取工作区并核对阶段、完成后核对清除，合成媒体 Preview/Master 渲染通过；工作台状态回归 8/8、TypeScript noEmit 与 git diff --check 均通过。当前运行构建尚未包含此修复，真实界面复验待后续受控构建。
2026-11-08 r17 续接准备：为使手动草稿状态修复进入受控构建，拟使用唯一 ID 20261108-status-r17，严格固定继承 r16 四份已验证身份；保留已有目录、映像、停机、锁、helper、账本和预算检查，增加篡改与近似 ID 离线回归，不操作 Docker。r16 v10 字幕定向实测：实际画面显示字幕，截图 r16-caption-20261108.jpg SHA-256 636bc4acb7af5c8480985c2568645a6c3f77a612394a6459407791efe5033d8d。
r17 守护接续实现完成：23/23 定向测试通过，包含 r16 四份身份分别篡改、错误根目录、近似 ID 拒绝，以及既有停机、锁、helper 和账本校验回归；git diff --check 通过。此步未构建或启停容器，未修改账本。受控构建命令 node scripts/p5/build.mjs 20261108-status-r17；满足既有前置条件后执行 node scripts/p5/run.mjs resume 20261108-status-r17。

2026-11-08 r17 Docker/Chrome 运行现状：隔离双服务构建输入摘要 `6270b1b9c16080fdfd685d16a19e1ed17450978ae4717d1804b14e73137e86d2`、运行摘要 `5ec09d458e69a062fd5fa61c8aed0b62c3d6fcede673897055ccea9d603e98f7`，身份记录 `guarded-identity-1794137750088.json` 的摘要已核对。双服务启动时 healthy，既有账本为 146 笔、CNY 181.290204 / 200 保守预留、0 pending。Chrome 重开源作品 v10，界面可见已有字幕且显示输入已保存；随后 Host CPU 高，健康探针曾超时，原因尚待排查。此时手动草稿状态修复尚未完成真实构建复验；本记录不声称 P5 完成或所有运行状态正常。
2026-11-08 workspace 历史验证性能：源作品 10 个草稿、7 次渲染；隔离数据库快照、只读不可变对象的低优先级测量显示完整快照约 1.92 秒，而单次 readCreationState 约 9.02 秒，原因是每个草稿的音频投影再次读取并复验当前状态和历史渲染证据。拟仅在本次读取中复用已经经过完整验证且 actor 匹配的草稿状态，直接按已验证版本读取 Timeline，保留后续音频和证据检查；增加多草稿重复读取次数及下一次读取篡改拒绝回归。不跨请求缓存，不改变权限或持久数据。
2026-11-08 r17 Chrome 局部定向验证：源作品 v11 手动切换字幕轨后依次实际显示“已保存 · 待制作”“制作预览与成片”“可以看片”，最终观看 v11；待制作截图 r17-saved-pending-20261108.jpg SHA-256 1097219ec4c5641facf7fbd603849494070e15ecae88857601e1403f68a745fd，制作中截图 r17-render-active-20261108.jpg SHA-256 9f204f8a0fd7f970e8082e6d005ddaa0b3ed5e44aedab2f34184af0b7f8c6d71。此为手动草稿状态和直接制作的局部实测，不作为整个 P5 验收。
workspace 性能修复与回归：多草稿真实 Host 测试先复现单次投影重复读取完整请求 5 次，修复后为 0；依然从每次 workspace 的完整快照校验和 actor 过滤取已验证版本，并在异步档案读取后再次验证 actor 与 worker 状态。真实 Host 的历史草稿、渲染、后续证据篡改拒绝、异步期间凭据撤销拒绝三项定向集成，以及 TypeScript noEmit 和 git diff --check 均通过。该源码尚未进入 r17，隔离快照性能测量不等于修复后真实界面验收。
2026-11-08 r18 守护接续准备：为验证工作区历史读取性能修复，拟增加唯一 ID 20261108-workspace-r18，严格绑定 r17 的配置、Compose、构建和运行身份四份固定摘要；保留原有停机、所有者锁、helper、账本与预算约束，加入四文件篡改、错误根路径和近似 ID 的离线回归；本步不操作 Docker。
r18 续接脚本与定向回归完成：24/24 通过，包含 r17 四份身份逐项篡改、错误根目录和近似构建 ID 拒绝，原有停机、所有者锁、helper、账本与预算约束保持不变；git diff --check 通过。尚未构建或启停容器，也未修改账本。受控构建命令 node scripts/p5/build.mjs 20261108-workspace-r18；满足原有前置条件后使用 node scripts/p5/run.mjs resume 20261108-workspace-r18。
2026-11-08 精修提交性能：r18 启用字幕轨保存成功 v12，观测上界约 101 秒；源码显示同步段反复完整读取请求及历史渲染证据。拟仅合并同一同步段的重复读取，并将原子事务 BEGIN IMMEDIATE 内已读取且核对 hash 的 state 传入最终 guard；所有实际 await 后重新校验、证据完整校验、权限/素材文件身份和事务边界不变。先增加重复读取回归及权限失效/原子失败测试，暂不改变运行中的 Docker。
r18 Chrome 局部实测：同作品重开在 23.4 秒观测上界内恢复可操作（包含工具间隔，非精确耗时）；启用字幕轨最终保存为 v12，等待观测上界约 101 秒。截图 r18-saved-v12-20261108.jpg SHA-256 809599c6c9910104b1ba9945c1b6b0bf391f10c00940d24a6fbfe4a6ed2642ee；此结果未包含后续手动提交优化。
手动提交性能修复回归：事务 guard 中额外完整读取请求的次数修复前为 1、修复后为 0；每个实际异步来源验证后仍重读，原子事务内仍完整读取并核对预期 hash；同步段复用已验证的父草稿状态及提交前状态。真实 Host 合成素材集成通过，覆盖来源检查等待期间授权到期拒绝、原子失败和重放；TypeScript noEmit 与 git diff --check 通过。当前运行中的 r18 不含本修复，真实交互耗时尚待后续构建复验。

2026-11-08 r18 Chrome 素材面板定向观察：创作页选择音频筛选后仍停留在创作；切换免费音频库后仍在创作。进入素材页后免费音频库选择保留；在素材页切回我的素材再返回创作页，音频筛选仍保留。截图 `r18-creation-audio-filter-20261108.jpg` 为 146491 字节，SHA-256 `307c76649fb0047b5f45cecbf56b5047e5674290473cc5dba79ecb7590cc653e`，记录回到创作页后的音频筛选状态。这是共享状态与独立页面的定向切换验证，不代表拖拽或完整 P4/P5 验收。

2026-11-08 r18 Chrome 授权素材加入定向观察：读取获准片段后，尝试将 `visitors-main` 授权片段拖到镜头带，未观察到页面状态变化，原因未确定，不能记为拖拽通过。随后选择同一获准片段，选择主视频插入并顺延落点，点击“添加到播放头”后界面显示当前编辑 v13、已保存待制作；播放器仍为 v11，v13 尚未制作。截图 `r18-creation-add-v13-20261108.jpg` 为 146900 字节，SHA-256 `5778b29cb6f450c45f8b00d496db8b00d04df7335c9f3bb6a28ae6185b7da642`。这是按钮加入的局部界面观察，不代替拖拽、渲染或完整 P4/P5 验收。
2026-11-08 r19 守护续接准备：唯一构建 ID 20261108-audio-r19 将严格继承 r18 的配置、Compose、构建和运行身份四份固定摘要，保持既有停机、所有者锁、helper、账本和预算约束；增加四文件逐项篡改、错误路径和近似 ID 的离线回归。本步不修改业务源码、不构建或操作 Docker。
r19 续接脚本与定向回归完成：25/25 通过，逐项覆盖 r18 四份固定身份篡改、错误根目录和近似构建 ID 拒绝；原有停机、锁、helper、账本和预算约束不变。git diff --check 通过。尚未构建或操作 Docker；后续受控构建命令 node scripts/p5/build.mjs 20261108-audio-r19，满足原前置条件后 node scripts/p5/run.mjs resume 20261108-audio-r19。

2026-11-08 环境声要求的界面和工作区投影：初单及普通续改可显式选择本次 AI 制作“必须保留环境声”或取消该硬要求；不选择时沿用既有要求，取消并不表示静音。工作区仅投影真实记录的 revision 动作，原始用户文本和素材、音频数据授权不因该选择扩张。当前片段或已有批注与该选择同时提交时明确阻止并保留输入，避免未支持的组合提交静默丢失。续改输入仅在成功回执与提交请求、具体 revision、原文和动作一致，且项目、表单世代、输入未变化时清理；失败、其他窗口并发更新或切换项目均保留。首单等待期间的新输入也保留。

该界面不保证手动精修、组合修改或混音后仍满足环境声要求；当前实际声音观察服务尚未提供可信的真实 v2 环境声事件，不能据此宣称真实环境声制作已通过。受控 Host/SQLite 测试、工作区投影集成、renderer 属性测试、隐藏工作台 DOM 交互回归 8/8、TypeScript 检查及架构检查通过；覆盖失败与远端相同动作、无动作及切换项目的并发保留。当前源码尚未进入 Docker/Chrome 实际构建，真实交互及真实 v2 音频链尚待验证；不声称 P5 完成。

2026-11-08 r19 Docker/Chrome 局部观察：构建输入摘要 `dbdd8c2424b7aac0a99f9a18240f61338a7abb20579876058a43ed02aad77269`、运行摘要 `dbb336c7e69d7b8ebb2a12b208e4481c5e41789e89d16336c1eeffb1f0b40916`，身份记录 `guarded-identity-1794141279064.json`；账本为 146 笔、CNY 181.290204 / 200 保守预留、0 pending。同一作品重开 v13，在精修中确认首段为已获准视频、总计 9 段；停用字幕后生成 v14，在 37.7 秒内观察到保存，此数为包含观察间隔的单次上界，不是性能基准。Chrome 环境声选择可切换至“必须保留”并恢复沿用；未提交请求，未进行模型调用。截图 `r19-workbench-v14-20261108.jpg` 为 129194 字节、SHA-256 `09072813b629fb7bbd8929d17c669e36741b1f0e3619352f50bdae7337cad15f`；`r19-ambient-selection-20261108.jpg` 为 129611 字节、SHA-256 `828f137c444fcbc762f4c564465072be8e7af174444e404f939308fb4272ef92`。本次仅为局部交互观察，不证明环境声生产或 P5 整体验收通过。

2026-11-08 r19 Docker/Chrome 真实环境声负例：同一已授权源作品 revision 6 显式选择必须保留环境声。第一次执行因查询包含该请求未授权的 profile，返回 `REQUEST_DATA_DENIED`；该 revision 没有模型调用。随后在 Chrome 档案选择“仅查看项目”，保留已有授权并继续同一 revision，返回 `CREATION_AUDIO_EVIDENCE_INSUFFICIENT`，未生成新作品版本。当前错误提示偏技术化，正在修复；这次只验证授权及证据不足时的拒绝，不证明真实环境声正向能力。截图 `r19-ambient-denied-20261108.jpg` 为 128916 字节、SHA-256 `655497bceff1bc2e130252da4ca94bacfac3a52dc4d2560d172048d96604c687`；`r19-ambient-insufficient-20261108.jpg` 为 162359 字节、SHA-256 `7457036673844620851853fd6c5bcb1b87387e7f11088d1f3a8447b78b29b1fa`。
2026-11-08 r20 守护续接准备：唯一构建 ID 20261108-errors-r20 将严格继承 r19 配置、Compose、构建和运行身份四份固定摘要，保留停机、所有者锁、helper、账本和预算约束；增加四文件逐项篡改、错误目录和近似构建 ID 的离线回归，不改业务源码、不操作 Docker。
r20 续接脚本与离线回归完成：26/26 通过，覆盖 r19 四份身份逐项篡改、错误根目录和近似 ID 拒绝，原有停机、锁、helper、账本与预算约束不变；git diff --check 通过。尚未构建或操作 Docker；后续受控构建命令 node scripts/p5/build.mjs 20261108-errors-r20，满足原有前置条件后 node scripts/p5/run.mjs resume 20261108-errors-r20。

2026-11-08 r19 负例提示修复：Host 仅在所选档案是唯一未授权数据类别时返回专用拒绝码；其他或多个未授权类别仍保留原拒绝，均不改变授权、查询或自动重试。桌面错误映射明确“档案 → 仅查看项目 → 制作 → 继续制作可播放版本”和新请求明确授权路径；环境声证据不足提示未生成版本、检查已获准素材或明确取消本次硬要求。真实 Host/SQLite 合成回归覆盖档案拒绝、同一修订手动移除查询后证据不足、无新增规划调用或草稿及其他权限拒绝；桌面授权定向测试、architecture、typecheck 通过（本地假模型，不代表真实 UI 新构建验收）。r19 启动时守护账本 seq 292，两个真实负例后只读仍为 seq 292；此结论仅适用于该守护账本。下一步在固定身份的新构建复验用户可见提示；不能据此宣称环境声正向能力或 P5 完成。

2026-11-08 r20 Docker/Chrome 定向提示观察：身份记录 `guarded-identity-1794142349282.json`，构建摘要 `1dcc1dc3ddc46f77092d99572851ff0d0e0fc52c837dbe89c27a1bcbbf0197f3`、运行摘要 `aeb44584f925f56b80512591d27bd77f2b477205c1f7452e2b1c53949d4ffd7f`；启动时账本序号 292、146 笔、CNY 181.290204 / 200 保守预留、0 pending。对同一 revision 在不使用档案的情况下继续制作，Chrome 显示中文环境声证据不足提示，旧版 v11 保留；再选择已有档案查询并继续，同一请求显示专用中文档案未授权及恢复路径。最后恢复“仅查看项目”，未扩大授权。截图 `r20-ambient-message-20261108.jpg` 为 162353 字节、SHA-256 `fd70c02ae93e1e5b42183fe53cb35ed8dc4f8eac4513a4853417103158372506`；`r20-profile-message-20261108.jpg` 为 163913 字节、SHA-256 `5aa7b06cc3e004d0de540467383957586555a0fbe121c2d7ab8e497e26a646ea`。这是错误提示与恢复路径的局部观察，不代表完整验收或真实环境声正向能力。

2026-11-08 r20 Chrome 已有成片导出定向验证：选中已就绪的 v11，界面显示预览与成片检查通过，确认文件列表后下载至 `C:\Users\24179\Downloads\AVE-v11.mp4`；下载文件为 767834 字节，SHA-256 `68498b352b4d8bd8b1715e2eb41efc02149b53bae4133d5120b0eaffbc7cbb25`，与 Host 同一渲染 `render-027901a0e47db85afc243ead` 的 Master 对象摘要一致。该渲染 Preview/Master QC 均 passed、0 issues；成片 12 秒，H.264 640×360、30 fps，AAC 48 kHz 双声道。截图 `r20-download-v11-20261108.jpg` 为 42725 字节、SHA-256 `71f81f05ecac5bb22f5043b69241bc31707ed869fbfe59662900f9c4deeedb51`。这是已有版本的导出定向验证，不证明硬性环境声要求已满足，也不代表 P5 完成。

2026-11-08 r20 Chrome 正常关闭与重开定向观察：输入显示已保存后，通过作品管理关闭，并从最近作品重开；界面仍显示 4/4 获准素材、当前编辑 v14、观看 v11 及明确的环境声 require。问题页仍保留档案未授权与环境声证据不足两条记录；v11 导出页仍显示预览和成片检查通过及 1 次文件写入。截图 `r20-reopen-issues-20261108.jpg` 为 121978 字节、SHA-256 `46f58fead1844cf3d7b13539a6431800d16cf01da8bb77288bf9b918d260542e`；`r20-reopen-export-20261108.jpg` 为 98758 字节、SHA-256 `231669bce24a74ea6efd7d344f11128228eb1fc2259adfd8942fcf0695fe6611`。本次只验证该作品的正常关闭及重开后的定向状态，不代表 P5 整体验收。

2026-11-09 r20 重做版本静音 QC 定向调查：在隔离作品中首段视频从 34/30 秒缩至 33/30 秒，v16 撤销后重做生成 v17。v17 的 Preview 和 Master 实际均被 SILENCE 阻断；两者均检测 0–1.13329 秒静音。可执行图所绑定首段原片的 0–33/30 秒经完整来源与 PCM 检查为严格数字零，Host 从已提交 Timeline 的音频参与补集产生的 `planned_silence_intervals` 包含后续 33/30–34/30 秒的一帧无音源区间，采访从 34/30 秒开始。原 QC 只能分别判定整段静音完全落入计划区间，或整段完全被可信零值来源覆盖，未识别零值来源与计划空段连续组合。先添加真实 Worker 协议回归并复现阻断，再修改现有 QC handler 和 smoke；所有路径已在本包 allowed_paths。

2026-11-09 静音 QC 修复及验证：保留原纯计划静音判断及其 50ms 边界容差；该既有容差可能掩盖边界附近少量有声采样，未声称消除此风险。在原判断失败后，新增路径以精确 RationalTime 分段核对已验证图：每一有活动音源的分段须所有活动片段的原片区间独立证明为严格数字零，无活动源的分段须被计划空段覆盖；未知或非零活动重叠、未覆盖的内部微缝均阻断。新增路径不对内部间隙使用容差，只有验证图和源节点一致声明的实际输出尾部才允许受限 50ms 容差；无图旧行为不变。真实 Worker 协议 smoke 的 Preview/Master 零源加计划空隙回归修复前阻断、修复后 passed，伪造计划、缺失空段、1 个采样点有声重叠等反例仍阻断；完整 Worker QC smoke 和 `pnpm run stage3:precision:test` 通过。此为受控合成媒体验证，r20 真实 v17 尚未以新构建复验，不声明 P5 完成。

上述 1 个采样点重叠反例的图已统一时间基并通过 RenderGraph 编译和 Worker QC 协议阻断检查，但未运行编译生成的 FFmpeg 命令；该反例使用的视频片段位于帧间，不代表生产真实渲染。零源加计划空隙正例使用实际媒体并经过真实 Worker 协议检查，其结果不证明该反例的渲染能力。

2026-11-09 r21 守护续接准备：为复验当前 QC 修复，唯一构建 ID 20261109-qc-r21 拟严格继承 r20 配置、Compose、构建和运行身份四份固定摘要；保留现有停机、所有者锁、helper、账本和预算约束，补充逐份篡改、错误目录与近似 ID 的离线回归。仅准备脚本和测试，不操作 Docker，不代表已构建或验收。
r21 守护续接脚本与离线回归完成：27/27 通过，覆盖 r20 四份身份逐项篡改、错误根目录和近似构建 ID 拒绝；原有停机、锁、helper、账本与预算约束不变。git diff --check 通过。本步骤未构建、启停容器或修改账本；源码稳定后受控构建命令为 node scripts/p5/build.mjs 20261109-qc-r21，满足既有停止、锁与账本条件后执行 node scripts/p5/run.mjs resume 20261109-qc-r21。

2026-11-09 普通请求过期恢复：r21 中重渲染遇到 `REQUEST_EXPIRED`，既有续期入口只在失败批注消息中出现，普通制作和渲染没有入口。为当前已过期且未取消或撤销的请求增加显式入口，复用既有 Main 原范围确认对话和 Host 续期命令，活跃运行、权限状态未同步或续期待处理时禁用；续期成功后由用户手动继续，不增加授权范围或自动重试。到期显示依赖客户端时间，最终资格和原范围仍由 Host 校验。

挂载 Electron DOM 测试覆盖普通失败请求可见、显式点击、待处理/活跃运行/失效状态禁用及未过期/撤销/取消隐藏；注册 IPC 和真实 Host/SQLite 的定向回归覆盖取消无写入、未知字段拒绝、确认对话展示原范围、续期 24 小时且其他授权字段不变。`stage3:p4-workbench:test` 8/8、桌面授权定向回归及 `typecheck` 通过；原生对话响应在测试中受控模拟。源码尚待进入后续 Docker 构建及 Chrome 真实流程，不据此宣称完整 P5 验收。

续期确认补充复用初单的接收端和各模型分工地址展示；空部署仍明确显示未配置。真实 Host 四路由定向回归验证原接收端逐项展示、取消无写入、续期后完整范围及草稿、修订和模型调用不变；桌面授权测试及 `typecheck` 通过。未增加模型权限或自动启动任务。

2026-11-09 r22 Docker/Chrome 定向观察：身份记录 `guarded-identity-1794198233674.json`，构建摘要 `db0f7495ce3ff6cb33ff137284e6aa1d6df1149e81de43d5834c9107de2700a8`，运行摘要 `f20daacce8a2298e662de72ac4008e6a0262ea121ac089616a27f986a118a777`；启动时守护账本序号 292、0 pending。Chrome 中原请求过期后显示新增续期入口，点击后确认对话展示原四项素材、授权数据范围、各本地及阿里云接收端和 24 小时续期。截图 `r22-reauth-review-20261109.jpg` 为 107324 字节，SHA-256 `bb89fdac6b38bda3c5b3f40b227d68cfbccfec49fd0e8614e6989dacb6c701e3`。本次尚未执行最终确认，v17 重渲染尚未完成；该观察不代表 P5 整体验收。

2026-11-09 r22 续期与渲染失败：用户确认后，Chrome 显示原请求续期成功、授权范围未变；随后手动对既有 v17 点击制作，返回 `CREATION_MATERIAL_GRANT_REQUIRED`，未生成可播放画面。截图 `r22-renewed-grant-failure-20261109.jpg` 为 93490 字节，SHA-256 `32eb1b3e16cbbc6a75966bcebe26e5e37dd65f4751bc398add47588eee627424`。容器日志表明失败在来源验证，渲染路径要求素材凭证的授权代次和摘要严格等于续期后的当前授权；旧草稿所用凭证仍绑定续期前代次，导致误拒。续期历史和原范围、素材身份及权限仍须校验，不能通过绕过授权解决。下一步修复并在新构建复验；本次既未验证 v17 质检修复，也不代表 P5 完成。

2026-11-09 r23 守护续接准备：唯一构建 ID `20261109-grant-r23` 固定继承 r22 的配置、Compose、构建和运行身份四份摘要，保留停止、所有者锁、helper、账本和预算约束。`node --test tests/integration/p5-run-resume.test.mjs` 29/29 通过，覆盖四文件逐项篡改、错误路径、调换顺序及近似 ID 拒绝；本准备未构建或启停容器。

2026-11-09 续期渲染修复：渲染旧草稿时复用已有续期链核验，继续校验旧授权摘要、原素材及不可变对象身份和权限，以及当前请求的撤销、取消、到期和运行状态。真实 Host/SQLite 受控回归中，两次原范围续期后重开并完成双目标渲染和质检；到期、素材权限变更和撤销仍拒绝，拒绝不发布成片。修复前同一正例复现 `CREATION_MATERIAL_GRANT_REQUIRED`；测试使用合成编码媒体与本地模型 fixture。首次回归因测试插入位置处于模拟关闭之后失败，调整测试顺序后完整通过；`typecheck` 与 `architecture` 通过。未将此结果推广到其他续期后的低层创作入口。

2026-11-09 r23 Docker/Chrome v17 定向复验：构建输入摘要 `83ffd93667bb6e35d7e71dd49224f7685dc964c93969adf2113682b26c62344c`，运行摘要 `9b772699effb65e0432029c28bc7db7b5372faafe6c084d5767fcc12490c155d`，身份记录 `guarded-identity-1794200022348.json`；启动时账本序号 292、146 笔保守预留 CNY 181.290204、无 pending。正常关闭作品后切换本任务隔离服务，重开同一作品并手动制作 v17，界面显示预览和成片检查通过、静音提示不阻止导出。新渲染 `render-e28615d9bf6da75381c5b3de` 绑定 Timeline v17，两目标 QC 均 passed，各有一条 0–1.13329 秒的 `SILENCE` 非阻断警告；真实输出重算摘要均为 `04e3d16dd0d12814dad19fa622226022d0b56b52434fa52246d13f28fbeb3d1a`，各 871106 字节，H.264 640×360/30fps，视频 13.133333 秒、AAC 48kHz 双声道音频 13.133 秒；解码全片音频非零（mean -23.6 dB、max -4.3 dB）。截图 `r23-v17-qc-pass-20261109.jpg` 为 88137 字节，SHA-256 `9b48ef9f3818937fff22d86db8002395629f956d218a873e5076d0e8d817c047`。此结果验证该已保存版本的续期渲染及零值源与计划空档组合质检，不证明环境声要求、人工听感或 P5 整体通过。

同一 r23 工作台选择观看 v17，实际预览从 0 秒播放，可跳转至约 6 秒并继续至 13 秒；比较界面显示 v17 与 v16 两个独立播放器和实际画面。成片导出页检查通过，确认后显示已准备的下载链接；点击链接后默认 Downloads 目录暂未发现 v17，保存结果未确认。该定向操作不构成完整连续 P5，也不证明声音已被实际捕获或人工听评。

本轮 `acceptance:final:synthetic`、`interaction-acceptance:test`、`typecheck`、`architecture` 通过；DOC-011 的 r23 分类见 `EVD-20261109-DOC-011-R23-CLASSIFICATION-R14`。`docs:sync` 通过，`docs:check` 和包含它的 `pnpm check` 因两个当前 P4 交互 scope 的证据适用性未满足而退出 1，后续总检查未运行；38 项历史范围维持 UNVERIFIED。复核运行身份 `guarded-identity-1794201152464.json` 与 r23 输入/运行摘要一致，账本仍为序号 292、CNY 181.290204 保守预留、0 pending。完整 P5 的新项目导入、同构建连续流程和独立留出链仍未完成。

2026-11-09 Chrome 文件选择纠正与 r23 导入：用户截图显示 Chrome ChatGPT 扩展的“允许访问文件网址”目前开启；截图不能证明此前状态。r13 时将失败确定归因为该权限未启用缺乏证据，现已在原记录更正。此次第一次将文件选择事件注册在工作台外层“导入”按钮前，实际按钮只打开 AVE 上传对话框，10 秒超时；随后在对话框内的“选择本机素材文件”之前注册事件，成功选择公开许可 `piccolo-performance.mp4` 并提交导入。界面显示独立留出作品 v0 的批次 1/1 完成、0 失败；截图 `r23-chrome-holdout-import-20261109.jpg` 为 86339 字节、SHA-256 `6482362a3646786c323fce457fc210c65d7284bbdb4f2085e47f17bf352a6f16`。本次是浏览器文件选择器局部成功，不能据此反推 r13 失败的根因，也不代表完整 P5 旅程或学习链通过。

2026-11-09 r23 留出声音负例：只读核对新导入作品 `9582f5a8-24c5-49cc-8fec-52aacad13e73` 未参与当前隔离档案学习，导入文件 SHA-256 `e1c777bb33e1eec7d68b63b598c5a9b751347bac47a12d2a6c7ed15c00e25677` 与登记素材一致；该公开演出文件曾用于其他历史预检，不能称系统从未处理过。界面读取当前档案的采访和纠正后紧凑节奏两项测试原则，以自然语言请求保留演奏原声，明确不授权本作品后台反馈学习。真实规划输入包含这两项原则，第一轮模型正确引用原话并提出 `source_audio` 要求；本次 `source-evidence-v1` 无区间绑定的非静音事件证据，Host 保持失败关闭，未生成草稿或成片，不能称原则已应用。界面错误提示却一律写成环境声硬要求并建议取消开关，而本次开关未指定；这是错误文案，不应通过放宽声音证据修复。截图 `r23-holdout-audio-evidence-20261109.jpg` 为 123888 字节、SHA-256 `85a3852fb614846b8cffcf6842de32a5186da0cbf00be29ad81d520536c157f4`。最终账本序号 300、150 笔、CNY 185.588400 / 200 保守预留、0 pending；不是供应商账单。该负例不证明真实原声正向能力或完整 C6。

2026-11-09 r24 错误提示修复与定向复验：对共享 `CREATION_AUDIO_EVIDENCE_INSUFFICIENT` 的普通原声和环境声失败改用中性提示，不再假定用户选择了环境声硬要求，也不建议无条件取消。真实 Host/桌面错误映射回归分别覆盖直接错误和 `MODEL_OUTPUT_INVALID` 包装原因，修复前断言失败、修复后通过；`typecheck` 通过。守护续接专项 30/30 通过。r24 输入摘要 `93a8fbbba42b1ac0a206ff30a3b6c2391a22b3d1fbc0e41c5472e5e09179a6db`、运行摘要 `a34922caabe368ac6d59790ca6807d399faa2e46405f59ed61f77876d849242e`，身份记录 `guarded-identity-1794208340346.json`。Chrome 留出项目第二条受控要求显式要求可核验环境声，界面返回“无法可靠核验所要求保留的原素材声音”，未生成新版本；截图 `r24-sound-message-20261109.jpg` 为 121335 字节、SHA-256 `a41dfd4238cf0460b3e23671d58c74caa270dd905a5f82ba8d875be75f24a186`。原证据校验没有放宽；该负例不证明真实音乐或环境声正向能力。

同轮在原请求上误以为“继续制作”会触发无付费的原环境声负例；实际续期后逐项重新准备四份素材，分别间隔约 74–77 秒，随后复用已有 v17 渲染并触发该请求此前获准的后台反馈学习。新增一次模型调用保守预留 CNY 0.939792、已收到响应，结果没有新持久偏好；界面与只读状态确认操作结束、v17 不变。此前无付费的预期错误，未将其作为提示复验。代码中完整历史校验重复路径与单核持续高负载相符，尚无执行栈证据证明唯一原因；未为提速削弱历史完整性检查。DOC-011 r24 分类证据 `EVD-20261109-DOC-011-R24-CLASSIFICATION-R15` 保持 38 项历史范围 UNVERIFIED，`docs:sync` 通过，`docs:check` 因两个当前 P4 交互 scope 仍退出 1。

2026-11-09 r24 混合素材无模型费用定向检查：新建隔离作品 `P5 r24 混合素材导入检查 20261109-9e464ac6`，使用浏览器文件选择器导入已登记公开素材 `visitors-main.mp4`、`coast-main.mp4`、`coast-photo.png`、`interview-audio.wav`，界面显示 4 成功、0 重复、0 失败、0 取消。音频播放器显示从 0:00 运行到 0:02，随后切换视频并观察播放到 0:02 / 0:08；图片缩放键盘右移显示 1.05。素材页音频筛选切回创作页仍生效，点击音频卡未离开创作，切换免费音频库仍在创作页；截图 `r24-create-audio-library-20261109.jpg` 为 113148 字节、SHA-256 `64b2af09662ba6dbc3b25d4ff3f0a1fc5c1c04d24acdc1af5ef84784849b2cbc`。正常关闭并从最近作品重开后 4/4 素材及完成批次仍在。没有捕获实际播放声音；浏览器文件选择事件不是原生系统文件选择器验收，本轮也没有从头连续完成 P5，不能据此关闭 WIN/C 矩阵。

同一作品追加有效 `coast-holdout.mp4` 和既有 79 字节损坏测试样本，批次显示 1 成功、1 失败，已登记素材总数从 4 增至 5。使用“仅重试失败项”重新选择同一损坏文件后，成功项未重复，记录保留两次独立 `moov atom not found` 原因；每次失败后未登记的临时上传被清理，当前恢复提示为重新选择来源。截图 `r24-retry-invalid-20261109.jpg` 为 121660 字节、SHA-256 `e6889efaa1dc32a2e00197908673d300456ce6283bbdd92229fe67570c1032c9`。另在选择 `visitors-holdout.mp4` 后、提交前取消上传，列表仍为 5 项；这是对话框取消，不是批次中途逐项取消。重试成功替换损坏文件及用户接受风险的 WIN-09 同名来源场景不在本次通过范围。

声音观察评估准备：为定位真实音乐与原声证据缺口，在活动包登记 `scripts/p5/audio-event-evaluation.py` 与 `tests/integration/p5-audio-event-evaluation.test.mjs`，用于离线窗口/标注对齐和边界回归；现有 top-5 预检不能计算逐类、逐录音的可复核结果。新工具仅供探索评估，不注册生产服务或改变置信阈值。候选 STARSS22 为 MIT 许可的室内强标注实录，按官方训练/测试房间分离；其 100ms 标注和四声道来源不能直接证明任意场景或精确边界，未标注区间不等于静音，音乐与乐器分开报告。数据和结果以来源、文件/派生摘要绑定，未取得完整覆盖或独立验证时保持候选未合格。

2026-11-09 声音离线探索：从 STARSS22 官方来源按事先固定规则取训练/留出各两段，官方许可、README 和标签包经发布方 MD5 核验；音频按 HTTPS Range 读取并逐条核对长度与 ZIP CRC、计算 SHA-256，前后 HEAD 一致但范围响应不保证版本原子性，完整 ZIP MD5 未验证，已有 partial 保留。来源与限制记录于 `starss22-v1-20261109/subset-receipt.json`（SHA-256 `22627392663636343d756f4c6780e78793e1b0714f470a3c445ddda950a58d13`）。四条录音分别在 network=none、只读输入的一次性 Docker 内，以固定前两声道无损派生并运行当前 YAMNet 候选；推理不挂载标签、不访问真实产品服务或账本。探索工具将记录、模型/类别表、源/派生 PCM 和标签身份绑定，检查跨分区房间及 PCM 重复；独立复核发现的绑定漏洞已补齐，定向测试 10/10 通过。

四段对齐结果为训练 1076 窗口、留出 517 窗口。充分标注窗口的未校准分数中位数：训练 room6 speech 0.969、instrument 0.262，room21 speech 0.852、music 0.082；留出 room8 speech 0.918、instrument 0.031，room23 speech 0.918、music 约 0。未知不是负例，窗口相互重叠，样本少且非代表性，分数不是概率，未调阈值、未计算声称合格的准确率。汇总 `inference-train-r1/summary-four.json` SHA-256 `120b41bf7413b0bcf99fa20f6ee6854ab1b5f763ea46b2a44c91cbc38bd17e22`，完整结果 `report-four.json` SHA-256 `9263d797aa902d766da30109cd962da52ef787fb103d2126278da23e9f860578`。数据集偏室内且乐器覆盖少，结果说明不能仅凭当前候选分数将音乐/环境声事件标为可靠，不完成 P5 或真实原声正向能力。

2026-11-09 AST 替代候选探索：从 [MIT AST 模型仓库](https://huggingface.co/MIT/ast-finetuned-audioset-10-10-0.4593) 固定提交 `f826b80d28226b62986cc218e5cec390b1096902` 下载权重和配置，权重 SHA-256 `ae0c1e2ad4e1381d851fa9bf298ba13ebc9c5a914cdee2dbe427a6583869924d` 与官方记录一致，模型元数据标 BSD-3-Clause、模型卡由 Hugging Face 团队编写；来源收据 `ast-candidate-20261109/receipt.json` SHA-256 `143e225046bd626e573f88b612c29f3a42bee8bc82810ce9fa8610cb2cf9ea59`。四条录音各固定前 10 秒，前两通道平均后重采样至 16kHz，宿主 Python 以离线加载标志及 local_files_only 运行，推理过程不读取标签；此做法并非操作系统级断网。独立汇总 527 维 logits/sigmoid 后才对照标注：两个音乐标注 99/100 帧窗口的 music 分数分别约 0.392 和 0.0057；四个首窗均无乐器标注，不得作为乐器漏检依据。汇总 `summary-first10.json` SHA-256 `dbfb13580c7d66c7f70e72f1b8419ad8c599bea0804c3322542400473c8cecc0`。

另按标注选择每条 TAU 录音最早连续 10 秒乐器窗口：训练 [90,100) 秒，留出 [63,73) 秒，各有 100/100 帧乐器标注；留出另有 50/100 帧语音并发。训练/留出对应 instrument 分数约 0.867/0.146，不能推断差异成因；该标签引导选窗不属于无偏留出资格评定，选窗先于推理没有不可篡改的事前注册证据。选窗记录 SHA-256 `d2146ec016cd2f0c24e34d28dc08de15b44662bb71c75d77c5c8c3eccd09a4a7`，汇总 `summary-instrument-windows.json` SHA-256 `fade19a7af5b6d8bb6ea68517d45f39309a60d5450b0e39b73244b42fd0d5910`。独立只读复核来源、区间和结果一致；NumPy 特征回退存在第 3 个 mel 滤波器全零警告，尚未证明与 Kaldi 实现等价。分数未校准且不是概率，均不提供精确事件边界或生产合格证据；保持原失败关闭与现有生产部署。

AST 特征警告定向对照：在独立证据目录取得官方 `torchaudio 2.7.1+cpu` Windows wheel，SHA-256 `c6b82f209797d0b6e46c33a76facb39987141c453f85d9d0fa849363d47c2f42` 与官方索引一致，包内许可证为 BSD；只隔离解包使用，未安装到系统或修改生产配置。四个已有真实 10 秒输入的 NumPy 回退特征 SHA 与先前结果一致，与 Kaldi fbank 分支比较，归一化特征平均绝对差约 `4.43e-7` 至 `4.53e-7`；静音及 440Hz 正弦另作合成对照。`fbank-comparison-r1/comparison.json` SHA-256 `7903f4f0d6608b1513b48ff73b4a5f921f9ab5c8d45bb0737daac749ad8afb98`。回退初始化报告 mel 滤波器索引 3 全零；这六个固定输入上的接近不证明所有输入等价或模型可靠。首次隔离命令因 Python `-I` 禁用用户 site-packages 找不到 NumPy 而失败，保留轮次；核对解包内容后以正常解释器完成，未升级依赖。

2026-11-09 工作台测试时序诊断：`stage3:p4-workbench:test` 首次运行共享 Electron harness 在原 30 秒限时下超时，8 个测试共享同一失败；stdout 已有完整结果，但当次未记录各阶段时间，不能确定是检查超时还是退出阶段延迟。保留该失败；随后只增加固定标签的单调时钟和进程退出诊断，不更改超时及断言。一次新诊断运行 8/8 通过，启动到最后 capture 27.489 秒、capture 后返回约 0.039 秒、调用退出至子进程关闭约 0.322 秒；该运行退出正常且限时余量较小，不能倒推或抹掉首次超时。日志 `docs/evidence/assets/p4-ux/r24-workbench-diagnostic-20261109.log` SHA-256 `5fc464e207170af38c90add1f03aa568e512754c417e5d7502a8efaaf7bc156a`。本地 UI 回归不替代真实连续验收。
2026-11-09 r24 定向下载：Chrome 的下载事件返回 `C:\Users\24179\Downloads\AVE-v17.mp4`，文件 871106 字节，SHA-256 `04e3d16dd0d12814dad19fa622226022d0b56b52434fa52246d13f28fbeb3d1a`，与 Host 已保存成片一致；未触发模型调用。这是单项下载核验，不是完整 P5。

2026-11-09 原音轨保护执行单元：在活动包登记 ADR-0055 与原轨校验测试路径；先设计版本化的明确源轨选择及其已授权来源、精确保护区间和时间线完整覆盖，再贯通请求、规划、模拟提交及持久化重建，保留显式环境声保护；最后验证错源、缺段、静音路由、时间网格、修订和当前项目重开。用户明确当前为开发者模式，不需要旧项目或旧 proof 兼容迁移，旧实现可以直接替换；测试证据和卷保留。此保证只覆盖源轨参与，不声称音乐分类、最终听感或 P5 通过；如不能完成完整调用链，保持未完成并记录原因。

只读审查后的未完成项：v1 观察存储视频观察范围，生成时 Host 依据新鲜 probe 与视频范围相交计算可编辑边界；现有草稿重建核对保存的规划根、观察范围和实际 Timeline，但没有独立重建已选择音轨的完整解码边界。保存根中的 `editable_start/end` 自身不足以证明完整音轨。不能为本项全局放宽 `source-evidence-v1`，也不能以非零 PCM 或源描述冒充音乐事件。先查明原片与 probe 的权威持久化位置，实现并测试可重读的流边界身份基础，再贯通保护提交与重开；跨时钟无法精确覆盖或目标时长冲突须拒绝。上述为待实施要求，不是运行时能力；未改变环境声语义。

创作区素材与免费音频库增加播放头落点提示文案；挂载回归 `stage3:p4-workbench:test` 8/8、`renderer:workbench:test` 和 diff 检查通过。此项未调用模型，r24 尚未包含该改动，也不作为浏览器验收。

原音轨开发进度：版本化本地请求修订记录已授权 asset 的 require/clear，授权详情展示选择。Host 从当前授权 material 和持有的 immutable 原片重新探测并固定音轨边界，模拟和原子提交前验证完整连续覆盖，读取草稿时重建素材、来源和 Timeline 绑定；完整帧表仅留在 Host 根证据，模型仅收到精简边界。受控本地 provider 的真实编码素材已完成完整原轨、缺段、错源、静音的初步 Host 回归，Preview/Master 解码及重开通过；不同时间标记、证据篡改、产品界面和当前 Docker/Chrome 真实流程仍待验证。手工编辑无法证明该要求时明确拒绝，拒绝前不会中断进行中的旧版本渲染。`contracts:check` 和阶段性类型检查通过；首次边界测试因将异常代码误当异常文本匹配失败，修正断言后通过。本结果不代表声音分类、听感或完整 P5 通过。

原音轨受控回归补充：使用每秒不同频率的真实编码合成音频，Preview 与 Master 均按时间窗口验证源顺序；另验证非零源起点的完整 `[1s,4s]`。项目重开后分别在独立事务中篡改实际源引用、material 授权代次、material 摘要与 Timeline 覆盖，均触发对应重建/存储拒绝并回滚。100000 项音频帧列表的规划投影测试确认各轮模型请求不包含完整帧表或本地 material 身份；它们留在 Host 根证据。上述为本地 fixture 和实际 Worker/FFmpeg 的定向回归，未调用云模型，不代替真实演出声音识别、人工听评或当前 Docker/Chrome P5 验收。

声音语义复核：曾复现模型把“素材 A 的原轨”和“素材 B 的演奏”拆成两项、均引用 A 的源轨时被错误接受；现禁止同一源轨证明用于多项独立要求，并要求规划语义上按目标/来源拆分，其他要求走独立证据或返回歧义。单条引语仍可能被模型错误地合并两个目标，或者模型漏报其中一项；本次没有用关键词代替语义判断，完整源轨证明不代表已理解或满足其他声音要求。此局限保留为真实风险，不声称已完全解决自由文本理解。

2026-11-09 r25 续改失败分析：revision 2 要求更紧凑的镜头转换并继续完整保留原音轨，最后在模拟 Timeline 的源轨起止覆盖检查失败；未提交新草稿。已登记失败只有两轮模型响应摘要和用量，Host 在注册模型结果之前抛错，未保存当次实际选段及模拟 Timeline，无法判断是模型选择还是编译映射造成边界缺失。已确认的产品缺口是原音轨嵌在画面时，缺乏仅凭用户明确选择及本地权威源轨证明创建独立连续音轨的可用路径；不能以发送音频样本给模型替代此功能。下一单元先用真实 Host/Worker 受控回归复现，再在现有 CommandEditIR 模拟/提交路径中实现源轨独立安排及去重，保留环境声独立验证，覆盖重开、Preview/Master 和错源、静音、缺段拒绝；此分析不表示真实续改已修复。

2026-11-09 r25 守护构建与隔离续接：受控续接只允许 `20261109-source-track-r25` 继承经核验的 r24 四份固定身份；续接定向测试 31/31、`stage3:p5-tools:test` 64/64 通过，原有停机、锁、helper、卷和预算检查保留。r25 desktop/whisper 镜像分别为 `sha256:caf2d87c1c7a8a35c9a9da4e1c394bcb6f6c542d1dbd0a820d1b50f6c4479fd8`、`sha256:830a9b4e1db770185b2c3317d75a5c9da358438575018533efc8c47f762a98bf`，双服务健康；构建输入摘要 `5852afee09e56c471c14a35411a3c53c11ba98c1d949ee0253ec45801fcb594f`，运行摘要 `ff59015a798fdc34d71ed88a67f054d71a2d3d570e11866d6c5ca653c864bdb4`，身份记录 `guarded-identity-1794218348568.json` SHA-256 `c89d2f05109a3c1ee14d135418bbc170f72c782add3b40215ca58a6a26cfa96d`。只读账本收据 `r25-host-state-20261109/budget-receipt-316.json` SHA-256 `58375b3a14bf8904cde5e68d29c889ed5c9593f6d347999ac69419ded1870a91`：序号 316、累计保守预留 CNY 194.126736 / 200、0 pending；其中列出的 r25 初稿五次预留合计 CNY 5.360508，保守预留不是供应商最终账单。

2026-11-09 r25 Chrome 真实首稿与下载：在隔离作品 `b497b151-cee2-4984-b9e0-5b866ed4ef03` 对已登记 `piccolo-performance.mp4` 明确选择完整原音轨，使用真实创作流程生成 v1；界面正常关闭并重开后作品仍可访问。只读 Host 收据 `r25-host-state-20261109/host-receipt.json` SHA-256 `1b77e072a27ada441b8772f51cd750bc37d4a5720d10e7524022bc2cee34acfc` 记录 revision 1 的原始要求、该素材的 require 选择、规划引用、完整 384000 样本源轨边界及一个 0 dB、240 帧的来源片段；Preview/Master 各自 QC passed、issues 为空。Chrome 实际下载 `AVE-v1 (4).mp4`，956139 字节，SHA-256 `fb176ca924d27465a7a19e4d604e83ab080b5c468fbd47e6414cfe2b0254400e`，与 Host 双目标输出一致。

实际音频对比 `r25-source-track-audio-comparison-20261109/comparison.json` SHA-256 `5d8fd9fedb8078b2ae388eb62e8b47c67dc562bbe6eede422854cb9a3a1fc752`：原片与下载均为 8 秒 AAC 48 kHz 双声道，原片视频 8.008 秒、输出视频 8.000 秒；统一解码为 48 kHz 单声道后各 384000 样本、均非全零。±50 ms 搜索的整体最佳偏移为 0 样本，整段相关 0.9993136；0–2、2–4、4–6、6–8 秒依次为 0.9982034、0.9993508、0.9998513、0.9998980，各段最佳偏移均为 0。解码相关不等于音乐语义识别或人耳听评，单项结果不代表完整 P5、C5 或其他阶段通过。

同一作品的 revision 2 续改为“请把演出剪成更有节奏感的作品，通过更紧凑的镜头转换突出表演，同时继续完整保留原音轨。”本轮 Chrome 界面实际观察返回 `CREATION_SOURCE_TRACK_UNMET`，已有 v1 未变；截图 `r25-revision2-failure-20261109.jpg` 为 184497 字节、SHA-256 `2fdd0cf6baf98fe1748c1e11425906cb3c4ddebbaa504d153bb360a6bf0ab5b3`，记录当前界面而非连续录像。此项目前没有失败 Host 收据，上述 revision 1 收据不代表该失败的原因。Host 侧根因正在只读调查，不将失败归因于素材不足、用户要求或模型，也不将失败记为续改通过。

2026-11-09 r26 守护续接准备：唯一构建 ID `20261109-independent-track-r26` 绑定 r25 的配置、Compose、构建和运行身份四份既有文件及双服务镜像，保留停止、所有者锁、helper、账本和 CNY 200 上限等原有条件；近似 ID、文件逐项篡改、交换与错误根目录均被拒绝。`node --test tests/integration/p5-run-resume.test.mjs` 32/32、`pnpm run stage3:p5-tools:test` 65/65 通过。只读确认 r25 desktop 与 whisper 两服务健康、镜像和构建及运行身份一致；本次准备没有构建、启停服务或触碰实际账本。r26 的构建与真实续改尚未执行。

2026-11-09 独立原轨实现及定向验证：Host 根据已授权原片与精确完整边界，经现有命令编译、模拟和提交生成独立连续音轨，画面同源嵌入音频使用真正 muted 路由；不向模型发送音频。受控真实 Host/Worker 测试以两段倒序画面和空模型音频决策生成作品，Preview/Master 每秒 440/660/990 Hz 顺序、非零源起点、重开及独立轨错源、静音和截断篡改拒绝均通过；另覆盖首稿和续改的 A/B 声音歧义拒绝，无云模型调用。短于完整源轨的目标明确报告时长冲突；被静音的画面不能作为逐字字幕的音频锚点，受保护片段的原嵌入音频不能被隐式静音。`stage3-edit.test.ts`、`timeline-core.test.ts`、类型检查和 `git diff --check` 通过。真实 r25 失败候选未持久化，无法断言其具体选段或根因；r26 Docker/Chrome 真实续改及完整 P5 验收仍待执行。

2026-11-09 手动拖放原轨接续：r26 Chrome 实际拖入获准视频时旧手动守卫返回 `CREATION_SOURCE_TRACK_NOT_IMPLEMENTED`，v1 未变。本轮 Host 改为重新持有并探测当前授权原件、绑定 material 与原轨证明，在模拟和原子提交时验证完整覆盖，重开时重建证明；界面插入同源画面时生成明确静音路由以避免双重原音。真实 Host/Worker 受控测试通过 Renderer 实际拖放命令（缺失静音拒绝、有静音成功）、草稿重开、错源/缺证明/摘要篡改和环境声双约束拒绝；未调用云模型。既有 `stage3-manual-draft-host.test.ts`、源轨属性、P4 时间线命令、`contracts:check`、TypeScript 和 diff 检查通过。原轨和明确环境声同时要求时，手动后继尚不能重建环境声事件证明，明确失败关闭；此项尚需新 Docker 构建和 Chrome 真实拖放复验，不能记为 P5 完成。

2026-11-09 r26 Docker 与真实首稿：隔离双服务以 `20261109-independent-track-r26` 运行，desktop/whisper 镜像分别为 `sha256:96303525d3448cf20821d21cf848c05dec83830e008e5518b3de4bc44097a2e3`、`sha256:373826cab0707017d21f26bc4575c49182882699520d9a103ea2fa6ffa577023`；构建输入摘要 `4001caa38cc84b4a16884fe85f698005eea8add5f5045b9975587eafd82b7b74`、运行摘要 `abae1770ccfef13351abefb9d100838c645a542f2b30b038c491c2728387dd40`，身份记录 `guarded-identity-1794220516648.json` SHA-256 `b0b1b41f89dd77d741889df9651f4e795f34d071a480b2fa75a635ebe0be116f`。Chrome 在新隔离作品 `3685a6e9-1eee-49ac-ba45-fbcffffcc236` 用已登记 `piccolo-performance.mp4` 发起 revision 1：“请把演出剪成更有节奏感的作品，通过更紧凑的镜头转换突出表演，同时完整保留原音轨。”本次明确选择该素材完整源轨；授权对话仅选“本次要求、当前作品与时间线、素材观察与证据、素材抽帧”，音频、转写、个性化原则和免费音频库未选，后台学习未授权，也未选择环境声硬要求。这是新项目首稿，**不是** r25 原作品 revision 2 的续改复验。

只读 Host 收据 `r26-host-state-20261109/host-receipt.json` SHA-256 `a7ecf3b541d31291ca3483561f1d031356526d0b4607ab89cf52ad99435bc6d4`：v1 有两个各 120 帧的画面镜头，来源区间分别为 `0–960000/240000` 与 `952952–1912952/240000` 秒，画面嵌入音频路由均 muted；一条独立原轨从源 `0–384000/48000` 秒、时间线第 0 帧持续 240 帧、0 dB。模型终稿 `audio=[]`，Host 以源轨绑定安排独立轨。Preview/Master QC 均 passed、issues 为空，Host 成片及 Chrome 实际下载 `AVE-v1 (5).mp4` 均 952760 字节、SHA-256 `097d7aca8713e6f8d9f992932b1714cdd24d8d60ac7edf1e05cf7a829297c750`。界面正常关闭并重开，截图 `r26-independent-track-reopen-20261109.jpg` 为 185123 字节、SHA-256 `4ba2de2fdf14e70c94d3be240e45ca4e109cf197ff230ea843060007685ea466`；截图不是连续录像。

下载与原片实际音频比较 `r26-source-track-audio-comparison-20261109/comparison.json` SHA-256 `98e547ba4f5e2eb7ea4190363c6a4866b76debeb8bf763c8aa70cf6316b130a4`：原片和输出音轨均为 8 秒 AAC 48 kHz 双声道，统一解码为 48 kHz 单声道后各 384000 样本且均非全零；±50 ms 搜索最佳偏移 0 样本，整段相关 0.9993136，0–2、2–4、4–6、6–8 秒分别为 0.9982034、0.9993508、0.9998513、0.9998980，各段最佳偏移均为 0。输出视频为 8 秒，原片视频为 8.008 秒。与 r25 单镜头结果的画面抽样记录 `video-comparison.json` SHA-256 `8238b97709ce1f3f41f1a6d547aab72f5e26d9247e385a4cb6f14463d692135b`：每秒 4 帧共 32 帧的最近原片画面均为同时间索引；该抽样不能精确判定剪辑点。r25 与 r26 是不同构建，不作为同构建 C5 差异验收；解码比较也不是音乐语义识别或人耳听评。

只读预算收据 `r26-host-state-20261109/budget-receipt.json` SHA-256 `857907a635fa079f41a70b705aa909d341cb0a1798b183061a15eaa74fa5d1e5` 记录序号 326、163 笔、保守预留 CNY 199.543272 / 200、剩余 CNY 0.456728、0 pending；保守预留不是供应商最终账单。真实 C5 的同构建不同意图、C6 完整独立留出学习链和完整连续 P5 旅程仍未完成；不以本次局部首稿关闭这些条件。

2026-11-09 r27 Chrome 拖放与成片观察：在 Docker 隔离工作台重开作品 `3685a6e9-1eee-49ac-ba45-fbcffffcc236`，从创作区拖入同一获准素材，实际生成手动草稿 v2；随后由 Host 渲染并在界面观看。截图 `r27-drag-v2-20261109.jpg` 为 154229 字节，SHA-256 `8edcceec3189cb0229e6880154c5799ec0b660a910a0bb3797c59ebf082067fe`，只记录当时界面，不是连续录像。交互暴露播放头落点提示误导：同版本主动 seek 后播放位置与编辑游标未可靠同步，实际拖入落在开头，当前正在修复和验证。

只读 Host 收据 `r27-host-state-20261109/host-receipt.json` SHA-256 `605440918ba7e83bff3bd0a90e3bfc7c2e1d37419a8579e17d5bd963a743f4fc`：v2 共 16 秒，新增 8 秒画面位于 0–8 秒，原画面顺延至 8–16 秒；三段画面原声路由均 muted，完整原轨从时间线第 240 帧持续 240 帧。Preview/Master 分别 QC passed、issues 为空，输出各 1792714 字节、SHA-256 `1830bf76a9f26845d18f67beddb6a738795118c3d0ac47763833dd30fa72bc5c`。对实际成片按 48 kHz 单声道解码：0–7.95 秒共 381600 个样本全部为零，7.95–8 秒 2400 样本中有 192 个非零，不能称整个前 8 秒全零；8–16 秒各区段非零，与 v1 的 0–8 秒等长样本 Pearson 相关 0.998738。已确认该前段缺声与当前路由和原轨位置一致；正在修复不与完整原轨重叠的新画面保留自身原声，重叠冲突须明确拒绝。QC passed 不等于整段有声或人工听评通过。

只读预算收据 `r27-host-state-20261109/budget-receipt.json` SHA-256 `0ccda27b77e1a38411e19ee02f49e022db5aa91476a361795a46a63353465c69`：账本较 r26 不变，序号 326、163 笔、保守预留 CNY 199.543272 / 200、剩余 CNY 0.456728、0 pending；保守预留不是供应商最终账单。该单项交互和渲染不构成 C5 或完整 P5 通过。

2026-11-09 r28 修复：r27 实际播放器定位与编辑播放头未同步，拖放落点错误且新增视频原声被自动静音。当前修改仅在观看与编辑版本身份一致的用户主动 seek 时同步精确帧；旧版本观看不反向改写编辑位置。非重叠同源新增视频保留原声，Host 以完整独立原轨证明并拒绝实际重叠。Renderer 工作台 8/8、属性及边界测试通过；真实 Host/Worker 受控回归覆盖相邻有声、部分和完全重叠拒绝、双输出逐秒音频与重开。r28 守护续接 34/34、P5 工具 67/67，通过且保留原账本和 200 元上限；尚待新构建真实 Chrome 验证，不代表 P5 完成。

2026-11-09 r28 Docker/Chrome 定向复验：隔离双服务以 `20261109-seek-audio-r28` 运行，desktop/whisper 镜像分别为 `sha256:38f7b77199b8496072f4f3a8511e3ecf9ce57dbf665cf0647159cfc031327fc9`、`sha256:ef6878624b3d3144377e87ea2147c351dc21e6b4243a311d8c960b0bfbb24b5c`，只读观察均健康；构建输入摘要 `af2eadaa3b1ed088fbc95ef80337bd80408f221fed1139f86a7f19c47760e89e`，身份记录 `guarded-identity-1794223138902.json` SHA-256 `4ddf668a62f5a5637659b07294e88b526f9b8532fc350cf9b7f1b9d6e33436f1`。r28 源码指纹对应 DOC-011 [R21 blocked 分类](../evidence/runs/EVD-20261109-DOC-011-SEEK-AUDIO-CLASSIFICATION-R21.md)：38 项历史范围仍 UNVERIFIED，`docs:sync` 通过，`docs:check` 因两项当前 P4 交互证据适用性未满足退出 1。此前 Renderer 工作台 8/8、源轨属性及真实 Host/Worker 受控回归、守护续接 34/34 与 P5 工具 67/67 均通过。

Chrome 在同一作品 v2 将播放器定位到 16 秒，选择已获准视频片段并点击“添加到播放头”，生成手动草稿 v3；这项操作是按钮插入，不是直接拖放。三次直接拖放尝试均未出现新版本或错误：v2 对目标坐标 1050/824、950/824 各一次，v3 对 1040/824 一次；现有观察不能判断原因，也不能标记直接拖放通过；r27 曾实际拖放成功。截图 `r28-v3-20261109.jpg` 为 178908 字节，SHA-256 `81b454d3fd94776059d3d13550717507f7cf55917e42b1f40115917bcaeaaa4f`，仅记录当时界面。

只读 Host 收据 `r28-host-state-20261109/host-receipt.json` SHA-256 `63d1a7fa148a0243c1e7bdfe0c488dbfc7a0d168bfc8786f751125e518443d4b`：v3 共 24 秒，新视频在 16–24 秒且未静音，独立完整原轨仍在 8–16 秒；旧 v2 引入的前 0–7.95 秒全零静音继续存在。Preview/Master QC 均 passed、issues 为空，输出各 2760247 字节、SHA-256 `a159fd5eabd89014b911ee88d14174ec7a064cdaf093a64398d1db6bbcaabf77`。48 kHz 单声道解码的新片段 16–24 秒全部 384000 样本非零，与源片 0–8 秒在零偏移比较的 Pearson 相关为 0.999337，四个 2 秒区间分别为 0.998317、0.999313、0.999858、0.999893；未进行偏移搜索，解码比较不等于人工听评或声音语义识别。

只读预算收据 `r28-host-state-20261109/budget-receipt.json` SHA-256 `2841342c33eedd42363330a92ea699e2197c2459e72d6837cf50384391f8b1a0`：账本较 r27 不变，序号 326、163 笔、保守预留 CNY 199.543272 / 200、剩余 CNY 0.456728、0 pending；保守预留不是供应商最终账单。真实 C5 同构建不同意图、C6 完整独立留出学习链及完整连续 P5 旅程仍未完成，本次局部结果不关闭这些条件。

2026-11-09 新增预算授权：用户说明账户剩余 99.63 元全部可用于 P5 收尾。当前账本序号 326、保守预留 199.543272 元、0 pending；为避免重复计入可用余额，本轮总保守上限固定为 299.173272 元。延续同一账本、素材许可、模型配置与隔离服务；续期不发模型请求。现已实现固定 r28 身份的离线续期及 r29 守护接续，专项续接测试 35/35、P5 工具 68/68；尚待独立复核及实际续期，不能将测试当作预算已经变更。

2026-11-09 用户人工验收反馈（待处理）：创作页“创作要求与授权”中的新创作要求区域过窄，用户无法看清内容；需检查实际布局和不同窗口尺寸下的可读性。用户再次明确要求：用户将素材放入作品即代表授权用于创作，不要再反复要求用户授权。后续需据此梳理并调整实际界面及对应权限流程；本条仅记录反馈，尚未修复或验收。

补充反馈：用户指出“AVE 创作请求授权”弹窗展示模型接收端、数据范围等技术细节，并要求逐次点击“授权本次创作”，严重打断正常剪辑流程。用户要求将这类许可改为登录后的默认许可条款，不再在每次创作时弹窗确认；素材放入作品即视为授权用于创作。该产品要求与登录、条款及现有数据处理权限边界如何衔接，待实现时梳理；目前仅记录，尚未修改或验收。

2026-11-09 正式测试入口：依用户要求删除 AVE P4/P5 测试容器，未删除任何卷；原 P5 作品留在其独立卷，不自动出现在正式作品列表。正式 Compose 使用 6084（6080 已被其他应用占用），desktop 与 whisper 均 healthy，首页 HTTP 200；正式配置不包含 P5 素材白名单，也不继承 P5 预算守护。创作区域布局、首次使用说明及工作台文案已调整；授权专项、工作台回归、类型、架构及契约检查通过。真实素材创作与新版 UI 仍未完成整条交互验证；不得由健康检查推定所有功能已经完成。docs:check 仍有证据适用性失败，P5 尚未关闭。

本轮创作入口文案改为“开始制作”，因此将三个真实旅程测试调用方 `tests/fixtures/stage3/real-journey.ts`、`tests/fixtures/stage3/real-journey-continue.ts` 和 `tests/integration/stage3-mixed-real.test.ts` 登记进当前工作包并同步其按钮选择器；这仅同步入口名称，不代表完整真实旅程已验收。

实施范围补充：当前产品没有登录；为保存首次使用条款接受状态并由主进程执行统一检查，将 `apps/desktop/src/main/types.ts` 与 `apps/desktop/src/main/host-context.ts` 加入活动包范围。需保留 Host 素材与数据范围校验，不能虚构登录或静默视为已接受。

首次使用说明实现：首次发起创作时说明所选素材与创作信息、配置的模型服务、可选音频和档案及后台学习；用户接受后按模型接收服务身份在本地保存版本化记录，后续请求及同范围续期复用；服务变化重新说明。Host 仍核对请求、来源、范围和会话。专项 `pnpm exec tsx tests/integration/stage3-desktop-authorization.test.ts` 和 `pnpm run typecheck` 通过，当前尚未在正式 Docker 构建实际交互验收；产品尚无登录，此说明不冒充登录条款。

2026-11-09 用户真实测试反馈（待设计与修复）：创作对话仍暴露“请求”“授权范围”、数据类别、模型服务标识、环境声硬性要求等内部术语和大段实现说明，按钮含义不清；信息过多、区域拥挤，用户难以找到选择素材、描述意图、开始制作的主流程。此前加宽弹窗只解决部分空间问题，未解决信息架构和可理解性。用户要求移除创作主界面中无必要的技术信息，以用户友好的语言呈现。修改示例：标题“创建视频”；展示“已选择 3 个素材”及“选择素材”；大输入框提示“描述你想制作的视频，例如：剪成一段轻松的旅行短片”；提供“声音设置”中的“保留原声 / 自动配乐 / 不使用声音”等清晰选择，以及“开始制作”按钮。无素材时提示“请先添加素材”并给出入口；已有作品续改时再显示“修改整个视频 / 修改当前片段”。示例为待实现设计，选项须与真实能力及原声保护约束对应，不得制造伪功能或静默丢失用户要求；详细配置仅在确有需要时提供，错误使用可理解的原因和恢复操作。尚未修改或验证。

2026-11-09 用户明确本轮重点是 UI 整改：以创作、素材与上传和问题页面的实际呈现为范围，围绕选择素材、表达意图、开始制作重整交互；使用真实项目状态和 Host 既有路径，不以模拟数据替代功能。界面隐藏内部细节时必须正确传递实际必需数据并保留素材来源校验，所选音频或档案等额外范围不静默扩大。正在实现，尚未完成验证或 Docker 更新。

本轮 UI 实现与受控验证：创作区使用实际素材选择卡并默认选中可用的导入素材，创建时自动提交必需数据和有效期限，续改隐藏仅对新请求有效的声音选项；素材面板与上传窗移除内部身份展示，问题页区分记录与就地提示。类型、架构、web-host 和素材面板定向检查通过；工作台受控 DOM 最近一次 8/8 通过，此前两次在 active-layout 到 30 秒超时，保留该不稳定事实。Docker 镜像已构建，真实用户素材及完整视觉流程尚未验证。

2026-11-10 用户交互调整：创作对话记录改为独立可滚动区域，用户不在底部时新消息不强制跳转；创作要求、保护镜头、声音设置收进输入区的加号菜单并打开独立设置面板。保留原控件和 Host 状态路径。受控 Electron 定向测试通过菜单、窄视口、Esc 焦点、滚动与素材提交；综合工作台测试在 active-layout 30 秒超时，不标通过。Docker 6084 已更新，实际界面核对菜单三项与滚动条；未发起新的模型调用。首次镜像构建遇 Docker API 500，服务随后自行恢复，重试构建成功；未重启 Docker 或其他项目。

2026-11-10 制作失败只读定位：最近 v2 Preview 为 60 秒、3120×4160、30fps、15 段；00:30:14 至 00:35:29 的 render.timeline.v1 记录 BLOCKED/TIMEOUT，调用未指定专门超时，Worker 客户端使用 300 秒加 5 秒通信余量，另有取消与清理耗时。更早 v1 预览亦超时，同分辨率、33 段；两者不同于前一日视觉模型连接失败。Preview 未作尺寸缩放，且失败时未进入 Master 或 QC；高分辨率是明确负载线索，但临时文件已清理且没有 FFmpeg 进度记录，无法断言是处理慢还是卡住或特定滤镜故障。关闭页面会断开事件流并使外层窗口操作失效，但已进入的 produce 调用未传入该窗口取消信号，实际记录为 TIMEOUT 而非 CANCELLED；不能认定关页是根因。后续容器重建由用户明确授权，与此前失败分开；本轮未修渲染、未再次运行模型或渲染。

2026-11-10 本轮任务：按用户要求仅实现真实渲染进度和清楚的失败原因，完成必要代码验证后停止，不继续真实产品验收或付费模型请求。增加活动包内 FFmpeg adapter、渲染 handler 和 Worker client 路径，用于将真实帧进度从 Worker 传到 Host 和工作台，同时保留超时/错误根因并脱敏展示；不得编造进度或声称已解决此次高分辨率渲染超时。

2026-11-10 渲染进度与诊断：编码阶段由 FFmpeg 实际帧数驱动分目标进度，准备、音频处理及输出收集等子阶段记录状态；静默运行以限频心跳保存耗时，失败保留当前任务最后的脱敏诊断和退出状态。Host 按作品、请求、修订、任务与尝试绑定工作区展示，手动渲染和制作流程均覆盖；用户界面显示安全摘要，原始本地记录限制长度并脱敏。已做针对性 Worker、Host、存储及前端代码测试；未执行真实媒体产品验收或模型付费请求。该改动不承诺已修复此前高分辨率渲染超时，历史未记录的信息不能补造。

2026-11-10 用户授权低资源跨平台容器改造：真实项目的 45 秒、26 片段、3120×4160 Preview 被 Docker 内核记录为 global OOM，FFmpeg 被杀；当前 Stage3 禁止代理，整文件读取、所有片段单图和无界重任务并发均不满足 2GiB 总预算。先处理流式存储与资源约束，再实现语义正确的代理、分段和恢复，最终验证 amd64/arm64 与真实旅程，不以组件测试宣称完成。工作包 manifest 加入 docker/compose.low-resource.yaml（隔离的两服务预算）、test_low_resource_ffmpeg.py（线程配置验证）及 render-bundle、render-persistence、project-storage 测试（流式发布、完整性与原子性验证）；这些路径是该任务必需。保留现有脏文件及运行容器，不自动部署、重启或使用付费模型。

构建身份补充路径 scripts/docker/build-reliable.mjs 和 tests/architecture/build-identity.test.mjs：为 amd64/arm64 分别构建、核验平台及镜像身份，不发布镜像，不把单架构结果冒充双架构验收。

资源调度补充路径 resource-gate.ts、stage3-resource-gate.test.ts、desktop/main/model-configuration.ts：为 Worker 与本地模型调用提供相同可取消资源闸门并验证关闭/排队；已有 worker-client、model-gateway、host-context 在工作包范围内。服务端未确认推理结束时不得释放配额。

登记 packages/platform/job-engine/src/public.ts：资源队列等待取消需持久化为 CANCELLED 而非 BLOCKED；沿用已有 job-persistence.test.ts 验证，避免取消被误报为失败。
2026-11-10 低资源改造进行中：已增加独立 low-resource Compose overlay 和编码日志有界尾部；FFmpeg 线程约束尚须与版本化执行策略绑定；新增可取消 Worker FIFO gate，排队不开始 Worker deadline，关闭需确认 producer drain；Whisper/YAMNet 尚未接入，不能称全局调度。渲染结果暂存/完整性校验正在改为有界流式处理，正式 Browser 的草稿预览与下载仍有整文件读入路径。增加按 linux/amd64 或 linux/arm64 明确构建并校验镜像平台的入口；尚未实际构建或验证两平台。受限连续片段分段执行器仅为未接线实验，尚未具备完整语义、持久检查点或生产身份。新源码使历史 Evidence 指纹失配；docs:check 当前失败，不能标记能力完成。下一步完成生产发布与模型 gate 的正确性验证，再设计跨权限、跨重启的分段身份及完整 Browser 流式路径。

登记 packages/platform/project-host/src/media-browse.ts：复用受 session 与范围读约束的素材流式能力，为 Stage3 已授权草稿 Preview/Master 建立 opaque token，避免正式 Browser 预览与导出整文件载入。具体渲染、handler、server、UI 与回归文件均已在活动包中。旧 Stage2 preview Host 方法未见现行产品路由，不恢复旧路由。

分段执行预备：现行只允许一个 current adapter，低资源环境不能隐藏切换同一 v7 身份。登记 ADR-0056、render 三份现行 schema/示例、生成验证器和定向集成测试路径，用于同步升级 Host/Worker/Storage 执行身份及只读旧回执；切勿将尚未实现的 v8、代理或分段声明为当前能力。生成合同遵守仓库 codegen，历史记录不改写。
低资源模型资源记录：仅 overlay 设置固定 Speaches 的 WHISPER__TTL=0，转写完整响应后在释放共享 lease 前读取同源 loopback /api/ps；管理器非空、不可读或响应不完整时阻断后续任务。已确认该检查不外传 api key；管理器空只证明模型引用释放，native allocator 可能保留内存，RSS 与 2GiB 目标尚未实测。自建 Host/provider 必须注入同一个 gate 才受限。运行中服务未重建。

登记 tests/integration/stage3-bounded-render-host.test.ts：真实 Host→Worker→QC→bundle 受限线性执行与权限／失败关闭必须单独验证，现有夹具包含尚未支持的增益与reframe，不能简单设置环境视为低资源通过。

登记 worker/render-result.v2 schema 与 valid/invalid 示例：v8 Worker 必须按图真实报告 original/proxy/mixed，Host 以正式合同验证来源与执行身份，避免原片冒充代理；历史回执只读，不改写。

登记 creation-render-adaptation.v1 / creation-render.v2 合同和正负例、静态图片及视频代理 Worker 路径/注册表、ProxyMap 测试及 ADR-0057：Stage3 原 generation 固定 original/profile/plan，不可直接替换；新适配须绑定现行授权与精确身份、960 预览 profile、经过验证的代理和时间映射、独立目标计划，并与结果原子登记。图片保留 EXIF 转正、alpha，复杂构图/字幕的画布坐标需经适配保持语义；不允许缺代理回退原图或重写历史。

登记 worker/media-still-proxy request/result v1 合同及 valid/invalid 示例：派生图片必须在 Host/Worker 边界校验源身份、生成参数与输出身份，防止新代理路径缺字段或 rebound。
2026-11-11 续接：登记 media.preview-proxy.v1 的 Worker、请求/结果合同、正负例与真实协议测试。现有通用 media.proxy.v1 会按最小帧数截断且原片/代理流索引假定相同，不能证明新的 Preview 时间范围被完整覆盖；新任务必须验证每帧及首尾映射，不影响旧任务调用。
2026-11-11 用户调整优先级：暂停低资源渲染优化，现有两服务原镜像已恢复至6084，接续云端 Qwen 语音与声学接入。登记 model-gateway/qwen-audio-asr.ts 与 tests/integration/qwen-audio-asr.test.ts：阿里兼容 Chat ASR 不返回时间戳，须按官方原生 Qwen-Audio-ASR HTTP 协议保存真实词级时间、完整输入、精确发送与审计；既有任务授权不自动改绑。接入、定向测试、镜像来源与实际部署分别验证，不把容器健康冒充完成用户制作。
2026-11-11 云端 Qwen 启动补充范围：登记 docker/configure.py、start-desktop.sh、health-desktop.sh、compose.cloud.yaml、docker-packaging.test.mjs 与 Docker 操作文档，以显式角色配置注入云端音频凭据，仅在实际本地模型启用时启动和检查本地进程；保留原项目/配置数据卷与旧混合模式，缺凭据或模型能力不伪成功。切换部署须先验证配置和接口，禁止覆盖用户工作区未完成低资源改动。

2026-11-11 云端切换执行记录：在原桌面镜像 `sha256:6207ee74cdcebcc2134696e8c4a8241585335c1fa18ccf46ffee7f3f26c7f612` 上仅叠加云模型网关和启动脚本，生成 `ave-desktop:qwen-cloud-20261111-r2`（`sha256:d2f4474e1a6333737be08ffa655f962cf2d1078821e7a60b73ccc329b175efc8`）；镜像内 `qwen-cloud-overlay.json` 记录叠加来源，此镜像不代表当前完整工作树构建。实际配置为视觉 qwen3-vl-plus、转写 qwen-audio-3.1-asr-flash、声音 qwen3-omni-flash、规划 qwen3.7-max-2026-05-20，凭据通过现有配置注入，不写入镜像或覆盖文件。隔离容器用合成语音真实调用转写与声音，获得两句带时间转写及声音结果；空识别的服务错误有独立记录，不能推断为静音。定向协议与启动测试、typecheck、contracts:check 通过；未验证真实项目的完整制作。首次 Compose 启动因默认 6080 已被其他服务占用而失败，随后显式恢复原 6084：桌面容器 healthy、HTTP 200，原项目、上传、配置及素材挂载保留；本地 Whisper 已正常停止。非密钥运行覆盖文件位于用户 AVE Docker 配置目录，原 `.env` 与数据卷保留。新模型访问仍受现有授权及费用边界约束，合成测试产生少量模型用量，实际费用未核实。下一步在不替换此运行版本的条件下继续代理绑定、分段执行和低资源验证；不得将服务启动或合成调用等同于 45 秒项目通过。
云端适配复核补充：工作区已修复原生 ASR 非 loopback HTTP 明文风险、失败响应已知用量丢失和响应无界读取；`stage3:model:test`、独立 ASR 测试和 typecheck 通过。当前运行的 r2 早于这三项源码修复，实际 Qwen 端点为 HTTPS；未为应用修复重启运行服务。已发送请求后的取消不能保证云端停止计费。
路径登记纠正：前述部分低资源与云端路径误登记在基线包，现也登记至实际活动包 WP-S3-RELIABLE-UX-001；新增 `tests/integration/stage3-preview-proxy-host.test.ts` 用于验证 Host 代理准备中的原素材、授权、散列、时间映射和缓存身份，不以该测试代替正式渲染与双 QC。审查另发现长音频样本当前完整读入并在多个素材间累积，必须保持完整证据并改为有界增量处理，尚未解决。
2026-11-11 流式审查：Browser 下载在响应前对稳定句柄流式核验已批准的成片或署名侧车散列，传输期间核验文件身份并在变化时中断；`web:host:test` 覆盖 96MiB 输出、下载前及传输中篡改和含中文署名的实际侧车，typecheck 通过。传输中已发出的字节无法撤回，校验增加一次磁盘读取；Windows 未覆盖非 Windows 的符号链接分支。该源码尚未部署。旧 Electron 预览/Master 读取和旧 Stage2 预览仍有整文件接口；Host 两处媒体样本先读取后检查 16MiB 限额，尚需修复。
长音频审查：现行 observation 的单个 model_input JSON 内联全部样本，保存和重新打开均会整份解析，仅切小块不足以形成有界链路；Worker 对完整源的帧探测也可能按帧数增长。登记 `observation-audio-chunks.mjs/.d.mts` 与其 property 测试，先验证基于整数采样格的完整连续分块及模型数据上限；后续仍需版本化引用、逐块授权记账和最终原子提交，历史回执保持只读兼容。该基础不等于长音频支持完成。
登记 `tests/integration/stage3-media-sampling.test.ts`：覆盖现有媒体预览样本有界读取及路径替换失败，避免在校验 16MiB 上限前先读入异常大文件。
2026-11-11 用户要求独立云端验收：单独启动 Compose 项目 `ave-cloud-acceptance-20261111`，端口 `127.0.0.1:6085`，使用既有 qwen-cloud-r2 镜像、独立项目/上传/配置/Profile 卷及独立导出目录，素材绑定只读；四类模型配置均为 Qwen 云端，未启动 Whisper。容器 healthy、页面 HTTP 200；尚未进行用户实际作品全流程验收，新验收项目需重新导入素材。保留原 6084 服务及其卷，不能并发共写同一项目。云端模型处理获授权素材可能产生费用。
隔离低内存试验：保持 CRF23 与 x264 lookahead=4，视频与连续音频各编码一次再 stream-copy 合封；45 秒、26 片段、3120×4160 合成素材在单个 768MiB/2 CPU/no-swap 容器完成，1350 帧、2160000 个 48kHz 采样、无 OOM，耗时约 333 秒、工作区峰值约 24.6GiB，cgroup 峰值约 768MiB，内存压力事件很多。仅 Worker 合成案例，未覆盖用户项目、Host/模型整体预算、全部语义、恢复或 ARM；生产分段执行仍阻断。
受限渲染 Worker `render_graph_media_correctness.py` 另在隔离 Pillow 环境通过，覆盖 90 帧切点、AAC 编码前后解码一致、短音轨失败、进度、已有输出保护、磁盘不足，以及视频/音频编码和合封等边界取消清理；ruff、mypy 通过。不同步将此结果扩展为全语义或真实项目验收。
最终合封额外检查音视频起始 PTS 为零和视频落在全局 30fps 帧格；注入错误元数据时拒绝发布，定向媒体套件与静态检查复测通过。45 秒测试先于该补充校验，未重新运行；这仅覆盖简单单轨，不证明转场、变速、字幕、HDR 或多轨语义。
登记 Worker `media_sample.py` 和 `media_timing.py`：长素材的帧探测、帧/packet/STTS 对照及大图/音频散列需要有界处理；保留完整时间证据，不得截断探测或访问 project.sqlite。隔离测试不触碰 6085 验收容器。
Worker 素材读取进展：采样帧使用逐行探测与私有临时 SQLite 索引，逐包/STTS 对照保留完整证明；音频连续性逐行验证，图片源和样本文件按固定缓冲区散列/复制。`stage3:sampling:test`、`mixed_media_acceptance.py`、Worker lint/typecheck 和 QC smoke 通过；50,000 条受控帧索引的 Python tracemalloc 峰值约 1.1MB，不代表整个容器峰值。图片解码仍可能随像素数增加，`media_scene_scan`/通用探测和 Host 长音频模型输入仍有无界路径；运行镜像未更新。
扫描协议缺口：现有 scene/probe v1 在 Worker 单行响应、Host 与持久化中内联完整帧和 packet 数组，只有解析流式化仍不能保证端到端有界。登记 `media_evidence.py` 及对应测试，先建立完整帧表的有界写入、读取和身份验证基础；后续需要版本化文件引用协议、Host 范围遍历与历史 v1 保留，不能删帧或把摘要冒充完整证据。
帧表基础已通过 8 项隔离测试、Worker lint/typecheck，覆盖逐行完整验证、双遍散列、篡改、中止及文件清理；50,000 条帧的 Python tracemalloc 峰值 15,701 字节，不含文件缓存和 FFmpeg。该基础尚未接入真实 ffprobe、scene/probe v2、Host 或存储；旧 v1 与 span_id 未改变。
登记 scene/probe v2 的 Worker 请求/结果合同及正负例、新 Worker handler、Host `media-evidence.ts` 与集成测试：以受控文件引用及散列传递完整帧表，独立流式生成并分块验证；v1 主链和历史身份保持。该阶段只建新协议和受控 Host 基础，正式扫描切换、旧记录兼容与持久化仍需接续验证。
scene/probe v2 受控基础通过合成媒体对照：scene 帧/cut 与 v1 比较，probe 各流帧与 packet 时间逐项比较，验证元数据绑定、篡改、越界路径、读取中撤权、取消和清理；110 项 contracts:check、contracts:clean、typecheck、Worker lint/typecheck 与旧 sampling 测试通过。当前 v2 未接产品 Host/存储，对静态/动画图片明确失败，Host 对 probe 摘要尚未独立重算，不能用于生产授权或状态提交。
后续 Host 已流式独立重算 probe 摘要并在返回记录前比对，伪造摘要并同步重算文件哈希仍拒绝；scene span 与 v1 逐项对照。新测试纳入 `stage3:sampling:test` 且整条通过；scene v2 动画、probe v2 静态与动画仍明确拒绝。上述 v2 尚未接生产 Host/存储，不能宣称完整项目有界。
登记 creation-render v1 的现行与 legacy schema/正负例路径：v2 真正接入时必须迁移旧版本而保留 `$id` 与历史读取，避免两个 current major；现有 v1 回执不重写。`stage3-workspace.ts` 已在活动包范围。
登记 `creation-render-adaptation.mjs` 与对应集成测试：在持久化边界比较 Original、代理、目标图、执行计划和授权身份，随后才可进入双 QC 同事务；仅 schema 合格不能证明身份。
代理存储隔离进展：v2 adaptation、双目标回执/输出与状态在同一事务中验证和登记；真实合成项目的最终前台 `stage3-render-host.test.ts` 通过，覆盖事务故障、QC 失败、授权变化回滚及 v1/v2 历史读取，独立测试覆盖原片/代理/映射/轨道授权篡改。v2 使用已有合成输出验证事务，尚未完成实际代理渲染及双 QC；生产入口仍为 v1，低资源执行阻断保持。由于 v1 仍是当前生产写入版本且 v2 尚未接线，两个 current major 的文档检查失败如实保留，不能提前把 v1 标为 legacy 或隐藏 v2。
Host 代理持有基础已通过合成视频/图片隔离测试：固定句柄与流式散列、缓存和原素材授权复核、取消与释放，覆盖持有期间文件/元数据篡改和撤权。尚未接入正式渲染及双 QC。
隔离实际代理渲染：1 秒 30 帧带 AAC 的合成 1200×800 单片段采用 standard-v1，Preview 从代理渲染为 960×640，Master 从 Original 渲染为 1200×800；两次真实 QC passed，帧数与音频解码采样一致，Preview 与缩放 Master 全片 SSIM >0.9。该测试不经过 v2 正式 Host 入口，未覆盖低资源、复杂语义或真实用户项目；生产阻断保持。
登记 `stage3-preview-adapted-render-host.test.ts`：隔离验证简单语义下真实 Host v2 的代理 Preview、原片 Master、双 QC、撤权回滚及历史只读；标准执行策略的测试不能代表 2GiB 或解除低资源阻断。
隔离 Host v2 首次真实运行通过：标准执行策略、合成单片段，Preview 960×640 代理与 Master 1200×800 原片分别通过 QC，撤权无 v2 成功回执，同操作重试不重新生成；`AVE_LOW_RESOURCE=1` 仍按预期被 `BOUNDED_LINEAR_UNVERIFIED` 阻断。正在复核旧 v1 和最终源码；该结果不代表复杂语义或 2GiB 验收。
Host v2 本单元最终回归：真实隔离单音视频 Host 双 QC、v1 回执回归、代理失败无原片回退、QC 时撤权回滚、缓存损坏失败、关闭重开、未验证坐标变换阻断和低资源阻断均通过；单图片和单音视频的组件双目标 QC、adaptation 身份篡改测试与最终 typecheck 通过。仅简单语义/标准执行策略，不代表复杂剪辑、HDR、大图、真实项目 2GiB 或多架构验收；新错误码当前仍为通用界面提示。该源码尚未部署到云端验收容器。
2026-11-11 用户要求继续本地完善：低资源渲染尚未验证、预览语义不支持、代理缓存损坏及观察样本超预算现有专用中文提示；严格区分“尚未验证”与实际 OOM，不泄漏原始诊断。桌面即时错误和当前失败记录的定向测试通过。长素材观察以 32MiB 累计样本预算在读取/模型发送前失败关闭是过渡保护，不是长音频增量处理已完成。
资源预算修正：Compose 的两个服务原先分别设 `cpus: 2`，不能单凭此保证合计 2 核；低资源 overlay 现为二者均设置 `cpuset: 0-1`，共享同一组 Docker 引擎 CPU，保留各自 2 核带宽及 768/1280MiB 硬限。`docker compose config` 和包装测试通过，隔离容器实际 `sched_getaffinity` 返回 0,1。需要引擎可分配 CPU 0 与 1，尚未实测双服务全负载、macOS/Linux 各宿主或 ARM；运行中的服务未改。
该 32MiB 是每次观察操作的原始样本累计预算，不是并发操作的全局总预算；低资源模式外保持现有行为。声明长度、实际文件大小、跨样本累计、取消与授权撤销均需通过 Host 真实合成观察测试，不能据此声称 2GiB 全流程或长音频支持。
低资源观察护栏的 Host 合成媒体测试现已通过，覆盖声明大小与文件不符、累计超限、取消、撤权、标准路径及无模型发送/发布；typecheck 通过。已为现有采样 Worker 增加绑定源身份、流、精确采样核心/上下文与实际字节上限的分块校验：真实重叠 WAV 的各核心区拼接与原 PCM 逐字节一致。分块仍未接入观察主链，历史授权、记账、持久化和重开仍待改造。
登记 `observation-audio-file.mjs` 与对应集成测试：引用式逐块观察需要固定句柄验证实际 WAV 身份、完整散列、PCM16 头/采样数及授权，并有界计算音频事件证据；不改旧 v1 内联记录，不把独立组件视作已接入主链。
补登记 `observation-audio-file.d.mts`：为存储公开接口提供与实现一致的类型声明，避免调用方绕过明确边界。
登记 `observation-audio-boundary.ts` 及其 property 测试：为逐块音频的精确采样核心区归属建立有界、无浮点验证，保留跨界原始词/事件并标记不确定；该单元不替代根清单、逐次账目、恢复和正式接线。
该边界基础测试通过：BigInt 半开核心区按词中点唯一归属，跨界保持 uncertain；事件保留原 ID 和原始范围并记录核心交集，测试覆盖多采样率、不同时基、切点、越界与大整数。原始响应不丢弃，尚未接生产融合。
登记单音轨流式观察 root/chunk/call/settlement 四类 v1 合同、正负例、`creation-audio-stream` 校验与测试、ADR-0058：根清单绑定请求、授权代际、素材/路线身份及有界索引文件；每次物理请求有独立预留和结算，未知结果禁止自动重发。该子根不冒充完整多素材观察，现有内联 v1 历史记录保持不变；先做独立合同和验证，再接存储/主链。
上述四类合同及正负例、流式索引/核心覆盖验证与 ADR-0058 已实现；117 项合同校验及跨根/跨块串换、权限撤销、unknown 不自动重发测试通过。选取单块必须重新扫描完整索引并取得仅进程内可用的身份凭据，当前多块为 O(n²)，不能声称已高效恢复。真实 dispatch、逐次持久账目、多素材观察与重开尚未接入。
登记 `creation-audio-stream-store.mjs/.d.mts` 与集成测试：复用现有内容寻址暂存及事务日志，以单事务登记受授权分块调用的不可变预留、响应与结算；崩溃后缺结算保持 unknown，不自动重发。只构建和验证 Host 持久化单元，不声称 observe 主链已切换。
逐块账目真实 SQLite/对象库首轮测试通过：根与索引原子登记、事务故障与共享对象保留、预约重开后的未知状态、显式新 attempt、撤权后响应不发布而 ledger-owner 仍能准确记录已发调用的结算；成功响应重开验证与篡改拒绝。最终回归及正式 Host dispatch/observe 接线仍待完成。
新增真实子进程提交后异常退出测试：预约提交后重开为 unknown 且禁止重发，响应与结算提交后重开可读已验证响应；并覆盖 COMMIT 确认丢失、迟到响应追加、同步授权 guard、共享索引并发和等待取消。该账目仍未连接真实模型 dispatch 或观察主链。
登记 `creation-audio-stream-dispatch.ts` 及其集成测试：对接既有物理 dispatch，发送前持久预约并同步复核授权，绑定实际 wire digest；同一实例不得二次发送，未确认结果保留 unknown。先用本地 HTTP fixture 和真实单块 WAV 验证，不连接云端或将其视为生产 observe 已接通。
登记 `model-gateway/src/whisper.ts`：受信物理传输应提供实际发送音频的样本 ID、MIME、内容散列和长度，供 Host 在预约前与已验证 chunk 比对；只绑定身份，不改变 wire 格式或模型。
单块物理 dispatch 隔离进展：真实 Whisper adapter 与本机 fixture 验证发送前不可变预约、实际 wire 哈希/长度及 sample ID/MIME/内容散列与已授权 chunk 一致；同长度音频篡改、串换 ID/路线和预发送撤权均不发送，连接丢失保留 unknown，已结算响应重开可读。OpenAI 兼容音频 adapter 同样携带内部样本身份，wire 与模型不变。`stage3:model:test` 和定向媒体测试通过；生产 observe、全局模型释放、多块融合仍未接入。
登记 `creation-audio-stream-runner.ts` 与集成测试：单音轨逐块按原 split provider 逻辑顺序执行 Whisper 和声音角色，独立恢复成功结果并复用原资源 gate/卸载/排空；unknown 禁自动重发，撤权不发布内容。现有声音输出版本 v2 与未来观察持久根版本不同，旧内联观察不可伪装成新引用记录；该单元仍不代表多素材 observe 主链接通。
联合 `stage3:render:test` 曾在首个 Host 规划失败：新音频传输身份字段无条件扩散到 planner，触发现行严格字段验证。正在修复为仅音频流显式 opt-in；保持原 planner 字段/身份和校验，不以放宽合同掩盖回归，需修复后完整重跑。
规划兼容修复：增强身份仅逐块音频显式 opt-in；无媒体 planner 与普通音频/多媒体传输保留原字段。真实 `stage3-planning-host`、`stage3:model:test`、媒体采样、逐块 dispatcher 与 typecheck 已通过；完整 render 脚本需待并发 Host 分段修改稳定后重跑。
登记 Worker `still_image.py` 与 `still_image_bounded_test.py`：大 JPEG 的导入 facts、缩略图和观察路径当前会在生成低分辨率代理前完整解码，需验证解码器级缩小与原尺寸、EXIF、ICC、alpha、损坏输入语义；不支持的格式继续明确失败。新测试须实际验证 Worker 路径及硬限内存，不改成片原始素材。
受限渲染增量：简单连续单轨片段的非零音量增益与标准执行真实音频逐样本对照通过；无音轨作品不再产生静音音轨，帧数与标准执行一致。`render_graph_media_correctness.py`、ruff、mypy 通过；初次测试自身遗漏临时输出导致清理断言失败，修复测试清理后完整复跑通过。生产阻断仍保留，长片段切分和完整语义未完成。
长片段现按全局输出帧格最多 300 帧分块；每个片段先经现有音频子图完整解码/重采样一次，再按全局采样位置切分。强制 13 帧分块的普通及 VFR/44.1kHz 合成输入，与不分块的逐帧哈希、完整 PCM 及最终 AAC 字节对照一致；完整媒体套件、ruff 和 mypy 通过。早期 VFR/44.1kHz 用同时消费无关视频链提取音频时触发 FFmpeg 内部断言，改为仅使用经验证的音频子图后复测通过。此为 Worker 合成语义验证，分块尚非持久检查点，生产阻断保持。
默认分块的独立硬限试验：3120×4160 单图、12 秒 360 帧、无音轨在 768MiB/2 CPU/no-swap 禁网容器成功，约 60.4 秒、临时工作区峰值约 6.53GiB、无 OOM；cgroup 峰值触及 768MiB，内存压力事件 130633。该单 Worker、单目标合成结果不代表双服务总预算或真实项目通过。
登记 render-segment plan/result 与 Worker request 的 v1 合同/正负例、`render_segment.py`、存储和 Host 恢复集成测试：Host 从完整语义/目标计划派生绑定源身份、全局帧与采样范围的分段；Worker 只生成无损结果，Host 重新验证权限、计划、版本、散列和数量后原子登记。中间段不得作为作品，历史回执不改；先实现并验证合同和存储，生产入口继续阻断。
检查点存储隔离单元：已验证 plan/segment result 身份、视频与 PCM 对象及事务登记，96MiB 流式读写、重开、撤权、篡改和事务失败测试通过；不创建正式 Render Bundle。Worker handler、Host 调度、真实源权限 guard 与恢复尚未接线，执行器 FFmpeg 散列必须由实际二进制计算并在重试重新验证，不得信任外部字段。
受限 `render.segment.v1` Worker 已在隔离真实素材测试生成无损 NUT/PCM，验证计划、源散列、实际 FFmpeg 可执行文件散列及全局边界；11 秒合成媒体的 300–330 帧/PCM 与完整渲染对照。Worker→Host-owned Storage 集成在关闭 Worker 和项目后重开并只读复验第一片，再启动新 Worker 完成第二片；执行器身份变化与撤权阻断，未创建 Render Bundle。产品 Host 调度及真实权限守卫仍未接线，生产阻断保持。
片段身份进一步绑定全局 `frame_start`；将 0–300 拆为 0–150/150–300 后，既存 300–330 片段身份不变且可读。完整覆盖校验拒绝缺口、重叠、缺尾、执行器或授权身份混用；该校验尚未由产品 Host 最终合封调用，不能宣称生产恢复已完成。
登记 executor-identity 与 segment-assembly 的 Worker 合同/正负例和两个 handler：实际读取 FFmpeg 身份，使用绑定散列/长度/条数的有界清单逐项验证全部无损分段及全局覆盖，再各编码一次视频与音频；输出仅为 staging，不代表 QC/作品发布。原拟独立 `stage3-segment-assembly.test.ts`，实际断言并入既有 `stage3-segment-resume.test.ts`，避免重复。正式 Host 调度和权限重验需后续单独接通。
独立 Worker 合封合成测试：Preview 代理低清与 Master 原片原尺寸共享语义哈希；分段→重开→单次合封的逐帧输出和 AAC 解码样本均与完整执行一致。清单哈希错误、缺口/重叠/缺尾、越界路径、缓存损坏、取消和源变化均失败且无输出；未生成正式 Bundle。生产 Host 和双 QC 仍未接线。
高分辨率分段合封硬限试验：3120×4160 单图 12 秒、360 帧、无音轨，在禁网 768MiB/2CPU/no-swap 容器完成两段→对象目录→流式清单→单次合封，141.8 秒、临时峰值约 10.88GiB、无 OOM；cgroup memory.peak 为 805,560,320 字节，比配置 768MiB 高约 0.24MiB，且 max 压力事件 441154，不能声称严格低于预算或代表含音频/Host/QC 的完整流程。
登记 `render-segment-coordinator.ts` 与 Host 集成测试：由 Host 以实际图/计划和已持有源权限逐段验证/生成/登记、可取消地流式生成清单并调用合封；最终仍需既有双 QC 和原子发布。先用隔离策略验证，产品低资源阻断不得因单测解除。
实际分段 Worker 限额试验：禁网、768MiB/2 CPU/no-swap 独立容器对 3120×4160 无音轨静态图生成 300 帧无损片段和发布副本，用时 51.0 秒，临时峰值约 10.88GiB、cgroup peak 768MiB、无 OOM，max 压力事件 216832；不代表音频、完整 Host 或 2GiB 产品验收。
大 JPEG 预览代理采用解码器级缩小并保留 EXIF/ICC，隔离 768MiB/2 CPU/no-swap 容器中 6503×4001 合成 JPEG 的真实 Worker 代理协议通过，cgroup 峰值 143,675,392 字节且无 OOM，243 组缩放几何对照通过；导入和观察阶段尚在验证，大 PNG 等不隐藏降级。
大 JPEG 低资源观察/浏览补充：相同隔离硬限下，6503×4001、EXIF 6 与 ICC 的合成 JPEG 完成真实 `media.probe.v1`、`media.sample.v1` 和 `media.browse.v1`，采样与浏览的画幅/ICC 正确；损坏 JPEG 明确失败，超过 2400 万像素 PNG 在低资源模式明确拒绝。cgroup 峰值 187,052,032 字节、无 OOM，包含测试素材生成；标准模式与 Master 原素材路径不变。该结果不等于超大图片完整用户旅程通过。
PNG 边界探索：仅在临时实验中将上限提高至 3200 万像素时，8000×4000 高熵 RGBA/EXIF 6 PNG 经 probe、采样、代理后在 4096 浏览阶段 cgroup OOM（exit 137）；原源码上限未提高。现行 2400 万像素边界的一组 6000×4000 RGBA/EXIF 6/ICC 合成图完整 probe→采样→代理→浏览通过，单 Worker cgroup 峰值 521,334,784 字节、无 OOM；样本不足以证明所有色深、交错格式或 Host/模型总预算，继续验证，不能据此放宽。
反例：6000×4000、16 位高熵 RGBA、192,062,857 字节单 IDAT 的合法合成 PNG 在现行 2400 万像素上限内，隔离 768MiB Worker 的 probe/采样/代理后浏览阶段仍触发 OOM（cgroup peak 800,829,440 字节）。现行像素门禁不能证明所有 PNG 安全，正在补固定缓冲结构/CRC 预检和明确单 chunk/元数据预算，不能放宽或把失败解释为支持。
低资源 PNG 流式预检与预算边界实验：单 64MB IDAT 的 4000×2000 RGBA16/EXIF6/ICC 合成图，在同一 768MiB/2CPU/no-swap cgroup 中由既有 r2 编译 Host 与当前 Worker 源码完成导入、授权、受控观察、4096 浏览和代理，峰值 493,559,808 字节、无 OOM。该 Host 并非当前工作树构建，输入与模型合成，不包含 Whisper、真实模型或成片；不能作为 2GiB 全流程验收。
预算收紧依据：同条件 6000×4000 RGBA8 合成 PNG 完整链峰值 738,353,152 字节，主服务余量过小；4000×4000 高熵 RGBA8/EXIF6/ICC 峰值 511,135,744 字节、无 OOM。计划只在低资源模式将不高于 8 位 PNG 的保护上限从 24MP 收紧到 16MP，16 位上限为已测 8MP；这只是有明确失败行为的保守门禁，非所有内容或整个应用的内存保证，标准模式不改。
低资源 PNG 预检已实现固定缓冲的完整 chunk/CRC 与结构校验、ICC/元数据预算及取消，随后仍真实解码像素；不高于 8 位限制 16MP、16 位限制 8MP，未支持的结构或超限明确拒绝。`worker:media:test` 覆盖高熵单 IDAT、CRC/截断、ICC、APNG/Adam7、颜色与 alpha、标准模式。真实 Host 分类/代理回归通过；最终 `stage3:sampling:test` 在本轮账目并发锁追加前通过，账目变更后需复核受影响测试。
登记 `ffprobe.py`、`media_browse.py`、`build_thumbnail.py`：向低资源 PNG 固定缓冲预检传递现有取消回调，确保长文件扫描可取消并清理；不改变标准模式与权限边界。
登记 `media-import.ts` 与 `stage3-probe-boundary.test.ts`：仅将 Worker 结构化诊断中精确匹配的图像资源码透传到导入、探测和代理失败，界面使用固定脱敏中文；不根据不可信错误文本猜测 OOM，其他错误保留原分类。
真实 Host PNG 分类回归通过：超限、CRC/结构无效和不支持的 PNG 信息分别有固定脱敏中文；伪造 Error.code、其他诊断中的同名文本和多重故障不误报单一资源原因。probe/代理透传只接受可信单一结构化诊断。
登记 `stage3-large-still-host.test.ts`：用合成高像素照片验证真实 Host 素材导入、明确授权、观察采样与原片/代理身份绑定；不访问网络模型或用户项目。
登记 `stage3-worker-drain.test.ts`：Worker 持续运行时 stderr 会随重复警告无限累积，须限制日志尾部，同时单独可靠识别跨缓冲区的 owner drain 标志，确保长日志截断不能解除生产者终止证明。
Worker client 现保留最多 16Ki 字符 stderr 尾部，截断时在内部诊断标记，单独跨块匹配带 owner token 的 drain 凭据；2MiB 连续警告、正常退出与既有超时/取消/孤儿子进程/未确认 owner 测试通过。该修复不解决旧协议 stdout 的长帧表整体驻留。
2026-11-11 用户续接并授权重建 6084：工程完成后由用户验收真实一条视频，6085 云端实例保留。重点核查 FFmpeg 抽帧/探测线程、全帧日志累积及 Host 读取链；登记 `media_scene_scan.py` 以限制现行 v1 扫描在低资源模式的线程并保持帧、分数和时间不变。6084 恢复原本地 Whisper/YAMNet 角色，视觉/规划沿用原配置；部署前完成受影响工程检查，不以健康替代完整视频验收。
6084 已按用户授权重建为冻结本地镜像：desktop `sha256:94b3948f319919f2a792c86d36523e2aa565efa47b2264b999e096cd4908199b`，Whisper `sha256:304ee15404eeccf0188a17f5b57e95d159ebc6f212c759f9e3c90d5cc240c518`；build-input `82c4f66f767141d9e46b8c4bc0fff7b1f63b8a9e759e4927fbfc37f4db2b6b96`。两服务 healthy，HTTP 200、原挂载保留，硬限768/1280MiB且共同CPU0-1；6085旧容器ID/启动时间当时未变。镜像内当前Host+Worker在独立768MiB/2CPU容器完成合成恢复/双QC工程测试，146,288,640字节峰值、无OOM；完整stage3:render:test通过。用户真实视频与完整高分辨率2GiB验收未执行，后续6085配置开发不替换该冻结版本。
用户追加 6085 全云端经济模型与 AVE 配置选项：独立镜像/配置/卷，不影响已冻结的 6084 本地版本。先核对 Qwen 官方能力与价格，受信预置四角色、关闭不必要思考、不删授权素材证据、不隐式回退；UI 只选择已注册 deployment 并保留原授权确认与历史绑定。登记非密钥 cloud 模板和合成 smoke 脚本，仅使用合成数据进行少量真实接口验证，不发送用户媒体。
补登记 Main model-configuration 与 project.handlers：解析严格互斥的旧单配置或多profile启动根、注册不可变部署身份、向新请求设置投影无密钥配置选项；旧单配置和历史请求绑定保持。6084使用冻结独立镜像，不随6085配置功能的新增代码替换。
补登记 `.dockerignore` 仅放行无密钥 cloud 预置模板，Dockerfile纳入模板；原 `.env`、日志与私密运行覆盖继续排除。现有 cloud-startup 测试验证预置注密、全HTTPS/禁本地和旧单配置兼容。
登记独立 `compose.cloud.profiles.yaml`：仅6085启用 profiles 和内置云端模板，覆盖继承的本地角色JSON并通过现有凭据来源注入密钥；旧cloud overlay和6084均不改变。
6085预置工程验证：经济档 vision/planner 为 qwen3.7-flash-2026-07-15，转写为 qwen-audio-3.1-asr-flash，声音为 qwen3.8-omni-flash，显式关闭可关闭的思考；增强档 vision/planner 为 qwen3.5-plus-2026-02-15。官方模型/价格页面于本日核对，低单价与实际token量分开，不截断完整素材或规划。六次单次合成真实调用共662 tokens（144/68/104/117/125/104），无重试/用户素材；词时间戳、固定状态与文字对应等小样例通过，不代表长音频、完整规划质量或成片流程。cloud启动、Python注密后Node加载、旧单配置、全官方HTTPS/禁本地负例、architecture和typecheck通过；运行容器尚待独立部署验证。
6085 已独立部署 `ave-desktop:cloud-profiles-20261111-r1`（sha256:bf3ad1c5d4a685ff1d0c886fa58f0c99e31ee9e686a2a5417e1a4e031706efbd；build-input 14d55ad9c67999e690eee5661d800cf746ef79e9d7c2d3ec11779163a1b6c446），默认economy、四角色均官方HTTPS Qwen，未启动本地模型进程/Whisper。健康与HTTP200通过；隔离同镜像6086实际浏览器验证新建合成项目后“创作设置→创作要求→本次模型配置”可见、默认经济、增强切换与四角色更新，无模型发送；截图见 evidence/assets/p4-ux/local-cloud-20261111/model-config.png，临时测试容器已移除。6085变更前后6084两容器ID、StartedAt和image逐项相同；用户卷保留，真实一条视频仍待用户验收。
本轮不可变工程/部署记录见 [EVD-20261111-S3-P4-UX-LOCAL-CLOUD-ENGINEERING-R1](../evidence/runs/EVD-20261111-S3-P4-UX-LOCAL-CLOUD-ENGINEERING-R1.md)；result为partial。最终docs:check仍因未接线scene请求双major及历史适用性/指纹失败，没有执行docs:complete；用户视频验收、完整2GiB和arm64等未验证边界不被健康检查替代。
工程架构检查发现前轮 Worker 私有 SQLite 索引和新增跨包内部导入违规；登记 `frame_index.py` 替换为有界临时固定记录索引，保留完整帧/packet时间证明。公共包导入与 Core运行时依赖也必须修复，不加检查器例外。当前容器 Host工程测试在观察阶段出现 MEDIA_SAMPLE_FRAME_PTS_REQUIRED，尚未通过，部署前需定位修正。
登记 YAMNet 服务及现有语义测试、新 lifecycle 测试：当前服务启动即常驻数值库与模型，健康依赖常驻模型，不能凭引用卸载推断释放 RSS。拟每次请求以子进程加载原模型，父进程只验证文件并排队至子进程实际退出；健康不加载模型，客户端断开不提前释放资源。
登记 `docker/start-whisper.py`：现启动探针会实例化 Whisper-small 再删除引用，不符合按需加载且未证明RSS释放。需在保留同一固定模型和缓存完整性检查前提下消除启动加载，并通过隔离 CPU/int8/1280MiB 实测及健康/TTL 验证。
登记 `scripts/stage3/test_whisper_lifecycle.py`：使用只读原缓存与隔离 refs、合成音频验证健康不加载、真实转写、TTL 与实际进程/容器内存，不改现有服务或用户卷。
登记 tests/integration/docker-cloud-startup.test.mjs：隔离验证 Qwen 云、本地及混合配置的条件启动、密钥不泄漏和失效配置失败关闭，不启动用户容器。

2026-11-11 6084 配置续接：用户明确选择“现有本地音频方案与全云端切换”，不要求视觉/规划离线。沿用当前 v1 profiles、Host 不可变 deployment digest 和每请求授权；新增互斥 `AVE_MODEL_PROFILES=1` 混合入口，保留 `AVE_CLOUD_PROFILES=1` 的全云严格限制。登记 `docker/compose.mixed.profiles.yaml`：仅6084叠加，由继承的原单配置保持本地档全部模型/参数身份，再复用现有云端模板合成选项，避免另建重复模型清单。已注册本地依赖按所有配置取并集，注密逐配置判断；关闭时等待 Host 排空和 YAMNet 已接受推理完成。原6085容器冻结为 `e9b75ee4d8568ad08ee69ac89703111671fa33224f12ad6b082c89a55490b2df`，StartedAt `2026-11-11T10:31:11.454997489Z`，image `sha256:bf3ad1c5d4a685ff1d0c886fa58f0c99e31ee9e686a2a5417e1a4e031706efbd`；本轮构建、部署与验收不修改其服务、卷、端口或配置。现有431条工作区改动保留。

2026-11-11 用户追加6085再次制作失败：依据截图及真实容器日志，发生于 observation/视觉分析，尚未进入规划或渲染。返回 JSON 的 description 正常，但键名为 `uncertain:false`、值为无关字符串，缺少必需布尔字段 uncertain；精确验证正确拒绝，原失败输出 hash 为 `d8568b8f0cdb7d38dca552e7db32a04578cf7c86b6e2204db222e90ac2bcd6b5`。原视觉指令 `Return JSON {description:string,uncertain:boolean}` 是伪JSON；当前 json_object 只约束语法。官方英文 structured-output 文档还明确多模态 json_schema 会退回 json_object，不能把 schema 当保证。按最新故障请求，优先最小修复视觉提示为合法字面样例及精确规则，子调用追加提示版本，实际 wire/input hash 随新提示变化；保留 deployment digest、严格validator、单次尝试及历史记录。同步补固定脱敏 MODEL_OUTPUT_INVALID 解释，避免已知校验错误仍显示“没有可确认原因”。不自动重发用户素材、不把该修复称为完整制作已通过；若更新6085仅为此故障修复，保留原独立全云配置、模型、权限、卷及端口，6084混合功能不在6085启用。

6085故障复核与更新：只读原项目状态显示第1–15次vision结算response，第16次失败MODEL_OUTPUT_INVALID，均为qwen3.7-flash-2026-07-15；无本地模型或渲染阶段。新amd64完整镜像 desktop `sha256:7f3d967de208af4c6f972d2e4a66a1a639769eb4cbacb8958c1c905b04a705b5`，build-input `c560d2c8f4ffe068238a374aca55be8d5babc838f0c4e0446a161cd79b852d15`。冻结镜像在独立临时配置/项目/UID1000、只读现有配置模式下用真实网关完成3张96×96不同几何图：252/253/262 tokens，共767，无重试，均为vision-frame-json-v2、精确字段和布尔通过。一次先前测试夹具直接Docker --env-file未按Compose解引号，真实调用被拒、用量未知；更正为Compose读取原env后通过，未修改或打印密钥。自动审批曾拒绝从inspect提取key至临时env的提案（仅返回blocked by policy），未执行；随后改为候选容器UID1000在内存只读既有0600配置，不提取/复制key。该测试仅为网关合成图，不代表Host账目、复杂照片、规划或视频全流程。官方依据：[JSON Object/Schema及多模态限制](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen-structured-output)。

6085在Host接收SIGTERM并自行exit0后替换为上述镜像，保留原cloud-only档位/独立卷/6085端口，容器 `799373edaa173accf1bb9d8f06fc0c536c077fa52d0bbfa1eb1d90bf1bf46f62` 于 `2026-11-11T11:02:03.439756257Z` 启动，healthy和HTTP ready，未运行本地模型进程。导出绑定在inspect中从Docker Desktop内部路径显示为C盘路径，经同一C盘目录规范化核对，全部挂载一致。未自动重发用户素材或修改旧失败记录。

6084首次混合启动明确拒绝旧YAMNet的base64格式（新门误仅允许data-url），原配置未被覆盖；立即恢复原r2镜像且两服务healthy。实际旧配置只读确认后，Python/Node门仅增加原已支持的base64格式，仍固定原模型、loopback、端口、json/validated_json/text-only；补真实base64和独立planner json_object的跨语言digest保留、重开实际wire及非法格式测试。部署前改用实际旧配置只读预检，不能再以仓库默认模板等同用户私有配置。

最终6084混合部署完成：desktop `sha256:027161204a6098f6e2b94315fb31d399b6c391e018ecc01916a38e0b6db525ad`、Whisper `sha256:e00f86bcad6869438c36edb4177e4fa108efbe6f62bd5aaf237a9f8e21c35bd1`，build-input `13569c78ee7daa006a640509996eb4143dbc4b47c5a594da5ce4863900b354d4`。实际旧配置只读预检和运行注册均保留原digest `d08a1d0cbfa5367525f0401e61678aed5420ffe7f274d24c17e35fd595a0ae18`；主服务768MiB、Whisper1280MiB、共同CPU0-1、healthy/HTTP ready，全部原挂载经同一宿主目录规范化核对保留。实际Browser空项目验证默认本地、切经济全云后四角色更新、再回本地，无模型提交；截图保存，空测试项目移入可恢复回收站。6085故障修复后的ID/StartedAt/image在6084更新期间完全不变。临时6086容器及网络已清理，无其他后台测试。新增不可变记录 [EVD-20261111-S3-P4-UX-MIXED-PROFILES-VISION-R2](../evidence/runs/EVD-20261111-S3-P4-UX-MIXED-PROFILES-VISION-R2.md)，result partial；文档检查仍保留独立scene双major和历史适用性失败，不作完整视频、2GiB、arm64或P5通过声明。下一步真实一条视频仍由用户验收；若再失败，以该次真实持久化记录定位，不自动重发全部素材。

2026-11-11 规划提示补全：用户报告6085生成初稿时模型返回音频意图 required 但 requirements 为空。只读检查发现该约束仅由Host校验，原提示未明确三种状态与列表的关系；允许后续再次测量的 measure-or-final 阶段也未附完整音频指令。补充明确状态/列表、精确请求及证据引用、独立声音、测量 selection_id 唯一、范围与帧格、最终回执与镜头一一对应和声音保留规则；v1/v2原有证据限制及失败关闭不变。针对两版本和两个可测量阶段的规划属性测试、stage3:creation:test、typecheck、architecture通过，未重发用户素材或执行真实模型；此源码修改尚未构建或部署到6084/6085，完整作品仍未验证。

用户随后授权更新容器并暂停远端同步：完整 amd64 镜像构建输入 `b6aad73b2e055a702185c6bd7f3fa7edcd41307335b3316385c751236f2c4a59`；desktop `sha256:f5f2b24fbbe44bc62f2f3b8d711bc6497b3acb24ca55a460b0804cc76fa33c88`。隔离容器验证镜像内新提示、全云档身份和健康入口，未发送模型请求；6085 原 Host 完成输入排空并正常退出后仅重建 desktop，原卷、云端配置与端口保留，新容器 `b1571d7a2ff2f85ed427a84703be6365a30c00a4d5c536e05fb4142486d8b81c` healthy、HTTP ready；6084 两容器 ID 保持不变。临时验证容器已移除。没有向 Git 远端提交或推送，真实项目完整视频仍未验证。
