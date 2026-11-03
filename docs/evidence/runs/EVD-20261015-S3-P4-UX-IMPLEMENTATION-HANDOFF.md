---
evidence_id: EVD-20261015-S3-P4-UX-IMPLEMENTATION-HANDOFF
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-15
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 1eeeff98739b426976a8bf4f1ce65e35492aa42f75ebca74c629b81cb829488f
result: partial
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
---

# P4 implementation handoff — independent review required

本记录是 P4 本轮实现和针对性自检的交接证据，**不是 P4/P5 完成证据**。权威层为 Evidence，由 DOC-007 的本轮 checkpoint 链接；现有 R3 记录描述另一源码/构建，不能容纳这轮修改的结果，因此新增此独立记录。没有修改历史 Evidence，没有声称人工审美/听感接受。

## Environment, identity and boundaries

- Windows `LAPTOP-59PJIFQS`，工作目录 `C:\Users\24179\Desktop\AI_VLOG\AVE`，分支 `codex/p4-stage-start-20261009`，HEAD 如上；没有提交、推送、部署或修改代理/凭据。`127.0.0.1:7897` 未更改。
- 当前源码指纹、每个触碰源码文件的 SHA-256、工具版本、Git 状态见 [source-identity.json](../assets/p4-ux/implementation-20261015/source-identity.json)。源码指纹包含整个 dirty 工作树，并非仅此轮 diff。
- 开始时已读 Git dirty 状态且保留已有修改；临时基线副本在后续沙箱调用中未能重新定位，因此不能作为持久交付物。下方明确列出此轮触碰路径；其他 dirty 文件、既有删除与 untracked 内容没有被重置。只删除了本轮测试错误创建、随后已隔离到临时目录的 `electron-user-data` 缓存。
- `.agents` 不存在。按 AGENTS 读取当前文档链、P4/P5、DOC-007、WORKSPACE_DESIGN 和测试规范。P4 allowed_paths 已包含全部运行时/测试/文档路径，无需扩张权限。
- P4 由 completed 重新置为 ready 后执行 `docs:start` 的实际脚本，现保持 active；P5 pending。两项 P4 capability/acceptance 置 pending 复验，保留历史证据引用，新增 `DEBT-S3-P4-CURRENT-UI-REVALIDATION`。没有调用 `docs:complete`。
- 本轮 Electron 加载当前 renderer 源码的隔离副本。没有重新构建生产桌面/容器，没有新的 build-input、镜像或 WIN interaction receipt；历史 R3/P5 运行面不能代表这里的源码。

## Implementation and touched files

运行时变更均在 `apps/desktop/src/renderer/`：

| 文件 | 本轮变更 |
| --- | --- |
| `workbench/workbench.js` | 九页布局与路由；全局浮动气泡；展开/收起、键盘/指针拖动、位置保存和边界夹取；单一 composer/log 跨页；素材返回路由；当前范围接线；失败历史精确重试/重新打开编辑及未发送草稿保护；Escape 保留原生对话框行为。 |
| `styles/workbench.css` | 替换旧 navigation-rail/story-sidebar/editor-desk/dock-composer 布局，采用 demo 的 sidebar、素材/预览、精修资源/预览/属性/时间线及 global-chat 分区、色彩、卡片/版本行和响应式；属性栏不再被针对 details 的旧 `[open]` 规则隐藏。 |
| `features/creation-workspace.js` | 用户/助手消息与真实任务状态；共享整体要求；范围按钮；独立批注正文 dialog；待发送队列编辑/删除/清空；失败任务保留 composer，历史单项重试/重开；历史页独立节点；空队列不占据浮层。 |
| `features/timeline-annotation-queue.js`、`.d.ts` | 当前片段/字幕范围转换为精确 RationalTime 的现行 v2 annotation，作为同一次 v3 组合提交的结构化上下文；失效选择拒绝发送。 |
| `features/timeline-panel.js` | 镜头条增加“整部作品”范围入口；保留原真实手势/命令。 |
| `features/media-panel.js` | 真实素材类型筛选、项目/音频目录切换、精修素材/特效/转场标签；修复重试按钮误显示，保留真实授权片段/资源操作。 |
| `features/audio-library.js` | 目录隐藏时停止试听；替代资源入口先展开正确目录再选择/试听。 |
| `features/player-panel.js` | 创作和精修页面均可通过真实预览右键建立批注。 |
| `state/workbench-state.js` | 气泡默认右下角，仍使用现有 Host UI 偏好保存。 |

