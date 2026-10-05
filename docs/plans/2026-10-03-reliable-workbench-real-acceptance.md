# DOC-007 AVE 可靠媒体、完整交互与真实验收执行计划

## Purpose / Big Picture

把现有公开能力与 Stage3 C1–C9 完善为用户能够稳定使用、遇错能够恢复、结果能够核验的完整创作工具。本计划覆盖项目管理、混合素材、素材预览、对话创作、制作中修改、基础精修、配乐、版本、导出、个人化权限与恢复。保留浅色方向、中央播放器与侧栏结构，改进交互、排版和动效。

初始阶段于2026-10-03只完成计划文档；随后用户明确授权“根据文档完成全部执行计划”，本记录进入实施执行阶段。DOC-007 属工程执行记录层，由 [文档主页](../README.md) 与 [Work Orders](../07-work-orders/README.md) 导航。旧混合素材计划记录的是此前交付，不适合覆盖新失败、完整交互和新的实操门槛，因此新建本记录；产品、架构、UX、测试和 programme 权威仍复用原路径，不建立第二套状态源。

本计划的P0–P5与旧混合素材计划的P1–P5是不同任务的阶段编号。实施授权已取得，依次promotion并通过docs:start登记唯一active包；尚未promotion的候选不能提前实施。授权覆盖必要实现、测试、修复和最终两服务构建/实操，不包含提交、推送、合并或正式发布。各包精确允许路径以当前manifest为准，保留用户数据和原有变更。

既定 editing-v1 blocked 的高级功能仍按正式工作包推进；界面不得暗示可用。本次核心流程完成不等于高级剪辑范围完成，不取代原 Stage2/Stage3 Exit 或 Release。

## Context and Orientation

2026-10-03 读取基线：分支 `main`，HEAD `13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de`。生成 STATUS/WORK 无活动包，ready backlog 只有 editing `WP-XFORM-002`。Stage3 当前矩阵为 tested；这是历史工程状态，不是本次实操通过。长期目标仍在 [PROJECT_GOAL](../../PROJECT_GOAL.md)，不因局部完善重写。

四项既有未提交变更须原样保护：`.dockerignore`、`docker/Dockerfile`、`docs/plans/2026-10-02-mixed-media-resource-packs.md`、`tests/integration/docker-packaging.test.mjs`。初始差异为四文件、10 insertions、1 deletion；原字节摘要及首次检查结果见 [本轮 Evidence](../evidence/runs/EVD-20261003-DOC-007-RELIABLE-PLAN.md)。保留现有项目、素材、导出、档案、私有配置与模型缓存；禁止 reset、清空工作区、删除数据卷、无关容器清理及扩大权限。

首次 `pnpm run docs:check` exit 1：generated `docs/current/VALIDATION.md` drift、多项 evidence applicability 失败、三个 programme 的 latest evidence fingerprint mismatch。不得改写历史 Evidence、降低断言、仅同步文档或刷新 applicability index 把该基线包装为通过。未来受影响代码和最终镜像重新验证后追加 Evidence，才可处理状态与适用性。

已读现行权威链，以下文档继续各司其职：

| 领域 | 复用权威 | 本计划的补充用途 |
| --- | --- | --- |
| 产品与高级能力边界 | [Product](../product/PRODUCT_VISION.md)、[Editing Scope](../product/EDITING_CAPABILITY_SCOPE_V1.md)、[Stage3](../product-intelligence/STAGE3_PLAN.md) | 现有公开入口的可靠性与恢复，不缩减 C1–C9 或提高高级状态 |
| Host 与执行架构 | [System](../architecture/SYSTEM_ARCHITECTURE.md)、[Editing Execution](../architecture/EDITING_EXECUTION_ARCHITECTURE_V1.md)、[Foundation](../specifications/editing-execution-v1/FOUNDATION_AUTHORITY_RECOVERY.md) | 新浏览预览边界见 [ADR-0041](../decisions/ADR-0041-browsing-preview-and-strict-analysis.md)，实施前同步真正改变的接口与调用方 |
| 工作台与对话 | [Workspace](../ux/WORKSPACE_DESIGN.md)、[Interaction](../ux/AI_INTERACTION_MODEL.md)、[Review](../ux/REVIEW_APPROVAL_MODEL.md) | 本轮目标是状态可信、布局细修及失败可恢复；旧视觉观察不追认为新验收 |
| 自动与人评 | [Test Strategy](../04-engineering/TEST_STRATEGY.md)、[C1–C9](../product-intelligence/CREATIVE_QUALITY_BENCHMARK.md)、[Quality Pipeline](../pipeline/QUALITY_EVALUATION_PIPELINE.md)、[Human Evaluation](../05-evaluation/HUMAN_EVALUATION.md) | 新的 Windows 实操记录与身份门槛，不另造综合评分 |
| 实施顺序与能力状态 | `docs/program/*/{EXECUTION_MANIFEST,CAPABILITY_MATRIX,ACCEPTANCE_MATRIX,STATE}.yaml`、generated `docs/current/` | promotion 后唯一活动包、机器接受项与 Debt；本轮状态变化只经programme工具发布 |

## Progress

- [x] 读取指令、相关权威、源代码入口、Git 状态；核对四项原变更。
- [x] 保存首次 docs:check 失败与只读运行镜像身份；未重新构建或执行业务。
- [x] 将用户确定方案映射为 P0–P5 候选、恢复不变量、自动矩阵与 Windows 十步。
- [x] 创建待实施 ADR，连接现有产品、UX、测试与工作单入口。
- [x] 完成本轮文档检查及独立只读复核；结构/指纹/差异检查通过，docs:check仍保留基线Evidence失败，不宣称全库通过。
- [x] 实施授权已取得；P0已promotion并经docs:start启动。
- [ ] P0构建身份、来源/输出绑定和本机/CI分层门槛已实现，完成回归、复核与Evidence后退出。
- [ ] P1–P5 实现、最终镜像实操、独立复核和用户审美/故事/听感接受：本轮均未运行。

## Plan of Work

### P0 当前基线与验收基础

候选 `WP-S3-RELIABLE-BASELINE-001`，无本轮实现前置。登记问题清单，每项含公开入口、复现输入、首次失败、根因是否确认、受影响用户结果、恢复、所属阶段与证据身份。对当前问题照片、两段 MP4 使用获准来源；记录 SHA-256、大小、流身份、来源许可和授权，不猜测文件名、路径或根因。缺样本只阻断对应真实回归，继续合成边界、代码链和其余已授权工作。

建立完整构建输入与镜像运行文件清单，覆盖 Host、Worker、Contracts/生成绑定、database、资源目录、启动脚本、依赖锁、本地模型及工具身份。构建输入还包含 `.dockerignore`、实际 Compose/覆盖文件、两服务 Dockerfile、构建脚本、Node/Python 锁与基础镜像；解释被排除文件。凭据只记录配置来源和非敏感部署身份，不能把 `.env`、key、私有素材纳入镜像或 Git。

分别保存 HEAD、工作区实际源码指纹、未提交差异摘要、完整输入清单摘要、两镜像 ID/RepoDigest、实际运行容器的 image ID、启动配置摘要、镜像内运行文件清单摘要与 FFmpeg/Worker/模型身份。当前 `scripts/docs/fingerprint.mjs` 的源码范围不能替代 Docker、resources 或完整镜像身份。可变 tag、源码 fingerprint 和容器 healthy 都不能证明镜像与源码一致；P5 要对构建输入与镜像文件逐项核对，并以同一镜像实跑。

在获准工具范围内实现本计划的实操记录验证器，并接入现有 `docs:complete`、`docs:check` 与 CI 实际运行的 `pnpm run check` 链。产品候选包 promotion 时登记它们所需步骤 ID；验收工具自身的 P0 通过恶意记录/身份漂移/零写入测试完成，不能自称已经完成产品实操。缺门槛的 P1–P5 不能完成。保留首次 docs 失败，受影响回归成功后新增 Evidence 并记录旧失败→修复→复验关系。

退出：数据保护清单、问题身份、精确允许路径、完整输入/运行清单规则、可验证的实操门槛及其反例测试到位。当前 DOC-007 只完成规划与部分只读盘点，**不宣称实施 P0 完成**。

### P1 可信批量导入

候选 `WP-S3-RELIABLE-IMPORT-001`，依赖 P0。

- Host 持久化批次与逐项状态：等待、上传、校验、已导入、重复、失败、取消。上传完毕还需校验与原子登记。终态为完成、部分完成、停止；停止保留项目/权限/数据库等批次级原因。完成须所有项导入或已核验重复；部分完成列成功、失败和取消数，不能泛称全部成功。
- 坏文件首/中/尾均继续其他项；用户取消停止剩余工作，保留成功项。停止/取消时明确已执行项与未开始项，上传中的取消等待资源释放。重试只针对可重试失败，已导入项不重做；数据库故障、授权失效或项目关闭停止批次，不当成普通文件错误继续。
- 素材资产、Original 位置、导入单项结果在 Host 同一事务登记；对象文件先完成安全发布，数据库失败仅清理本次无引用文件。不能让已写资产没有位置，也不能先宣告导入成功。事务锁内重新验证项目与授权代次。
- 内容身份决定重复：同名不同内容分别导入、同内容不同名称返回同一资产并记录重复来源。批次项/内容/效果身份让重复点击、响应丢失和重试幂等；冲突不能覆盖原登记。并发去重以 Host 事务结果为准。
- 图片 EXIF 缺失沿用现有处理；`0` 按解码像素方向显示并记录兼容说明；`1–8` 正确旋转/镜像；其他非法值与真正损坏文件明确拒绝。透明图片保持透明语义、原片不改。显示尺寸与方向必须对应实际解码。
- 检查可用磁盘空间，包括上传临时文件与派生媒体余量；估算不足明确失败，检查后耗尽仍按真实写入错误回滚。清理取消/失败的无引用临时文件；已登记 Original 必须由 Host 引用保护，不能随 Browser 会话过期删除。恢复先重查持久状态，不自动重复非幂等工作。

