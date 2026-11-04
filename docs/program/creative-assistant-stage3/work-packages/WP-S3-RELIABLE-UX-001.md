# WP-S3-RELIABLE-UX-001 — Demo 工作台与全部真实操作接入

## 目标、范围与执行入口

交付与 `demos/p4-workbench/` 一致的正式界面，并将下表所有可操作项接入真实项目、Host、Timeline、渲染/回执及恢复。先完成内部功能，再重做 UI。唯一 UI 依据、源文件摘要、L0–L7 执行顺序与 GATE 处理位于 [DOC-007](../../../plans/2026-10-03-reliable-workbench-real-acceptance.md#p4-视觉与交互)；稳定行为由 [Workspace Design](../../../ux/WORKSPACE_DESIGN.md)定义。

依赖是正式 P3 关闭与 P4 Timeline/Annotation/Recycle 三个工程子包；依赖完成不代表本包完整用户能力实现。本包允许路径和必需检查只取本 programme 的 EXECUTION_MANIFEST；按 generated WORK/STATUS 开工。本文是操作范围权威，不重复维护机器状态。

**每行通过条件**：真实入口可操作、身份/权限/版本正确、Host提交或实际业务回执、结果回读、失败无半提交、相关撤销/重做、刷新/正常重开。改变画面/声音者还必须证明真实 Preview/Master 一致输出。只是纯 UI 偏好者验证保存/恢复与焦点，不强制产生 Timeline 版本。只读浏览不得伪造编辑提交。

## 审查基线与第一个动作

2026-10-12 开工源码审查基线：当前页路由及多项 Host 命令存在，但完整 UI 未按 demo 重做；一次精修后旧预览会阻断下一次编辑；部分对象缺拖移/修边；空白时间落点被夹到内容末尾；批注保存后仍画历史活动标记且不发送模型；v1仍可新写；P4专项未进入总检查。

这是历史开工基线。此前 Electron 检查与完成记录不代表当前 Browser P4 包完成；当前状态以 programme/current 为准。2026-11-03 正在修复并整合同一请求续期与真实灰度批注链路，完整 OP/WIN 验收仍须独立证据，P5 尚未进入。

## Demo 逐操作清单

“首次复核”表示现有代码有相关入口但整行尚未在本轮完整验证，不能标为已交付。入口路径简称 Renderer = `apps/desktop/src/renderer`；Host = `packages/platform/project-host/src`。文件名必须结合实际函数搜索读取。

| ID / 单元 | 对象与必须支持的操作 | 实际入口与链路 | 退出场景 / 审查缺口 |
| --- | --- | --- | --- |
| OP-01 / L5,L6 | 九页导航：创作、素材、精修、历史、问题、作品、回收站、帮助、导出；隐藏导航、返回页面 | Renderer `workbench/workbench.js`、`state/workbench-state.js` → 现有项目/UI状态查询保存 | 九页有独立正式route；项目/观看版/编辑版/输入/焦点保留，隐藏页面不能获焦；旧home/project-list路由和隐藏分支已移除。L5/L6验证见DOC-007。 |
| OP-02 / L5 | 真实视频/图片/音频导入、重复识别、取消、失败重试；素材分类/搜索/网格/紧凑网格/列表/尺寸 | `features/media-panel.js` → `api/project-api.js` → 现有media import/browse Host | 真实缩略图，空库保持空；已成功项不重复，浏览不写Timeline；首次复核 |
| OP-03 / L5 | 素材播放/暂停、seek、音量、全屏、图片缩放；回到作品 | `features/player-panel.js`、media-panel → opaque media/preview refs | 真画面/声音，快速切换不串流，返回同一版本与位置；波形失败不冒充素材不可播；首次复核 |
| OP-04 / L5 | 音乐/音效库搜索、试听、选中/替换、来源/许可、自动配乐入口 | media-panel/creation-workspace → `project.audio.library` 及既有request授权 | 缓存/项目原件分离，取消无伪错误；实际音频和署名存在；库授权不随普通导入扩大；首次复核 |
| OP-05 / L4,L5 | 单一普通输入/消息流、整部作品/当前对象范围、制作中输入、浮层展开收起/拖动位置 | `features/creation-workspace.js` + workbench → creation request/revision/UI | 组合消息已由 OP-17 的 v3 请求字段接入；页面切换不复制composer、不丢IME/选择及制作中普通输入仍待 L5 实际复核 |
| OP-06 / L1,L2 | 主视频/图片资源按前后剪辑点插入、已有片段重排、选择定位 | timeline-panel → `p4-timeline-commands.js` → `project.creation.manual` → Host `editCreationDraft` | 保留各段原时长，顺延后续，不隐式拆片；一次放下一个版本；首次复核 |
| OP-07 / L1,L2 | 主视频/图片左右修边、播放头/右键分割、删除、复制到PiP | 同OP-06，timeline-core精确命令 | 源范围/帧格合法，图片展示时长独立；连续三次操作及撤销/重做，不要求每次制作；旧预览门禁待修 |
| OP-08 / L2 | PiP资源落点建轨、同轨移动/修边/分割/删除、主视频↔PiP跨轨 | timeline-panel、p4 commands → Host → timeline-core/render-graph/Worker | 松手在有效临时轨才建轨；同视频轨拒绝重叠；PiP随播放头真实合成；边缘手柄缺口待补；不新增demo没有的画面内变换手柄 |
| OP-09 / L2 | 音频/音效资源拖入、选中、移动、修边、分割、删除 | timeline-panel → typed commands/既有precision入口 → Host | 音频条能实际拖动；采样边界、路由、撤销/重开正确；保留gain/fade/ducking/mute/solo等既有功能入口；手势待补 |
| OP-10 / L2,L3 | 字幕/文字资源拖入、选中、移动、修边、分割、删除 | timeline-panel、creation-workspace → Host字幕/Timeline命令 | 字幕条不是仅可点span；时间范围与文本分割语义明确、无重复提交；缺轨有效落点才创建；手势待补 |
| OP-11 / L2 | 手动新增可选轨、拖入原子建轨+内容、删轨连内容、移走/删末项清理、恢复轨 | p4 commands → Host `editCreationDraft` → timeline-core | 主视频不可删，锁/保护范围拒绝；空轨新建后可接下一次放置；undo恢复轨及对象；PiP与主视频相邻；首次复核 |
| OP-12 / L1,L2 | 空白定位、拖动播放头、逐帧、指针锚定缩放、竖/横滚动、可视区标尺、吸附与拖放反馈 | timeline-panel `tickAt`/pointer事件；workbench `timelineSeek` | 12秒内容可在20秒定位/落片；范围随内容及播放头增长；以demo吸附阈值/首尾边/排除自身为准，吸附不改时长；取消还原；末尾夹取待修 |
| OP-13 / L3 | 预览直接改字幕，Enter/失焦提交、Escape恢复；字体/字号/颜色/粗细 | player-panel → creation-workspace/Host字幕命令 → caption layout/渲染 | 一次修改一个版本，输入期间不触发时间线快捷键；已安装/许可字体真实输出，缺字/字体失败可见；无虚假字体目录 |
| OP-14 / L3 | 灰度/黑白/模糊拖入或属性应用、选中、替换、无效果/删除、撤销 | p4 commands → `set_effect`/移除 → Host → render-graph/Worker | 对象明确且两端真实生效；重复不叠加；当前无强度参数不得造控件；删除/替换需完整复核 |
| OP-15 / L3 | 相邻主视频剪辑点交叉叠化，合法落点提示、选择、再次放置替换、Delete删除、撤销恢复 | timeline-panel → typed transition commands → Host/渲染 | handles/overlap/相邻关系合法，两端实际转场；不建独立转场轨、不把片段边缘fade当转场；选择/删除接线待补 |
| OP-16 / L4 | 预览点批注+精确帧、片段/轨道时间批注；独立正文；添加/编辑/移除/清空待发 | player-panel/timeline-panel → `timeline-annotation-queue.js` → composer | 已接入；活动标记跟随锚点，预览坐标排除留黑；失败队列可恢复、编辑正文和保留正文重定位；历史只在处理状态允许时绘制 |
| OP-17 / L4 | 整体要求+多批注一次发送；真实处理/失败重试/完成；历史锚点跳转 | `project.creation.annotation.send` → Host持久消息与任务状态 → Stage3 request/creative/model规划 → Command/Commit | 已接入现行 `produceCreation`；区分持久消息、queued/processing/failed/resolved/superseded 与真实渲染回执；失败精确重试或重新打开编辑，成功移除活动标记、历史可跳转。自动化使用受控 provider，不代表外部模型实跑 |
| OP-18 / L4 | 当前批注新写、历史精确读回/重放、失联提交重试 | Main handler → Host `sendTimelineAnnotationMessage` → `project-storage/src/timeline-annotations.mjs` +合同/validator | 当前写协议 v3；新写拒绝 v1/v2，仅允许既有消息精确重放；未发送旧草稿明确升级并保留正文；v3 message 与 queued 事件原子追加，状态事件可重开 |
| OP-19 / L1,L5 | 版本点击观看、明确采用、比较/组合、撤销/重做 | creation-workspace/workbench → draft timeline/preview/select/combine/restore | 观看≠编辑≠采用；对齐源身份/PTS/lineage，无对应内容明确说明；按钮/键盘条件一致；旧预览不能禁当前合法编辑 |
| OP-20 / L5 | 问题列表/刷新、短红提示、关闭提示、适用恢复入口 | error-dialog + workbench → Host持久问题与重试用例 | 约2秒toast淡出，30秒且无关成功后同一问题仍可查；有根因/对象/下一步，关闭不删除；首次复核 |
| OP-21 / L5 | 作品列表、新建/打开/关闭/重开、移入回收站 | project-panel/workbench → Main recents/project lifecycle → Host | 不透明引用与真实身份，失联/损坏不假空列表；跨窗口切项目旧回调不写新作品；首次复核 |
| OP-22 / L5 | 回收站逐项/全部恢复、逐项/全部永久删除、确认/取消/空态 | Main project handlers/recents → Host物理删除边界 | 外部原片、独立导出、共享档案和他人作品保留；身份/锁/外来文件检查；中断可恢复；无handler旧入口清理；首次复核 |
| OP-23 / L5 | Select a version; export and inspect QC, location, cancellation and failure | `export-dialog` / `workbench` through Project Host and the Compose Browser Host | The current user-facing target is `http://127.0.0.1:6081/`. Browser export returns actual downloads and sidecars when provided; the UI reports download initiation, not OS-level save completion. Verify against a current Browser build. Electron-only export receipts are a separate runtime record and do not substitute for Browser evidence. |
| OP-24 / L6 | 帮助、实际快捷键、资源/属性/预览/时间线独立尺寸、响应式和减少动态 | renderer页面、事件与workbench.css | Help、实际快捷键与IME保护已接入；九页导航、共享composer、Projects/Help/Recycle正式页面、1440/1080/820/640/360视口、125%/150%等效视口、焦点恢复、输入选区保留和减少动态均由DOC-007 L6自动复核。 |

## 范围解释与缺口处理

- demo的顶部状态选择器、固定库存/作品/回复、合成缩略图、CSS假效果、模拟导出及localStorage项目状态不进入产品。
- demo明确未连接的在线素材/字体贴纸商店、数字人、联网采集/学习、未注册柔光/漏光等不属于本包可操作能力。展示明确空态/不可用原因；不得用这条例外禁用表中已有OP。
- 既有正式精修、保护、配乐、档案和导出能力必须保留；UI重做不缩小既有产品范围。
- PiP/字幕/音频等只完成本清单与现有能力保持，不声称完整专业剪辑家族accepted。
- 已有任务范围内连续实施，不新增人工审核/重复授权条件。产品内部改片权限、云处理范围、素材许可及数据保护仍须由真实运行接口校验。

## 批注闭环的实施约束

沿用一条共享会话。整体文字与annotations数组是不同字段；Host从已验证锚点派生有界上下文，正文是不可信用户内容，不能提升为系统指令/直接命令。组合提交绑定request revision、draft、Timeline和operation身份；消息持久化和创作任务的关联必须可恢复，重试不得重复任务/修改。

当前组合提交/消息合同为v3，独立处理状态为v1；已由 ADR-0046 记录。旧v1/v2消息保持只读/精确重放，不在其旁增加旧协议新写入口，也不直接删除历史数据。

区分 queued、processing、failed、resolved、superseded 的持久状态语义；消息保存回执不能声称resolved。失败可以按原身份重试，也可以由用户明确重新打开并以新身份编辑；失败根因与原消息保留。成功处理后活动标记消失，历史锚点仍可跳转。实际 Host/存储/渲染闭环与边界验证见 DOC-007 L4 检查点。

请求修订和已提交作品版本分别校验：生成失败后，最新已保存草稿可以早于当前请求修订；新批注仍须绑定同一请求的最新草稿与当前 Timeline。新修订的 `creation.state.saved` 内部事件在同一事务保存 `annotation_operation_id`，普通修订显式为 null；重试只能恢复该修订所属的原 operation。旧三字段事件保持原样，仅在消息唯一且历史处理事件能证明关联时读取，含糊的历史中断须明确报错并允许重新编辑，不能丢弃批注继续生成。全片灰度要求与同向有效锚点可以共存；明确局部限定、保留彩色、否定灰度及失效锚点仍需处理冲突。

## 验证与交付

工程命令以manifest为准，执行顺序/具体场景见DOC-007。每个OP记录执行用例和Evidence；包含真实导入与编辑数据、实际解码合成媒体、模型边界测试、失败/重开，以及十种工作台状态。测试fixture和mock只证明对应边界，真实云模型运行与可选真人意见分别记录。

本包正式关闭须所有OP完成、必需工程检查通过、当前完整构建的WIN-09/WIN-10自动交互记录以及不可变Evidence和工具校验。人工审核、审美/听感签字或再次询问授权均不是完成条件；可选反馈不能被伪造为已接受。Agent完成实际可自动化验证及修复，记录工具限制。本包完成不自动代表P5、Stage Exit或Release。

## 2026-10-15 current deployment clarification (DOC-012)

The acceptance target for the user's current P4 workbench is the Compose-hosted Browser entry at `http://127.0.0.1:6081/`. The TypeScript web Host source is `apps/web/src/server.ts`; the Docker image runs its compiled `apps/web/src/server.js` artifact. It serves the shared Renderer through the Browser entry and `/api/invoke` transport. Electron uses a different IPC transport. Accordingly, the Electron-only failure recorded in DOC-012 is historical evidence about that Electron journey and a diagnostic signal for shared Renderer behavior. It does not establish failure of the running Docker Browser entry. Do not require Electron delivery or repeat Electron testing to satisfy P4; WIN-09/WIN-10 still require current-build automated Browser interaction receipts. The documented HTTP/health check is not an interactive acceptance.

The proposal to move detailed creation permissions into global settings is unresolved. It is not an approved product requirement or an implemented capability; retain the current permission flow until a product decision records the intended ownership, timing, and consent semantics.
## Current Browser engineering entry (2026-10-20)

The P4 required engineering list uses `web:host:test`, the direct `node --import tsx tests/integration/stage3-p4-integration.test.ts` check, and the existing timeline/annotation/recycle checks. The legacy `stage3:p4-integration:test` aggregate also launches an Electron DOM harness, so it is not the mandatory entry for this Browser-only acceptance. This changes the test entry, not the required operation coverage: OP-01 through OP-24 and WIN-09/WIN-10 still require actual current Browser evidence. The aggregate and its historical outcomes remain available for their own runtime; no old test is relabeled a Browser pass.

Audio-track listening uses the existing PrecisionEditV1 solo action with optional exact track_id and representative clip_id; Host selects all clips on that enabled audio track, preserving picture and reversible gain/routing. Existing global Track.solo remains unchanged and historical state has explicit cancellation. Display-only selected state is bound to its immutable Host metadata reference. Runtime acceptance belongs to the current build Evidence, not this interface description.
