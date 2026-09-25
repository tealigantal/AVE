# Stage3 候选工作单与依赖

2026-09-18 首批实施登记：[WP-S3-INTEGRATION-001](../../program/creative-assistant-stage3/work-packages/WP-S3-INTEGRATION-001.md)
实施期间只允许该单一 active package；已配置 Qwen 凭据和本地 Whisper。当前阻塞是听音语义质量：修复提示角色后，两种真实 Qwen 模型均在开发对照中虚构静音事件、遗漏已知声音变化；真实创作验收尚未完成。执行记录见
[本次 ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md)。候选的完整能力范围不因此标记完成；下文保留候选规划基线，当前写入授权以正式 manifest 为准。

所属 Work Order 层，由 [07 Work Orders](../../07-work-orders/README.md) 导航。现有 documentation-expansion 工作单属于早期设计/Stage2 衔接，不能用其已完成状态授权本阶段，故此处单独保存未启动候选。产品范围只由 [Stage3 总计划](../../product-intelligence/STAGE3_PLAN.md) 定义，字段语义引用 [对象模型](../../intelligence/OBJECT_MODEL.md)、[运行时](../../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md)、[ADR-0028](../../decisions/ADR-0028-stage3-request-drafts-and-local-profile.md)。

所有候选：**Lifecycle: draft / not promoted**；Owner: 后续实施的根 Coding Agent，唯一共享源代码写入者；Last reviewed: 2026-09-14。下列 S3 编号仅候选标识，不伪造正式 WP/Capability/Acceptance 状态。每包的“允许”是未来 promotion 提案，不授权本轮修改这些路径。

## 共同合同、范围与登记

共同输入基线：本地 `1434d0060a23b321fb43290f48f71e348979cf79` 的 CreativeContractV2、StoryProposalV2/ApprovedStoryPlanV2、CommandEditIntent/CommandEditIR、当前项目 format v2、worker-media@v5、ave-worker-host-r15。前几项需替换时 S3-01 定稿唯一当前身份，后续包固定对应提交/生成物 digest，而不使用“latest”。新增 RequestAuthorization/IntentRevision/FeedbackObservation/EditingPrinciple/ProfileSnapshot/DraftVersion 是逻辑设计名，正式 `$id`/版本在 S3-01 首步登记，同步 examples/生成器输出/调用方；不并存旧接口。

公共允许范围 P（仅有关字段/用例）：`contracts/schemas/editorial/**`、`contracts/schemas/project/**`（已核对存在）、`contracts/examples/**`、`contracts/generated/**`（仅生成）、`packages/platform/contract-runtime/src/**`、`packages/platform/project-api/src/**`、`packages/platform/project-host/src/**`、`packages/platform/project-storage/src/**`。共享 P 的写入按包串行，由唯一 owner 处理；不是所有包任意重写公共文件。每包新增测试仅下述命名路径；同时允许下列明确现有消费者测试同步切换。`package.json` 仅允许登记对应测试脚本，不改依赖。`database/project-format-v2.sql` 的相关表若必须改变格式语义，由 S3-01 同步项目唯一当前格式/创建/open/存储测试，保留旧用户数据并在非当前写入前拒绝；不能藏迁移。新增用户库 baseline 属于 S3-03 的 user-profile-store。

共同文档允许 D：本目录、`docs/product-intelligence/STAGE3_PLAN.md`、各包下列所拥有设计文件、新包对应 `docs/plans/*stage3*.md`、`docs/evidence/runs/EVD-*S3-*.md`。未来 programme 登记允许 `docs/program/PROGRAM_REGISTRY.yaml` 和选定 programme 的 manifest/state/matrices/该包文档；generated current/index 只由 sync 生成。不得改历史 ADR/完成包/Evidence，不修改许可证、依赖、CI、云平台、Marketplace、自动发布或无关工具家族。工具无法登记就另立工具范围，本轮没有此授权。

