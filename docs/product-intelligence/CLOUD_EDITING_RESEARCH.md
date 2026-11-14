# 自动剪辑对标与云端方向：历史研究

本文保留历史研究及其当时提出的方案，文中阶段、工作包和执行顺序均不构成当前入口。当前执行以[唯一计划](../plans/2026-11-12-llm-semantic-foundation.md)为准。

状态：DOC-013 初始方向研究和 DOC-014 文档整理已有记录；DOC-015 接续核对 Hypit 模块并制定完整交付实施方案，见下文。Hypit 接入实施和实片对标未开始。本文属于独立文档工作计划，记录研究依据、开放问题和后续验证；产品目标由 [PROJECT_GOAL](../../PROJECT_GOAL.md) 拥有，云端方向由 [ADR-0059](../decisions/ADR-0059-cloud-editing-direction.md) 拥有，当前实现状态仍由 programme/current 和对应 Evidence 决定。现有活动 P4 计划负责其实施顺序，不能用本研究推进或完成它。

## 需求与边界

用户于 2026-11-11 指定：自动剪辑效果对标 Hypit 和 ChatCut，同一作品仍可手动精修；暂缓本地部署，全部模型角色采用云端配置，并允许云端渲染。先研究并更新文档，本工作不更改代码、容器、云服务或项目数据。对标的是实际作品效果和交互能力，不要求引入竞品客户端或复制其内部实现；生成媒体是否纳入具体交付须另行明确成本、授权和范围。

## 官方资料研究