退出：自动矩阵通过，真实 UI 的追加、坏文件批次、取消、失败重试、断线后核对数量与登记通过。首次失败与修复复验保留；未跑真实入口不能完成该产品包。

### P2 可播放素材预览与严格分析分离

候选 `WP-S3-RELIABLE-PREVIEW-001`，依赖 P1，设计依据 ADR-0041。

浏览链提供图片、**完整视频**和音频实际播放；Worker 准备浏览器兼容媒体，Host 保存准备、转换、就绪、失败及重试状态。画面、声音、波形分别准备；波形失败不阻断播放，声音失败仅在明确显示“仅画面预览”并持续保留声音故障时允许画面播放。真实无音轨来自 probe/解码事实，不能用声音失败冒充。若原格式可播放，可使用经 Host 验证的授权来源；否则显式转换，不让 Renderer 猜路径。

严格链继续验证源摘要、PTS、采样对齐、覆盖区间和实测收据，观察、精修与配乐测量只消费该链。浏览派生物不能替代 Master Original 或充当精确分析收据。Browser 播放位置含来源/派生策略/映射身份，只有 Host 映射、检查源范围并转换为 RationalTime 后才能成为剪辑边界；非零起点、VFR、edit list、编码延迟不能直接用浮点 `currentTime` 写 Timeline。

当前两段失败 MP4 分别记录编码延迟、容器/流非零起点、edit list、逐帧 PTS、实际解码帧及音频 sample 覆盖区间。对可解释的首尾边界与真实内部间隙分别判断；只有证明解析或边界缺陷才修正算法，保留原失败回归。禁止放宽 `MEDIA_SAMPLE_AUDIO_GAP`、吞错、填默认时间戳或制造覆盖来过关。

点击素材直接进入中央素材预览；支持播放/暂停/跳转/音量/全屏，图片缩放与恢复。返回作品恢复观看版、位置与声音设置。快速切换、关闭面板与换项目时取消旧准备请求、停止旧声音、清理 object URL/播放器/监听器；晚到结果校验项目、素材、请求与选择代次，不能覆盖新选择。播放准备有真实超时与取消，不用假进度。

Browser 使用 Host 授权的不透明媒体引用，支持 Range、HEAD、越界处理与失效检查；Electron 使用对应受限协议，Renderer 不取得原片路径。引用绑定项目/会话或当前授权域、来源摘要、派生策略及工具身份；跨域访问拒绝，替换来源或撤销授权使引用和缓存失效。缓存可重建、不可越过 Original 引用保护。

退出：当前失败样本真实播放回归与严格采样结果分别有结论；无音轨/短音轨/真实间隙保留精确失败语义；实际视频和音频操作不串画面、不残留声音。浏览成功不能把严格失败改为成功。

### P3 完整业务与恢复

候选 `WP-S3-RELIABLE-JOURNEY-001`，依赖 P2。逐个审计公开入口，记录输入、Host 操作、持久终态、输出/QC/版本、失败、取消及重开恢复；实际模型配置下完成 C1–C9 和混合素材全链，禁止只改善首页或按钮。

Host 保存任务终态、导出记录、可恢复问题。客户端播放诊断关联精确素材或作品版本，Host 收录来源与发生时间；字节进度可临时显示，成功/失败/恢复结果必须查询得到。问题卡说明对象、原因、已完成部分、恢复动作；错误码和详细诊断按需展开。未处理错误不随轮询、切换素材、无关成功消失，刷新与重开可回看；明确解决、撤销或关闭提示不应销毁审计记录。全局提示只反映对应操作，消除“预览失败但操作完成”的矛盾。

输入显示保存中/已保存/保存失败并绑定文本修订与 Host 确认版本。覆盖后立即刷新、关页、断线必须恢复最后确认文本并清楚报告未确认部分；不能仅靠 unload 异步写入承诺保存。中文 composition、发送与切换面板共享同一输入状态。恢复分类为已完成、已取消、可重试、需重选来源；提交前核验授权/base/generation，不自动重放云调用或其他非幂等工作。

| 区域 | 最终行为与恢复 |
| --- | --- |
| 作品入口 | 新建、继续、失效与打开失败明确；真实封面与保存状态；引用身份变化不能静默打开另一作品 |
| 素材侧栏 | 真缩略图、类型筛选、多选、批次与问题入口；选中进入中央素材预览 |
| 中央播放器 | 明确素材/作品；返回作品保留观看版、位置、声音；空项目说明尚未制作 |
| 对话 | 全高消息区、底部固定输入、授权按需展开；制作中继续输入；收到/调整中/可观看映射真实 Host 状态 |
| 精修 | 随镜头/图片/声音/字幕显示适用操作；与语言续改共享 CommandEditIR/CommitPlan；保护、冲突、失败明确 |
| 历史比较 | 观看版、编辑版、最新草稿、采用版分开；可用状态依据对应输出/QC；新版不抢播放、不自动采用 |
| 配乐 | 音频库试听、授权来源、实测范围和署名可查；历史来源重开可复现，不因取得音乐失败交付“配乐完成” |
| 导出 | 固定所选版本；QC 通过、下载已开始、实际保存分开；重开后重新授权下载，失败不覆盖旧合法导出 |
| 档案学习 | 范围、来源、例外、纠正、排除、遗忘可看；关闭、合法无匹配和损坏区分；不能隐式退化后显示成功 |

网页无法观测系统下载完成时只显示“下载已开始”；实操要打开实际下载文件，检查版本、画面、声音与附件。Electron 的保存状态以真实受限保存操作返回为准。云授权必须真实界面确认，模型/结果失败保留根因、用量和无错误提交证据。

退出：生成中修改/取消/旧结果、手动后续改、保护/比较/采用/撤销重做、个人化例外与遗忘、音频来源与导出、Host/Worker/SSE 故障及重开恢复实际通过；C3/C5/C6/C8 的主观判断另列待用户接受。

### P4 视觉与交互

候选 `WP-S3-RELIABLE-UX-001`，依赖 P3。沿用现有浅色苹果式方向与中央播放器/侧栏，不重制产品界面，不用示例图、假波形或动画掩盖缺失结果。

2026-10-05 用户约束及剪映实际观察已登记于现有 WORKSPACE_DESIGN.md：颜色与 Apple 简约逻辑冻结，剪映仅参考交互和排版。P4 按以下顺序融合整改，不把 P3 基础入口故障延期至美化阶段：

| 优先项 | 整改与退出检查 |
| --- | --- |
| 主路径与层级 | 对话、看片、按需精修保持单一主路径；每种状态只有明确的下一步主操作，技术设置渐进展开；从新建到导出可连续操作 |
| 稳定排版 | 中央播放器保持优先空间，素材/对话/属性按需展开；固定输入、独立消息滚动，宽窄窗口切换保留内容、焦点与选区 |
| 对象联动 | 素材预览和创作选材区别清楚；选中镜头后只呈现适用属性和语言修改目标；保存、撤销、重做给即时反馈 |
| 版本呈现 | 历史卡明确观看、编辑、采用身份；保存但未制作时给下一步，制作中不抢播放，完成后由用户决定观看/采用 |
| 问题与恢复 | 缺项原位提示，操作失败就近显示原因和恢复；持久问题中心用于历史回看，详情可换行，关闭不删除记录 |
| 可访问与操作连续性 | 键盘、中文输入法、焦点返回、125%/150%缩放与减少动态效果实际检查；保留现有颜色令牌和系统字体 |

P4 交付以空项目、已导入、授权、制作、已保存待预览、可播放、比较、失败重试、重开恢复、导出十种状态的实际流程为依据；美学接受由用户确认。本表是待实施计划，不能写成已经完成。

2026-10-04用户再次明确：苹果设计理念和接近苹果官网的颜色保持，剪映仅参考交互方式，不能改变AVE对话创作的产品路径或直接搬入其主题/布局。素材须优先显示真实原片缩略图，文件名退为辅助信息；具体参考边界统一见WORKSPACE_DESIGN.md。本条为设计约束，不宣称已实施。用户已打开剪映，确有交互细节需要时再只读查看，不操作其项目。

系统字体、统一间距/圆角；正文至少 14px，次级说明可读。每视图清楚主操作，技术诊断按需展开。真缩略图不拉伸，长名称截断并可查全名，错误详情换行且不挤坏播放器。宽窄窗口保持输入、选区、焦点，窄窗口以主要面板切换解决，不依靠整页横向溢出。