测试修改：`tests/integration/stage3-p4-workbench.test.mjs`、`tests/property/timeline-annotation-queue.test.mjs`、`tests/architecture/renderer-workbench.mjs`、`tests/fixtures/stage3/renderer-races.js`。最后一个 fixture 的调用方/选择器已跟随新布局，但其完整长流程本轮未运行，必须由 reviewer 跑 `stage3:desktop-workspace:test`。

治理修改：Stage3 manifest、STATE、CAPABILITY_MATRIX、ACCEPTANCE_MATRIX，DOC-007，本 Evidence 与资产目录；`docs/current/**` 和 `DOCUMENT_INDEX.md` 只由 sync 生成。

没有移入 demo 的固定素材、假回复、模拟处理结果或 localStorage。真实动作继续经现有 Main/Host/Command/Commit/Render 链。本轮没有修改 Host、跨语言合同、Timeline 写入路径或渲染架构。

## OP-01–24 coverage and review scope

表中“保留”仅表示复用现有真实实现，不表示本轮重新通过端到端验收。

| OP | 实现/必要自检 | 独立复核仍需覆盖 |
| --- | --- | --- |
| 01 | 九页独立路由、导航折叠、共享状态；8 页 active-project fixture 加独立 export 页面检查。 | 同一真实项目/版本跨页、关闭重开及旧 UI 偏好迁移。 |
| 02 | 保留真实导入/browse；新增分类、目录、资源标签，修复重试可见性。 | 真视频/图片/音频、重复、取消、失败重试、非空图库布局。 |
| 03 | 保留播放器，修复素材返回创作/精修来源页，连续切素材不丢返回页。 | 真播放/seek/音量/全屏/图片缩放、快速切换释放。 |
| 04 | 保留实际音频目录；替代入口、显示切换和停止试听接线修复。 | 真试听、授权、替换/应用、来源与许可。 |
| 05 | 全局同一个 composer/log；跨页草稿、选区、气泡展开收起/位置保存；当前片段范围。 | 原生鼠标捕获拖动、IME、生产过程及重开恢复；范围语义 review。 |
| 06 | 保留真实插入/排序命令；既有 DOM 时间线回归通过。 | 实际素材插入、重排的 Host/render 与版本次数。 |
| 07 | 保留修边/分割/删除/复制；本轮 DOM 分割/删除回归通过。 | 连续三次操作、精确帧格、撤销重做与双端输出。 |
| 08 | 保留 PiP/跨轨链。 | 非空 PiP 手势、边缘、冲突拒绝与真实合成。 |
| 09 | 保留音频链，DOM 音频拖动回归通过。 | 采样边界、真实音频输出、路由与持久化。 |
| 10 | 保留字幕/文字链，DOM 字幕拖动回归通过；可作为当前范围。 | 字幕/文字落点、修边、分割、删末项/建轨。 |
| 11 | 保留原子建轨、删轨/清理与保护规则。 | 主轨保护、空轨、撤销恢复、真实 Host 版本。 |
| 12 | 保留精确标尺/播放头/空域/缩放/吸附；旧预览与空时间域回归通过。 | 原生手势、取消、跨轨、长时间线与窗口缩放。 |
| 13 | 保留预览字幕直接编辑；Enter/blur 单次提交 DOM 回归通过。 | 字体/字号/颜色/粗细在 Preview/Master 的实际输出。 |
| 14 | 新资源标签连接现有灰度/黑白/模糊；DOM 效果删除回归通过。 | 效果拖放/替换/移除/撤销的双端输出。 |
| 15 | 转场标签接现有交叉溶解；既有替换/选择逻辑保留。 | 剪辑点合法性、删除/替换与实际 Preview/Master。 |
| 16 | 预览/轨道右键→独立 dialog→编辑/删除/清空队列；精确点/时间属性测试、dialog DOM 回归通过。 | 真解码帧上的点和时间；取消/重定位/历史锚点。 |
| 17 | 整体要求+多批注一次提交；真实 queued/processing/failed/resolved/superseded 显示；失败保留并精确重试/重开。 | 从正式界面到真实模型/Timeline/render 的完整链；持久消息不等于处理成功。 |
| 18 | 保留当前 v3/旧协议只读重放边界；Host annotation 测试通过。 | 失联请求重试及重开读回的当前构建交互。 |
| 19 | 独立版本历史页，保留观看/采用/比较/组合/撤销功能。 | 非空多版本、真实封面、比较/组合、选区与输入焦点；完整 race fixture。 |
| 20 | 保留持久问题与恢复入口；本轮 DOM 导入问题恢复回归通过。 | WIN-09 的等待/无关成功/真实重试链。 |
| 21 | 作品页面保留真实项目控制；布局/导航检查通过。 | 真新建/打开/关闭/重开、跨窗口与 dirty 恢复。 |
| 22 | 保留真实回收站和权限确认。 | 逐项/全部恢复删除、取消、外部原片/导出/档案保护。 |
| 23 | 现有正式 export 页面保留；桌面/360 宽度、返回/可见性回归通过。 | 实际保存、产物 hash/QC、附件、失败/取消及重开。 |
| 24 | 资源/属性/时间线分区与尺寸、帮助、响应式及减少动态；40 个 active-page geometry 检查通过。 | 非空媒体的视觉对齐与尺寸交互；原生窗口、125%/150%、L7 当前构建复核。 |