| 参考 | 官方资料所述能力 | 对 AVE 目标的启示 |
| --- | --- | --- |
| Hypit | [官方仓库](https://github.com/hypit-ai/hypit)描述以参考视频或要求创建可编辑、可重复运行的制作流程，组合字幕、B-roll、效果和文字锚点；[文档](https://hypit.video/docs/)列出脚本、样式、素材、时间装配、字幕/画面/音频轨道和渲染。 | 除完成一条成片外，要能审视叙事结构、字幕和包装的组合；参考驱动、时间锚点与可复用能力应纳入后续调查，不能仅凭模板名称认定效果相同。 |
| ChatCut | [官方介绍](https://chatcut.io/docs/what-is-chatcut)描述自然语言生成或修改可编辑多轨时间线、字幕与版本；[功能说明](https://chatcut.io/features)还列出动态图形、转写、音频处理和生成式素材。 | 自动方案需落在用户可继续调整的时间线上，精修后仍可撤销、预览和导出；生成类能力应与素材剪辑分别确定范围和费用。 |

以上为供应商当前公开描述，不是独立质量测评、能力保证或 AVE 的已实现状态。没有下载竞品、上传用户素材、产生竞品服务费用或运行实片对照。

## 现状与关键缺口

AVE 已有基于素材证据的创作规划、版本化时间线和部分精修路径；当前用户作品在规划阶段失败，尚无同素材成片对照。低资源分段覆盖有限，复杂字幕/转场/多轨不因此获得完整支持；云端模型配置与云端渲染是不同能力，目前不能以 6085 健康或云模型调用证明远端渲染已实现。详细实施状态以 [current STATUS](../current/STATUS.md)、[VALIDATION](../current/VALIDATION.md) 和现行 Evidence 为准。

当前案例暴露两个后续问题：用户说“1分钟以内”时应表达为时长上限，不应自动等同必须满60秒；图片应以可编辑的正展示时长计入画面时间，规划与测量应共同识别它。是否需要用户显式最低时长、如何处理无下限及无法构成连贯作品，应在实施设计中明确；不能把图片机械拉长或伪装成真实视频运动。

## 后续可执行验证口径

1. 建立可授权共享的同一组图片、视频和音频样本与请求，覆盖旅行 Vlog、口播、混合素材、字幕/标注、多音轨和参考风格；保留素材身份、模型版本、成本、执行参数及结果，竞品能力/套餐限制单独记录。未经授权不将用户私有素材发送给对标服务。
2. 分别比较首次自动成片的素材选择、时长范围、故事连贯性、节奏、画面构图、字幕准确/时序/样式、声音衔接和包装；记录技术客观检查以及人工听看评价的实际覆盖，不把单项通过扩大为整体对标。
3. 在自动产出上验证时间线精修：片段/图片时长、字幕文字与位置、声音与轨道、效果、撤销重做、保存、重开、预览与导出；每项需保留可编辑语义、权限和用户确认，修正后再次验证作品。
4. 云渲染实施需先定义 Host 到执行服务的合同、可信身份、许可与上传、成本可见性、数据生命周期、取消/重试/未知状态、原片身份、目标一致性、QC、原子发布和恢复；对权限撤销、网络中断、费用超限、重复结果、损坏结果分别失败验证。
5. 复测用户案例及多个真实项目后，记录与 Hypit/ChatCut 的样本、版本、可比性和差距。效果达到与否须基于结果，现阶段不得承诺等同或将本地优化暂缓表述为已完成。

## DOC-013 初次验证与当时下一步

已阅读上列官方资料并对照现有目标、稳定架构和现行工程 Evidence；更新长期目标、产品愿景、架构入口与 ADR，未更改运行配置。下一步由后续授权的实施工作包处理时长区间、图片参与规划和云端渲染方案；本次未选择服务商或预算，也未声明新的运行能力。

文档研究记录为 [EVD-20261111-DOC-013-CLOUD-DIRECTION](../evidence/runs/EVD-20261111-DOC-013-CLOUD-DIRECTION.md)；仓库 docs:check 仍因既有 scene 请求双 major 和历史 Evidence 适用性/指纹失败，未推进任何实施工作包。

## DOC-014 接续：文档与本地分支清理（2026-11-11）

Purpose / Context：按用户“处理文档以及分支问题”“旧的不适用的直接删除”整理当前要求；保留历史执行证据、用户数据和现有有效实现。复用本计划记录，不另建状态源。

Plan / Concrete Steps：记录 dirty 文件与分支；删除旧本地优先、GPU 配置和过期入口条款；统一云端模型操作入口；仅删除已合入当前 HEAD 的旧本地功能分支；重建生成文档并核对引用与分支；按用户后续指令，不为通过文档追加测试或重跑历史验收。远端同步仍暂停，不提交、推送、部署或删除远端分支。

Progress：已核对远端 heads 与本地祖先关系，当前工作保留在 `codex/cloud-editing`；旧功能分支删除前的 SHA 与工作区清单保存在 `docs/evidence/assets/doc-014/repository-before.json`。两个其他 detached worktree 不属废弃证明，原样保留。

Surprises & Decisions：主分支比当前 HEAD 少 9 个提交，不代表有合并冲突；未提交实现不属于任何已发布版本。当前 `media.scene_scan.v1` 仍被生产 Host 使用，新增 v2 为磁盘流式试验，不能仅因旧版本号删除 v1。检查失败必须记录真实原因，不得删有效断言或历史 Evidence 伪造通过。当前 P4 已重新打开，过期 accepted 状态须撤销为 blocked，历史结果保留。

Validation / Acceptance：云端文档不再要求本地模型；本地旧分支均有可恢复 SHA 且提交包含于新分支；生成状态反映真实阻塞；检查结果和仍需实施的协议问题明确记录。协议完整替换需要同步 Host、Worker、存储和测试，不属于单纯删除文档。

Idempotence / Recovery：修改文档按具体段落；不批量删除目录。分支可用记录的 SHA 重建；dirty 文件不 stash/reset。仅忽略未跟踪的临时浏览器跟踪和输出目录，不删除用户素材或 Evidence。

Interfaces / Artifacts：不改变模型、时间线、媒体协议或容器；维护 README、领域政策、programme 状态、生成 current 及独立 DOC-014 Evidence。Outcomes：已删除 97 份不再适用的归档文档和旧本地部署条款，删除 7 个已合入旧本地分支，保留其他 worktree 与所有用户数据。P4 两项能力及对应验收由过期 accepted 更正为 blocked，保留原 Evidence。文档清理不修复仍存在的 scene 协议并存、历史证据不适用于现构建、规划失败或云渲染尚未实现；不声称所有产品隐患解除。

用户补充明确不为文档通过而做测试。本轮只做文件/引用与 Git 元数据核对、生成文档同步；首次已观察到的 docs:check 失败记录保留，不追加历史验证。独立记录见 [DOC-014 Evidence](../evidence/runs/EVD-20261111-DOC-014-DOCUMENT-BRANCH-CLEANUP.md)。

## DOC-015：Hypit 模块核对与完整交付实施方案

### Purpose / Big Picture 与本次边界

2026-11-11 用户要求深入核对可复用模块及 AVE 接法，更新文档，完整目标一次交付；所有新增效果同时接入精修轨道和分段独立批注，不重复开发现有能力。本次授权是研究与文档，不是安装依赖、改产品代码、部署、购买许可证或发送用户素材。内部实施单元是施工依赖，不是可选阶段或缩小版交付。已有编辑能力范围仍由产品 scope 拥有，本计划不能删减其要求，也不将所有历史高级编辑债务误设为此次对标接入的全新前置。

本独立 DOC-015 沿用本文，不再创建第二份路线图。允许修改：本文、`PROJECT_GOAL.md`、`docs/README.md`、`docs/product/{PRODUCT_VISION,EDITING_CAPABILITY_SCOPE_V1}.md`、`docs/ux/WORKSPACE_DESIGN.md`、`docs/decisions/README.md`、新增拟议 ADR-0060，以及本次 `docs/evidence/assets/doc-015/**` 和独立 `EVD-20261111-DOC-015-*`。不改 programme、generated current/index、代码、锁文件或当前容器；不调用活动 P4 的 start/complete 来冒充研究验收。新增 ADR 只承载重大依赖/执行边界的拟议决策，Evidence 只承载本轮实际研究与核对事实，两者不能由滚动计划或旧 ADR 替代。

### Context and Orientation：已核对的 AVE 复用基础

基线为分支 `codex/cloud-editing`，HEAD `293695defc884445630b7d83e77a58c8f2031186`，已有 546 条 dirty/untracked 记录；本次以当前工作树而非 HEAD 代表实际源码。修改前清单和 7 份现有文档摘要见 [baseline](../evidence/assets/doc-015/research-baseline.json)。当前 P4 两项集成能力为 blocked，P5 pending；工程子集存在不等于当前完整接受，历史验收也不证明新效果。

| 现有能力与 owning source | 本次直接复用 | 接入时必须处理的真实缺口 |
| --- | --- | --- |
| `packages/core/timeline-core/src/public.ts`、`commit-plan.ts`；Host `commitCreationEdit` / `commitManualCreationDraft` | Clip/Caption/Effect/Transition/轨道、模拟、单次原子版本、锁、撤销/重做 | 仅扩展缺少的有类型组件引用/参数与 Command，不新建第二份 Timeline |
| `timeline-core/src/automation.ts`；`render-graph/src/public.ts`；Worker `render/graph_compiler.py` | hold/linear/Bezier 与 x/y/scale_x/scale_y/rotation/anchor_x/anchor_y/opacity 八条已支持变换路径 | 复用 AutomationCurve；旧 Keyframe[] 被阻断，不能拿旧字段代表新动画支持；补目标效果实际需要的组合 |
| `render-graph/src/v2.ts` 与 Worker compiler | 已有字幕、静态构图、合成、色彩、音频、时间映射及受限转场；dissolve/cross_dissolve/fade/whip/zoom/luma 已有 resolver 分支 | 按真实 handles/overlap 和执行限制接通，不重复实现；不得把 resolver 枚举当完整实片验收 |
| `project-host/src/precision-edit.ts`、Renderer `p4-timeline-commands.js` | 现有移动/修边/分割/复制/波纹删除/图片时长/字幕/音频等 | `slice` 拒绝 automation/tracking/time_map；新增效果必须同步完成窗口裁剪、分割和显式重定时，不能通过删除断言掩盖 |
| `core/edit-ir/src/creation-plan.ts`，尤其 `CREATION_TRACK_SEMANTICS_UNREPRESENTED` / `CREATION_EXISTING_SEMANTICS_UNREPRESENTED` | 已有手动字幕、音画关联、solo 元数据和保护引用的保留机制 | 当前 managed track/变化片段的高级语义可能阻断下一轮 AI 修改；扩展显式 patch 与依赖重映射，保持未涉及对象原样 |
| `project-host/src/creation-timeline-projection.ts` | 白名单 UI 投影与 `restoreCreationPrivateFields` | 新增参数、元素与只读来源投影，不能暴露执行代码/路径或在 UI 回传时丢失隐藏字段 |
| `project-host.ts` 的 annotation validate/resolve/send/retry；`project-storage/src/timeline-annotations.mjs` | 独立批注 ID、范围、组合消息、版本、任务、失败恢复和规划上下文 | 当前仅 clip/track/空间点锚点，主要为单位速度来源映射；需元素/词/效果/转场目标、明确谱系、逐条落实结果 |
| `timeline-annotation-queue.js`、`timeline-panel.js`、`precision-edit.js`、`creation-workspace.js` | 现有独立正文、待发队列、共享输入、精修轨道及属性栏 | 在原页面加对象选取和参数，不嵌入另一个编辑器替代 AVE |

特别区分：ClipKind 已有 `graphic`，但当前 Worker 将其作为静态图片源；可编辑动态图形组件不是已实现能力。Graphic Bake 在架构里是既有扩展位置，当前仍需真正实现，不能因为文档中出现该名称就声称已接通。

### Research：固定版本、许可与发布工件

核对日期 2026-11-11；Hypit 源码固定为 [`47bfe6e9a231773a29af447eeb9fe65f32217275`](https://github.com/hypit-ai/hypit/tree/47bfe6e9a231773a29af447eeb9fe65f32217275)，根 Distribution 标识 `@hypit/hypit@0.3.2`。源码快照和 npm 工件是两种身份，不能假定 main 等于某个已发布 tarball；实施锁定实际安装工件的 version/integrity、依赖闭包与源码对应记录。当前源码 Node 要求 `>=22.15.0`，AVE Docker 基线为 22.16.0，版本下限相容；尚未进行打包、容器或浏览器执行验证。

许可依据是固定提交的 [LICENSE](https://github.com/hypit-ai/hypit/blob/47bfe6e9a231773a29af447eeb9fe65f32217275/LICENSE)，声明 modified Apache-2.0，**不能标为普通 Apache-2.0**。文本允许自己基础设施及组织内部/单组织自用场景，并对向第三方提供 hosted/managed/SaaS 功能、多租户以及商业再分发要求商业许可；CLI、报告、manifest 或衍生界面的署名有条件保留要求，输出内容权利另有条款。项目独立包也声明 `SEE LICENSE IN LICENSE`。技术方案以当前自用评估为基线，第三方服务/分发前需匹配真实使用方式与相应权利；不以 sidecar、私有部署或只复制部分源码绕过条款。未购买、未联系厂商，也未判断 AVE 的未来商业部署已获准。第三方字体、浏览器、模型和其他依赖许可单独登记。

源码 package.json 的 `private:true`/`workspace:*` 不代表没有可安装包；已核对 npm 发布元数据的独立包存在 dist JS exports 和 integrity。反过来，有发布元数据也不证明安装/运行成功。避免照抄旧文档的 `@hypit/render-hyperframes` 或已不存在的 root `author-kit/composition` 子路径；以固定源码及选定工件 exports 为准。

精确版本、抽查 integrity 和源码文件清单见 [Hypit audit](../evidence/assets/doc-015/hypit-audit.json)。优先接入的发行组合为 `caption-fine@0.2.0`、`text-fine@0.2.0`、`ranking/comment-sticker/depth-stack@0.1.0`、`film@0.2.0`、`composition@0.1.0`、`html-program@0.1.1`、`provider-html-local@0.2.0`，统一核对与根 `hypit@0.3.2` 的依赖闭包；这些是已发布候选，不是已安装依赖。可复核的官方源码包括 [独立打包脚本](https://github.com/hypit-ai/hypit/blob/47bfe6e9a231773a29af447eeb9fe65f32217275/scripts/pack-independent-package.mjs)、[caption-fine](https://github.com/hypit-ai/hypit/blob/47bfe6e9a231773a29af447eeb9fe65f32217275/packages/caption-fine/README.md)、[text-fine](https://github.com/hypit-ai/hypit/blob/47bfe6e9a231773a29af447eeb9fe65f32217275/packages/text-fine/README.md)、[HTML provider](https://github.com/hypit-ai/hypit/blob/47bfe6e9a231773a29af447eeb9fe65f32217275/packages/provider-html-local/README.md)。npm 核对使用 `https://registry.npmjs.org/@hypit%2F<package>/<version>` 对应工件元数据，不以搜索摘要认定可用。

### 模块复用矩阵

“直接复用”指复用现成算法/组件/执行模块，不意味着零适配或已部署。全部来自上述固定源码的 `packages/<目录>/`；模块边界须以发布工件导出复核。

| 模块 | 决定 | AVE 接入位置与理由 |
| --- | --- | --- |
| `caption-fine`、`text-fine` | 直接复用字幕/文字布局和动效实现，外加输入适配 | AVE 的 Caption/词时序为权威；映射为 Hypit caption schedule/visual track，返回图形贡献。已有普通字幕不重做、不重复烧录 |
| `ranking`、`comment-sticker`、`depth-stack` 及其他经核对组件 | 直接复用排行/评论卡/多卡片景深组件实现和声明的参数；项目示例通过受控打包复用 | 注册为 AVE 图形效果，公开稳定 element IDs 和属性；不能只导入成片。comment-sticker 是成片中的社交评论卡，不是 AVE 独立批注。缺少所需参数时补 adapter/组件暴露，不删除精修要求 |
| `visual-track`、`spatial`、`text`、`temporal` | 作为 Hypit 图形依赖按需复用 | AVE 负责时间线和坐标权威，转换后的 canvas/时间窗口只是执行投影；已支持普通 PiP/变换继续走 AVE |
| `film`、`composition` | 复用结构化图形合成 | 建立图形子图/场景，不用 Hypit Film 替换全片 AVE 项目；现有音频混合和片段合成继续复用 |
| `html-program` | 直接复用 Composition→逐帧 HTML 编译 | `compileHtmlProgram` / `materializeHtmlProgram` 作为执行适配内部接口，固定字体/依赖和 frame domain |
| `provider-html-local` | 直接复用浏览器绘帧执行，接 AVE Worker Job | `rasterizeHtmlProgram` / `rasterizeHtmlFrames` / `createLocalHtmlProvider` 可作为候选接口；不必为此复制浏览器绘帧器，也不必引入全套 Hypit executor |
| `html-video` | 通常不接其整套 author 编排，保留为参考 | 该模块编排 compile/rasterize/audio/mux；AVE 已有音频与最终发布，直接使用 html-program/provider 避免重复；不是必须引入的新编码引擎 |
| `script`、`narrative-temporal`、`narrative-caption`、`speech-evidence` | 对语义锚点和词句映射按需复用，AVE 数据适配 | 已有云端转写与 source PTS 保留；没有真实词级时序时明确获取云端对齐，不能默认启用本地 WhisperX或捏造词时间 |
| `recipe` 与 production/craft 指导 | 复用样式表达和创作方法，按许可保留来源 | 规划层得到可执行能力/风格参数，不允许 Skill 文本越过 Host 变成任意命令 |
| `studio-companion` | 复用可提取的属性/元素映射知识，按需依赖 | AVE inspector 和批注使用自有白名单投影；不复制 Studio 项目状态或直接回写 SVML 成为另一权威 |
| `studio`、`project`、`result`、`workspace`、全局 runtime/executor | 不替代 AVE 同类系统 | 已有项目、事务、任务、版本、权限和恢复；需要的 Hypit 内部依赖可以私有封装，不对外暴露双写状态 |
| image/video/speech 模型与 provider 包 | 在需要生成素材的明确需求中复用适配，不默认启用全部服务 | 接现有 Model Gateway、授权和成本记录，输出作为有来源的普通素材；不重建模型网关、不默认换供应商 |

### Plan of Work：完整交付范围与差异工作

下表定义本次对标接入应整体完成的结果面，不限定为三个示例效果或少量模板。每行全部适用新效果均须经过后述共同验收。具体组件目录由同一版本能力清单枚举；缺项记为未完成，不靠减少目录制造通过。产品原有 CAP 家族继续保留，不因引入 Hypit 自动全体 accepted。

| 结果面 | 优先复用 | 必须随效果完成的工作 |
| --- | --- | --- |
| 自动选材、叙事、时长区间、混合图片/视频、参考风格 | AVE 观察/规划/Skill/时长测量，参考 Hypit production 方法 | 时长上限不等于固定时长；图片按真实展示参与；风格拆成受证据约束的剪辑/字幕/构图/音频/包装参数；实际作品评测 |
| B-roll、PiP、图片运动、基础变换与转场、色彩/声音编排 | AVE 已有 Command、AutomationCurve、resolver、FFmpeg | 补尚缺的规划和精修入口、目标所需组合及依赖联动，不重写已有执行能力 |
| 字幕排版、逐词强调、动态文字、双语/多语言需要的布局 | AVE Caption + Hypit caption/text 模块 | 词与句身份、中文/字体/安全区、样式和动效参数、手动纠字保留、按词/字幕批注、裁剪联动 |
| 标题/人物条/地点/章节/结尾卡、标注箭头/贴纸、图表/排行、聊天/路线等动态图形 | Hypit 组件、Composition、HTML 程序；已有可用实现优先 | 结构化元素与依赖、可编辑参数、图形轨/附着实例、局部批注、动画窗口精修；项目组件可扩展，不能把几个模板当全部包装能力 |
| 参考驱动的整体包装与用户指定新图形 | 组件组合、样式配方、受控项目组件 | 固定组件版本、参数和元素清单；新增代码组件在隔离执行边界验证后使用，不能在 Renderer/Host 直接 eval 模型代码 |
| 云端模型与允许的云渲染接入 | 现有 Model Gateway、Job、Worker、ExecutionPlan、QC | 图形执行可在获准远端 Worker 同构运行；服务配置、上传、取消、幂等、费用和结果校验完整；具体远端资源未选定不能声称已交付 |
| 精修与分段独立批注 | 原工作台、PrecisionEdit、组合 annotation 与版本机制 | 对本表所有新增效果同步完成对象级修改、逐条结果、保护未涉及内容及保存重开，无“以后再接”项 |

生成式素材保持既有需求边界：当前不是自动购买全套竞品生成模型。若目标请求需要生成图片/视频/声音，使用前述 provider 接入路径和相同素材精修/批注合同；没有素材授权或费用授权时明确未执行，不能用生成视频内部不可编辑作为放弃其时间线和分段批注的理由。不得把此边界用于删去已经明确要求的目标效果。

### Interfaces and Dependencies：建议接法（尚未实施）

已核对的上游函数链：`scheduleFineCaption(timing, program, document)` → `renderFineCaption(schedule, program, document, timeline, within, regions?)` → VisualTrack；`createFilmTrackSet` / `appendFilmVisualTrack` → `compileFilmComposition(program, canvas, timeline, set)` → `compileHtmlProgram(composition, timeline)` → `rasterizeHtmlFrames(request, options)` 或 `rasterizeHtmlProgram(request, options)`。`options.resources` 为 Hypit `EndpointInvocationContext["resources"]` 的资源接口，须实现到 AVE 授权内容寻址输入的适配，另接 `signal/onProgress/onDiagnostic`；不能只把原片路径直接传入就声称完成授权边界。

`caption-fine` 消费既有转写/词时序与可选 RegionEvidence，不做 ASR、人脸检测、跟踪或 Cue 拆合；原生 Studio 部分 Cue 时间视图只读，所以精修仍由 AVE 合同与 Commands 完成。当前 `rasterizeHtmlProgram` 输出无音频 H.264 TimelineVisual，不能当透明图层；固定源码的 `rasterizeHtmlFrames` 也调用不透明黑底捕获，不可直接用于透明叠加。须增加受控透明捕获或使用含获准背景的完整视觉区间，并验证实际输出。Provider 已有 Puppeteer/Chrome 绘帧和 FFmpeg 源解码，不需要重造；其依赖包括 `puppeteer-core@25.10.0`、`@puppeteer/browsers@3.2.2`，固定浏览器版本、字体和准备流程须进入实际构建锁与缓存身份。

```text
自动规划 / 精修 / 分段独立批注
  -> Host 解析当前对象与保护范围
  -> 当前 CommandEditIntent / CommandEditIR / simulate / CommitPlan
  -> AVE Timeline（组件参数、元素身份、源关系均随版本保存）
  -> Semantic Render Manifest
       -> Preview Graph / Plan -> 现有 Worker + Hypit 图形适配
       -> Master  Graph / Plan -> 现有 Worker + Hypit 图形适配
  -> Host 核验来源、产物、QC -> 原子 Render Bundle
```

1. **对象合同**：在现有 Clip/Caption/Effect 体系增加 typed component 引用，包含组件 ID/版本/内容摘要、参数 schema 版本、实例 ID、element IDs、获准资产/字体、局部时间窗、布局与锚定关系。沿现有 Contracts 生成绑定，禁止把可编辑结构藏进无校验 metadata。渲染产物是缓存；组件定义/参数是可恢复语义。新增字段同步 projection、存储、调用方及 validator。
2. **规划改动**：首次自动创建继续复用现有 creation plan→Commands；对已有作品修订扩展现有 planning exchange、Host 上下文和 `creation-plan.ts`，让模型针对当前对象提出有类型的 patch，不再建立另一套初稿系统。修订不回传/覆盖完整工程；Host 把 patch 编译为现有 Commands，合并保留用户参数、锁和未涉及对象。结构性重排必须计算依赖映射；无法表示的操作继续明确失败，不能直接删掉当前 `UNREPRESENTED` 检查。
3. **图形执行**：拟新增 `packages/platform/hypit-adapter/` 的 Node 执行适配，由 Worker 管理生命周期和限权子进程；Core 不 import Hypit SDK。复用 Hypit 组件/Film→Composition→HtmlProgram→provider 绘帧。Worker 获得的只是已授权内容寻址输入、帧域和目标 plan，无 SQLite、模型凭据或任意文件访问。依赖安装、字体加载和浏览器准备在构建/受控准备阶段，不让任意组件执行时自动联网安装。
4. **输出与合成**：优先输出声明 alpha/色彩/时间域的图形层，由现有 compositor 合成；透明输出格式须用选定 provider 实测，不预设其 MP4 会保留 alpha。若选择透明 PNG 帧或受支持无损中间格式，按既有 asset/graph/manifest 路径注册。需要背景参与的效果明确纳入受授权场景输入，不能把独立透明层误当背景采样。普通字幕与替换为图形的字幕只执行一次。
5. **精确时间**：AVE RationalTime/PTS 为权威；Hypit 整数帧是目标 profile 的投影。沿现有全局边界规则建立帧区间，记录帧率与源映射，不能逐片段浮点取整。Preview/Master 共享语义，分别投影自己的 profile；变帧率输出验证事件边界，不要求不同帧率逐字节相同。
6. **缓存**：复用现有 Job/cache，不新建用户项目结果库。key 包含组件实现/参数/依赖与字体摘要、语义 hash、局部窗口/锚点映射、target/profile、执行器及浏览器版本。修改一个标题只失效依赖它的图形产物；是否局部编码由现有 graph/segment 支持决定，不假称已有任意增量渲染。
7. **失败和云端**：模型/远端生成的提交 receipt、未知完成状态和渲染 job 继续交给现有任务所有者；本地 endpoint 模块也可运行于云端 Worker，并不自动等于拥有远程服务。远端提交必须绑定 plan/input identity、授权期限和幂等键，Host 复核实际输出后才发布。涉及的架构取舍见拟议 [ADR-0060](../decisions/ADR-0060-hypit-execution-adapter.md)。

### 精修和分段独立批注的强制接入合同

- **同一对象**：轨道条、属性栏、预览命中和批注都引用同一实例/元素身份。效果可附着片段、字幕或剪辑点，不强制每种效果独立建轨。生成媒体可按片段/范围修改或重新生成；不能声称可直接编辑其内部像素元素。
- **精修语义**：move 保留局部动画；trim 取原动画窗口而非重启入场；split 创建两个保留来源谱系的窗口；duplicate 创建新实例/元素身份并记录来源；stretch/speed 只有明确请求才重映射。复用 AutomationCurve 与现有 time-map，仅补缺失窗口/依赖处理。所有新增效果支持适用的属性编辑、顺序/层级、启用/删除、撤销与重开。
- **目标锚点**：扩展现有 annotation union 为 track/clip/caption/word-range/effect/graphic-element/transition；携带 base version、稳定对象引用、时间范围/语义绑定及可选空间点。新增写入使用唯一当前合同；历史事件按原 schema 精确读回，不能伪造历史 element ID。默认追踪稳定对象/来源谱系，不按同名字样匹配。
- **语义和物理时间**：支持固定作品时间、跟随片段局部时间、跟随真实词句三种明确关系。命中重叠元素可选目标；跨版本删除、多义、跨分割无法唯一对应时 unresolved 并保留正文，不能扩大作用域。跨多个子片段的原范围只有谱系可证明时才拆成目标集合。
- **批处理与落实**：复用一条整体要求+多条独立批注的组合消息和 operation ID。在 Host 预检冲突/保护范围，整批默认一个原子作品版本，不静默部分提交。每条 annotation 记录对应 patch/Command/对象/结果版本，以及失败、冲突、未落实原因；整批真实 render 成功且每条效果核对通过才全部 resolved。发现部分不满足时保留候选版本和诊断，不能冒充用户已采用。
- **重试**：operation+annotation+patch 内容摘要绑定幂等；已提交版本若仅渲染失败，只恢复渲染，不再次修改参数。用户编辑失败批注时创建新修订并显式 supersede 旧任务，沿现有语义保留历史，不篡改旧批注正文。
- **保留**：后续 AI 修改必须保留没有被当前请求覆盖的手动参数、文字校正、轨道关联、音频选择、组件版本和锚定方式。语义 hash/对象比较与命令范围证明未触及对象不变，不能只信模型“已保留”的文字回答。

### Concrete Steps：一次交付的内部执行单元

| 单元（均为必需） | 文件/边界 | 完成证据 |
| --- | --- | --- |
| U1 固定复用清单和基线 | 依赖 manifest/lock、构建配置、许可清单、效果到现有 capability 映射 | 每个目标效果有已复用/需适配实现路径、固定工件和依赖闭包；不增加第二套编辑器；先验证选定发行物实际可加载 |
| U2 组件/元素/时间/patch 合同 | `contracts/schemas/{timeline,editorial,render,worker}`、codegen、contract-runtime、timeline-core、projection | 单一当前写入协议、跨语言一致、旧事件精确可读；有类型实例参数与元素身份、不可执行 payload |
| U3 图形与字幕执行接入 | 拟新增 `packages/platform/hypit-adapter/**`；现有 Worker handlers/render、render-graph、Job/发布 | 所需组件/布局/文字/动画真实输出，透明度/字体/色彩/时序正确；双目标同语义、无静默遗漏 |
| U4 自动创作与局部保留 | `model-gateway/src/creation-planning.ts`、Host `stage3-creative.ts`/`project-host.ts`、`core/edit-ir/src/creation-plan.ts` | 全部效果可规划、参考风格可落到实际参数；下一轮批注不因新增语义全局失败，未涉及/保护对象不变 |
| U5 全量精修接入 | `precision-edit.v1` 的正式后继合同及 Host/compiler、`p4-timeline-commands.js`、timeline/inspector | 每种新增效果可选、可改、可裁剪/分割或按明确对象语义处理；撤销/重做/重开，不保留旧写接口并行 |
| U6 分段批注完整接入 | annotation 后继合同、Host resolver/processing/storage、queue/player/creation-workspace | 独立窗口/分段范围/元素定位、多批注组合、逐条落实、冲突与重试、剪辑后正确跟随 |
| U7 获准云执行与完整交付验证 | 现有 Worker Client/Job、部署配置与浏览器全流程 | 获准服务真实执行、断网/取消/重复/损坏结果闭环；同素材质量比较及全部 U1–U6 交叉验收 |

开工者先按现有治理将 U1–U7 的具体路径、依赖、必需检查和验收加入正式 programme 工作包；复用本计划和既有 P4/P5 单元，已满足项目不重开第二套实现。P4 的既有阻塞在受影响流程内实际修复，不能用新效果掩盖，也不能只关闭 P4 就宣布对标目标完成。`pnpm docs:start -- <实际登记的WP-ID>` 和 `docs:complete` 仅用于届时真实工作包，不在本次 DOC 执行。U1 的加载验证是完整实施的内部步骤，不是对外先交一版 demo 的阶段门槛。

### Validation and Acceptance

每个目标效果的一行验收矩阵必须覆盖：**AI 自动创建 → 精修选择/参数/时间修改 → 分段独立批注 → 整组提交与逐条核对 → 未涉及对象保留 → 撤销/重做 → 保存重开 → Preview/Master → 导出**。任何一列未完成，该效果未完成；任何目标效果未完成，整体验收不通过。组件截图、接口、单元测试、单段 MP4 不代替上述结果。

操作差异由对象语义决定，例如转场调整绑定剪辑点而非独立媒体片段；不适用项必须说明语义依据，不能因尚未实现而标为不适用，不能免除新增动态图形的参数、裁剪、分割等必要精修能力。

交叉验证必须包含：

1. 旅行 Vlog、口播、混合图片视频、多音轨、参考风格、中文与多语言字幕、动态图形叠加；时长上限、短素材及不同画幅。
2. 一个批次同时修改字幕词、图形元素、片段运动、音频和转场；同一对象冲突、整体要求与局部保护冲突、失效观看版、无权限素材。
3. 带效果的 move/trim/split/duplicate/speed；保留窗口而非重启动画；分割/复制后的锚点谱系及歧义；切页输入/IME与失败正文保留。
4. 固定/语义锚点，乱序帧渲染和 seek，24000/1001、25、30、60 等实际选定有理帧率 profile 的精确投影、源音频采样，图层遮挡/alpha/字体 fallback 与不可用字体显式失败；不能将十进制 23.976 当作 24000/1001。
5. 模型二次修改不覆盖手动图形/字幕/声音；过期 patch 拒绝；已提交未渲染、取消、worker crash、远端未知结果、重复产物、依赖损坏与重开恢复。
6. 同素材/同请求/同画幅及目标时长与 Hypit、ChatCut 的实际作品对照；记录版本、模型、成本、可比性和各维度差距。叙事、节奏、选材、字幕、声音、构图和包装必须有实际评估记录；使用自动/模型评价时记录模型和原始依据，不冒充真人听看或天然等效。可选人工意见不作为反复授权门槛。

未来实施已核对存在的检查入口：`pnpm run stage3:precision:test`、`stage3:p4-timeline:test`、`stage3:p4-annotation:test`、`render-graph:test`、`basic-vlog-toolkit:test`、`timeline:audio-caption:test`、`worker:render-correctness:test`；另须 Contracts 生成/检查、typecheck、architecture、活动包要求、当前 Browser 真实交互与媒体验证。新增测试放入现有相应 suite 并登记真实命令，不杜撰一个尚不存在的 Hypit 测试脚本。上述均为未来实施验证，本轮未运行。

### Idempotence and Recovery

研究文档只追加/精确修改本任务段落，保留既有 dirty 和历史 Evidence。实现时以完整对象快照和事务做版本恢复；组件升级创建新的精确版本/摘要，不就地改变旧作品含义。缺失执行依赖不能把效果删掉后导出；明确恢复依赖或阻断。缓存可重建，用户组件参数/历史批注/授权素材不可作为临时缓存清理。远端重试先读回既有任务身份，不能重复产生费用或重复施加编辑。回滚实现/部署需先确认旧版本是否能读新对象；不通过伪降级转换新作品，必要时保留新运行环境并回到旧的合法作品版本。

### Progress / Surprises / Decision Log / Outcomes

- 已完成：核对当前工作树、Hypit 固定源码与独立发行元数据，识别许可、旧文档路径漂移和发布打包区别；记录可复用模块及 AVE 接点。
- 已完成：将精修+分段独立批注写入长期目标、产品范围和交互要求；本计划保留一次完整交付及所有新增效果共同验收。
- 重要修正：不是从零开发图形引擎；不是所有高级能力都不存在。主要新增是受控图形适配、规划保留/patch、动画窗口精修和细粒度批注，整体按中等规模集成规划，不给未经验证的工期或“几行即可”保证。
- 技术选择：优先使用固定独立包；不嵌入整个 Studio，不替换 Host/Timeline/Job，不导入只有成片而无参数的假可编辑结果。重大依赖方案记录为 ADR-0060 Proposed，未声称产品已经采用。
- 尚未执行：安装/加载/图形输出验证、代码修改、真实对标、云渲染配置、许可采购。实际版本兼容、透明输出和往返编辑证明是实施 U1–U7 内的工作，不是删减目标的理由。
- 文档验证结果和本轮关闭范围由 [DOC-015 Evidence](../evidence/runs/EVD-20261111-DOC-015-HYPIT-INTEGRATION-PLAN.md) 记录；不修改任何实现包状态，不新增人工签字门槛。
- DOC-015 研究与方案文档已完成：限定文档的 `git diff --check` 返回 0，137 个本地链接/锚点核对无错误，研究 JSON 可读取，代码指纹与修改前一致。未运行产品测试、`docs:check` 或生成同步；沿用用户不为文档通过重跑测试的要求，既有失败不改写为通过。下一步是按 U1–U7 登记并执行完整接入，而非重新讨论缩小目标。

## DOC-016：逐接口实施与失败闭合接续

本节细化并修正 DOC-015，不创建第二套状态或缩小 U1–U7；本次为方案文档，尚未实现。2026-11-11 审查发现：`视频60秒内` 被解析为精确 60 秒，无主语的 `1分钟以内` 未识别；30fps 下浏览器时间 4.1 的现有函数返回 tick 122；`PRECISION_FRAME_BOUNDARY_INVALID` 被压为 `COMMAND_FAILED`；固定 Hypit PNG 捕获为不透明。均为源码/纯内存探针观察，不等于真实云模型或整条产品旅程已验证。实际工作树及本轮验证见独立 [DOC-016 Evidence](../evidence/runs/EVD-20261111-DOC-016-INTERFACE-PLAN.md)。本节是未来实施的设计合同，不声明现有字段或接口已存在；字段名为拟议合同，实施时以正式 Schema 的唯一当前版本及生成绑定为准。

DOC-016 本次文档允许路径仅为本文、尚为 Proposed 的 `docs/decisions/ADR-0060-hypit-execution-adapter.md` 和独立 `docs/evidence/runs/EVD-20261111-DOC-016-INTERFACE-PLAN.md`；不修改历史 Evidence、programme、代码或生成文档。证据归属本独立文档工作，不附属于 P4/P5。

### I1：用户要求 → 时长约束

- **输入**：原始 request/revision、作用对象、当前 Timeline 及其 RationalTime。Host 保留原文和修订身份，不把模型解释当最终权威。
- **拟议输出**：版本化约束包含 `scope`（整片或指定对象）、`revision`、原文引用、`kind`（exact/range/upper/lower/approximate）、有理数上下界及各自 inclusive 标记；缺失上下界是 null 而非默认 60 秒。近似容差须明确来源与用户语义，不自动把上限变成目标。
- **规则**：覆盖“60秒内/以内/以下/少于/不超过/至少/正好”、中文数字、无主语后续修订、否定、范围、全片与片段区分；明确新修订替换或收紧旧约束，未识别但疑似时长要求不得静默沿用旧值，返回可解释的不确定/冲突。相同上下界冲突或真实不可行则保留原作品并说明原因。
- **时间量化**：保留原始有理边界和现有 RationalTime 合同，协议边界验证安全整数，内部 BigInt 精确比较。设 `x=边界/Timeline tick 时长`：闭下界取 `ceil(x)`、开下界取 `floor(x)+1`；闭上界取 `floor(x)`、开上界取 `ceil(x)-1`。精确时长不可用整数 tick 表示时报告相邻合法帧，不更改原意。若区间无合法正 tick，报告边界和帧率，不修改用户要求。`creationDurationBudgetContext`、最终 Timeline extent、音频与字幕超尾校验共享同一约束版本。

### I2：目标选择 → 测量 → 终稿回执

- **输入**：I1 约束、已授权素材 evidence、图片展示时长、受保护内容、节奏/音轨硬约束、Timeline 版本与模型调用/费用预算。
- **测量**：沿用 `measure_selection` 的选择 ID、来源范围、timing 和 `target_duration_ticks`；Host 精确计算视频可用容量、图片显式 still 展示 tick、精确保留占用、最低长度及缺口。图片 duration 是明确预留，不作为可随视频权重自动变长的素材。
- **仅上限且候选不可行**：在用户范围、已有保护和音轨约束内重新选择较短目标并生成新的 query/测量回执；若没有可行候选，返回可用容量、目标和受限原因。明确 exact/min 或保留整轨时不得自动缩短。新目标不得复用旧 receipt，Skill/音频证据需要按实际新选择重验。允许的额外测量次数、费用与此前已发送调用统一由 Host 预算和授权裁定，不能绕过上限自动循环重试。
- **终稿**：`final.measured_query_id` 和 `measurement_receipt_digest` 指向本运行的确切可行记录；Host 验证全部 selection ID 一一覆盖、顺序、时长、素材、权限和版本未反弹，再编译；结果不符合时提示确切字段和原因，不修补伪成功。

### I3：模型网关 → 分阶段协议

- **现状**：`creation-planning-exchange.v3` 的 `measure_selection`/`final` 分支封闭且类型严格；目前 wire 至多 `json_object`，动态 response schema 主要在文本上下文。本节不把提议的新协议写成现有接口。
- **实施**：为初稿与既有作品修改定义同一版本化协议中明确的分支和完整 schema；测量查询包含 Host 分配 query ID、整数 tick 和合法选择；final 只能引用确切回执并包含允许的 creative/patch 字段。patch 明确 base Timeline/version、typed target、允许操作/参数路径、预期旧值或对象摘要、关联 annotation IDs；Host 负责实际 Command 和权限，不接收模型任意代码或任意 Command。
- **provider 适配**：以真实服务能力声明 `json_schema` strict、`json_object` 或文本；优先使用供应商实际支持的严格 schema，否则明确发送 schema 并本地严格验证，保持同一业务合同。逐阶段测试实际序列化 wire 和响应，校验 JSON、版本、分支、整数类型、额外字段、引用/身份/权限、预算和业务约束；不得做静默类型强转或无限重试。
- **错误**：按实际 `kind` 和阶段归并 AJV 错误，只暴露安全字段路径、预期类型和恢复建议，不把 oneOf 的无关分支报错混作主因。区分拒绝、截断、空响应、非法 JSON、schema 错、测量不可行、过期回执和提供商网络错误；记录安全 request ID、finish_reason、已发送/费用未知和诊断引用。非 SSE 在解析前失败时原文可能不存在，不能宣称必然保存原始输出。

### I4：组件对象、精修和 AI 修改

- **来源联合**：扩展现有 Clip 来源为受控 `asset` 或 `component` 判别联合；后者含 definition ID/版本/摘要、instance ID、element ID 集、参数 schema 版本、经过校验的 typed 参数、资产/字体内容身份和授权、局部窗口及锚点。纯文字/图形不伪造空白视频；Host 校验和持有组件依赖，不把组件当普通视频 probe。同步 schema/codegen、timeline-core、所有 source reader、授权/源持有、projection、存储重开、render source identity 和迁移/历史读取。
- **参数写回**：为每个组件注册可编辑元素、属性路径、类型/范围/默认值及依赖；Renderer 只拿安全白名单与不透明引用，提交 instance/element、属性、typed 值、expected version/hash。Host 验证作用范围、锁、保护和旧值，合并未改字段，经现有 CommandEditIntent/IR、模拟及 CommitPlan 原子提交；不得以自由 metadata 或整个对象替换丢失隐藏参数。
- **局部编辑**：move 保留局部时间；trim 对原曲线求切点值及左右切线并保留裁后窗口，不重新播放入场；split 保留两个窗口及来源谱系；duplicate 创建新实例/元素 IDs 并记录来源；speed/stretch 依用户明确要求映射。复用 AutomationCurve，补 Bezier 边界和现有 time-map，不删 unsupported 校验制造支持。
- **后续 AI**：初稿继续用当前 creation plan；修改扩展 planning exchange 的 typed patch。`creation-plan.ts` 扩展元素/效果/字幕词/属性级 preserve refs 与快照差异断言，支持目标修改和未涉及对象逐字段保留；无法证明映射、冲突或版本已变则不提交。

### I5：预览命中 → 分段批注 → 每条落实

- **命中输入**：project/request、实际观看 render ID/Timeline 版本、实际显示帧或已证实 PTS、归一化画面坐标；Host 或受控只读投影基于真实 transform/crop、层级、透明度和遮挡返回候选对象与 element ID。单一候选可选定，多义让用户选择；无候选或观看版过期不能默认为当前顶层片段。
- **时间**：不得用 `currentTime` 浮点乘帧率后无条件 floor 当作显示帧。建立播放解码帧/PTS 到 Timeline 的明确映射，处理 CFR/VFR、seek 与帧边界；4.1秒/30fps 在精确边界应为 tick 123，同时验证实际展示帧而非仅计算理论秒数。
- **锚点合同**：在现有 annotation 后继协议中使用 track/clip/caption/word-range/effect/graphic-element/transition typed target、稳定 ID、base version、时间/空间及跟随关系。词身份须和转写源及真实时间绑定；字幕纠字、拆合、翻译、重复词、分割/复制通过明确谱系映射，无法唯一对应时 unresolved，不从同名文字猜测。
- **组合输入**：允许只有多条批注而无整体文字；对现有限制 20 条或超出模型上下文的情况定义有界分批读取、完整覆盖和最终单次原子提交，不能截断或丢弃。保留独立正文和失败队列；全局要求与局部要求冲突时指明条目。
- **逐条回执**：每个 annotation 形成 obligation ID、目标/范围、可验证期望、patch/Command 关联（允许 1:n 和多条共享）、实际证明与结果版本；状态区分 applied、already_satisfied、conflict、unresolved、failed 及主观不可判定。全部已满足可指向原版本而无需空提交；有改动的批次一个原子版本。生成/渲染成功不单独证明每条已落实，不能只信模型自报。
- **幂等**：operation/annotation/patch digest 与基准版本绑定；已提交仅渲染失败时只恢复同版本渲染，不重复应用修改。失败重开编辑以新修订 supersede 旧任务，保留历史及未完成正文。

### I6：Hypit 适配与双目标渲染

- **字幕**：`scheduleFineCaption(timing,program,document)` 要求 document ID 匹配、unit ID 精确覆盖、每个区间为非空整数帧；`renderFineCaption` 再消费相同 Timeline/Canvas。AVE 保留真实 RationalTime 和词源身份；无词时间用句级可编辑字幕，不编造逐词时间；小于一帧的词按明确规则聚合展示单元，保留全部词和批注映射，不静默丢失或虚称逐帧独立可见。
- **帧率**：从用户/源设置携带精确 `numerator/denominator`，贯通 schema、Host、Semantic Render Manifest、各 target Profile/Plan/cache、Python、FFmpeg、Hypit clock 和 QC。24000/1001 不等于十进制 23.976；Preview/Master 可各有 profile，但共享同一语义身份。视频 VFR 使用既有 Original PTS 映射；Hypit 的采样/重采样不能仅凭帧序号声称与源 PTS 等价。
- **透明和资源**：固定版本 Provider 的 PNG/H.264 均为不透明捕获。优先在隔离 Worker 适配透明捕获，复用 Hypit 组件和 HTML 编译，并验证透明背景、半透明边缘和颜色；背景参与时须绑定受授权背景并证明完整 z-order/PTS。`ResourceStore` 的 put/write/get/has 和可选流接口适配到项目/授权/目标/SHA/MIME/size；输入和临时结果双向验真，输出经 Host QC 后原子登记。
- **执行合同**：`rasterizeHtmlFrames({program,frames},options)` 的 frames 必须非空、严格递增且在 frameCount 范围内；分批大小/字节预算、背压、顺序与每帧身份必须校验。组件、参数、资源/字体、语义 hash、时窗、profile、浏览器和执行器版本进入缓存身份。Hypit 分阶段 progress 映射为 Worker 协议；未知总量显示不确定，不伪造百分比。设置明确超时、取消/终态确认、进程树回收与可恢复幂等任务。
- **隔离**：固定上游 Chromium 使用 `--no-sandbox`，子进程本身不证明隔离。只运行预审核可信组件，或在受控隔离环境明确只读镜像、任务目录、低权限、无凭据、禁止外联及其他 localhost 服务访问、CPU/内存/PID/时间限制；对恶意网络、文件和死循环做失败验证。

### I7：错误、诊断与恢复合同

在 provider → Gateway → Host → Worker/Node → IPC/Browser → workspace → 重开全链传播结构化失败：稳定 `stage/code`、受限公开 message/details（字段路径、目标/实际时长、合法相邻边界）、request/job/operation/annotation/component ID、target、是否已提交、是否可重试、费用状态、diagnostic ID 与脱敏 cause chain。网络超时、取消、已发送但结果未知、格式错误、业务约束冲突、渲染失败和清理/诊断回调失败分别编码；原始错误与清理错误并列保留。扩展 `creation-errors.ts` 与 `creation-failure.ts` 对 `PRECISION_`、新组件/Worker 错误和时长根因的映射，避免包装层覆盖；安全信息可跨重开显示，原文/凭据/路径仅按权限保存在本地诊断。已提交版本与草稿状态必须真实报告。

### 执行顺序与验收（完整目标一次交付）

1. 对 U1–U7 建立逐效果清单和上述接口对照，登记正式工作包与必要路径；修正 I1/I2/I3 以及错误合同，保证既有模型和时长链先可核验。内部顺序不是缩小交付范围。
2. 同步 I4 的组件/参数/时间合同与所有调用方；接 I6 真实图形执行，保留已有 AVE 原语；同时完成 I5 精修/独立批注、逐条结果和保留逻辑。
3. 统一验证：`视频60秒内`→max 60/min null；`1分钟以内`及两轮修订均正确；30秒素材在60秒上限内可选30秒、exact 60不可擅自降级；图片固定预留重新测量；模型数字字符串/额外字段/截断/过期回执与各真实云 provider 协议分别验证。
4. 逐效果执行 AI创建→轨道精修→多处独立批注→逐条核验→未涉及内容保留→撤销/重做→重开→Preview/Master→导出；覆盖仅批注、超过20条、no-op、冲突、主画面/PiP/字幕遮挡、短词、4.1秒帧边界、24000/1001、VFR、透明 alpha、Bezier trim/split。
5. 注入 provider/Worker/取消/超时/磁盘/诊断回调失败及已提交未渲染；验证原因、费用状态、幂等、重开和保护范围。同素材与 Hypit/ChatCut 真实对标另留效果证据；无实际模型或运行不宣称通过。工程与 Browser 媒体验收遵循 U1–U7 既定完整条件。

**本轮进展**：已记录实施前工作树 551 条 dirty/untracked、分支 `codex/cloud-editing`、HEAD `293695defc884445630b7d83e77a58c8f2031186`；计划修改前 SHA-256 `a5b0490904be2dd1c71769162b4d4864e4ee44253b36587c63e48bca08f793bc`，ADR-0060 修改前 `5f332385e0ac66e4ffd33404bb458e4613fa98ac34a5d827b328a73c589ddece`。本次只补方案并纠正 Proposed ADR，不启动实施、不改变 programme 或 generated 文档；验证范围见 DOC-016 Evidence。

## DOC-017：完整实施执行合同与接续手册

### 目的、权威与本轮范围

本节针对交由 GPT-6.1 Terra ultra 持续实施的需要，把 DOC-015/016 的原则补成施工决定、接口清单和检查点；不依赖该名称对应模型的任何未经验证能力，不承诺完成概率。沿用 U1–U7 完整交付目标，内部小单元不是缩小版交付。本文是执行计划层，正式 Schema 仍是跨语言合同唯一来源；下述新增名称、版本和状态是**拟实施设计**，不能当作已有 API 调用。冲突时，本节对 DOC-015/016 的具体设计细化优先，产品范围和架构不变量不变。

本轮 DOC-017 只允许维护本文、docs/README.md 的导航及独立 DOC-017 Evidence。不安装依赖、不实施产品、不改 programme/generated、不运行产品验收。代码入口核对基于当前 dirty 工作树，不以 HEAD 或历史 Evidence 代替；实际实施前重新核验。文档补全不表示新效果、云执行或真实对标已经完成。

### A. 执行者入口、停止条件与恢复

1. 依 AGENTS.md 阅读当前权威链，记录分支、HEAD、dirty 文件和受影响文件摘要；不得 reset/stash/覆盖既有工作。读本计划 DOC-015 的复用清单、DOC-016 的 I1–I7，再读本节。首次进入不得从旧 P4 accepted 记录继续。
2. 将下表 E00–E12 映射到正式 programme 工作包及 allowed_paths，再执行 `pnpm docs:start -- <实际工作包ID>`。不得把 DOC-017 标为产品工作包，亦不得直接把所有单元塞入 P4 而不检查包的目标/依赖。已有已满足代码保留，当前验收不足则补相应验证。
3. 每单元同时改合同、生产调用方、持久化/重开和必要测试；通过自身检查才开始依赖它的单元。可以在同一单元做完整纵向切片，但所有效果仍要完成。不要先铺满空接口，也不要等最后一天才接批注。
4. 每个检查点在本文追加：单元ID、实际修改路径/函数、实际合同版本、已运行命令/结果、证据位置、未解决问题、下一条具体动作。长上下文接续从首个未验证单元恢复；不重做已验证且输入未变化的工作。
5. 新发现的必要接口记录到对应单元再修改；常规可逆实现选择自行完成。若源码推翻下述设计，写明证据与替换决定，保持同一目标，不另建第二套路线图。真正缺少的外部凭据/预算/服务授权集中列出，继续其余独立工作；不能静默模拟外部成功。
6. 完成须有逐效果全部列通过、真实云模型/媒体/界面证据、必要仓库门禁及 scoped Evidence；再按实际包执行 docs:complete、docs:sync、docs:check。不得因剩余工作复杂、只有单元测试通过、或只完成 P4 就结束整个目标。提交、推送、部署、购买和私有素材外传仍需相应授权。

### B. 效果登记：固定交付清单与扩展规则

以下为 DOC-015 结果面的具体交付条目，不是全部历史 CAP 家族重新验收。E00 将每行拆成实际可调用 definition，并固定参数 schema/版本；自动枚举采用的上游包导出，遗漏的已承诺效果补入同一表，不能删行。不能把“其他”当完成状态。每个 definition 都记录：`effect_id / AVE能力或上游export / 实现摘要 / 参数schema / 元素列表 / 允许精修动作 / annotation target / Preview与Master执行路径 / fixture与断言 / 当前证据`。

| 效果族 | 必需对象/参数和复用决定 | 对象级验收重点 |
| --- | --- | --- |
| 素材叙事、B-roll、参考风格 | 复用观察/规划/Skill；选择、顺序、来源范围、关联音轨；参考只解析为可执行参数及证据 | 次轮修改不重排保护镜头；参考不可访问须显示原因，不捏造已观看 |
| PiP、分屏、图片运动 | AVE transform/AutomationCurve/compositor；位置、裁切、尺寸、层级、运动窗口 | 两画面分别命中；trim/split 不重启动画 |
| 基础转场、色彩、声音编排 | 复用实际 resolver/FFmpeg；每个采用的转场登记 handles/overlap，颜色与增益沿现有类型 | 剪辑点批注、关联音轨/字幕联动、保持未指向参数 |
| 普通/双语/多语言字幕、逐词强调 | AVE Caption/真实词源 + caption-fine；文字、字体、字号、颜色、位置、安全区、强调和时序 | 中文/emoji/换行、短词与重复词身份、纠字后 AI 保留 |
| 动态标题、人物条、地点条、章节、结尾卡/CTA | text-fine + Composition；每项独立 definition，可共享同一文字布局实现 | 主副文字/背景/标识分别选取；入出场窗口可精修 |
| 箭头、标注、贴纸/logo、进度图形 | 复用图形原语/项目组件；几何、描边、内容、方向、位置、进度 | 元素命中、遮挡、局部参数修改、透明边缘 |
| 图表、排行 | ranking 或 Composition；数据项稳定ID、标签、数值、排序、颜色 | 修改一项不替换整表；重排后批注跟随数据项ID |
| 评论卡、聊天布局 | comment-sticker + Composition；消息ID、正文、头像授权引用、顺序、气泡参数 | 成片评论对象与产品批注分开；不按正文猜对象 |
| 多卡片景深 | depth-stack；卡片ID、资源、层级、位移/景深/时间参数 | 多卡分别精修、前后遮挡命中、分割保留窗口 |
| 路线图形 | Composition 项目组件；路径控制点/站点ID、标签、图形背景、进度 | 无地图授权时使用明确的示意背景，不冒充真实地图；站点单独批注 |
| 用户指定新图形 | 优先组合已登记组件；必要时走下述隔离编译/验证的新 definition | 不把固定模板作为新图形要求的上限；保留源码摘要、schema、元素身份和恢复依赖 |
| 获准生成媒体 | 经既有 Gateway/provider 作为带来源素材进入上述路径 | 可修改片段/范围、重新生成、保留版本；不宣称能直接编辑像素内部对象 |

每项共同列：AI创建、轨道选择、属性修改、适用时间操作、独立批注、混合批次、保留、撤销/重做、重开、Preview、Master、导出。只对真实对象语义不适用的动作说明理由。总完成由这些列计算，不由模板数量、截图数量或模型自报计算。

### C. 接口合同冻结与修改闭包

E01 在正式 schemas 下形成完整可执行 Schema、正反例与生成绑定，不把下列伪签名直接作为运行接口。同一批更换当前写入版本，旧版本只在历史 reader 中可读。建议后继为 planning exchange v4、precision-edit v2、annotation/message/processing 各自当前版本+1；E00 检查是否被其他未提交工作占用，若已占用使用下一个版本并统一改所有引用，不能并行发布两个 current major。

| 边界及拥有者 | 确定输入/输出和不变量 | 必须同步的生产调用方 |
| --- | --- | --- |
| Host 时长解析 | revision原文+scope+base → DurationConstraint；字段 `schema_version, scope, revision, raw_text, kind, minimum, maximum, minimum_inclusive, maximum_inclusive, tolerance_source`；无界用null；时间沿 common RationalTime | stage3-creative.ts 的 resolveCreationDurationTarget/resolveBoundCreationDurationTarget/assertCreationDurationTarget/creationDurationBudgetContext；stage3-request.ts 和上下文构造 |
| Gateway规划 | 固定root digest、phase、允许query ID、预算、能力目录、保护引用 → measure_selection或final；新增修订patch分支见D | model-gateway/src/creation-planning.ts 的 createCreationPlanningProvider；contract-runtime/src/creation-planning.mjs及.d.mts、generated validators、Host调用及诊断/resume读取 |
| 组件登记/持久化 | DefinitionRef=`id,version,digest,parameter_schema_digest`；Instance=`instance_id,definition_ref,parameters,element_bindings,resource_refs,window,anchor`；参数只能通过对应schema；引用资源有内容摘要与项目授权 | timeline-core/public.ts、序列化器、project-storage、creation-timeline-projection.ts、render-graph、Worker；所有source访问点 |
| Clip来源 | 新当前格式用判别联合 `{kind:asset, range:SourceRange}` 或 `{kind:component, instance:ComponentInstance}`，不保留同时可写的旧source和新source；图形不调用media probe | validateCommandInput/Timeline验证、timebase推导、source holds、precision-edit.ts、creation-plan.ts、权限和依赖验证、render compiler、导出/重开 |
| 精修与AI patch | `base_version,target,operation,typed_payload,expected_digest,annotation_ids`；target为具名union；Host编译普通TimelineCommand并simulate | compilePrecisionEdit、precisionEditCreationDraft、commitCreationEdit、project-api、IPC、Browser server、p4-timeline-commands.js、inspector |
| 批注 | `annotation_id,revision,base_version,target,anchor,body`；anchor明确 timeline/clip-local/word-source 跟随关系；批次含完整annotation revision列表和digest | annotation schema/runtime、Host resolver/send/process、storage读写重放、queue/player/timeline/workspace；具体状态见F |
| Worker图形 | `operation_id,execution_plan_ref,semantic_hash,target,profile,component_refs,resource_refs,frame_indices,limits` → 已验真帧产物及诊断；无SQL/任意路径 | worker request/result schemas、worker-client、Python registry/handler、Node adapter、render-graph及Host结果登记 |
| 失败投影 | FailureEnvelope字段及状态见H；公开字段与私有cause分开 | model-gateway/public.ts、creation-failure.ts、creation-errors.ts、Worker异常包装、Web/IPC、workspace、持久化重开 |

**修改闭包检查**：改字段前对旧type、schema `$id`、validator导出名、IPC方法、`.source`相关读取做定向 `rg`；登记每个结果为 current写入/current读取/历史读取/测试/生成物。当前写入必须全部切换；历史记录不批量改写；生成物用 `pnpm run contracts:generate` 产生。不能仅靠TypeScript找Python、JS、JSON和旧项目读取遗漏。根common RationalTime不为本任务另造第二定义；wire使用安全整数、内部BigInt，拒绝溢出；内部bigint输出沿既有序列化边界，不直接JSON.stringify。

**迁移决定**：旧工程采用Host已有格式校验/迁移机制，在独立副本验证能完整读取后才允许事务升级；不在读取时隐式改写历史事件/摘要。旧SourceRange在历史reader映射为asset分支，新写统一新格式。若既有格式政策不允许自动迁移，提供显式升级到副本，保留原工程与版本；不能为了接入改写其禁止规则或丢弃历史。未知组件版本阻断对应渲染并可恢复依赖，不删除组件后继续成功导出。

### D. 模型协议、时长和预算的确定规则

**时长解释表**：60秒内/以内/不超过/以下 → upper闭60；少于60秒 → upper开60；至少60秒 → lower闭60；超过60秒 → lower开60；正好60秒 → exact60；30到60秒 → 闭区间。中文数字和分钟换算先转精确有理数。`不要超过60秒`是upper；`不要60秒，改成30秒`以最后明确修订为准；无法确定否定作用域返回可解释歧义，不猜。新revision明确全片时长则替换此前全片时长；“仍不超过60秒，至少30秒”在同一revision求交；“只改第2段”不替换整片约束。“大约”复用用户给定容差；无容差只作为软目标，不凭空制造硬区间，必须在上下文和界面标明软约束。没有下限不写成60秒，执行上只要求合法正时长。

**目标选择**：初稿模型根据选材提出target，Host只测量不偷偷改切点。上限约束不强制填满。第一次测量不可行且仅因容量不足时，返回精确 `max_feasible_ticks` 与原因；下一次模型查询选择范围内目标并重新测量。Host不能把旧query的target直接改成新数。若存在exact/min/锁定整轨，先检查与容量交集，空集立即解释失败。每个候选须同时满足画面、图片固定预留、转场重叠、保护片段、字幕和音频extent；不能只求视频片段长度总和。没有额外调用预算时返回原原因及预算已耗尽，不藏一次修复调用。

**协议分支**：保留measure_selection与final基本模式；v4将final结果设为显式 `result.kind=create|patch` 判别联合。create复用当前creative字段并增加已登记组件实例提案；patch含 `base_timeline_version,base_digest,operations,obligations`，不接收整个Timeline或任意Command。operations只允许 `insert_component,set_component_parameter,remove_component,precision_action`，precision_action复用正式精修后继schema；其他已支持修改通过该精修union表达，不复制第二套音频/字幕API。每个operation有唯一提案ID、typed target、expected digest（新增用明确absent前置条件）、annotation IDs。禁止自由JSON Pointer写任意工程字段；参数路径须命中definition白名单。模型可给临时实例ID，Host分配持久ID并保存一对一映射，后续操作只引用本批临时ID或已授权持久ID。

**测量与终稿**：初稿仍先测量再final；纯属性patch无需素材选择测量，用Host对固定base的模拟/约束回执。结构/时间patch先提交proposal由Host模拟并测量，final引用该proposal digest及回执，不能替换其operations。两类回执以 `receipt_kind=selection|patch_simulation` 区分；都有root/base/constraint/authorization/selected resources摘要。终稿回执必须由Host持有，模型不能自造。预计无改动也走保护/逐条义务验证，不因空commands绕开权限。

**调用规则**：保留现有每次规划最多2次测量、3次physical calls作为默认上限；修订patch同样计数，不能加隐形纠错循环。分批批注在发送前计算整个operation的最大调用/费用，并受已有总授权和资源限制；不足则提示差额且保留全部批注。网络已发送但结果未知先核对已有request身份，禁止当作未发送重试。取消后仍完成已发送调用的费用结算记录。

**provider格式**：正式支持列表从已配置云端模型部署读取，不在文档杜撰供应商能力。逐部署登记strict schema/json_object/text与已验证wire样例；任何模式都经相同本地Schema和业务校验。拒绝 `duration_ticks:"900"`、额外字段、错误version/phase、未知target；不把字符串强转为整数。现有v3 query ID由模型返回，升级时Host预分配本轮允许ID并在context给出，validator要求等值，不能只改prompt。schema不支持是配置错误；截断/refusal/非法JSON分别归类；有限重新生成若确有授权须占同一个预算并留下每次原始结果/诊断可用性。

**必备样例**：E01必须提供完整合法create、合法属性patch、合法时长patch、no-op和各自失败JSON；不能将仅有片段的文档示例当能通过校验的fixture。E03同时证明Gateway实际发出的body与Schema一致，测试不能绕过wire直接给Host对象。

### E. 图形、时间、命中与精修的实现选择

1. 默认走**透明PNG帧+现有compositor**。在固定provider源码的受控补丁或适配fork中替换opaque-capture黑底路径，显式透明canvas/body与截图alpha选项；固定补丁摘要和依赖。先验证0/0.5/1 alpha及彩边，再接主图。需背景采样的组件单独声明reads_background，输入仅为计划授权的背景子图；不能把所有图形默认烘焙进全片。H.264不作透明缓存。
2. Node adapter只提供组件编译与帧产物执行，不拥有项目模型。Python Worker以受控进程协议传入manifest，不通过拼接shell传参数；stdout仅协议、stderr脱敏日志。frame_indices严格递增；乱序seek由调度层排序去重并保存请求到输出映射，不能把乱序直接交Hypit。每帧产物携带index、PTS、digest、MIME、size、width/height、alpha/color声明；Host核对遗漏、重复、顺序、尺寸、字节与内容身份。
3. 帧率使用约分的正整数numerator/denominator贯通；Timeline网格与目标帧网格分别映射。事件使用半开区间[start,end)，相邻边界采用同一投影函数，不能各片段独立浮点四舍五入。默认采样按目标帧起点对应语义时间，VFR源通过已有Original PTS索引选择含该时刻的帧。输出QC检查事件边界及音画对齐，不拿23.976近似24000/1001。
4. 短词强调先按真实词区间与帧域求可展示区间；无帧可占用的词合并到同一句相邻单元，优先后邻、末词用前邻，保存所有原word IDs及实际时间，不改ASR证据。同帧多词作为联合高亮单元；界面可选择原词但明确共享显示单元。整个句子无可展示帧时报告不可展示，不跨句偷时间；不能用句级降级冒充逐词目标通过。
5. 组件局部时间采用不可变definition时间域+instance窗口。move不改变窗口；trim改变窗口起止；split左右窗口并记录父ID和区间，右半不从0重新播放；duplicate新instance/element IDs；speed显式改变映射。优先保存窗口而不破坏性重采样曲线；确需导出裁剪曲线时用原三次Bezier de Casteljau分割，按时间轴求切点，保留左右控制点。增加跨切点取样相等断言，不只比较keyframe数量。
6. 渲染时同步产生可缓存的元素命中投影，绑定semantic hash、render、profile和frame。记录元素几何/变换/crop/层级；复杂形状用同帧ID mask或受控alpha hit mask，不能仅用包围盒命中透明孔洞。播放端优先使用已展示帧回调提供的mediaTime并以输出帧索引映射；异步seek期间禁用提交旧命中，等待帧身份确认。不支持显示帧证明时要求暂停并选定已索引帧，不能凭currentTime猜成另一个对象。Host最终验证target仍属于观看版本。
7. 参数编辑和AI修订共用Host编译器。现有replace_clip可作为内部Command，但必须先从当前对象复制并只改批准字段，保留隐藏/手动字段，模拟后比较实际diff。复杂动作影响关联字幕/音轨时将全部依赖纳入一个CommitPlan，禁止多次提交造成中间破坏状态。
8. 自定义图形默认先组合现有definition；必要的新代码只在隔离验证任务中构建，必须同时产出参数schema、稳定元素绑定、依赖清单与测试。固定构建镜像、无凭据/外联、只读输入、专属临时目录、非特权用户、CPU/内存/PID/磁盘/时限；依赖只能来自已批准闭包。网络/文件越权和死循环验证失败则不登记definition。隔离任务本身不能直接写Timeline；通过后由Host登记不可变摘要，再经正常patch创建实例。不能因“不运行任意代码”删去自定义图形目标，也不能以Node子进程等同安全隔离。
9. 资源上限从现有ResourceGate/执行能力快照派生，记录到ExecutionPlan；帧批大小受decoded RGBA字节估算与允许内存的较小者约束，单帧超限明确失败。超时/取消先发signal，等待限定宽限期，再由受控任务管理者回收进程树；同时保留主错误与清理错误。具体宽限值和运行限制在E04按实际部署配置固定并写测试，不把示例数值冒充生产容量。

### F. 批注处理、事务与逐条证明

**三类状态分开**：产品批注正文/修订、批次执行状态、逐条义务验证结果。不能把三者塞进一个resolved布尔值。拟议批次状态为 `queued → planning → validated → committed → rendering → verifying → resolved`，任意阶段可转failed/cancelled；未提交旧revision可superseded。`already_satisfied`是义务结果，不是必须制造新Timeline的批次。

- processing后继合同将 `commit_receipt` 作为可选持久字段，允许与failure并存。receipt包含operation ID、base/result版本、patch digest、提交身份；失败必须携带phase和committed。`resolved`要求全部义务为applied或already_satisfied且证明匹配结果版本；主观不可验证保留为needs_review/unverified，不冒充客观通过，不强制人工评审作为工程门禁。
- queued持久化完整批注revision集合、顺序、保护范围、base和授权摘要。固定每次投影最多20条并受token预算限制，按队列顺序切批；所有批次读取相同base，不能边生成边改项目。共享对象/依赖先分组，必要跨批关系由全局目标索引承载；单条超token上限返回确切条目和原因，不截正文。每批给出patch提案和覆盖的annotation IDs；最终要求并集恰好覆盖全部输入。
- 合并规则：同target+同property+同前置摘要且值相同可合并；值不同、删除后再改、重叠时间编辑或保护冲突为conflict，不采用“最后一条赢”。同一操作可满足多条义务，一条义务可关联多个操作。缺失条目、未知条目、重复导致的语义冲突一律在commit前拒绝。
- 义务由Host保存 `obligation_id,annotation_revision,target,scope,predicate,operation_ids,evidence_refs,result_version,status`。predicate只允许确定性比较（参数相等/范围、对象存在/不存在、时间区间、未涉及内容hash）及明确标识的主观评价；不执行模型生成表达式。语义解释需与原批注和目标一起呈现，不能把“更自然”偷偷变成任意数值后宣称已满足。
- commit前：全批预检、版本/权限重验、模拟、保护diff、测量、覆盖证明齐备；任一冲突不提交。commit时：Timeline提交与operation→版本回执必须由Host同一事务或既有可证明崩溃恢复的提交日志绑定；不得先提交再只在内存记operation。若当前存储事务不支持，E06先扩展事务接口和崩溃恢复测试，不能在Worker写数据库补救。
- commit后：render失败保留result版本和全部正文/回执，旧可用预览保持可访问并清楚标识当前候选未渲染。retry读取回执，仅恢复该版本渲染/验证，不再应用patch、不新建版本。若用户已编辑到新版本，旧job完成只能登记旧版本产物，不能覆盖当前预览。
- no-op：所有义务在base上已满足则记录原版本和已有可用render；无可用render可渲染该版本，不制造空commit。需要主观判定或目标不明确不归为no-op。整组resolved需要逐条证明，不以render receipt存在代替。
- supersede：已提交结果不能撤销历史为“未提交”；新批注修订创建新的operation并保留旧receipt。已发送云调用须继续结算/收回结果身份，取消不删除费用记录。跨split映射可产生目标集合，只有谱系和时间覆盖完整时采用；duplicate不自动把原批注复制到新对象。

**必须成对修改的位置**：project-host.ts 的 resolveTimelineAnnotationAnchor、sendTimelineAnnotationMessage、processTimelineAnnotationBatch；project-storage/src/timeline-annotations.mjs 的append与读取重放状态校验；processing/message/annotation schema及codegen；Renderer队列、状态显示与重试入口。现有processing.v1的failure/result互斥须被新合同正确替代，历史v1 reader保留原规则。

### G. 云执行：接口固定，外部输入明确

默认复用Worker任务协议和ExecutionPlan，增加远端transport，不创建第二Job或项目库。E09实现服务无关HTTPS transport：提交请求包含operation/idempotency key、plan/inputs digest、授权期限、资源及预算上限；返回remote job ID和accepted身份；查询返回queued/running/succeeded/failed/cancelled及费用状态；取消返回确认或cancel_requested；结果含产物manifest及摘要。相同key+相同digest返回同一job，相同key+不同digest拒绝。凭据由Host运行环境管理，Renderer只见部署ID。

上传采用获准内容身份及短期访问凭据；不把全项目目录或数据库传到服务。断网后先按幂等key/query找回job，找不到且不能证明未接受时保留unknown，不自动再次付费提交。Host验证下载字节、输出身份、target/semantic hash和QC后才发布。远端worker无回调SQL权限；结果过期/重复只登记一次。输出过大、磁盘不足、凭据过期、授权撤销均须可解释失败并保留恢复身份。

真正外部输入仅为：实际部署地址/受信身份、凭据、获准素材用途/保留期限、费用上限及对应许可。先只读核对已有配置和会话授权，不重复索取已有信息；缺失时一次列清并继续完成transport及本地模拟协议测试。真实云验收保持未完成，不能以模拟或同机Docker替代。配置“允许云渲染”本身不是购买或部署授权。

### H. 错误合同和恢复动作

FailureEnvelope必需：`schema_version,stage,code,message,details,operation_id,committed,retry_action,cost_state,diagnostic_id`；request/job/annotation/component/target标识按阶段必需，未知值显式null。details为按错误码定义的封闭union，不能任意塞原始SDK对象。`retry_action=none|replan|resume_render|query_remote|retry_fetch|repair_dependency`；retry不等于用户必须再次授权所有步骤。cause私有保存，公开投影只保留安全字段，重开不得变成COMMAND_FAILED。

| 错误类别（复用现有码，缺失才新增） | 公开detail与恢复 | 必须验证 |
| --- | --- | --- |
| 模型拒绝/截断/JSON/schema | phase、字段路径、expected/actual类型或finish_reason、诊断ID；replan受预算约束 | 原因不被oneOf噪音覆盖，不显示密钥/完整prompt |
| 时长不可行/无合法帧 | 约束revision、上下界、actual/capacity、合法相邻帧；replan或none | 60秒上限不报必须60秒，exact不悄悄变短 |
| 过期base/receipt/保护冲突 | expected/actual版本、冲突对象、annotation IDs；重新读取后replan | 零写入、批注正文完整 |
| PRECISION边界/组件参数 | target、property、合法范围或帧界限；none直到修正输入 | creation-errors.ts不压成通用码 |
| 依赖缺失/字体/组件摘要 | 受限依赖ID和期望摘要；repair_dependency | 不偷换字体/版本或静默漏效果 |
| 已提交渲染失败 | result版本、target、job、committed=true；resume_render | 重试不重复commit |
| 云提交结果未知 | remote/request身份、cost_state=unknown；query_remote | 不重复扣费提交，不声称失败就未收费 |
| 取消/清理失败/磁盘不足 | 实际phase、已提交状态、主错误+清理诊断引用 | 终态与进程回收相符，主错误不被finally覆盖 |

### I. 执行单元、检查命令和证据

以下函数是已核对入口或明确拟新增边界，不要求无条件新建文件。每项通过后保存可恢复检查点；任何新接口必须有真实调用链，不能仅通过孤立fixture就标完成。

| ID / 依赖 | 修改与具体交付 | 最小验证及通过预期 |
| --- | --- | --- |
| E00 / 无 | 实际包登记；逐效果definition清单；固定npm tarball/integrity、exports、浏览器/字体/许可和patch；读当前所有受影响调用方 | 实际发行物加载与最小帧输出；源码/工件差异记录；未安装过不能写兼容已验证 |
| E01 / E00 | C的完整Schema/例子/版本迁移；H失败结构；正式声明D各phase/receipt；登记所有reader/writer | contracts:generate、contracts:check、contracts:roundtrip；每分支合法/非法样例、旧事件只读、新写拒绝旧版 |
| E02 / E01 | 时长解析/绑定/预算/最终extent及error投影；保留原图片测量路径 | stage3:generation:test及新增具体回归；D语义表、中文数字、局部revision、开闭边界、无合法tick、音轨超尾 |
| E03 / E02 | Gateway wire、响应schema、query ID、create/patch回执、预算与resume全链 | stage3:model:test、stage3:generation:test、stage3:product:test；实际序列化body、3次上限、错receipt、截断、已发送未知 |
| E04 / E01 | component union/保存重开/资源持有；Node adapter+Worker协议、透明帧和隔离 | typecheck、architecture、worker:render-correctness:test；纯文字零视频源、alpha、错digest、缺帧、取消、越权网络/文件 |
| E05 / E04 | Semantic Manifest→双Graph/Plan、精确fps/PTS、缓存身份、caption适配、逐效果接入 | render-graph:test、basic-vlog-toolkit:test、timeline:audio-caption:test；同语义hash、各目标正确窗口、短词/字体/双语、所有B条目 |
| E06 / E01,E04 | obligation合同、storage状态机、提交事务/恢复与no-op；先完成Host层 | stage3:p4-annotation:test；21条全覆盖、冲突零commit、提交后crash/reopen单一receipt、no-op原版本 |
| E07 / E03,E05,E06 | patch编译/保护diff、精修窗口/曲线/关联对象；AI与手动共用路径 | stage3:precision:test、stage3:p4-timeline:test、stage3:generation:test；trim/split样本函数一致、手动字段保持、旧base拒绝 |
| E08 / E05,E06,E07 | 元素投影/同帧命中、轨道与属性入口、批注队列及逐条结果、失败正文/重试 | stage3:p4-annotation:test、stage3:p4-workbench:test及实际Browser旅程；透明孔洞/PiP遮挡/seek旧帧、只有批注、IME、重开 |
| E09 / E04,E05 | G远端transport/配置、任务恢复、结果QC；不重建Job | worker:client:test、job-persistence:test及新增transport故障用例；真实获准endpoint完成Preview/Master；模拟不能替代 |
| E10 / E02–E09 | H全链错误与失败注入；产物/版本/费用/UI重开一致 | 每种错误经实际入口触发；主因保留、敏感信息不泄漏、取消与资源回收、未知费用不伪成功 |
| E11 / E10 | 每个效果完整交叉旅程、真实云模型、同素材Hypit/ChatCut对标 | 保存请求、素材身份、版本、模型配置、预算、成片、截图和逐条判定；不声称未实际观看/运行的质量 |
| E12 / E11 | 更新正式架构/ADR状态和包证据；完成受影响能力与整体交付判定 | typecheck、architecture、contracts:check、pnpm run check及包必需验收；docs:complete/sync/check按实际包执行，既有失败真实分类 |

命令均以仓库根目录 `pnpm run <script>` 执行，实施前确认package.json仍含对应入口。新增tests加入现有suite；确需新script时同时登记package/allowed_paths，不在文档伪造已存在命令。pnpm run check失败不得反复重跑制造通过，定位失败归属并修复本任务引入的问题；既有不适用历史证据按现有治理处理，不删除有效断言。真实模型测试计入既有授权预算，纯文档工作不执行这些未来检查。

### J. 固定回归夹具与精确断言

E01/E00在现有tests/fixtures/stage3下复用/补以下夹具，媒体只用可授权样本；测试中的模型stub证明协议，不证明真实模型效果。每个实际效果把以下适用编号绑定到B清单，避免只测一种标题。

| fixture | 输入 | 不可削弱的预期 |
| --- | --- | --- |
| DUR-01 | 30fps、30秒可用视频、请求60秒内；模型选择30秒 | upper闭60/min null；900ticks可行；不得要求1800ticks |
| DUR-02 | 同素材、正好60秒且禁止重复/拉伸 | 精确不可行并保留base；不能偷偷选30秒 |
| DUR-03 | 先正好30秒，后改1分钟以内；片段局部修订另例 | 全片新约束替换旧exact；局部修订不替换全片 |
| DUR-04 | 图片明确3秒+视频7秒，目标10秒；另有2秒重叠转场 | 图片预留90ticks；总extent以合成测量为准，不能将重叠重复计入 |
| WIRE-01 | 合法响应、数字字符串、额外graphics字段、截断、错receipt各一例 | 合法通过；非法在对应边界失败；零错误commit，错误可重开 |
| ANN-01 | 21条仅批注，无整体文字，至少两批 | 21条覆盖恰好一次；一个最终commit；不丢第21条 |
| ANN-02 | 同一文字颜色设红与设蓝；另有已满足批注 | conflict零commit；已满足不抵消冲突；单独全已满足批次零新版本 |
| ANN-03 | commit后立即crash，再在render失败后retry | operation绑定唯一结果版本；无第二次应用；正文和原因可恢复 |
| HIT-01 | 主画面+局部PiP+透明文字孔洞，播放后seek | 点击不同位置命中不同真实对象；seek旧帧不可提交；多义可选 |
| TIME-01 | 4.1秒精确显示帧、30fps；24000/1001和VFR另例 | 已验证边界tick123；VFR按PTS而非浮点帧号；双目标无累计漂移 |
| CURVE-01 | 带非线性Bezier的组件在动画中间trim/split | 对原曲线相同语义时间取样值一致（显式数值容差）；右段不重播入场 |
| GRAPH-01 | 透明/半透明/不透明图形、中文/emoji/双语、1–5ms短词 | alpha与颜色正确，短词不丢ID；缺字体明确失败；无重复字幕 |
| KEEP-01 | 用户改标题位置/字幕纠字/音量，AI仅改另一元素 | 保护对象参数与identity保持；合法关联变化有明确操作证明 |
| CLOUD-01 | 提交断网、取消未确认、重复/损坏结果、授权过期 | query恢复身份、不重复付费提交、坏结果不发布、明确unknown |
| SANDBOX-01 | 新组件尝试外联、读非授权文件、死循环 | 拒绝/终止、无数据外传、无definition登记、主错误及清理结果保留 |

效果质量验收需记录叙事、选材、节奏、字幕、声音、构图和包装的逐维结果及依据；客观硬条件先于质量比较。对标服务无访问授权/不可用则明确该项未验证，不用官网能力表代替；这不允许删去产品效果实现。主观评价可用已授权模型并保留依据，但不得伪称人工接受或提供无依据的“等同竞品”结论。

### K. 本轮结果与实施接续

DOC-017补全的是施工合同、设计选择与验证路径，不是产品实现。当前所有E00–E12仍待正式实施/验证；此前DOC研究成果无需重做。下一执行者首先做E00的实际发行工件加载、逐效果清单和接口写入/读取闭包，再按依赖执行；若仅收到继续完善文档的指令，不跨入代码实施。

本轮只读复核了planning v3及预算常量、Gateway入口、时长函数、Clip.source/Commands、precision编译器、批注processing合同与Host处理入口、现有测试scripts，并对批注存储/恢复安排独立只读审查。未运行任何产品测试、真实模型、图形或云任务。文档检查实际结果见 [DOC-017 Evidence](../evidence/runs/EVD-20261111-DOC-017-EXECUTABLE-PLAN.md)。模型名称不作为验收标准，真实运行证据才是完成依据。

#### DOC-017 独立审查补充（并入E06–E08）

- 精确同步 `readTimelineAnnotationProcessingEvents`、`registerTimelineAnnotationProcessingEvent`、`readTimelineAnnotationRevisionMessage` 的状态与revision证明；Renderer的 `timelineAnnotationReceiptMatches` 核对完整annotation集合和结果版本，不只看batch resolved。
- `compilePrecisionEdit` 的sourceOf/validatePoint/slice/trim/remap分别处理asset与component；统一identity-remap函数供split/duplicate使用。`captionSlice` 对跨裁剪边界词保留词源身份、仅裁展示窗口，不能继续仅保留完全落入窗口的词。批注no-op由Host验证，不删除所有 `PRECISION_NO_CHANGE` 校验。
- 事务只包Host本地持久化，不跨模型、网络或渲染等待。模型和渲染在事务外，恢复依次检查commit receipt、render receipt、proof。已提交后的授权撤销禁止继续未经许可的云上传，但不删除已发生的版本事实。
- 批次顺序采用已持久化的队列ordinal，再以annotation ID作稳定次序；不是每次重试重新排序。token上限须由真实部署和序列化后的输入预算确认，不只按20条估计。
- E06增加message写后、revision写后、commit后UI返回前、render成功receipt登记前、proof写前五处断点；重开每次断言版本增量至多1、operation/正文不变、未完成条目不丢失。增加后批与前批冲突、单条subjective unverified、superseded旧job迟到；不得部分提交、伪resolved或更新错误预览。
- 对应测试文件：`tests/property/stage3-precision.test.ts`、`tests/integration/stage3-precision.test.ts`、`tests/property/p4-timeline-commands.test.ts`、`tests/integration/stage3-manual-draft-host.test.ts`；批注使用 `tests/property/timeline-annotation-queue.test.mjs`、`tests/integration/timeline-annotation-storage.test.mjs`、`tests/integration/timeline-annotation-host.test.ts`、`tests/integration/stage3-p4-annotation.test.ts`。扩展这些现有suite，而不是用一份只测新helper的脚本代替生产入口。

### 2026-11-11 实施检查点（进行中）

- 用户已授权实施 E00–E12。实施前 git status 共553条 dirty/untracked；活动 `WP-S3-RELIABLE-UX-001` 已执行 `pnpm docs:start -- WP-S3-RELIABLE-UX-001`，退出0。为同步本计划，活动包 manifest 仅新增本计划允许路径，原因记录在该工作包中；不把完整对标目标挤进 P4，也不推进包完成。
- E00：对照活动工作包与治理程序，当前全仓只允许一个 active package；P4尚未完成。独立完整交付工作包的登记与依赖、发行物加载/图形输出仍在核对，不能标为完成。
- E10 局部：`apps/desktop/src/main/ipc/creation-errors.ts` 为已知 PRECISION 边界错误保留具体码和安全恢复说明；`tests/integration/stage3-desktop-authorization.test.ts` 覆盖普通/嵌套错误及敏感信息不外露。`node --import tsx tests/integration/stage3-desktop-authorization.test.ts` 退出0。跨Worker/IPC/重开完整错误合同未完成。
- E02 局部：正在验证现有时长识别的上限和中文数字修复；正式constraint/协议、严格不等式及完整E02验收仍未完成。验证完成后记录实际结果。
- 批注只读核对：`processTimelineAnnotationBatch` 当前渲染回执后即resolved，未逐条证明；storage读取与写入均验证状态机，processing.v1不支持已提交回执与失败并存。后续需同事务绑定commit receipt，模型/渲染置事务外；不能仅改UI或Schema。
- E00发行包复核：只读临时环境 `npm pack @hypit/provider-html-local@0.2.0` 成功，SHA-512 与既有研究记录一致；tarball 的 dist/capture.js 调用 createOpaqueFrameCapture，不能直接作为透明PNG层。发布包声明 peer `@hypit/hypit ^0.3.1`、`@hypit/runtime-local ^0.1.1`，以及 Puppeteer 25.10.0、@puppeteer/browsers 3.2.2，指定 Chromium 152.0.7928.2。9包临时安装依赖解析超过约2分钟后中止，未验证可加载/绘帧；宿主Node 26.13.0也不同于目标容器Node 22.16。未修改项目依赖或锁文件，E00仍未完成。
- E02局部测试：`node --import tsx tests/property/stage3-source.test.ts` 退出0；修复覆盖60秒内、1分钟以内、中文数字及后续修订。`pnpm run stage3:generation:test` 仍在执行，尚无最终结果，不据前几个子测试通过声称套件通过。
- E00工作包登记：已在 Stage3 manifest、capability 和 acceptance 中登记 `WP-S3-CLOUD-EFFECTS-001` / `CAP-S3-CLOUD-EFFECTS-001` / `ACC-S3-CLOUD-EFFECTS-001`，状态均 pending，依赖当前P4；新增工作包说明并运行 `pnpm run docs:sync` 退出0。按当前治理全局只能一个active，不能在P4仍活动时启动新包。发行物的实际加载、图形绘帧和逐definition完整清单未完成，E00整体仍在进行。
- E02局部生成套件：`pnpm run stage3:generation:test` 完整退出0，包含现有Host规划、账本和重开测试；使用合成素材及HTTP fixture，未证明真实云模型/完整E02。`git diff --check` 对本轮修改的相关跟踪文件退出0。
- `pnpm run docs:check` 实际退出1：`worker/media-scene-request` 多个 current major；多个历史 capability Evidence applicability 不匹配；三个 programme 的 latest evidence fingerprint mismatch。此前文档审查已记录 scene 双major及历史证据适用性问题；本次源码修改后指纹亦已变化，不能把所有当前报错归因于旧问题或改写为通过。需要按当前合同和新源码证据逐项处理，不删断言。
- TypeScript：`pnpm exec tsc -p tsconfig.base.json --noEmit` 退出0；此命令不生成合同绑定。产品未部署，未声称浏览器、真实云模型或远端渲染验收通过。
- 协议冲突只读核对：当前 production Host 在素材观察和精修帧扫描使用 `media.scene_scan.v1`；v2另要求输出目录、产出文件回执，并拒绝GIF/animated WebP。不能仅删v1或改handler版本。完整替换须覆盖Host两条调用链、权限与内容校验、v2动图、Worker registry、job展示、相关脚本、合同/生成绑定及采样/混合媒体测试；该修复仍未实施。
- 时长修复独立复核发现内外、中文负数、中文省略位歧义、“不要超过”及“之前/以后”等边界存在误解风险，正在补充处理和回归；先前套件通过不代表这些边界已通过。
- E00补充探针：隔离、无网络且不挂载项目的临时Docker环境确认Node 22.16.0；系统临时目录 `npm install --legacy-peer-deps` 单装 caption-fine 完成，但在Node 22和26上 import 均因缺少 `@hypit/hypit` 失败。peer依赖不可省略，完整依赖闭包及可执行性仍须验证；不是产品部署或完整加载成功。
- E00 peer复测：系统临时目录单装 caption-fine 后补入 npm tarball `@hypit/hypit@0.3.2`，在无网络、无项目挂载的 Node 22.16.0 临时容器中实际 import，失败 `ERR_UNKNOWN_FILE_EXTENSION`：根包 `./recipe` export 指向 `packages/recipe/src/index.ts`。因此独立包 dist JS 不意味着闭包可被 Node22 原生 ESM 直接加载；须验证受控 tsx 加载或预编译/打包及其依赖闭包。9包安装仅确认元数据解析缓慢，不能断言不可安装。未更改仓库依赖，E00未完成。
- E00后续：Node22容器的 tsx 4.23.1 越过 .ts 扩展错误后，手工解包 root tarball 又因 recipe 的 @hypit/kernel workspace 引用未解析而失败；正式 npm 安装与手工解包不同，完整闭包仍未验证。root 包网络安装30秒未完成而中止。不能假定 tsx 即已解决，也不能断言包不可安装。
- E02复核补修：无主语“不要超过60秒”识别为闭上限；“60秒内外”、之前/以后、负时长、混合范围及“一百二”等有歧义的表达显式拒绝，未静默转换或继承旧值。最终修改后重新运行 `node --import tsx tests/property/stage3-source.test.ts`、`pnpm run stage3:generation:test` 和 `pnpm exec tsc -p tsconfig.base.json --noEmit` 均退出0；生成测试采用合成素材和HTTP fixture，不等于真实云模型。完整E02/新时长合同仍未实现。

### 分支核对及续做（2026-11-11）

- 当前 `codex/cloud-editing`，用户要求合理同步远端。`git fetch --no-tags origin` 成功；远端 main 为 `b600b38f2afe280f0152c1811e6b2d928e5e3a95`，当前 HEAD 领先9、落后0；另两 detached worktree 保留。`git push --set-upstream origin codex/cloud-editing` 创建同名远端分支，`git ls-remote` 核实其 HEAD 为 `293695defc884445630b7d83e77a58c8f2031186`，与本地 HEAD 相同。没有合并、强推、提交或清理；大量未提交/未跟踪文件仍仅在本地，不是远端备份。
- 本轮已执行 `pnpm docs:start -- WP-S3-RELIABLE-UX-001`，退出0。继续只在活动包已允许范围内修复 E02/E03 交叉处：模型测量提示与仅上限时重新选择较短可行目标的语义冲突；同时在隔离临时环境继续 E00 依赖闭包与加载探针。两者均不能据此宣称整包或完整目标完成。
- E00本轮补充：在隔离无网络Node 22.16.0临时容器，按 `@hypit/hypit@0.3.2` tarball内各 workspace 的 package.json 名称建立缺失 `@hypit` 包临时符号链接，未覆盖独立包，使用镜像 tsx 4.23.1 loader 成功 import `@hypit/caption-fine` 并观察到 scheduleFineCaption/renderFineCaption 导出。该手工映射不证明正式npm安装、依赖闭包或绘帧；后两项仍待验证。
- E02/E03本轮局部修复：新Host请求加入 `duration_remeasurement_policy=explicit-upper-bound-v1`，规划器仅在Host识别上限且无显式下限、预算尚存并发生容量不足时提示可提交新query选择较短目标；受保护/音轨/节奏约束且必须引用新可行回执。显式下限、exact及无策略标记的历史请求不放宽；Host新root timing文案同步修正。property覆盖上限、旧回执、精确/下限、预算耗尽、历史及未知策略；Host规划集成退出0。`pnpm run stage3:generation:test` 退出0，但套件启动后更新过timing文案，更新后另行执行planning property、Host集成和tsc均退出0；非真实云模型验证。完整E02/E03仍未完成。
- 规划格式错误提示局部修复：`CREATION_PLANNING_EXCHANGE_INVALID` 和 `CONTRACT_CREATION_DECISION_INVALID` 不再无条件宣称原始模型结果已保存；桌面授权测试通过并检查不泄露私有信息。真实provider截断、拒绝的分类及持久化重开仍未完成。
- E00正式安装对照：临时目录安装根包+caption-fine约50秒未完成而中止，registry查询 `@hypit/kernel` 为404；手工workspace链接+tsx仅证明受控Node22环境能够导入字幕模块。目标镜像尚未发现Chromium/Puppeteer，未有真实首帧、正式闭包或可部署证据。

### 工作区整理与远端检查点

用户明确授权整理并同步远端。先前本地保全覆盖3084个变更条目及约2.60GB现存内容，逐文件SHA-256读回验证；备份位于 .git/local-preservation/2026-11-11T15-01-16-528Z，仅本机。原始浏览器目录、模型、录屏、媒体、项目数据库、运行依赖及原始运行配置保持原位，通过 .git/info/exclude 的本地规则排除；完整排除清单保存在 .git/local-only-sync-manifest.json。并未删除原始资产。

本次将源码/合同/测试与文档/文字证据拆成两个检查点提交到 codex/cloud-editing，不合并main、不强推、不宣称交付完成。新增原始证据资产除已核对的DOC研究资料外不随提交上传；因此部分Evidence附件在远端不可用，需在本地保全目录对应工作区核验，不能据远端文字记录声称可完整复现。文字记录及历史删除意图保留；此前授权删除的97份旧归档文档随文档提交登记。

提交前 staged diff --check 和 TypeScript noEmit 均退出0。未重新运行全量验收；现有scene请求双current major、历史Evidence适用性/指纹问题和DOC-017未完成项保持原记录，不因同步改变为通过。此为开发检查点，不是Release或完整功能验收。