本轮确定的时长目标：按压约 100–140ms、面板约 240–300ms、画面短淡入；取代旧目标中面板 380ms 的本轮设计要求，不追认旧实现已经改变。动效可中断、反向，支持减少动态效果；对 CSS 与 JS 动态偏好变更均处理。WebKit [Responsive Design for Motion](https://webkit.org/blog/7551/responsive-design-for-motion/) 已于 2026-10-03 查阅，用作 `prefers-reduced-motion` 的依据；具体时长来自用户本轮方案，不是该文章规定。

新版本画面就绪才提供观看，不抢播放；加载有超时和取消。键盘、焦点恢复、中文输入法、连续窗口缩放、Windows 125%/150% 与减少动态效果在真实流程中验证，不能仅看 CSS 数值。

退出：正常/空/制作/比较/失败/恢复的宽窄操作均有观察，错误持续至少 30 秒并经历无关成功后仍可恢复。美学认可另由用户记录，不让工程检查代签。

### P5 最终打包与验收

候选 `WP-S3-RELIABLE-ACCEPTANCE-001`，依赖 P4。完成完整运行清单与两服务最终镜像；四项原变更继续保护，不能静默丢弃。全仓库必需检查与最终合成验收通过，Contract/源码/生成绑定/运行文件/实际镜像一致。实际模型与云调用的当前授权以真实界面和配置为准；本轮计划阶段不触发费用。

在最终同一构建身份上执行下列 Windows 十步，录制连续过程及实际声音，保留源身份、关键截图、日志、操作记录和产物摘要；独立复核检查证据与记录一致。修复必须回所属能力包，不借验收包扩大 runtime 允许路径。完整核心旅程失败不能只补一张最终成功截图。

退出须工程检查、真实实操、独立复核均通过，用户美学/故事/听感接受另行取得并绑定成片；更新使用说明、已知限制与恢复说明。分别报告本次核心完成、Stage Exit 与 Release；不会因为测试绿自动提交/推送/合并/发布。

## Candidate work packages / Allowed paths

以下是未来 promotion 的边界候选，不是当前允许改代码的范围。每包先穷尽实际消费者，再收窄到精确文件并登记 manifest、Capability、Acceptance、依赖、`required_tests` 与实操步骤。共享路径不允许并行写入；始终只有一个活动包。表中拟新增文件在 promotion 时明确标为新建，不能伪称已经存在。

| 包 | 候选实现边界 | 退出证据 |
| --- | --- | --- |
| P0 BASELINE | `scripts/docs/{complete-work,check,fingerprint,program-model}.mjs`；拟新增 `scripts/docs/interaction-acceptance.mjs`；`tests/architecture/docs-*.test.mjs` 的实际消费者及拟新增门槛测试；`scripts/docker/build-desktop.mjs`、`tests/integration/docker-packaging.test.mjs`、`package.json` 中门槛接入所需部分；若必须改变 workflow，先显式登记 `.github/workflows/ci.yml` | 数据/输入/镜像盘点、门槛拒绝反例与零写入；不代替产品实操 |
| P1 IMPORT | `packages/platform/project-host/src/project-host.ts`、`packages/platform/project-host/src/ports/project-host-ports.ts`；`packages/platform/project-storage/src/project-storage.mjs` 及其类型/事务实际消费者；`database/**` 的必要当前格式定义；`apps/web/src/server.ts`、Browser `entry.js` 上传寿命；`apps/desktop/src/main/ipc/media.handlers.ts` 及必要Main协议消费者；`apps/desktop/src/renderer/features/media-panel.js` 及批次 UI；Worker `adapters/still_image.py`、`handlers/media_fingerprint.py` 与解码调用方 | 联合事务/幂等/取消/清理测试、真实坏文件批次与重开 |
| P2 PREVIEW | P1 中 Host/IPC/Web 的精确文件及 `apps/desktop/src/main/protocol-handler.ts`；`packages/platform/worker-client/**`；Worker `handlers/media_sample.py`、`handlers/media_timing.py`、`adapters/ffprobe.py` 及拟新增独立浏览准备 handler；`apps/desktop/src/renderer/features/media-panel.js`、播放器与状态实际消费者；Host `audio-library.ts`、`stage3-creative.ts` 等严格测量调用方 | 完整播放、授权/Range/HEAD/失效、旧结果及释放、严格采样独立回归 |
| P3 JOURNEY | Host 的 `stage3-{request,workspace,creative,learning}.ts`、`precision-edit.ts`、`audio-{library,credits}.ts` 与实际业务消费者；project-storage/job-engine/user-profile-store；Web/IPC/preload 的任务/输入/版本/导出消费者；Renderer 对话/精修/版本/问题入口；仅必要 Worker/模型合同同步 | C1–C9、保存/恢复、导出身份与实际模型旅程 |
| P4 UX | `apps/desktop/src/renderer/**` 内实际工作台 CSS、DOM、播放器、状态与交互；对应 Renderer/Browser/原生交互测试 | 连续缩放/中文输入/焦点/动效/30秒问题持久化的真实 UI |
| P5 ACCEPTANCE | `compose.yaml`、`docker/**`、`.dockerignore`、构建脚本中完整清单/一致性需要的精确文件；Browser/Electron 真实验收 harness、获准非私有测试清单、最终 `README.md`/`README.zh-CN.md` 与 Docker 使用说明 | 最终两镜像身份、完整必需检查、十步录屏/声音/文件打开、独立复核 |

各包另登记对应 `contracts/schemas/**` 当前合同、examples、codegen 消费者，生成物只能工具产生；替换旧 Schema/readers/adapters/tests/docs 必须同包完成。新增持久记录要确定当前项目格式策略和数据保护，禁止未授权自动迁移或双当前格式。测试范围包含对应 Host/storage/Worker/Web/Renderer 集成与失败反例；不把整库 `tests/**` 当默认通行证。

共用治理范围在 promotion 明确登记：Stage3 manifest/matrices/state、跨 programme 仅受影响的适用性/状态、工具生成 `docs/current/**`/index、对应产品/架构/UX/测试说明、本计划、该包新 EVD 和实际 Debt。不得改历史 ADR/Evidence，不得手改生成物。高级 editing-v1 包保持原 programme 顺序。本轮 DOC-007 允许：本计划、ADR-0041、对应导航/产品/UX/测试的文档衔接、新独立 EVD，和 `docs:sync` 必需的工具生成状态/验证视图；禁止代码、合同、业务测试、依赖、CI、历史记录编辑。

## Concrete Steps

本轮文档命令（顺序执行，文档工具共享锁）：`pnpm run docs:check` 保存初始结果 → 完成文档 → `pnpm run docs:sync` → `pnpm run docs:check` → `pnpm run docs:architecture:test` → `pnpm run docs:fingerprint:test` → `git diff --check`。同时核对本轮相对 Markdown 链接与四项原文件字节。检查失败如实记录，不以重跑取最好结果。

未来实施：获准后登记 P0 → `pnpm docs:start -- <正式WP-ID>` → scoped tests、实际门槛 → 新 EVD、显式矩阵 reconciliation → `pnpm run docs:sync` → `pnpm docs:complete -- <WP-ID> <EVIDENCE-ID>` → `pnpm run docs:sync`、`pnpm run docs:check`。只有登记后的正式 ID 可执行。失败/待验包保留 blocked、Evidence 与 active Debt，不强行完成。接续只启动依赖就绪的下一包。

每包按最终改动运行 scoped tests；P5 及跨模块后运行既有完整 `pnpm run check` 与 `pnpm run acceptance:final:synthetic`，不削弱严格采样、权限与真实状态断言。已存在命令如 `stage3:check`、`web:host:test`、`renderer:workbench:test` 等在 promotion 时核对 package scripts，并登记新增实际测试命令。当前 shell 为 Windows PowerShell、Node v22.16.0、实际 pnpm 11.19.0，仓库声明 pnpm 11.9.0；实施/最终构建按锁定环境核对差异，不擅自改锁或依赖。Worker 检查使用 pinned interpreter，不用依赖漂移修测试。

## Validation and Acceptance

### 自动验证矩阵

| 边界 | 必测场景 | 实际断言 |
| --- | --- | --- |
| 图片与导入 | EXIF 缺失/0/1–8/非法值、透明/损坏；坏文件首中尾；同名异内容/异名同内容；重复点击/取消/重试/断网/磁盘满/事务故障 | 解码方向/alpha、持久批次项、资产+位置+结果一致、幂等与数量、失败无引用文件清理、成功 Original 保留 |
| 播放与分析 | 当前两段 MP4、AAC/WAV、非零起点/延迟/edit list、VFR、无音轨/短音轨/真实间隙 | 浏览完整画面/声音区间与严格源PTS/sample/覆盖收据分开断言；真实间隙明确失败 |
| 媒体访问 | Range 正常/越界、HEAD、失效引用、跨项目/会话、来源改变、超时/取消/释放 | 内容范围与长度、授权拒绝、身份失效、无旧声音/旧结果、无路径泄露 |
| 创作精修 | 实际配置模型、混合素材、配乐字幕、制作中修改/取消/晚到、手动后语言续改与保护 | 当前请求/base/授权、合法 Command/原子版本、实际编码画面/声音与保留部分 |
| 版本导出 | 历史输出失败/QC未过、观看与采用分开、撤销重做/比较、下载失败/重启重新下载 | 对应 version/render/QC/导出摘要，打开文件一致；未过QC不能标可交付 |
| 保存恢复 | 输入立即刷新/关页、SSE断线、Worker崩溃、Host重启、项目切换/缺来源 | 最后有效提交与输入修订、持久问题、恢复分类、零旧/无授权提交，不自动重放云调用 |
| 交互视觉 | 键盘/中文IME/焦点、连续缩放、125%/150%、减少动态、快速反向切换 | 真输入/选区/焦点与播放器稳定、可读与可恢复；不是仅按钮/字符串/CSS断言 |

负面场景只有明确失败、权威状态正确且恢复路径可用才 pass。文件存在或 HTTP 200 不足以通过；参数化 fixtures 验证边界，真实来源与界面验收验证产品，两者均保留。

### Windows 最终连续真实操作（全部十步）

| ID | 操作 | 必要观察与证据 | 覆盖 |
| --- | --- | --- | --- |
| WIN-01 | 空项目，真实文件选择器导入问题照片、两段失败视频和混合素材 | 来源摘要、project/batch/asset身份，数量/状态/方向与持久登记 | P1/P2、C1/C7/C9 |
| WIN-02 | 追加、取消、坏文件首中尾批次、失败重试 | 成功项保留、失败原因、只重试失败、无孤立登记/误删 | P1、C7/C9 |
| WIN-03 | 看图/缩放恢复、两视频播放跳转试听全屏、反复切换 | 真画面和声音、不串画面/残音、范围映射；波形失败独立 | P2、C7/C8/C9 |
| WIN-04 | 真实界面授权生成，制作中继续修改，观看结果 | 授权和请求修订、模型身份/调用、received/adjusting/watchable、草稿与编码 | P3、C1/C2/C5 |
| WIN-05 | 精修、语言续改、保护、比较、采用、撤销重做 | 多镜头视听/字幕变化、锁与manual保留、观看/采用版与原子版本链 | P3、C3/C4/C5 |
| WIN-06 | 音频库/配乐来源署名、学习授权、例外纠正排除遗忘、留出项目 | 实际试听、资源/receipt、授权快照/删除清单；新项目不检索排除来源 | P3、C6/C8/C9 |
| WIN-07 | 固定版本导出，打开下载成片与附件 | 实际文件hash/版本/画面/声音/署名，Browser只宣称下载已开始 | P3/P5、C8 |
| WIN-08 | 刷新、正常关闭、重开、AVE容器重启 | 原素材/输入/作品/问题可核对；最后有效版本与幂等恢复，故障后不乱重跑 | P1–P3/P5、C2/C7/C9 |
| WIN-09 | 故障提示至少30秒，完成无关成功后再恢复 | 连续时间段、仍能找到同一问题、恢复成功或明确继续失败 | P3/P4、C9 |
| WIN-10 | 宽窄窗口/连续缩放、键盘、中文输入、125%/150%及减少动态 | 真实输入焦点与布局/播放器不丢，反向可中断与可读 | P4、C7 |

P1–P4 需其负责的真实步骤，不必提前完成尚无实现的后续包；P5 全十步并复核 C1–C9 的详细场景（C5 同源不同意图与 C6 留出须额外案例）。跨模块修改重新跑完整核心旅程。相关源码、工具、模型、输入或镜像变更后受影响实操失效，不能沿用旧成功；纯导航改动记录影响分析，不假装媒体重新测试。新失败/修复/复验用新 attempt ID 与 EVD 串联，绝不覆盖首次记录。

实施阶段重新核验：独立Windows Computer Use工具已成功枚举Edge中的AVE工作台窗口；上一计划阶段的原生API不可用判断不再适用于该工具。真实系统文件选择器、下载文件打开与连续有声录屏仍须分别实操确认，尚未完成的步骤继续标not-run。未来执行者逐步验证工具能力；工具不能操作时保持待验，请真实执行者完成必要动作。不得注入文件、模拟授权、后台API、自动填人评或仅播放阈值代替对应真实步骤。声音需真实听音证据与执行者观察，静音录像和波形均不代替试听。

### 强制真实交互记录与机器门槛

复用 immutable `docs/evidence/runs/EVD-*` 包装实际记录；私有原片、完整录屏/日志保留本地获准证据目录，Git 只放脱敏摘要与可核对身份。不得提前生成全 pass 或空验收模板。实际执行时才创建记录；未运行写 `not-run` 和原因。

| 记录字段组 | 必填语义 |
| --- | --- |
| 标识/执行者 | record/attempt ID、schema version、WP/acceptance IDs；human/browser-automation/native-automation等真实执行者类型、身份与权限；独立复核者单独记录，不冒充human |
| 环境/时间 | Windows版本、浏览器/应用/工具版本、屏幕及缩放、音频输出/采集条件、场景、开始结束时间与时区 |
| 构建绑定 | HEAD、dirty diff摘要、实际源码fingerprint、完整build-input digest、两service image IDs/digests、运行容器image IDs、runtime清单摘要、Worker/FFmpeg/模型身份 |
| 来源/产物 | 获准来源摘要/许可；project、batch、asset、request/revision、draft、Timeline、manifest、Preview/Master plan/render、QC、export身份；未产生对象写明确未产生原因，不填虚构ID |
| 每一步 | 固定step ID、前提、具体动作、预期、实际观察、`pass/fail/not-run`、失败码/根因是否确认、持久状态与恢复结果；不适用子项说明事实依据，不用N/A跳过必需步骤 |
| 可核对证据 | 连续录屏文件摘要与时间段、关键截图/日志摘要及对应区间、实际成片/附件摘要、播放与声音观察；外部文件不存在/摘要不同不能算证据可用 |
| 血缘/结论 | 首次失败attempt、修复身份、重新验收attempt与受影响steps；工程/真实操作/主观审美故事听感/Stage Exit/Release分别判断；复核结果与限制 |

本机完成命令检查顺序：解析记录 → 校验WP与必需step集合（拒绝重复、缺步、非法状态/时间段）→ 比对当前源码/输入/运行镜像与每步artifact身份 → 核对证据引用摘要及首次失败关联 → 检查负责步骤全部有效pass且无未解决阻塞/独立复核问题 → **最后**才能进入原有完成事务。任一失败保持 programme 零写入，记录明确错误；not-run、身份漂移、步骤缺失都不能完成。本机先实时核验私有文件并生成不可覆盖的公开完整性receipt；CI核对receipt与record、当前源码/完整输入、运行摘要链和构建出处。收据缺失或内容漂移拒绝；提交相同字节造成的HEAD/diff布局变化保留审计出处。CI只证明记录/收据完整性，不能仅凭文件存在或自报pass认定动作成功，也不为方便外传原片。

验证器要测试缺必填字段、伪造human类型、缺/重复步骤、未运行/失败、负面测试状态错误、record与输出/镜像漂移、源替换、录屏区间无效、恢复缺失、旧成功重用、非法完成前零programme修改。CI只能证明格式、绑定和门槛执行，**不能从JSON、录屏存在或hash推断真实操作成功**；真实动作与听评由对应执行者/独立复核负责。P0已接入对应产品包的完成门槛：本机完成强制live，CI只读static核对公开收据及当前内容绑定。回归fixtures明确不是产品实操。

### 完成标准与分别报告

本次核心流程完成需：全部公开入口行为/状态/恢复明确；导入/播放/版本/导出/恢复无阻塞与数据丢失/伪成功；必需自动检查通过；文档/合同/源码/运行镜像一致；最终Windows十步与独立复核通过；用户对绑定产物的美学、故事、听感接受单独记录。缺一项就报告对应未完成，不把“技术可用”升格为主观接受。

Stage Exit 遵循现有矩阵/ADR-0026及相应Debt，不由本计划替换；Release遵循单独权限/分发/检查门槛。本轮无Git出版授权，历史任务的提交/PR授权不外推到本次。

## Idempotence and Recovery

根执行者负责写入，辅助探索只读。只逆向本任务明确diff可恢复文档，不清空用户工作。批次/派生/导出恢复先读Host权威终态；内容相同和相同效果允许幂等复用，内容/策略/版本变化必须新身份。重新下载要求当前授权；取消排空旧请求再释放资源。失败保留cause/stack/对象/请求/副作用与提交状态，原合法作品不变，问题记录可追加但不冒充作品提交。清理只处理确定无Host引用临时物，保留所有原片和历史已用资源。

## Interfaces and Dependencies

Host是项目状态和SQLite唯一writer；Worker只返回候选媒体/分析结果，不打开project.sqlite；Renderer只用窄API和不透明引用。Contracts是跨语言来源；权威时间RationalTime/PTS/sample。剪辑仍走 CommandEditIntent → CommandEditIR → simulation/validation → CommitPlan/Commit；一份Semantic Render Manifest派生Preview/Master各自RenderGraph和ExecutionPlan，Master必须Original。浏览媒体不是第三份作品状态或可提交分析凭证。

未来新合同至少涉及持久批次/单项、浏览派生及时间映射、精确播放诊断、任务/输入/导出与恢复投影；实操记录是仓库验收边界，不混成产品运行模型。promotion时核对旧调用方、schema/examples/generated adapters、存储与Renderer一致切换；不能只改Host或只加接口。数据库当前格式与既有数据保护冲突须明确兼容方案，不能擅自转换项目。

## Surprises & Discoveries

- 生成状态无active，但初始 docs:check不通过；状态文件里的tested/accepted不能证明当前工作区和运行镜像已经重新验证。
- Host `readMediaPreview` 串行缩略图、波形、前15秒严格采样；`measureCreationAudioResource`复用它。Renderer media panel未提供完整视频播放。因此浏览与严格链拆分是本次明确架构目标，放宽音频gap会影响配乐证据。
- `importMedia`逐项await；`persistOriginalCandidate`先登记asset、再登记location，存储分别事务。联合原子性与坏文件批次需验证；本轮未注入事务故障，不把代码风险当实测失败。
- 源码fingerprint范围不包含所有Docker/资源输入。当前两镜像已只读采集，但完整build-input/runtime摘要和源码镜像一致性仍待P0/P5证明。
- 当前两MP4与问题照片未在本轮取得精确来源身份或解码；不预判编码/时间戳根因。本轮没有真实模型调用、文件选择器、播放听音或下载文件打开。

## Decision Log

- 2026-10-03：采用用户所有默认设计选择，不逐项追问；维持docs-only，不外推此前提交或构建授权。
- 2026-10-03：本记录负责本次顺序与验证，不改历史混合素材ExecPlan和Evidence；programme仍是唯一实施状态源。
- 2026-10-03：ADR-0041记录浏览/严格分界的已选方案与待实施状态；不把proposed写成运行事实。
- 2026-10-03：P0先建立机器门槛，再由产品包满足各自实操，P5满足完整十步与独立复核；不让验收基础工具要求尚无实现的整个产品先完成。

## Artifacts and Notes

独立 [DOC-007 Evidence](../evidence/runs/EVD-20261003-DOC-007-RELIABLE-PLAN.md)保存首次失败、实际检查与限制；[ADR-0041](../decisions/ADR-0041-browsing-preview-and-strict-analysis.md)保存分界选择。未来每包另立真实EVD与实操记录，不把本文复用成产品成功证明。

## Outcomes & Retrospective

已交付可恢复的P0–P5候选、边界和退出条件；首要实施接缝是持久批次/联合导入事务与独立浏览预览。结构/指纹回归和差异检查通过，独立复核未发现阻塞遗漏并修正两处候选路径；同步消除生成漂移但Evidence适用性/最新指纹失败继续存在。四项原变更SHA256与运行源码fingerprint均未变。文档规划不等于实施P0、当前镜像通过、Windows实操完成、主观接受或Stage Exit/Release。检查与未运行边界见独立Evidence；本轮不继续实施或出版。

## 实施执行追加记录（2026-10-03）

- P0唯一active：构建输入清单、实际两服务运行/模型清单、source/output provenance、两镜像完整输入label工具；验收拒绝缺步骤/时间覆盖/Host状态源与对象绑定/身份漂移，完成拒绝保持零写入。
- 本机完成与CI读取公开完整性收据分开；独立观察和用户主观接受不由机器代签。已有旧镜像缺新来源记录，不能拼接新源码宣称通过。
- 首次新增测试失败是fixture未建generated目录，已保留事实并修复；随后测试通过。只读复核发现录屏覆盖、运行映射和静态API绕过等问题，逐项修复后重新验证，不改写首次失败。
- 原四项变更、项目及模型缓存未清理，未调用云模型、未重构/重启容器；当前问题照片/两MP4精确路径仍待用户提供，继续不受影响的实现。
- 最终使用本轮各阶段追加Evidence报告结果；先前Outcomes段是初始文档阶段的历史结论，不代表本次实施完成。

### P1 实施中追加（不构成完成）

P0已通过工作包完成协议；唯一活动包为WP-S3-RELIABLE-IMPORT-001。
新增批次合同及工具生成绑定，Host复用现有object_refs/object_store保存持久批次、私有来源和问题历史，未改变数据库v2格式。
资产、原片位置和单项结果联合事务；取消保留成功项，重试仅失败项；普通坏文件继续，空间、权限和数据库故障停止批次。
浏览器上传绑定真实对话框、项目、会话和单项，检查空间并可取消；成功上传仍等待校验登记。
失败/取消的临时文件清理依据Host引用，正常关闭保存未进入Worker的上传终态，重开仍可查看问题。
素材栏显示持久批次和恢复操作，操作通知只报告对应导入数量。

首次真实Worker回归发现损坏PNG被FFprobe描述为空流但成功登记，断言实际成功数3而非2；已增加有效解码帧校验、保留error级解码诊断并重新验证坏文件首/中/尾。
EXIF缺失、0与1–8以真实像素方向及透明通道核验，0记录兼容说明；非法值及损坏图片拒绝，原片摘要保持不变。
浏览器测试还发现清理后返回批次仍使用旧恢复提示，修复为重新读取Host终态；首次检查失败被测试finally的保存超时覆盖，已修正测试清理以保留原始失败。
关闭回归发现新增导入排空在会话已进入retiring后阻断原有数据库关闭重试；修复仅在活动会话存在时停止批次，原有关闭故障与重试断言重新通过。

目前typecheck、architecture、导入事务/真实Worker、混合素材及浏览器传输专项已通过；完整仓库检查、P1真实Windows步骤、当前问题来源、镜像重建、P2–P5仍未完成。
首次失败不删除，不用本段替代独立最终Evidence，不运行P1完成命令或推进P2。

### P1 工程核验与待验追加

Stage3首轮完整检查暴露导入返回顺序变化导致音频被当作镜头；恢复按选择顺序返回，
核对持久资产与位置身份。第二轮实际Electron暴露孤立环境缺ajv-formats依赖；生成工具
内联现有严格日期校验，独立无npm依赖导入与非法日期拒绝通过。fixture缺批次状态/pending
另行修复，首轮失败和修复后日志均保留。Worker保留OS errno及组合cause，Host空间/权限
停止批次；system.choose-files改为Host管理的批次与不透明来源引用，不返回原片路径。

Stage2 attempt02、Stage3 attempt03工程检查exit 0；它们执行期间最后两项取消恢复提示与
上传名称上限变更由最终Host/Web专项覆盖，不把之前开始的整套检查写成最终指纹全量复验。
最终类型、合同、导入事务/Host、Web、Worker lint/mypy专项通过。完整pnpm check仍在
docs:check失败，下游未由此命令执行；不能以专项通过或docs:sync宣称仓库全绿。

当前两服务候选镜像build attempt05完成，实际源码输入/编译输出逐项核验通过；精确候选
desktop镜像的真实Linux权限拒绝和tmpfs空间门槛、Worker解码、SQLite重开通过。
现有运行服务尚未替换，候选不是最终P5构建，更不是Windows实操或Release。
四项原改动字节及原有数据卷保持不变，无出版、真实云调用或用户数据清理。

P1退出仍缺问题照片/两失败MP4的精确来源、Windows工具URL校验恢复、WIN-01/02/08及
必需docs检查。按协议记blocked与active Debt，不完成、不提前启动P2–P5。
事实、身份、首次失败及恢复条件见
[P1工程Evidence](../evidence/runs/EVD-20261003-S3-RELIABLE-IMPORT-ENGINEERING.md)。

### 真实来源与错误可截图的局部优先事项

用户提供九个原片后恢复同一P1，真实来源工程导入/内容重复/幂等/正常Host重开通过，
七张JPG实际EXIF均为0，两段MP4完整解码通过。音频PTS有正负不连续，保留原始事实，
不将完整解码通过当严格采样或浏览播放通过。Windows连接仍失败，原片不注入UI代签。

用户随后优先要求简单修复错误停留：统一弹窗不自动关闭、Esc不关闭，手动关闭后
可从错误记录重看；上传失败保留原结果，启动失败不自动退出。该局部修改已工程验证
并更新本机两服务。停机返回143，正常输入flush未确认，须在后续恢复验收如实核对。
详见[错误可截图Evidence](../evidence/runs/EVD-20261003-S3-RELIABLE-ERROR-VISIBILITY.md)。
局部交付不完成P1或P2–P5，不提高真实实操、主观接受、Stage Exit/Release状态。

### 2026-10-04 作品列表删除局部修复

用户报告真实九项导入成功后，优先修复作品页缺少删除能力。复用原近期索引保存回收站标记，提供删除、取消、恢复与失败保留；原项目目录和原片保留。当前作品删除需实际输入保存确认、Host 关闭后再登记。真实 Host/SQLite 回归及隔离 Electron DOM 检查通过；用户导入成功反馈不自动视为完整 WIN-01/02/08 验收。该局部工作仍在同一 P1，后续阶段与主观接受不提升。工程与运行身份见 [作品回收站记录](../evidence/runs/EVD-20261004-S3-RELIABLE-PROJECT-TRASH.md)。

### 2026-10-04 继续原目标与用户纠正

用户明确指出当前删除/恢复是假的：现实现仅隐藏/恢复近期导航项，不能算真正作品删除。按用户要求延期到P4 UI整改统一解决；不继续扩展此局部功能，不用该回归宣称项目删除通过。新增Debt保留此问题、对象和退出条件。当前继续P1，首先修正实际保存确认超时后Host仍退出的已证实风险，再核对真实Windows导入/取消/重开验收。Edge连接本轮重新检查仍报nodeRepl.fetch失败，暂不把工具fixture写成真实操作。

### 2026-10-04 人工验收执行安排（当前有效）

用户确认实际页面为 `http://127.0.0.1:6080`，明确要求后续不再由Agent使用Windows操控工具验收；真实界面操作全部由用户执行。Agent继续实现、工程检查与必要修复，每次到人工门槛时提供前提、完整操作顺序、预期结果、失败反馈方式与当前构建身份。用户实际反馈通过后再记录对应步骤，未反馈保持待验；截图或网址确认本身不构成功能通过。该安排取代先前等待Windows工具URL校验恢复的执行方式，不降低真实验收标准，不把工程测试记为人工接受。既有记录支持human执行者，后续按实际执行记录建立身份与证据绑定；不预填pass、不绕过完成门槛。

本次恢复：保存关闭Web回归attempt03、typecheck attempt03、architecture attempt01均exit 0；两服务build attempt02成功，输入摘要为 `74d86a02e29a5d046bed198d80fe1fa7dece220ab7a27e01046a7c5abfb7ba0b`，启动日志显示两服务healthy。docs:check attempt01 exit 1，历史Evidence适用性与latest fingerprint门槛仍未解决。工程通过与健康不代替WIN-01/02/08；本记录不完成P1，不推进P2。

当前P1人工操作流程：

1. 准备独立验收作品，记录作品名和本次时间；保留已有作品。使用获准的七张问题照片、两段视频及可用独立音频。另准备可丢弃的损坏图片测试文件，不修改原片。页面保持上述本地地址。
2. 在作品页点“新建作品”，完成页面提示；进入“素材”，点“导入素材”，实际选择七张照片和两段视频。等批次结束，核对九项均已导入，名称、数量及照片方向正常；任何失败如实记录。该步对应WIN-01，完整视频播放与听音另归P2，不能提前视为通过。
3. 再选同一批原片，核对显示重复且素材总数不增加。追加独立音频，核对作为素材登记，没有被纯音频拒绝。
4. 分三个批次分别把损坏文件安排在首、中、尾，并包含有效素材。核对坏项失败原因保留、后续有效项继续处理、批次显示部分完成；成功项或重复项不得被撤销。若选择器无法控制顺序，记录实际顺序并反馈，不能声称首中尾已覆盖。
5. 点“仅重试失败项”，按实际选择提示给该失败项重新选择有效来源；核对只处理失败项，原成功项保留且数量不重复增长。随后另起可观察进度的批次，操作“停止剩余导入”；核对成功项保留、未执行项取消，批次不显示全部成功。若按钮不可用或导入太快无法操作，反馈待验，不算通过。另验证文件选择器取消后作品和既有素材不变。步骤3–5对应WIN-02。
6. 在对话输入区输入一段容易辨认但不发送的文字；等待现有保存反馈后刷新，核对文字、素材数量及批次结果可恢复。点“关闭作品”，通过近期作品重新打开，核对同样信息与问题记录。出现保存失败时页面应保留，并可查看错误、继续保存和重试关闭，不能自动丢失作品或输入。
7. 正常关闭作品并确认已保存后，在Docker Desktop仅对既有AVE两服务进行停止/启动，然后重新访问本地页面、打开同一作品，核对素材、输入与问题记录保持，成功项没有重复导入。不要删除容器数据卷、作品或原片，不操作其他项目服务。步骤6–7对应WIN-08正常恢复；受控保存失败/超时已经工程覆盖，本轮尚无对应人工故障证据，不用正常重开替代。
8. 反馈每一步通过、失败或未执行；失败附步骤号、操作、预期与实际、页面错误码，必要时截图。可直接报告“当前P1流程1–7通过”，但这仅记录所列实操范围，不替代高级能力、故事/审美/听感接受、独立复核、Stage Exit或Release。Agent负责整理正式记录，不要求用户填写仓库JSON或自行宣称机器门槛通过。

作品删除仍按用户要求留到P4 UI整改，此次流程不测试导航隐藏来代替真实删除。

### 2026-10-04 精简人工交接（取代上一节的全套人工执行流程）

用户要求Agent先做完可自动执行的验证，再给出合理的人工操作。已执行导入Storage与真实Worker Host回归，均exit 0：联合事务、故障注入、丢失提交确认、重复/名称身份、坏文件首中尾、仅重试失败、取消、数据库致命故障与重开。Renderer workbench边界检查exit 0，只证明代码边界，不证明浏览器交互。复用同一源码下已通过的Web保存拒绝/超时/迟到确认/继续输入/重试保存回归、typecheck与architecture，不要求用户重做这些工程故障矩阵。

已采集当前两服务完整运行身份，assertRuntimeBuildProvenance exit 0，核对构建输入、镜像内源码与编译输出/启动文件绑定；两服务healthy。相关新增日志为 `human-handoff-{storage,host,renderer,provenance}-attempt01.log`，运行清单为 `human-handoff-runtime-attempt01.json`，均位于 `docs/evidence/assets/reliable-import/`。本次没有改运行代码、重建镜像、重启服务或调用Windows工具。docs:check先前真实exit 1仍未修复；不更新旧Evidence、不宣称仓库全绿。

人工只做当前浏览器入口和显示/输入保存的最短实际链：打开已有九项作品核对列表与照片方向；选择其中一张原片再次导入，确认真实选择器、重复状态与数量不增加；再次打开选择器后取消，确认原作品保留；若有能观察进度的获准大文件，在独立验收作品测试“停止剩余导入”，确认按钮可用与成功项保留（无法触发则待验，不强迫构造大量素材）；在现有创作要求输入框键入单行、不发送，刷新与正常关闭/重开核对文字、素材和批次记录。用户只反馈各步骤实际结果，无需构造损坏文件、排序故障矩阵或操作Docker。

上述缩短的是人类重复操作量，不是完成标准。UI失败项恢复入口在实际遇到失败时还需确认；受控取消未执行时保持待验。本轮不要求P2尚未交付的完整视频播放/听音，也不把当前缩略预览替代完整播放。人工反馈记录实际范围；完整P1与机器验收绑定、必需docs检查、后续P2–P5仍未完成。

### 2026-10-04 P1人工通过与工程收口

用户明确回复“通过，继续”，并再次要求“以人工为准”。该反馈接受前一条五步人工流程：既有九项列表/照片方向、原生选择器重复识别、选择器取消、不发送输入刷新/关闭重开、停止剩余导入。来源消息和已验收产品输入/运行身份保存在 `p1-human-confirmation-20261004.json`；没有伪造录屏、逐步时间、主观听评或独立观察。人工结论是实际界面门槛的权威，工具连接失败不再作为未执行理由，不向用户重复索要同一验收。

按用户更改的执行方式，P1完成工具新增限定本包的human确认分支，仍实时核验产品输入、两服务运行文件与工程日志，拒绝缺确认、步骤缺失/失败、构建漂移、工程失败和其他包借用。原录屏路径及反例断言保留。allowed_paths只追加实现该用户验收变更必需的完成模块、对应反例测试、旧Renderer测试环境和本次真实复验后的适用性索引；产品运行代码未改。

首轮完整工程复验出现三个已定位问题：Stage2旧fixture没有browser window/DOM/modal对象；Stage3在注入失败的持久错误弹窗仍打开时测试背景焦点；本机Pillow 11.2.1不符合Worker固定12.3.0。前两项补齐实际测试环境与显式关闭错误提示动作，保留原断言及首次日志；第三项在临时隔离Python环境安装仓库现有固定依赖，不修改系统Python或依赖锁。对应专项修复后已通过，固定运行镜像的渲染正确性也通过。第二轮完整工程链正在复验，未将尚在运行写成通过。

完整复验成功后才建立新的scope证据/适用性关联并处理docs失败；不改写历史Evidence，不只同步生成文件伪绿。作品删除仍延期P4；P2及后续运行实现仍须在P1完成协议通过后启动。

2026-10-04 P1收尾：第二轮完整check下游70条命令逐项exit0；P1专项全部exit0，精确指纹acaf880251794df35c09b9be3d2dc1aa6e8ea58822b5f96e2bb7197160cff7e1。用户五步人工反馈为通过并以人工为准，新Evidence EVD-20261004-S3-RELIABLE-IMPORT-HUMAN-CLOSEOUT绑定产品构建与原始消息。先运行docs同步/检查/完成，再启动P2；不追溯历史未发送文本，真实删除仍P4。


### 2026-10-04 P2 implementation and engineering validation

P1 completion and generated current state were verified before starting P2 with docs:start. Existing uncommitted work and protected packaging files remain intact. The active package now implements Worker full H264/AAC/PNG browsing, exact source/output fingerprints, project-session and caller-bound opaque references, real Range/HEAD, revocation and producer/handle cleanup. Host records preparing/ready/conversion/waveform/playback failures in existing object_refs; no schema migration. Browsing waveform is independent and cannot supply precision coordinates. readMediaAnalysis keeps strict sample semantics; the previous Host method/query remain strict compatibility entry points for existing precision consumers. No browsing derivative enters soundtrack measurements or Master.

Clicking material opens the central source player with real controls, image zoom/reset and return-to-work. The watched work's existing decoded player remains paused with its version/position/volume, and resumes only when that same player was previously playing. Closing materials, changing source/project or returning to work cancels/releases the previous operation; late results do not revive it. Browser streams are authenticated against the real session. The default Electron protocol lacks a trusted sender ID, so native source streaming currently requires the sole registered window and a trusted initiatorOrigin; multiple native windows fail closed. This restriction is explicit, not claimed as verified native multi-window support.

Engineering tests have already verified actual 18-second encoded tails, image transparency/EXIF 0, silent-video classification, controlled waveform failure without audio disappearance, real AAC internal gap still failing MEDIA_SAMPLE_AUDIO_GAP, late-delivery cancellation, unopened-handle cleanup, concurrent release, foreign owner, source replacement and reopen. The earlier gap test used Matroska with missing exact stream bounds and correctly failed CREATION_MEDIA_BOUNDS_REQUIRED; it was replaced with a timestamp-preserving AAC gap fixture to exercise the intended strict-gap boundary. The first Windows output check exposed handle/path dev-ID differences; it now follows the existing inode-based Windows identity rule, retaining hash, size and timestamps. Neither failure justified loosening strict sampling. Full validation and build identity follow; actual WIN-01/03/08 remain unrun and require fresh human feedback on the final product build.

### 2026-10-04 P2工程收口与真实边界

最终源码指纹b1dd501fe5d4efeb4f1c42b31dec1f3b72b0bed128ee4c03819574aa3d687037。完整check下游70条与P2专项14条逐项exit0，结束指纹一致，逐命令日志哈希已核验；首次失败与对应修复日志保留。新镜像九份既有素材全量转换/解码通过，两视频完整37.967秒和32.856秒且有音轨，严格MEDIA_SAMPLE_AUDIO_GAP失败仍保留。新镜像842个来源/700个运行输出逐项核验通过；工程通过不替代实际播放听音。

旧运行Host在SIGTERM更新准备时因DESKTOP_INPUT_SAVE_TIMEOUT拒绝关闭，项目和Node保留；停止脚本一并结束YAMNet，已以原1000:1000用户和同一模型/端口恢复，并实测health。未强制关闭或替换服务，既有容器ID和数据卷保留，其他新出现的无关服务未操作。等待用户正常保存并关闭页面后继续安全更新两服务、核验最终运行身份，再交接WIN-01/03/08。工程Evidence EVD-20261004-S3-RELIABLE-PREVIEW-ENGINEERING为passed；包及人工Evidence EVD-20261004-S3-RELIABLE-PREVIEW-HUMAN-PENDING为blocked并登记active Debt，不执行docs:complete，不推进P3。无提交/推送/合并/发布。

P2文档收尾首次docs:check因已完成P1人工记录与P2当前源码不同而拒绝，原日志closeout-docs-check-attempt01.log保留。修正限定completed/accepted包的static校验只审计已接受历史构建，保留记录SHA、原运行manifest、来源/输出摘要、确认和工程日志检查；增加Evidence header与记录构建指纹匹配。live包完成与未完成包static仍验证当前构建，反例继续拒绝漂移和历史篡改。修复后最终指纹f7a992b62faa590b4c17ba90e538027ca2d7911bbbe21ca857eb97a434ca889d；产品构建输入0fa8b7bdfc5850c3d47d5cb779422a4d2aacf3e590f06d736b9787a4ebaa5b9b不变，编译镜像来源/输出逐项再次核验通过。完整工程链重新复验，最终结论由后续账本和docs检查给出。

P2最终收尾：full-ledger-attempt03.json全部70条exit0；focused-ledger-attempt04.json全部14条exit0，开始/结束最终指纹一致。docs:sync、docs:check、docs:sync -- --check最终均exit0，git diff --check exit0。工程Evidence和适用性关联只在最终完整复验通过后更新。P2包blocked、人工Debt active、无active工作包；正常保存关闭页面这一阻塞解除后，先将P2恢复ready并docs:start，再执行安全两服务更新及真实运行身份核验，交接新构建人工流程。禁止直接跳过保存保护、借P1历史确认完成P2或提前推进P3。

### 2026-10-04 P2运行更新交接

用户回复“已关闭”后恢复P2并docs:start；旧desktop在SIGTERM后自行退出，未强制终止。只以原compose.yaml及GPU override执行两服务up -d --no-build，实际来源/运行编译文件、两镜像、原五个数据卷、材料/导出绑定、GPU设备及所有无关容器ID核验通过。源码指纹f7a992b62faa590b4c17ba90e538027ca2d7911bbbe21ca857eb97a434ca889d和构建输入不变；运行摘要377e4b003b7eaceadafdf6efb1c989b6b3e6ab73cb7312c83a6b50a7aca31a99。先前旧服务保留结论成为历史，当前已运行P2。

EVD-20261004-S3-RELIABLE-PREVIEW-RUNTIME-HANDOFF和p2-human-handoff.json绑定最终运行身份；人工WIN-01/03/08仍not-run，用户“已关闭”不当作播放通过。P2包再次blocked，只待新的五步人工反馈，不执行docs:complete或推进P3。工程完整回归和专项源码未变，无必要重复执行。

### 2026-10-04新旧边界与Docker同步

用户明确要求物理移除旧实现并同步容器。git fetch后HEAD与origin/main均13a3ce0，ahead/behind 0/0，无待合并PR；最新实施是当前未提交P0–P2改动，不能reset成远端旧基线。旧readMediaPreview及project.media.preview物理移除，当前严格入口readMediaAnalysis/project.media.analysis与当前完整浏览project.media.browse按用途区分；精修与测试调用方同期迁移，反例验证旧查询UNKNOWN_QUERY且旧Host方法不存在。新ADR-0042保留ADR-0041历史内容并替代其保留别名限制。用户截图中的真实取消/Worker失败仍未修复，工程同步不宣称视频可用；本次先完成无兼容源码与两服务运行一致性。

两服务已从唯一现行源码重建并替换，构建输入ba427d274eec95d34774e41a039f5dad98bccf772574a9cb7638e796ce873bdd，最终代码指纹b4c1aa53345061be973fc72daf95ae58692fad65fc9ab3c891ea25589bfcb99a。实际运行文件及新容器内旧入口缺失均核验通过。旧两个容器已移除，五个AVE数据卷、材料/导出绑定、GPU配置及六个无关容器保留；全部22个原卷名称仍在。四个确认的旧AVE镜像ID首次盘点时已不存在，当前再次确认无引用且不存在，未执行额外镜像删除或广泛清理。细节见no-alias-preservation.json、no-alias-current-runtime.json和no-alias-running-removal.log。

P2继续受真实视频失败阻塞：取消旧浏览未排空时即开始新请求，共享Worker取消宽限终止可杀掉新任务。这次入口替换和容器同步没有修复该生命周期问题，也没有新的播放/听音人工通过。最终工程账本及阻塞结论另建EVD-20261004-S3-RELIABLE-PREVIEW-CURRENT-ONLY，保留全部历史Evidence，不执行docs:complete或推进P3。

### 2026-10-04取消竞态修复并直接换容器

用户指定暂不检测，修完直接重建容器供本人看，无必须不跑全量。Renderer等待旧release，Worker在取消排空期间暂停新派发，正常任务并发与终止失败保护保留；两个现行文件直接修改，没有另接视频脚本或恢复旧别名。两服务构建及原Compose/GPU override替换已完成，输入d65b2e11bc38aaedb1e46239b705e3a0690811cea673a4182e80b1c621ddca85。本轮所有检测not-run，P2实际播放待用户反馈，工程状态退为implemented，不把上一版本测试当本轮通过。详见EVD-20261004-S3-RELIABLE-PREVIEW-CANCEL-FIX。等待反馈期间不跳过P2验收推进依赖包；用户通过后继续既有P3/P4/P5顺序。

### 2026-10-04交互参考与P3只读准备

用户指定苹果设计理念和接近苹果官网的颜色保持，剪映仅参考交互。已同步现有UX权威及P4边界，未复制剪映主题、改变产品路径或操作用户剪映项目。当前P2新容器尚待播放反馈，未据“继续任务”猜测人工播放通过，未启动依赖它的P3。等待反馈期间只读审计发现：error-dialog.js的Map仅在当前页面存活，刷新/重开不可回看；creationErrorResult对未映射媒体/Worker错误使用笼统状态/授权提示；Host已有素材浏览审计读取而全局错误入口尚未接入。这些是P3真实问题持久化、对象/恢复说明的实际接入点，不能仅以弹窗样式替代。按用户先前要求本轮未运行检测或重建容器。

本次独立文档事实：[EVD-20261004-DOC-007-INTERACTION-REFERENCE](../evidence/runs/EVD-20261004-DOC-007-INTERACTION-REFERENCE.md)。

### 2026-10-04 P2人工审核通过

用户明确“人工审核通过，继续”。当前P2流程整体人工接受；按其此前指令本轮机器检测延期，不改写旧测试、不虚构录屏/消息ID/逐步时间。已按实际产品输入和两服务运行身份登记[EVD-20261004-S3-RELIABLE-PREVIEW-HUMAN-CLOSEOUT](../evidence/runs/EVD-20261004-S3-RELIABLE-PREVIEW-HUMAN-CLOSEOUT.md)，经完成协议收口后进入P3。苹果视觉、剪映仅交互参考保持。

### 2026-10-04 P3实施与容器交接

P2已按用户“人工审核通过，继续”完成，随后docs:start启动P3。沿现有Host对象存储添加问题不可变修订和当前成片导出回执，Renderer恢复问题历史、显示确认输入修订及真实任务终态；网页导出只报告下载发起，不假定系统保存。现有业务表九行（含档案学习）全范围保留，不以本轮局部实施或P2通过替代完整C1–C9、WIN-04至09。两服务已从输入f3303656d8c9ea4b6ad8818b83630e06306701d6ea13b5428bd85cdecfcbd859重建替换，原数据挂载和无关容器保留。按用户要求机器检测、云调用与实际操作未运行；构建内编译和合同生成只证明打包。本轮capability implemented、acceptance/package blocked，等待新构建人工流程，未推进P4。详见[EVD-20261004-S3-RELIABLE-JOURNEY-IMPLEMENTATION](../evidence/runs/EVD-20261004-S3-RELIABLE-JOURNEY-IMPLEMENTATION.md)。

### 2026-10-04 P3代理测试、实际缺陷与复验

用户进一步明确“你来做这个p3的测试”，本轮启动P3后执行十二组必要/相关工程检查，均exit0，保留首次失败与修复后日志。真实界面发现saveUi整体刷新重入表单scope同步导致Maximum call stack size exceeded；修为仅刷新保存状态，不另接持久链。后续实际取消又发现REQUEST_CANCELLED迟到响应被Renderer重复报告为失败；现有API/workbench精确识别创作取消/撤销/取代控制结果，保持ok:false与真实终态，真失败仍报告。增加取消不追加问题的动态断言，现行Electron/Host/Web检查与实际取消终态复验通过。

隔离项目68c71d0d-97ae-46f5-8728-082fb3df96fb实际导入自制PNG/MP4，视频解码播放至末尾；既有配置模型生成4秒v1，手工改为5秒v2并编码/QC，双版本真实比较、采用与观看分离。当前v2下导出旧v1，浏览器实际文件AVE-v1 (1).mp4为4秒，hash与Host完全一致且完整解码。制作中未发送输入确认保存，显式取消不抢旧播放；取消前已提交字幕v3，不虚构回滚。确认文本、素材、版本、采用与问题历史经正常关闭、两服务重启及最终替换后恢复。数据挂载与六个无关服务保持；重启时曾以错误顺序先启动共享Desktop网络的Whisper而被Docker拒绝，已用既有Compose正确恢复，原失败保留。历史取消误报明确解决而未删除。

最终运行产品输入7978849a45263788e5c936b71327f04107a7c9459295d2e75bdf4b54f2816da6，详见[EVD-20261004-S3-RELIABLE-JOURNEY-TESTING](../evidence/runs/EVD-20261004-S3-RELIABLE-JOURNEY-TESTING.md)。docs:sync通过，docs:check仍有历史全局能力Evidence适用性不匹配，不凭局部检查改历史指纹。完整混合素材C1–C9、公开多镜头保护/语言续改/撤销重做、实际音频试听署名与隔离学习留出、多故障公开恢复仍未接受；工程fixture结果与本次有界公开实操分开。P3继续blocked，不执行docs:complete，不提前推进P4；原片/用户作品/档案未改，未跑无关全量、未提交/推送/合并/发布。

## 2026-10-04 独立永久删除交付

用户授权先实现真实删除、旧接口物理移除并同步容器，不跑全量。WP-S3-PROJECT-DELETE-001 局部实现已交付：Host 专属目录物理清理、持久删除意图和失败重试；Windows 专项、类型检查、架构边界和 Renderer 检查通过，最终容器编译 Host 的临时项目删除通过。仅AVE既有两服务重建，全部卷挂载和六个无关容器身份保持，8个近期作品保留。P3完整旅程和P4整体设计不随之通过；全局历史 Evidence 适用性失配仍阻塞文档工程门。证据 EVD-20261004-S3-PROJECT-DELETE-DELIVERY。

### 2026-10-05 P3重新审查与交互记录

用户要求先记录再审查，最终交付可正常使用的 P3 收尾及合入 P4 的视觉整改计划。剪映独立测试草稿实操已完成并按实际范围记录，未改用户原草稿。颜色不动、Apple 简约逻辑保持。当前 P3 已 docs:start；已有未提交变更与用户数据保留。

只读审查证实：开始制作的必需素材/授权折叠且默认空，提交缺项经通用错误入口升级为持久模态问题；仅授权 request 仍不足以完成后续自动链。另需核验首次渲染失败的直接重试，以及手动保存后的待制作反馈。修复按真实调用边界进行，不静默授权、不吞根因、不把界面演示算完整 P3 通过。当前尚未完成本轮修复与复验，P3 不收口、不推进 P4。

### 2026-10-05 P3继续验收结果

当前构建的入口字段验证、显式授权、手动版本待制作提示和首次QC失败重试已实施，十组相关工程检查通过。Edge文件URL权限由用户手动开启后，独立作品三份自制素材经公开上传3/3完成，空入口只显示本地具体缺项；制作中输入可保存。实际混合尺寸首稿及原画幅纠正均失败：视频96x64、图片320x180，两个模型输出都按要求reframe:null，但Host现行路线要求不同尺寸画面全部统一竖屏构图。不得把这项执行限制归因于模型忽略要求，也不得用静默改为竖屏掩盖。

明确第三版要求统一9:16 contain后，8秒三镜头v1可播放；公开保护精修得到9秒v2、独立比较/采用、撤销v3/重做v4及固定v1导出已核验。Host实际Master含H.264/AAC且完整解码通过；浏览器下载仍停留同hash的crdownload，保存完成未确认。原失败在无关成功后仍可回看，未提交中文输入与历史继续保持。详细记录与材料见[EVD-20261005-S3-RELIABLE-JOURNEY-RESUME](../evidence/runs/EVD-20261005-S3-RELIABLE-JOURNEY-RESUME.md)。

P3继续blocked及active Debt：混合画幅契约与模型请求/用户恢复提示需要统一，公开浏览器下载终态、真实听音/署名/隔离学习留出及完整故障链未接受，全局历史Evidence适用性仍有缺口。现行P3规范限制不得改变模型/渲染主链，调整这一执行路线须显式扩展其包边界并验证相关真实链路，不以P4视觉整改代替功能修复。P4现有计划继续保持颜色冻结、Apple简约、剪映交互/排版参考；补充“保存后直接显露制作入口、明确区分已保存/正在制作/可播放”和“隐藏inert侧栏不应暴露为可操作控件”的交互审查事项。未推进P4或完成P3，未提交/推送/合并/发布。


### 2026-10-05 正常服务续验及用户调整

用户确认真实下载和试听已完成，须选择保存/另存为；此项改为人工通过，历史待保存观察保留。用户要求停止隔离，只用现有6080服务。新增验收服务已全部停止，保留失败日志与数据。独立端口与固定测试端口冲突、Windows挂载fchmod失败及共享Cookie失效均属于本轮操作/环境问题，未计为验收通过。

现有6080作品实际学习一次、查询登记、单次例外及刷新保留通过，作品仍v4；测试学习已明确停用，经验保留未永久撤回。取消撤回出现DESKTOP_AUTHORIZATION_CANCELLED持久问题：Renderer API只排除project.creation.*控制结果，profile操作误报，Host未删除经验。新素材留出、实际永久撤回及完整公开故障恢复尚未完成，不用工程fixture替代。混合画幅与取消误报仍为P3功能阻塞，P4颜色冻结及交互/排版范围不变。详见[EVD-20261005-S3-RELIABLE-JOURNEY-DIRECT](../evidence/runs/EVD-20261005-S3-RELIABLE-JOURNEY-DIRECT.md)。

### 2026-10-05 P3收尾修复交付

用户授权执行收尾后，混合尺寸采用首个画面原生画布及等比留边，取消控制结果不再误报问题，档案范围缺项改为提交前原位必填校验。最终两服务已交付原6080端口，全部卷和无关容器保留，颜色未改。实际新视频加图片生成128×72、5秒首稿；不可变决策明确应用之前学习的3秒图片原则，完整播放通过。旧作品采用版本与输入保留。

公开本地渲染活动中断Worker后Host恢复制作、双QC通过，云调用总数不变。Host异常退出后，发现只启动desktop不能恢复共享网络中的Whisper；重启Whisper后公开重开v1–v4和中文输入保留。恢复需操作两个服务，不能把running当作可用。专项和Stage3工程检查通过；实际永久遗忘停在当次确认窗口，公开音乐署名导出未覆盖，28项历史文档适用性仍阻塞。P3不伪完成，P4不提前推进。详见[EVD-20261005-S3-RELIABLE-JOURNEY-CLOSEOUT](../evidence/runs/EVD-20261005-S3-RELIABLE-JOURNEY-CLOSEOUT.md)。

用户随后回复“确认”：正常6080公开执行仅1条测试经验的遗忘。刷新和Host档案只读验证证实原则为0、来源/事件/原则精确排除，学习仍停用；来源作品v0–v4及3项素材、当前新作品v4和未提交中文输入保留。永久遗忘验收通过，不再待确认。剩余为音乐署名完整公开导出及最终27项历史文档适用性，P3继续blocked。详见[EVD-20261005-S3-RELIABLE-JOURNEY-FORGET](../evidence/runs/EVD-20261005-S3-RELIABLE-JOURNEY-FORGET.md)。

### 2026-10-05 P3音乐署名续验与修复准备
原6080自建作品实际自动配乐首稿v5漏图仅2秒；公开纠正后v6含2秒视频、3秒图片、5秒配乐，双QC及实际完整播放通过。Host导出三份文件且完整解码通过，浏览器仅确认清单保存，音乐试听与其他两份文件保存仍待确认。用户批准扩展stage3-creative.ts和对应测试，已修复总长识别及试听取消AUDIO code丢失，相关源码与真实Renderer工程检查通过。新两服务镜像已构建，运行仍旧镜像；已请求保存关闭后同步授权，不打断仍有输入冲突的页面。P3仍blocked，不推进P4，详见EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-PREPARED。
# 2026-10-05 P3 音乐运行续验

用户允许同步，并授权浏览器entry及对应下载测试扩展。已同步两服务及验证最终来源/产物身份，数据挂载与无关容器保持。真实公开工作台原v6完整播放5秒，Champ de tournesol试听15秒播放到结尾；取消不新增失败弹窗。发现自动三下载只保存音频清单，已改成保留独立下载入口；三个文件实际保存并与Host哈希一致，MP4完整解码通过。回归及typecheck/contracts/web-host/renderer检查通过。最新证据EVD-20261005-S3-RELIABLE-JOURNEY-MUSIC-RUNTIME。docs:sync通过，docs:check仍28项历史适用性失配，无P3当前匹配或生成漂移错误。人工听感、修复后原请求新云首稿及已记录陈旧说明未接受，P3保持blocked，不执行docs:complete伪造完成，不推进P4/Stage Exit/Release。
# 2026-10-05 P3 人工确认及 P4 接续

用户明确“人工通过，应该进入p4了吧”，当前产品构建及运行镜像核对未变，人工接受登记于EVD-20261005-S3-RELIABLE-JOURNEY-HUMAN-CONFIRMED。P4应接续本计划视觉/交互范围。正式P3关闭工具仅支持P1/P2人工确认，已请求将human-import-acceptance.mjs及对应测试纳入P3；授权未回复时保留包blocked，不伪造记录或提前标P4 active。历史28项docs适用性问题独立保留。