“当前片段”沿用现有 annotation→规划上下文表达调整范围，没有新增 Host 硬性 edit-mask。reviewer 应检查规划产物是否遵守该范围；不得把 UI 选择解释成新授权或绕过现有保护约束。字幕用精确 track/range 并在正文标明 caption identity，现行合同没有专门 caption anchor 字段。

## Actual verification

日志目录：[implementation-20261015](../assets/p4-ux/implementation-20261015/)。工具执行的退出码另存 `verification.json`。

| 命令 | 结果 |
| --- | --- |
| `node --test tests/integration/stage3-p4-workbench.test.mjs` | 7/7；正式入口、时间线/字幕/效果、dialog、失败保留、单一全局对话、跨页、响应式。受控 IPC/provider fixture，不是外部服务或全 OP 接受。 |
| `node --test tests/property/timeline-annotation-queue.test.mjs` | 4/4；含 NTSC 精确范围、字幕范围、失效选择、preview 点及稳定提交身份。 |
| `node --import tsx tests/integration/timeline-annotation-host.test.ts` | exit 0；真实 Host/存储，受控 provider，临时隔离项目。 |
| `node --import tsx tests/integration/stage3-p4-annotation.test.ts` | exit 0；协议/提交处理辅助回归。 |
| `node tests/property/stage2-workspace.test.mjs` | exit 0；时间、授权、播放器、比较、导出、undo/redo 等现有 Renderer 回归。 |
| `node tests/architecture/renderer-workbench.mjs` | exit 0；Renderer 边界和 demo 配色基准。 |
| `node node_modules/typescript/bin/tsc -p tsconfig.base.json --noEmit` | exit 0；直接 TypeScript 检查，不宣称执行了包含 contracts:generate 的完整 pnpm typecheck 脚本。 |
| `node tools/architecture-check/check.mjs` | exit 0。 |
| `node scripts/docs/sync.mjs`、`node scripts/docs/check.mjs` | sync exit 0；本机 check exit 1，31 项 evidence applicability 不匹配；沙箱 EPERM 和 latest-evidence fingerprint mismatch 已在本机复核/元数据绑定后消除。没有更新 applicability index 来绕过复验。 |