每包 implementation 前必须把 P 的共享子目录收窄到该包实际文件、确定唯一正式 ID 和命令，并进入 programme；代码事实优先于候选对当前能力的推断，差异应在开工前记录。必要超路径变更停止并修改正式允许范围，不能默默扩包。所有执行边界保留 Host 唯一项目写入、RationalTime/PTS、CommandEditIR/CommitPlan、Semantic Render Manifest 和各 target Graph/Plan。

### 现有消费者测试允许范围（未来提案）

| 包 | 同步切换的现有测试 |
| --- | --- |
| S3-01 | `tests/property/permission-matrix.test.ts`、`tests/integration/permission-matrix-host.test.ts`、`tests/integration/permission-matrix-storage.test.mjs`、`tests/integration/project-recovery.test.mjs`、`tests/integration/project-storage.test.mjs`、`tests/integration/creative-context-host.test.ts`、`tests/architecture/ipc-sender.test.ts` |
| S3-02 | `tests/property/feedback-diagnosis.test.ts`、`tests/integration/feedback-revision-host.test.ts`、`tests/integration/feedback-revision-storage.test.mjs` |
| S3-03 | `tests/property/creative-context.test.ts`、`tests/integration/creative-context-host.test.ts`、`tests/integration/creative-context-storage.test.mjs` |
| S3-04 | `tests/property/intelligence-edit-adapter.test.ts`、`tests/integration/intelligence-pipeline-host.test.ts`、`tests/integration/model-gateway.test.ts`、`tests/integration/model-candidate-host.test.ts`、`tests/property/story-approval.test.ts`、`tests/integration/story-host.test.ts`、`tests/property/story-intelligence.test.ts`、`tests/integration/story-intelligence-host.test.ts`、`tests/integration/story-intelligence-storage.test.mjs`、`tests/integration/timeline-audio-caption.test.ts`、`tests/integration/timeline-render.test.ts`、`tests/integration/feedback-revision-host.test.ts`、`apps/worker-host/tests/render_graph_media_correctness.py` |
| S3-05 | `tests/architecture/renderer-workbench.mjs`、`tests/property/stage2-workspace.test.mjs`、`tests/integration/stage2-product-workspace.test.ts`、`tests/integration/stage2-product-actions.test.ts`、`tests/integration/desktop-workbench-host.test.ts`、`tests/integration/electron-runtime.test.mjs` |

合同替换的依赖检索若找到此表外实际消费者，必须在 promotion 时穷尽追加到正式允许范围，不跳过测试或只改断言使其绿；本轮不执行这些未来改动。

## S3-01 — 请求到持久草稿、制作中修订

**目标/用户成果**：一次制作授权能保存可撤回草稿；制作中插话/取消/手动变更不被旧任务覆盖。无模型也能用显式 Fixture 验证控制链，Fixture 不声称完整 AI 初稿。

**允许**：P、D；`packages/features/permission-enforcement/src/**`、`packages/core/editorial-core/src/**`、`packages/platform/job-engine/src/**`；`apps/desktop/src/main/ipc/**`、`apps/desktop/src/main/composition-root.ts`、`apps/desktop/src/preload/**`（仅请求可信通道）；`tests/property/stage3-request.test.ts`、`tests/integration/stage3-request-host.test.ts`、`tests/integration/stage3-draft-storage.test.mjs`。文档：对象模型、运行时、权限、review approval、稳定架构对应切换说明。

**输入→输出**：可信用户请求/素材/精确模型部署与发送范围/保护 + 当前 Timeline → Host-owned Authorization/IntentRevision、草稿 parent/base、采用/播放独立指针及 run/job 关联。持久化载入验证唯一当前合同，原文不可变。幂等 identity=request/revision/base/effect digest；权限和 cancellation generation 提交前再核对。

**依赖/步骤/替换**：无其他 S3 代码前置。先定共同字段和唯一 Schema 身份，再替换逐 Story/Edit 审批及对应调用入口；随后草稿原子存储、提交锁内修订检查、取消/重开。不能用自动创建旧 human approval 暂代请求授权。