8 张 `fixture-*.png` 为正式 renderer + 受控空媒体项目的截图，仅供布局/消息 UI QA；不是用户作品，不是实际播放、渲染或模型接受。精修截图明确显示资源、预览、属性和时间线，历史使用真实结构的 fixture 版本行。没有像素等价或完整美学接受声明。

执行中遇到并处理/保留的限制：

1. `pnpm` 不在 PATH；corepack 的固定 11.9.0 下载被现有代理访问权限拒绝。缓存 pnpm 版本不同且触发版本/依赖安装检查，未继续安装或改配置。本轮使用 package.json 对应 Node 脚本；没有更改锁文件或依赖。
2. 沙箱临时项目的 rename/hardlink 被 EPERM 拒绝；不能据此判产品失败。明确设置正常用户 TEMP 后，Host immutable-original 硬链接仍被沙箱拒绝；获准本机执行该单项测试后 exit 0，没有放宽产品不可变原片要求。
3. 隐藏窗口的 animation frame 等待曾超时，改用有界计时/读取布局；截图需重新绘制后捕获。最初新增 userData 路径错误已修复为 launcher 临时目录，由父进程等 Electron 退出后清理。
4. 隐藏窗口 CDP 鼠标注入未移动气泡，不能声称原生拖动通过。最终拖动回归明确使用 DOM PointerEvent 并仅 stub OS pointer capture；位置计算、保存和展开状态走产品处理器。原生指针捕获留给 L7。
5. 全套 `pnpm run check`、synthetic、完整 P4 required_tests、当前构建 WIN-09/10、P5 WIN-01–10/C1–C9、真实外部模型、实际最终媒体导出本轮均未运行。父任务已安排后续独立 reviewer；没有增加用户确认或人工签收门槛。

## Reviewer continuation

先读本记录、DOC-007 最新 checkpoint、source-identity.json 和新增代码；不要把累计 Git diff 中其他 dirty 文件归为本轮。重点审核：当前范围编码与规划约束，ordinary/combined request 的失败/成功草稿清理，精确重试不覆盖未发送文本，跨页面 focus/inert、dialog Escape，素材返回来源页，音频试听清理，属性面板与窄屏交互。

在已配置的 pnpm 11.9.0 环境中，从同一目录执行；不要为跑命令更改代理/凭据：

```powershell
$env:TEMP='C:\Users\24179\AppData\Local\Temp'
$env:TMP=$env:TEMP
pnpm run stage3:p4-workbench:test
pnpm run stage3:p4-annotation:test
pnpm run stage2-workspace-renderer:test
pnpm run stage3:desktop-workspace:test
pnpm run stage3:p4-integration:test
pnpm run renderer:workbench:test
pnpm run typecheck
pnpm run contracts:check
pnpm run architecture
```

继续执行 manifest 的其余 required_tests（timeline-render、worker render-graph/render-correctness、render-graph、request/generation/model、interaction acceptance、docs）；再按 P4 包/DOC-007 取得当前构建 WIN-09/WIN-10 与 L7 记录。P4 通过后生成绑定最终源码的新 EVD，执行 `pnpm docs:complete -- WP-S3-RELIABLE-UX-001 <新EVD>`、docs:sync/docs:check，才启动依赖就绪的 P5。P5 最终需 `pnpm run check`、`pnpm run acceptance:final:synthetic` 及当前构建全 WIN/C1–C9。构建/运行面按现有工程文档建立；本轮未提供新的已部署版本。

本轮实施者在交付最终答复后停止写入，供独立审核接手。

最终收尾：14 个源码/测试路径的 SHA-256 已登记，代码指纹 `1eeeff98739b426976a8bf4f1ce65e35492aa42f75ebca74c629b81cb829488f`。7/7 DOM 测试后仅将等价的 IME/defaultPrevented 组合判断拆成两个 early return，以兼容现有边界断言；最终 renderer boundary exit 0。该细节记录在 verification.json，独立 reviewer 应在最终指纹重新执行命令。31 项 docs applicability 失败保持真实，不构成新的人工批准要求。