**测试/产物/停止**：C1 控制链与 C2 全竞态、版本采用和重复请求、撤销、崩溃后旧任务；denied/stale/cancelled 无错误 Timeline/event 提交，允许独立 append-only 失败诊断。执行既有 `pnpm run permission-matrix:test`、`pnpm run project-recovery:test`、`pnpm run contracts:check` 和新增上述测试。缺必要权限或可用模型配置阻断该请求，不能扩大授权；按 ADR-0029 不设产品层数据/费用上限。完成产物为 exact-head 技术 Evidence 和可重开的草稿，不代表 Stage3 已验收。

## S3-02 — 感受和编辑信号到可纠正原则

**目标/用户成果**：用户说“不要煽情结尾”可定位原因并变成素材适用剪法；“只删那句话”立即纠正理解，保留原话和反例。

**允许**：P、D；`packages/features/feedback/src/**`、`packages/features/edit-intent-generation/src/**`、`packages/core/editorial-core/src/**`、`packages/platform/model-gateway/src/**`（仅 typed feedback 请求/响应）；`tests/property/stage3-feedback.test.ts`、`tests/integration/stage3-feedback-host.test.ts`。文档：feedback pipeline、editing reasoning、creator model、user profile 的信号归因部分。

**输入→输出**：S3-01 原话/版本选择、当前素材证据、manual diff、保护/意图快照 → FeedbackObservation、项目级 EditingPrinciple、候选修改范围与保留条件、获准学习事件。保留 explicit 与 hypothesis 来源区别。模型返回整个 typed response 在边界验证；操作模板不能代替感受理解。

**依赖/步骤/替换**：共同字段依赖 S3-01；纯逻辑可先与 S3-03/04 并行设计。替换 pacing-only/预先要求精确 proposed_source 的诊断入口；先真实实例锚定，再归因/原则，最后向 S3-04 送多镜头视听计划。当前一次反馈不能自动变长期 confirmed。

**测试/产物/停止**：C3 原例与纠正、歧义范围、反例、质量修复不学成偏好、敏感身份禁止、原话持久化重开。既有 `pnpm run feedback-revision:test` 加新增测试；模型语义效果以 C3 真实响应/作品/人审验证，Fixture 只验证边界。无法定位真实例子且会导致不同作品时询问，不能编造片段。产物进入 S3-03/04 联调。

## S3-03 — 本地档案、授权学习与遗忘

**目标/用户成果**：一次开启指定历史/参考学习后，新项目可用情境化经验，并能例外、纠正、排除和真正遗忘。

**允许**：P、D；新 `packages/platform/user-profile-store/**`（同一 SQLite 依赖，无新增第三方依赖）、`packages/features/feedback/src/**`（学习事件接口）、`apps/desktop/src/main/composition-root.ts`、`apps/desktop/src/main/project-session-manager.ts`；`tests/property/stage3-profile.test.ts`、`tests/integration/stage3-profile-storage.test.mjs`、`tests/integration/stage3-profile-host.test.ts`。文档：memory、profile、product learning、稳定架构所有权。

**输入→输出**：S3-01 consent/revocation 和 S3-02 观察，现有项目 Decision/Timeline 历史 → 单一 Profile Repository 的版本记录/来源排除/derived index，以及 Host 固定 ProfileSnapshot。项目记忆查询旧记录而不复制另一项目数据库。学习写入键 project/event/digest；用户级写锁与跨库失效依 ADR-0028；最终使用/提交与删除按同一短队列线性化，固定授权协调 → 项目锁顺序。

**依赖/步骤/替换**：S3-01 后可先做授权/存储/删除，与 S3-02 原则提取并行；自动归纳联调需 S3-02 真输出。首批同时覆盖跨项目，不以 project-only 为阶段终点。不读供应商隐藏记忆，不训练模型。

**测试/产物/停止**：C6 历史训练/留出项目隔离、旅行/演出/日常、早期假设、关闭/首次/成功无匹配，DB/索引/版本错误及删除中断；删除覆盖摘要/索引/缓存，旧任务和历史快照不能复活。执行新增测试以及 `pnpm run creative-context:test`；必要真实源缺失仅标真实项待验，不假 confirmed。产物为授权快照、删除清单及下一项目真实差异 Evidence。

## S3-04 — 完整模型初稿与多镜头视听编辑

**目标/用户成果**：真实模型综合素材和原则直接产完整片；语言和手动差异共同进入选材/结构/节奏/字幕/声音/必要画面处理，满意部分稳定。

**允许**：P、D；`packages/features/story-planning/src/**`、`packages/features/edit-intent-generation/src/**`、`packages/features/feedback/src/**`、`packages/features/evidence-building/src/**`、`packages/features/material-sufficiency/src/**`、`packages/features/reference-analysis/src/**`、`packages/core/edit-ir/src/**`、`packages/core/editorial-core/src/**`、`packages/core/timeline-core/src/**`、`packages/core/render-graph/src/**`、`packages/platform/model-gateway/src/**`、`packages/platform/render-service/src/**`、`packages/platform/worker-client/src/**`、`apps/worker-host/src/**`（仅声明视听子集）；相关 `contracts/schemas/timeline/**`、`contracts/schemas/render/**`、`contracts/schemas/worker/**`（均已核对存在）；`tests/property/stage3-edit.test.ts`、`tests/integration/stage3-creative-host.test.ts`、`tests/integration/stage3-media-real.test.ts`、`apps/worker-host/tests/stage3_media_smoke.py`。文档：story、material understanding、plan-to-Timeline、runtime、quality pipeline、对应当前执行规范。

**输入→输出**：request revision/base、获准 Evidence、S3-02 principles、S3-03 snapshot、模型部署与发送范围 → Gateway 真实模型计划/响应诊断 → Host semantic 编译/CommandEditIR/CommitPlan → 真实 Timeline、Preview/Master/QC、实际成本。无档案正常模式可先联通，完整完成必须含 S3-02/03 消费。

**依赖/步骤/替换**：S3-01 后接通 cold-start 模型；与 S3-02/03 并行，集成时消费同一合同。替换 Host 固定模板/等长换序、selection-only/单 trim 和不支持 output 精修的 lineage 前提；所需操作穷尽见 [Plan-to-Timeline](../../pipeline/CREATIVE_PLAN_TO_TIMELINE_PIPELINE.md)。补齐中移动镜头必须同步声字幕，保护检查覆盖所有联动。模型只是候选，不可发任意代码/Command。

**测试/产物/停止**：C1–C5、C8–C9：同素材目标反转的实际差异、句音完整、保护、无非法项过滤、调用记录及取消、RationalTime 边界/重开/渲染一致。既有 `pnpm run intelligence-pipeline:test`、`pnpm run timeline:audio-caption:test`、`pnpm run model-gateway:test`、`pnpm run contracts:check`、新增真实媒体脚本。缺原片/模型费用授权不能跑真实项；unsupported 必需子集不得降级或延期，应在本包范围补齐后验收。

## S3-05 — 已认可工作台接入日常项目

**目标/用户成果**：从作品列表创建/打开，直接制作、看片插话/精修、版本比较/组合、退出重开到真实导出，保持指定设计。

**允许**：P、D；`apps/desktop/src/renderer/**`、`apps/desktop/src/preload/**`、`apps/desktop/src/main/ipc/**`、`apps/desktop/src/main/project-lifecycle.ts`、`apps/desktop/src/main/project-session-manager.ts`、`apps/desktop/src/main/stage2-timeline.ts`、`apps/desktop/src/main/protocol-handler.ts`；`tests/integration/stage3-desktop.test.ts`、`tests/property/stage3-workspace.test.mjs`。文档：workspace、AI interaction、review、product journeys；原件参考仅新增原字节，不改原件。

**输入→输出**：用户选定的精确设计原件 + S3-01 workspace/versions + S3-03 控制入口 + S3-04 real outputs → 白名单 API 驱动的日常应用，不能用浏览器存储、示例媒体或模拟下载作为正式结果。

**依赖/步骤/替换**：S3-01 共同对象后可并行页面接入；实际生成依赖 S3-04，档案入口依赖 S3-03。先验证原件摘要并浏览器逐页检查，保留布局/文案/动效，逐步接 save/open、request、player/version、manual、export；同步替换 Stage2 reference-only 主路径。无原件时可做状态/API，不自行定配色布局。

**测试/产物/停止**：C2/C4/C7/C8；输入不禁用/不丢失、连续点击幂等、焦点和 reduced-motion、旧版不自动采用、内容 PTS 对齐、缺对应片段提示、真实保存重开/素材失联/失败。执行既有 `pnpm run renderer:workbench:test`、`pnpm run stage2-product-workspace:test`（切换时同步现有断言语义），新增测试及 direct Electron 实测。设计原件实查缺失阻断视觉忠实性声明；模型/真人缺失不能用模拟声称通过。

## S3-06 — 完整真实联调与阶段退出证据

**目标/用户成果**：在留出项目中证明完整个性化作品和可控日常工作流，记录失败/反例/费用/真实用户意见。

**允许**：D；`tests/integration/stage3-acceptance-real.test.ts`、`tests/fixtures/stage3/**`（仅获准合成 Fixture/脱敏清单，不含私人原片）、`docs/product-intelligence/CREATIVE_QUALITY_BENCHMARK.md`、`docs/pipeline/QUALITY_EVALUATION_PIPELINE.md`。需要修代码回所属 S3 包，不借验收扩 runtime/工具范围。

**输入→输出**：S3-01..05 已集成确切提交/合同/模型和素材授权 → C1–C9 Case records、实际编码与摘要、重开记录、失败根因/无错误提交、真人观看听评。无新综合打分系统。

**依赖/步骤**：首条真实接缝存在即准备并运行子案例，不等单案例零缺陷；最终 Exit 才要求整合后覆盖所有 C1–C9。授权历史与测试项目分离，真实目标答案不进学习上下文。

**测试/停止/完成**：开发集成按 ADR-0026 的对应完整门禁；真实脚本在 promotion 登记精确命令后执行，不能把这里的新文件名当已存在命令。缺原片、model 配置/数据授权、真人意见逐项列未验证；失败记录 expected/actual/root cause，不泛化 assert.throws。阶段完成须用户对精确保留产物接受，技术门禁不能替代；自动发布仍非目标。

## 共同恢复、Evidence 与并行边界

所有包在项目提交前失败保持原有 Timeline/权威作品不变；独立失败诊断允许追加且标明不构成作品提交。事务资源清理保留 cause/stack 和副作用。重新运行绑定同一幂等键时只复用合法已完成结果；输入改动创建新版本，不通过重试修内部错误。非当前格式写入前拒绝，保留用户原件，不自动转换/删项目。

每包实际结束时生成对应 `EVD-<date>-S3-0N-*` 并登记真实 fingerprint、命令/产物/未验证项；被阻断按 programme 记录 Evidence 与 Debt，不伪造完成。只有已登记包才使用 docs:complete；候选文档不能调用。S3-02/03/04/05 的纯逻辑和只读研究可并行，P 的合同、Host、存储改动按单 active 规则串行；候选包不单独启动，首批联调由唯一 active WP-S3-INTEGRATION-001 登记。


2026-09-24 首批集成继续沿用唯一 active `WP-S3-INTEGRATION-001`。
用户选定最新桌面设计原件并明确取消产品数据/费用上限，接口替换依据
[ADR-0029](../../decisions/ADR-0029-stage3-model-accounting-and-capabilities.md)。
不新增候选包完成状态；模型协议适配和工程夹具通过仍不构成真实闭环验收。

2026-09-24 用户选择 Qwen 画面 + Whisper 转录 + 独立环境声模型。
当前首批框架范围和共享文件仍由同一 WP 管理；[三路配置说明](MODEL_SERVICES_SETUP.md)
给出 API key、本地服务、规划复用、协议要求和未验证边界。
