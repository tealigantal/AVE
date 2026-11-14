> 2026-11-14 最新迁移方向：按用户要求优先切换剩余调用与测试，在同一变更中删除旧媒体协议，不再维持双轨。长素材流式消费和资源故障验证继续作为未完成工作，不以删除旧入口宣称其已完成。

> 唯一当前执行计划。2026-11-14 用户在上一小节点暂停后授权继续媒体迁移，并要求同步文档、消除文档错误。后续任务按用户最新授权和文末执行记录推进；历史阶段、暂停条件和检查范围只反映当时上下文，不作为当前执行门槛。

## 2026-11-14 上一暂停点（已恢复）

用户当时要求完成小节点后停止；此后已授权继续。该节点完成并验证 Host v2 调用、观察文件保存/重开与精修；全部媒体迁移尚未完成。v1 注册、Schema 与剩余旧测试仍保留。

恢复时先完成资源保护负例/并发/崩溃和其他受影响调用方测试，再删除全部媒体旧入口与旧观察 Schema，并执行最终检查。不得跳过测试直接删注册。详细命令、结果和剩余问题见文末本轮收尾记录。

## 2026-11-14 恢复媒体迁移（当前指令）

用户重新授权完成全部媒体旧协议迁移。顺序固定为：补齐 v2 格式及资源保护 → 所有调用方、观察对象存储和重开迁移 → 定向真实 Worker/Host 与故障验证 → 删除 v1 入口、Schema、生成绑定和旧正向测试 → 最终检查。验证前保留可用旧入口；不得发布不可用中间态。下方修复后停止记录仅为上一轮历史事实。

本轮沿用 M00–M08 的媒体闭包范围与现有活动包，不推进整包完成，不部署或调用付费模型。额外确认的调用点包括 scripts/p5/prepare-samples.mjs、jobs-panel.js，以及 observation 对象版本和 workspace 缓存的文件指纹校验。

## 2026-11-14 较早修复与停止边界（历史）

用户当时要求解决不可用问题后停止。不可用的直接原因是 Worker 已撤销 v1 注册而 Host 仍发送 v1；当时恢复两项注册以修复调用链，保留 v2 实现。下方直接删除指令及不可用中间态记录属于该修复之前的过程。

## 2026-11-14 较早迁移指令（执行顺序已调整）

用户明确要求直接移除 scene/probe 旧入口，说明目前没有生产环境、没有导入需要，并要求连续工作直至全部迁移完成。早先“保留 v1 生产入口直到新版完全闭包”的执行顺序不再适用；可在本地迁移过程中直接删除旧入口，切换全部调用方及合同，同一变更完成验证。此指令不要求删除已有用户文件、历史 Evidence，也不授权弱化资源、完整性、授权或事务边界。此前禁止运行 Stage3 测试和全组件检查的指令未被取消，沿用非 Stage3 定向验证。

## 当前登记与执行边界

唯一活动工作包为 `creative-assistant-stage3/WP-S3-SEMANTIC-FOUNDATION-001`，其计划即本文。原 P4 包退出活动入口，保留未完成状态与历史 Evidence；其他 programme 保留以维护历史状态和独立债务，不构成并行执行计划。下方首个英文计划及 M00–M08 是历史阶段记录，其中关于目录删除、独立 programme、登记路径、等待审核和命令限制的当时陈述不描述当前工作树，也不构成当前指令。最新执行进展以文末记录为准。

## 2026-11-14 初稿容错与云复验续接

- 当前规划契约原位删除 audio_intent 强制证明；保留历史读取兼容、资源身份与权限、时间边界、事务和 QC。局部规划结构错误及可选音频 HTTP 失败按有限预算纠正；已提交草稿渲染失败时保留草稿并提示。具体验证与限制见现有执行记录，不能据组件验证声称真实成片通过。
- 生产容器 6095 已使用当前构建镜像 `sha256:8d377c091be7b033c5110e2ac8078bd8857117b0aca50f3c66d94b74541c01df` 重建，原卷和旧镜像保留，两个项目数据库备份完整性检查通过。真实项目 9 个素材重开，第 3 次要求为“30秒vlog”。真实 Qwen 规划返回两次响应（分别 164129、167151 tokens，费用未提供），没有产出初稿。
- 根因：当前 Host `resolveBoundCreationDurationTarget` 仍用本地文本规则将普通“30秒vlog”解释为严格 900 ticks；两轮测得 443、839 ticks，后者接近目标仍因两轮测量门限失败（`CREATION_PLANNING_BUDGET_EXCEEDED`）。这与本计划的模型解释语义和普通目标合理范围要求冲突，也说明历史 M10 局部检查不能证明真实链路已迁移。
- 当前后续：完成真实多声音及局部故障恢复，迁移旧协议测试与调用方；语义交由版本化提示和模型解释，保留明确约束、授权、时基、事务和资源完整性校验。只执行与变更相称的必要检查及用户指定真实云测，不以 Stage3 测试或历史记录阻断。不得伪造成片来制造通过。

# LLM semantic foundation — implementation plan

> 历史阶段记录：以下到“媒体契约唯一新版迁移”之前的状态、路径和停止条件仅反映当时计划，已由本文顶部当前边界及文末执行记录取代。

## Purpose / Big Picture

Establish a safe, versioned infrastructure boundary for the user's repository-wide migration of semantic decisions to LLMs. This checkpoint delivers the machine-readable interpretation contract and trusted versioned prompt-file loading, then performs code self-review and scoped engineering checks. It stops before production Host invocation or real model/media acceptance so the user can audit the architecture and code.

## Progress

- [x] Confirm active repository state and record pre-existing dirty worktree; retain existing edits.
- [x] Register independent Stage3 package, capability, acceptance and paths.
- [ ] Add interpretation contract and generated validators.
- [ ] Implement trusted prompt loading, digest and variable checks.
- [ ] Add four feature-bound versioned prompts and focused self-checks.
- [ ] Review diff and run scoped engineering checks.
- [ ] Stop and wait for user audit; do not expand migration or claim acceptance.

## Surprises & Discoveries

- The repository already has an in-memory `PromptRegistry` and the model audit/cache carries `prompt_version`, but the current creation Host uses the fixed label `stage3-creation-v1`; no prompt file digest is currently part of that identity.
- Current registry contains only semantic-interpretation-v1. The user physically removed old programmes, work orders and plans; do not restore them as prerequisites.
- `AGENTS.md` already contains the user's durable semantic rule, and the authorized memory note already exists. Do not duplicate either.

## Decision Log

- Add an interpretation contract and prompt registry foundation without pretending that the Host already uses it.
- Prompt file selection is trusted code metadata and constrained to registered feature prompt roots. Raw user text is data only.
- Do not create a generic project-lifecycle artifact set: AVE already has canonical governance docs, programme manifests, plans and ADRs. Extend those authorities.
- Defer production semantic migration, Host persistence/recovery, planning budget expansion, live model evaluation and media acceptance until after user audit.

## Outcomes & Retrospective

To be updated after implementation and self-review. This plan records a bounded infrastructure checkpoint, not completion of the overall migration.

## Context and Orientation

Canonical sources: `AGENTS.md`; `docs/program/semantic-interpretation-v1/{EXECUTION_MANIFEST.yaml,CAPABILITY_MATRIX.yaml,ACCEPTANCE_MATRIX.yaml,STATE.yaml}`; `docs/program/semantic-interpretation-v1/work-packages/WP-S3-SEMANTIC-FOUNDATION-001.md`; `packages/platform/model-gateway/src/public.ts`; contract codegen under `tools/contract-codegen/`.

The starting worktree contains extensive pre-existing P4, Skill, model failure, media, annotation and DOC-017 changes. Keep those changes intact; only touch paths registered in the new package and distinguish pre-existing modifications from this checkpoint.

## Plan of Work

1. Generate and export `CreationRequirementInterpretationV1` validation/types through the canonical schema/codegen pipeline.
2. Add prompt-file registration/loading that checks trusted path containment, file digest, version uniqueness and exact declared variables. Keep current in-memory registry methods compatible.
3. Add the interpretation, initial selection, capacity correction and final confirmation prompt files in their existing feature boundaries.
4. Add focused self-checks for contract validity, malformed values, path safety, digest drift, variable mismatch, cache/audit prompt identity, and no fallback to semantic heuristics.
5. Review all changes, run scoped checks, update this plan and Evidence, then stop for user audit.

## Concrete Steps

Run `pnpm docs:start -- WP-S3-SEMANTIC-FOUNDATION-001` before product source edits. Use the package's `allowed_paths`. Generate bindings only via `pnpm run contracts:generate`; verify with `pnpm run contracts:check`, `pnpm run typecheck`, focused tests registered during implementation (`semantic:foundation:test` does not exist yet; register it before use), `pnpm run architecture`, and `pnpm run docs:check`. Do not run full end-to-end acceptance, real provider calls, Docker rebuilds, media rendering or deployment.

## Validation and Acceptance

This checkpoint asks for engineering self-check only. Evidence must state the precise commands and outcomes, whether they passed, and limits. It must not call the work accepted or claim the model understands user intent. Real semantic evaluation and original-media workflow acceptance are explicitly deferred.

## Idempotence and Recovery

Code generation is deterministic. Prompt registration rejects duplicate `(feature, name, version)` and digest mismatches. Existing string registration remains usable. Before any model caller persists new prompt identities, rollback can remove this additive infrastructure; after adoption, old prompt files remain immutable for replay.

## Artifacts and Notes

- Work package: `docs/program/semantic-interpretation-v1/work-packages/WP-S3-SEMANTIC-FOUNDATION-001.md`
- ADR: `docs/decisions/ADR-0061-versioned-semantic-prompt-foundation.md`
- Contract: `contracts/schemas/editorial/creation-requirement-interpretation.v1.schema.json`
- Evidence: `docs/evidence/runs/EVD-20261112-S3-SEMANTIC-FOUNDATION-SELF-REVIEW.md`

## Interfaces and Dependencies

Uses existing `PromptRegistry`, `ModelRequest.prompt_version`, model input hash/cache key and `ModelAudit.prompt_version`. Contract tooling produces all generated types/validators. This slice introduces no new runtime dependency and no project-storage schema. Host production integration and persisted interpretation identity remain follow-on work after review.

## 2026-11-12 authority correction

P4/P5 and the old cloud-effects execution documents were physically removed by the user. Their removal is not completion. This plan is the only active execution route; it must be self-contained and must not require the removed DOC-017. The full user-requested semantic migration remains the goal: inventory, interpretation contract, versioned prompts, Host persistence/recovery, structured duration/planning and six-send budget, safe failures, annotation identity, and later semantic/media evaluation. The foundation is an implementation milestone, not a reduction of that goal.

Historical checkpoint: documentation routing and package authority were repaired. The latest checkpoint is plan-only supplementation and remote sync; no product implementation or acceptance is performed. New-plan checks must derive from its actual interfaces and user scope; retired WIN/OP/P5 gates must not be copied into it. Historical unmet validation remains historical uncertainty, not a prerequisite to this work.

Documentation checks: `pnpm docs:sync` passed. `pnpm docs:check` failed on existing media-scene-request multiple current majors, historical capability evidence applicability and programme evidence fingerprints; no active-package conflict or generated-state drift was reported. These global historical findings are not new-plan acceptance gates. No product checks were run.

## Physical retirement result

The user removed the old programme directories, stage work orders, CREATION_PRODUCT_SCOPE.md and all prior files under docs/plans. A subsequent read-only check found only this plan remaining and confirmed the new programme, Evidence, decisions and generated-current directories remain present. Historical product acceptance is not inferred from deletion.

## 媒体契约唯一新版迁移：M00–M08（历史计划，不代表当前完成状态）

> 本节原始登记路径、旧 programme 删除和阶段停止条件是历史指令，当前活动包和授权以本文顶部为准。

### 范围、状态和执行原则

2026-11-12源码核对：Host仍调用media.scene_scan.v1及media.probe.v1；Worker同时注册v1/v2。media_scene_scan_v2.py明确以MEDIA_SCENE_V2_WEBP_RESOURCE_GATE_REQUIRED拒绝WebP；media_probe_v2.py以MEDIA_PROBE_V2_IMAGE_UNSUPPORTED拒绝JPEG/PNG/GIF/WebP。旧计划没有覆盖修复。仅替换版本字符串会导致功能退化，必须完成本节闭包。

用户授权删除旧契约并只允许新版。本节仅针对媒体scene/probe协议及必须同步的观察、缓存、存储、调用方；不是删除全仓所有v1合同。RationalTime、Worker envelope、其他仍为当前版本的v1不受版本数字影响。本节取代前文“无项目存储变更”的局部假设，仅对媒体迁移生效；语义LLM部分原范围不变。M00–M08作为同一计划中的媒体前置单元推进，M08结束后交审核，不能自动开始真实云模型、原用户媒体验收或部署。

不能修改interface-drift检查来允许两版current，不能将仍可执行的v1移到legacy冒充解决冲突，也不能删除WebP/图片测试来制造通过。v2扩展保持版本2，仅因这些v2尚未正式进入Host生产路径；实施前若发现持久v2已被实际使用，应先逐字段证明兼容，不能篡改既有文件含义。

每完成一个M单元，在本文件记录实际文件/函数、命令和退出码、失败原因及下一动作。每个单元的输入、输出、断言都必须完成再进入依赖单元；“Schema通过”“Worker返回成功”不能代替Host和重开检查。模型名称/思考档位不是质量保证，本清单用于降低执行时的隐含决策。

### M00：固定基线、登记路径、列出依赖（先做）

1. 执行git status --short、git rev-parse HEAD和git diff --name-only；记录现有dirty文件，禁止reset/stash覆盖。当前核对基线HEAD为e51ca2e，媒体、批注、Skill等存在未提交改动；新执行者必须以实际工作树重新核对。
2. 当前本地programme入口是docs/program/semantic-interpretation-v1/EXECUTION_MANIFEST.yaml，活动ID是WP-S3-SEMANTIC-FOUNDATION-001。本次远端仅同步本计划；若远端检出尚无该programme，先按本文件注册唯一programme、同ID工作包和对应CAP/ACC（S3-SEMANTIC-FOUNDATION-001），不要从远端旧P4包开工。注册字段遵循scripts/docs/program-model.mjs现有结构；活动包dependencies为空，scope_document为docs/product/EDITING_CAPABILITY_SCOPE_V1.md，plan_file为本文件，status为active；capability/acceptance保持pending，不标完成。旧programme不得进入registry。然后运行pnpm docs:start -- WP-S3-SEMANTIC-FOUNDATION-001。
3. 在活动包allowed_paths登记下面路径及理由，再改源文件：contracts/schemas/worker/media-{scene,probe}-*.schema.json及对应examples；引用它们的editorial观察合同及生成绑定；tools/contract-codegen；packages/platform/{contract-runtime,project-host,project-storage,worker-client}/src；apps/worker-host/src/worker_host/{handlers,adapters,runtime}、registry.py；apps/dev-cli/src/main.ts；对应tests/integration、tests/property、Worker测试；contracts/README.md、CURRENT_VERSION_POLICY.md、当前架构/新ADR/导航/本计划、package.json和programme。新增路径按搜索发现逐项补充具体原因，不能无界扩大。
4. 用rg搜索media.scene_scan.v1、media.probe.v1、media-scene-request.v1、media-scene-result.v1、MediaSceneResultV1、mediaSceneResultV1Validator；再查v2全部引用。生成表记录“调用入口/发送任务/请求字段/返回消费/持久化/测试入口”。扫描contracts的$ref，包括legacy里引用将被删除的worker schema；生成代码只用于确认闭包，不手改。
5. 用脚本按schema文件名去掉.vN.schema.json分组，输出所有重复current family。确认probe是否真的有v1 Schema：旧probe可能仅以未结构化任务形式存在；不能凭名称虚构需要删除的文件。本任务必须清理两种旧Worker任务，不顺手迁移其他family。
6. 新增下一可用ADR编号（不要覆盖ADR-0061），记录唯一新版边界、文件证据所有权、资源租约、旧项目处理、失败和回退政策；链接到docs/decisions/README.md。本轮计划编辑不代表ADR或实现已完成。

输出：调用表、真实重复合同表、路径登记、ADR。退出断言：没有依赖已删除计划或旧P4/P5验收。

### M01：冻结新版请求、结果与内部数据模型（依赖M00）

入口：contracts/schemas/worker/media-scene-{request,result}.v2.schema.json、media-probe-{request,result}.v2.schema.json、common/rational-time.v1.schema.json；packages/platform/project-host/src/media-evidence.ts。

1. scene/probe请求必须带schema_version=2、对应task_type、input_path、source_digest、timeout_seconds、output_dir；scene另带stream_index和threshold。Host预分配独占staging，Worker只写该目录；严格拒绝未知字段、缺字段、浮点或溢出整数。source_digest来自实际原件指纹，不从文件名推导。
2. scene结果沿用文件回执：path、receipt.header、frame_count/start_pts/end_pts、byte_length/sha256、span_count。帧NDJSON行保留frame_index/pts/end_pts/change_score；时间为原始有理time_base和整数PTS，不重采样为固定帧率。
3. probe结果沿用文件索引、source_digest、byte_length/sha256、record_count、metadata_json、policy_version。在Schema中增加可判别的media_kind（video/audio/image/animated_image）或等价严格分支，并同步readProbeEvidence：静态图片合法地没有帧/packet时序，不能以伪造一秒视频或空metadata默认值通过；动态图片有真实单次播放时序；音频-only无视频也必须成功。为每个分支写一个有效样例和边界无效测试。
4. 制作一张字段映射表：旧scan.source_digest/stream_index/time_base/threshold来自v2 header，start/end来自receipt，frames/spans来自完整校验后的文件记录。该表用于迁移业务算法，不输出或持久化重新包装的MediaSceneResultV1。Host内部类型命名为中性DecodedFrameIndex/SceneSpan等，不带旧schema_version。
5. 保留安全整数和BigInt比较。文件接收先验证全部字节/行/摘要/源身份，再公开数据；路径越界、软链接、文件替换、记录非连续、末帧越界均失败。静态分支的零时序只在明确image分支允许。
6. 确定观察持久化合同是否嵌套v1 scan；如是，创建唯一当前后继观察版本，并同步其schema、运行声明、存储验证和读写入口，禁止在旧版本下偷偷改变结构。

输出：Schema/字段映射/正反例和当前版本清单。旧schema暂可留在未提交迁移过程中供比对，M07前必须物理删除；不得把中间状态发布或标通过。

### M02：补齐WebP解码与资源边界（依赖M01）

入口：apps/worker-host/src/worker_host/adapters/animated_image.py、handlers/media_scene_scan_v2.py、runtime/engine.py；参考现有GIF顺序转换和WebP受控子进程实现，不重新发明媒体识别。

1. 按文件内容识别静态/动态WebP。静态WebP进入静态图片处理，动态WebP顺序逐帧解码，保留duration、alpha、blend/disposal和一次播放结束，不循环填时长。
2. 当前拒绝原因是“单子进程限额无法覆盖多个Worker”。先实现资源域共享租约：由可信配置提供固定内存总预算和域ID，同域多个Worker进程共用操作系统锁保护的租约记录；Host可触发Worker任务但Worker不得访问project.sqlite。每个解码任务启动前原子申请解码+编码合计预算，任务参数不能自增预算。
3. 租约至少记录域ID、任务ID、owner PID及进程启动身份、预约字节、运行子进程身份；重复任务不双占，预算不足排队并响应取消/超时。仅PID不够，必须校验启动身份防复用；不能仅凭TTL抢回仍活跃进程的租约。无法证明owner死亡时明确失败，不能超配。
4. 复用Linux进程组及Windows Job Object回收机制；Windows父Job不允许加入时报告稳定资源错误，不退到无限制子进程。环境变量沿白名单传给子进程。线程启动失败、spawn失败、取消、超时都必须终止并等待整个任务树退出，之后才释放租约。
5. 加入单帧尺寸、输出磁盘与编码背压边界；不能把“素材更长”当作无条件拒绝理由。临时解码产物只在任务workspace，结束清理；保留原异常cause，清理失败用聚合错误，不吞错。
6. 上述保护及并发测试通过后才移除MEDIA_SCENE_V2_WEBP_RESOURCE_GATE_REQUIRED的常规格式拒绝。资源真的不足仍允许资源不足错误，不能拒绝所有合法WebP，也不能简单删掉gate绕过资源控制。

退出断言：两个独立Worker同时请求时总预约不超预算；等待取消无子进程泄漏；崩溃恢复不误回收活跃进程；合法小型静态/动态WebP均在对应新版路径成功。

### M03：补齐probe图片/动画/音频分支（依赖M01，动画依赖M02）

入口：handlers/media_probe_v2.py、adapters/ffprobe.py、adapters/still_image.py、adapters/animated_image.py；只复用底层解码/探测算法，不调用media_probe.py的v1 handler。

1. 在M01类型分支下接入JPEG、PNG、静态WebP和动态GIF/WebP。移除MEDIA_PROBE_V2_IMAGE_UNSUPPORTED的无条件拒绝，仅保留真实格式损坏/资源不足错误。
2. 静态图返回真实像素尺寸、方向、色彩/alpha信息与源身份，不制造fps、视频duration或packet。沿用已有JPEG/PNG完整性与资源检查，保留CRC、profile、位深和解码失败测试。
3. 动态图使用实际帧时间，单帧GIF/WebP仍是image分支；多帧缺duration应明确报错。保留旋转、VFR、非零start PTS、音画不同尾部和ffprobe时间摘要语义。
4. file-backed metadata/packet/frame输出有界，不能先把全部帧读成大JSON再写文件。metadata_json有上限，索引逐行处理，output_dir和source_digest在发布前再次验证。音频-only样例必须通过。
5. Header/记录/结果文件完成后原子发布回执；失败不暴露半文件。Host读到image回执时必须走显式分支，而不是尝试旧probe结果的outputs[].value结构。

退出断言：每种既有支持格式仍能导入和提取事实，损坏输入原错误类别保留，无默认metadata伪成功。

### M04：Host、CLI与精修全面切换（依赖M02、M03）

入口：packages/platform/project-host/src/project-host.ts的inspectMediaCandidate、观察流程和精修流程；stage3-creative.ts；media-evidence.ts；apps/dev-cli/src/main.ts；worker-client握手/能力与任务白名单。

1. 将每个M00调用点逐一迁移，不做全仓盲目字符串替换。probe不再先依赖旧probe得到指纹：用既有fingerprint接口/持有的原件摘要得到source_digest，再请求v2；没有可信摘要则先计算，不使用空串。
2. 每次请求Host持有不可变源句柄和独占staging，明确signal、截止时间及assertCurrent。观察流程可复用现有staging；精修当前没有场景staging，需补建并在finally回收。cleanup顺序为停止任务/等待Worker结束→关闭读句柄→删除staging→释放原件，不提前删Worker仍在写的文件。
3. 用readSceneEvidence/readSceneSpans/readProbeEvidence验证回执。预期source、stream、time_base、threshold和执行器身份来自可信请求/实际事实；不能把返回header本身当作预期值自证。已有ffmpeg版本来源不够时补可信握手身份。
4. 观察流程用新版帧索引生成候选窗口与采样锚点。改creationObservationSpans、creationTemporalFrameIndices及其调用者，使它们消费中性有类型的数据或索引接口。保留末帧覆盖、去重、精确时间、源身份、采样额度断言。不得将整份文件重新拼成巨型旧scan对象。
5. 精修禁止继续查找/复用带旧scan的缓存；新版缓存需绑定源digest、stream、算法版本、结果内容摘要。由新帧索引构造split/trim合法边界；错误不允许生成Command/Commit。v2文件消费完成前不能改Timeline。
6. inspectMediaCandidate及CLI按media_kind规范化为业务需要的内部事实，禁止把旧Worker envelope作为内部模型。更新所有mock Worker和握手能力断言，让测试检查实际发送v2字段，而不只检查函数返回。
7. capability列表只宣告已实现的v2任务；客户端缺少v2时明确不兼容，禁止回退v1。同步IDEMPOTENT_WORKER_TASKS和缓存key，临时路径生命周期不能被过期幂等结果绕过。

退出断言：导入→观察→选材事实→精修调用均只发送v2；失败/取消不会新增草稿、Timeline或错误缓存。

### M05：持久化、重开与旧记录（依赖M04）

入口：contracts中引用scene v1的观察合同；packages/platform/contract-runtime/src/creation-session.mjs及相关观察校验；packages/platform/project-storage/src/project-storage.mjs和public.ts；Host读取workspace/observations的路径。M00的反向$ref表是修改清单。

1. 临时NDJSON路径不能直接持久化。Host先校验完整内容，再复制/发布到项目拥有的内容摘要地址；持久对象记录相对引用、摘要、长度、源与算法身份。遵守现有存储和对象引用机制，不新建第二个项目数据库。
2. 把引用、观察对象与相关事件放入既有事务。复制成功但事务失败留下可识别未引用对象，由既有清理机制处理；事务失败不能留下有效观察。禁止在Worker里写SQLite。
3. 冷重开重新验证文件身份/摘要/源绑定；缺文件、截断、篡改、悬空引用要显示稳定错误并保留原件/Timeline。禁止从损坏记录推测或生成默认帧。
4. 本次“只允许新版”明确适用于scene/probe运行与当前观察合同。旧原件、时间线和用户项目文件不删除、不就地重写。旧媒体分析记录不进入当前validator或新模型规划：由已有对象类型/版本元数据识别，报告MEDIA_ANALYSIS_REBUILD_REQUIRED或仓库等价稳定错误。该检测只拒绝旧身份，不解读旧payload、不保留v1 schema作兼容执行器。
5. 重建作为显式Host操作，从原始素材重新走v2并创建新观察对象，不能在打开项目时静默运行/改写历史/增加费用。旧项目若该部分不能继续操作，准确说明需重建；已有可读取Timeline/导出不得仅因分析缓存过旧而被删除。
6. 旧记录不自动转换为v2，失败恢复不重发已知完成的Worker任务、不重做已提交的Timeline。对未知结果遵守现有恢复规则，不伪称成功。

退出断言：正常重开可精修；事务故障无半提交；旧记录明确被拒绝用于新分析，原数据保留；不以“旧项目全打不开”代替细粒度错误处理。

### M06：迁移测试与有界资源检查（依赖M02–M05）

先新增独立新版用例，再在M07删除旧正向协议用例。不要将v2 handler调用v1 handler作永久对照。可把已核对的媒体事实做固定期望，或独立用ffprobe/解码对照；人工写返回对象只证明边界，不证明真实Worker运行。

| 用例 | 检查入口 | 必须断言 |
| --- | --- | --- |
| 视频CFR/VFR、音频-only | stage3-media-evidence-v2.test.ts、media_evidence_stream_test.py | 实际Worker v2收发、原始PTS和尾帧、回执完整性 |
| JPEG/PNG/静态WebP/单帧GIF | still_image_bounded_test.py、混合媒体Host测试 | image分支、尺寸/方向/alpha、无虚构时间 |
| 多帧GIF/WebP | animated-media-host.test.ts、mixed_media_acceptance.py | duration/disposal/blend、透明度、只播一次、精修帧边界 |
| 损坏/超大/profile/CRC | 原still_image_bounded_test.py边界迁移 | 真实错误、无空结果或隐式旧版回退 |
| 多Worker竞争、取消、超时、spawn/thread失败 | resource/animated adapter测试 | 合计预约有界、等待可取消、整个进程树退出、租约最后释放 |
| 文件逃逸/软链接/替换/摘要错/行断裂 | media-evidence reader测试 | 未公开未校验行，无提交，保留根因 |
| Host观察与精修 | stage3-observation-host.test.ts、stage3-precision.test.ts | 仅v2请求，时间/对象绑定准确，失败Timeline不变 |
| 存储/重开/旧观察/事务失败 | project-storage与project-open相关测试 | 新版可重开、旧分析显式待重建、用户原数据不变 |
| 旧task直接发送 | Worker协议负向用例 | v1不在握手，无handler/无side effect，稳定unsupported错误 |

所有格式必须有实际生成/编码的合成媒体；至少一个Host集成用例走真实Worker、真实文件、真实SQLite，不能所有层同时mock。Linux/Windows的进程树与租约测试各记录实际执行平台；缺失平台明确未测，不抹掉断言或用另一个平台冒充通过。此为代码自检，不宣称原用户素材或模型质量验收。

### M07：删除旧接口和生成清理（依赖M06）

1. 删除worker/media-scene-request.v1.schema.json、media-scene-result.v1.schema.json及对应valid/invalid例子；删除M00确实发现的旧probe合同，若不存在则不造空删除记录。同步所有$ref，尤其creation-observation和legacy链：不得留下引用不存在文件的历史Schema；需淘汰的旧观察Schema连同生成绑定删除。
2. 移除registry.py中的media.scene_scan.v1与media.probe.v1及旧handler import；删除handlers/media_scene_scan.py和media_probe.py的任务入口。仍有底层通用算法时移到现有adapter并按中性函数调用，不能保留接受旧任务的包装器。搜索CLI、runtime能力、worker-client与tests的全部调用方。
3. 在tools/contract-codegen/generate.mjs删除旧schema ID、validator exports和声明。该文件存在按数组数字索引映射：删元素会让后续validator错配，必须同步全部索引或改成按ID命名查找，并逐个验证导出对应$id。不能只删两行让错误静默传播。
4. 更新contract-runtime public.ts/public.mjs和所有TypeScript/Python类型import。运行pnpm run contracts:generate生成并清理旧产物，再运行contracts:clean确认无漂移。禁止手改generated；确认旧manifest条目和旧Python/TS绑定都消失。
5. 删除或改写旧正向测试与fixtures；保留少量“旧task应被拒绝”负向测试。rg残余每项标记为负向断言或不可变历史Evidence，生产代码与当前Schema不得含旧运行入口。不能对全仓所有.v1字符串机械清零。
6. 更新contracts/README.md、CURRENT_VERSION_POLICY.md、SYSTEM_ARCHITECTURE.md和新ADR：仅媒体v2是current、文件证据由Host拥有、旧分析需重建。清理新计划/工作包中与此冲突的“无存储变化”描述。历史Evidence不重写为现在通过。

退出断言：每个目标family只有一个current major；Worker不能执行旧任务；当前Schema图无旧引用；文档检查规则保持原强度。

### M08：最终检查、证据和停止条件（依赖M07）

按顺序执行，先在package.json确认命令仍存在（下列来自2026-11-12源码）：

```text
pnpm run contracts:generate
pnpm run contracts:clean
pnpm run contracts:check
pnpm run contracts:identity
pnpm run typecheck
node --import tsx tests/integration/stage3-media-evidence-v2.test.ts
python apps/worker-host/tests/media_evidence_stream_test.py
pnpm run stage3:probe-boundary:test
pnpm run stage3:mixed-media:test
pnpm run stage3:observation:test
pnpm run stage3:precision:test
pnpm run stage3:project-open:test
pnpm run architecture
pnpm run docs:sync
pnpm run docs:check
git diff --check
```

**历史阶段命令说明，已被本计划首段和用户 2026-11-14 指令取代，不是当前门槛。** contracts:identity包含roundtrip/生成，重复不是刷绿而是现有脚本结构；若脚本变化先说明新检查覆盖。追加M06新资源租约、Host事务故障用例的实际命令。带stage3名字的现存测试可按代码覆盖使用，名字不意味着重新启用旧工作包或旧验收门槛。不要启动stage3:check/P4/P5整包、真实云调用、原用户媒体验收、Docker部署；本轮范围不需要它们。

**历史阶段判定说明，已被首段及后续文档门禁修正取代。** 出现失败先保留首次日志并找根因；不弱化有效断言、不以删除失败用例掩盖问题。历史上要求 docs:check 的 multiple current Contract majors 必须真实消失；若新增其他失败，记录具体代码/文件，不写“全通过”。

最终Evidence至少包含：唯一新版合同清单、旧入口删除清单、M00调用表最终状态、媒体矩阵、两平台资源检查范围、Host真实收发与重开证据、故障原子性、所有命令结果、未运行的真实媒体验收。迁移子任务完成不代表LLM基础设施整包完成，不能调用docs:complete提前关闭该包。更新本计划M00–M08状态后停止等待审核。

### 授权、远端及恢复边界

本次只补计划并同步该文件。生产代码/契约及大量既有dirty改动不包含在本次提交；远端检出必须先检查其实际基线与本地工作树差异，不能假设本计划描述的候选改动已随计划推送。新执行者从M00恢复；若尚无新programme按M00登记，禁止重启旧包。不要恢复已删除旧计划来补信息，本节是媒体迁移的完整执行入口。

新旧迁移中间状态不得部署。若中途失败，保留用户原文件和未提交工作，在本文件记断点；不重新开启v1以宣称恢复成功。提交/推送本计划已获本轮授权；未来实现的提交/部署遵循届时明确授权，不能由本次文档同步推断。

2026-11-14 时长语义修复进行记录：现有 creation-planning-exchange.v3 契约新增可选结构化时长约束，新生产规划通过版本化提示要求模型解释普通目标和明确边界；Host 按整数 Timeline ticks 校验并把首轮约束绑定于后续测量，最后成稿必须对应已测量的目标。原生产正则时长解析不再作为新规划门禁，历史读取路径继续保留。用本次真实失败记录离线重放，旧两轮投影摘要不变；新范围 810–990 中的 839 帧可测量为可行，809 帧、修改首轮区间及违反明确 900 帧均被拒绝；这是诊断重放，不能代替真实模型语义能力验证。`pnpm run check`（类型、121 契约及架构）通过；未运行 Stage3 测试。下一步构建、核对并重建 6095 生产容器，再进行用户授权的同一真实素材云测试。

真实云复验第 4 条：新镜像 `sha256:e67d9e51240369d19c922b77fed2a5ad5709aae29b4de0a28c2263447dd7aa85` 中实际 Qwen 将普通 30 秒解释为 840–960 ticks（28–32 秒）；首个调用因不适用技能使用 no_change 标签被旧的 Skill 组合规则阻断，未产生初稿，调用用量 166130 tokens、费用未提供。原位放宽当前 SkillEvaluation 契约和新运行的非活动标签校验：不适用技能允许 no_change；记录保留，仍不允许据此绑定执行效果；旧运行仍按旧规则校验。实际失败输出本地重放可继续测量（598/900 ticks，尚不够，需要模型重新选择），`pnpm run check` 通过。不得将重放当成云端成功；正在构建修复镜像，后续继续真实复验。

第 5 次真实复验：Qwen 两次响应累计 314607 tokens，模型方案已原子提交为 v1、18 个镜头，保存了草稿执行记录；截至本记录渲染尚未开始，工作台轮询偶发 JSON 读取失败，容器健康探针持续超时、Node 持续高 CPU。对同一实际项目的独立只读复核：草稿执行验证约 4.5 秒、完整工作区快照约 8–12 秒，不能单凭这些数字证明生产进程卡住的位置。为缩短生成到渲染路径，新代码改为从已提交的权威状态直接定位该草稿及既有渲染记录，不再在该路径构建完整历史 UI 工作区；实际渲染入口仍重新校验草稿执行证明、授权、源文件和时间线。轻量 `pnpm run check` 通过，此优化尚未部署或经真实项目验证；原运行中的生产任务继续观察，避免重复模型调用。

渲染恢复与性能诊断：生产容器健康探针持续失败、无活跃云模型调用且已提交的草稿和时间线已完整备份（SQLite integrity_check=ok）；恢复容器后旧锁因 PID 复用误认为仍在使用，经确认仅当前容器挂载项目卷且新 Host 尚未打开项目，将旧锁移到导出目录保留。v1 18 镜头草稿成功重开，直接触发预览/成片渲染，无新模型调用。找到另一具体性能问题：`readCreationMaterial` 原先对每次授权核验先解析全部 435 份历史状态，再查首个匹配值；当前渲染对多个素材反复执行。改为倒序逐项验证读取直至首个匹配授权，原始授权及被选中的对象散列、范围、当前权限仍核验。使用同一真实项目的只读记录比较，两种读取对 9 项素材返回完全相同，约 1850 ms 降至 10 ms；`pnpm run check` 通过。该性能修复尚未用于当前生产渲染，正在构建镜像，不能把性能对比当作成片验收。

真实草稿渲染：授权读取优化部署后，同一已保存 v1 草稿在约 20 秒内进入 Worker 渲染，容器 healthy；预览和成片渲染及两项 QC 任务运行完成。QC 将两者开头 0–1.29473 秒静音判为 SILENCE 阻断，未发布成片。局部安静并不足以证明渲染故障，当前规则过严：调整为局部未声明静音保留 QC 警告并在版本详情显示；无效/缺失时长、无法解析的静音检测及非预期几乎全片静音仍阻断，缺失音轨、解码、同步和其他安全执行校验不变。独立边界检查覆盖真实 1.29473 秒局部静音、全片静音和未知时长；`pnpm run check` 通过。下一步部署后对同一草稿重渲染并检查输出，未重发模型。

真实草稿完成：修复后使用镜像 `sha256:69e5f56b8187a27d84291c5375aaa8ce965a01dbbebbff39963ebc1792220c4d`，对同一已保存 v1 草稿重新渲染，没有新增云模型调用。预览和成片渲染、双 QC 均通过；两者显示 SILENCE 提示（开头约 1.29473 秒），不阻断导出。正式工作台导出文件 `4deccd86-68f8-4b4a-8a56-63c342dd5840.mp4`，8,275,803 bytes，SHA-256 `75481623fc3de307ff21ca67693f9714082e1ae7022b9c69b0cc80d6ee2859b8` 与记录一致；ffprobe 为 30.000 秒、720×1280 H.264 + AAC。此结果验证该次无字幕要求的生产路径，不证明用户主观质量、解释字幕、每类素材或全部局部失败场景均已验收。

后续局部容错检查：当前规划中可选 Skill 的 failure 状态不再让其他有效剪辑失败；失败原文保存在模型审计并从绑定的已保存版本投影到详情提醒。未返回或返回空技能评估可继续测量，但任何实际 skill_effect 仍须验证有效技能、来源证据、能力和决策绑定；历史运行保留原门槛。真实失败上下文的定向重放验证了失败保留、非法效果拒绝、空评估可继续与旧规则不变；独立投影检查确认提示只对项目拥有者显示。`pnpm run check` 通过；这一局部恢复尚未以真实 Skill 故障端到端复验，不能泛化为全部局部错误均已恢复。

兼容性补充：将扩展的可选技能失败/空评估策略标识为 advisory-v2，保留真实 v1 草稿所用 advisory-v1 的原始投影。以实际成功模型运行的输入及两轮审计重建，摘要与持久记录完全一致；用实际失败上下文验证 v2 接受空评估和局部 failure、拒绝非法效果，v1 对这些情况仍保持旧行为。合成投影检查警告仅返回给项目所有者；`pnpm run check` 通过。计划继续在生产容器验证该版本对已保存真实草稿的重开，且不把这组定向重放当成真实故障端到端通过。

新容错版本已部署：镜像 `sha256:dc4b5d9ab5febacc7a03d5ee2c24a7e0c077dfc5b98677021a90904a54f31ce6` 与本地规划、技能代码散列一致；容器 healthy，真实项目重开后 v1 的 18 个镜头、可观看和导出状态仍可用。此重开及真实旧运行摘要回放验证历史兼容；advisory-v2 的 failure/空评估分支仅经过定向重放，尚无真实故障端到端证据。

过度约束续查：与局部静音相同，局部未声明黑场或静止画面也可能属于真实素材，而不是不可播放。当前 QC 将这三种局部现象作为用户可见警告；无法解析的检测和未经计划、近乎覆盖全片的异常仍阻断，独立解码、必要流和安全检查保留。定向边界检查覆盖局部、整片及未知时长，`pnpm run check` 通过。下一步以现有真实草稿再次渲染核验最终镜像；不会重新发送模型请求。

QC 验证补充：满幅音频峰值本身不证明失真，调整为可见 CLIPPING 警告；明确配置的响度/真峰值约束仍按原规则执行。`pnpm run worker:qc:test` 初次失败于旧断言仍要求局部静音阻断；已只迁移涉及局部区间的断言为必须含区间证据的 warning，保留整片丢音、缺失轨道、错误身份、执行计划篡改等阻断断言，并新增实际编码的局部黑场、局部静止、整片黑场和满幅峰值检查；该定向 Worker QC 检查现通过，`pnpm run check` 再次通过。没有运行 Stage3 测试。

最终生产复验：最终镜像 `sha256:15edd12786b85cecf1cf6468bec8f115d34450981fc05357bba19938435f59d7` 使用同一项目与“30秒vlog”第 6 条要求，真实 Qwen 规划实际采用 `advisory-v2` 和 `model-ticks-v1`，将时长解释为 840–960 ticks；首轮选片容量 1021 ticks、目标 900 ticks，第二轮提交，合计 329865 tokens，供应商未提供费用。v2 原子提交并完成预览/成片渲染，两项 QC 均通过并显示非阻断 SILENCE 警告；v1 仍保留。v2 Master SHA-256 为 `75481623fc3de307ff21ca67693f9714082e1ae7022b9c69b0cc80d6ee2859b8`，与此前用户可查看的 v1 导出逐字节相同；不据此声称两次创意结果不同或人工听看质量已验收。此次没有触发 advisory-v2 的 failure 分支，其恢复仍仅有定向重放与警告投影证据。

文档核对：`pnpm run docs:sync` 完成并消除 WORK/VALIDATION 的生成漂移；随后 `pnpm run docs:check` 仍因既有 `worker/media-scene-request` v1/v2 同时存在和跨 programme 历史 Evidence 适用性/指纹不一致而失败。这些不是本轮规划契约的第二份 Schema，也不能称为已解决；依用户指示不把历史文档门禁失败用于否定已完成的独立云测。当前轻量 `pnpm run check` 和本次直接相关的 `pnpm run worker:qc:test` 均通过，未运行 Stage3 测试。

剩余范围核对：当前自动规划纠错只覆盖首轮可证明的结构/时间/来源错误及可选音频下载失败；最终创意输出若有局部字幕或音频错误，仍可能整体拒绝，不能宣称所有局部失败都已恢复。后续应在不伪造模型输出、授权和精确时间的前提下，设计有界的最终输出纠错或可追溯部分提交，保留原始响应及清楚的缺项告警，并对实际 Host/持久化/重开进行针对性验证；禁止为通过而静默移除用户要求或放宽权限与来源校验。历史媒体 scene v1/v2 并存及 Evidence 指纹不一致仍是独立既有文档债，不将其计作本次规划契约的并行新 Schema 或云测失败。

最终输出局部纠错补充：对字幕区间、镜头或证据引用及音频区间或镜头引用的明确编译错误，Host 保存原始响应，并在校验响应散列、运行绑定和已测量来源后向模型提供有界修正提示；来源授权、执行和时间校验不豁免。一次生成最多进行一次纠错、总发送上限五次；修正仍无效则保留根因并明确失败，不静默删去用户要求。使用真实 v2 规划记录定向重放，确认可纠正代码进入纠错、来源拒绝不进入纠错、响应篡改被拒绝；这不是实际故障端到端通过。`pnpm run check` 通过；未运行 Stage3 测试。下一步部署该版本并以真实素材和模型复验正常生产路径，故障重试的真实触发仍需单独证据。

最终纠错代码生产复验：部署镜像 `sha256:d68d73a4d229a5e0d1cbed31a20ffc578f2285d75cb2ef6326dad8777e95b81e` 后，使用同一 9 份真实素材和第 7 条“30秒vlog”要求调用真实 Qwen，两次响应累计 339355 tokens（供应商未提供费用），v3 已保存为可观看，预览及成片检查均通过，静音仅为可见非阻断提示，v1/v2 保留。重开项目时工作台缩略图准备超时、Host 负载高且健康探针短暂失败；重复提交基于旧版本的请求被并发保护拒绝，持久记录确认第 7 条只保存一次。真实正常路径通过并不证明字幕/音频错误已在云端实际触发和恢复，也不证明人工视听质量；这两项仍需独立证据。最终 `pnpm run check`、`pnpm run docs:sync` 通过，`docs:check` 仍报告前述既有媒体契约版本和历史 Evidence 问题；未运行 Stage3 测试。

后续提示补强：字幕/音频最终方案纠错成功后，Host 根据已保存模型输入中的失败摘要、请求/版本/时间线绑定及原始失败记录匹配，在版本详情显示相应的复核提示；不把提示投影给其他项目参与者。使用定向投影检查覆盖所有者可见和其他参与者不可见，`pnpm run check` 通过。已补充最终字幕区间错误、纠错及重开后提示的 Host 集成测试案例，但按用户要求未运行 Stage3 测试，故该新增案例尚不能计为通过。检查同时发现 `resolveCreationFeedbackGoals` 仍用文本模式推导镜头数量、灰度、节奏及保留要求并形成部分硬校验；这与由模型解释自然语言的方向存在冲突，尚需以有版本的模型解释和历史回放兼容替代，不应把这项问题标为完成。

提示投影版本已部署镜像 `sha256:d9822b9ea31cb4b16471b3110e94972e63dd78bdc4919c9c1caeaa9308c14798`；重建前确认生产请求无活动模型运行、无活动关键任务。容器健康，真实项目重开后 v3 仍显示可观看；未重新发起付费模型调用。此验证覆盖旧版本重开，不覆盖新提示的真实故障触发。

提示绑定补强：提取可验证的投影绑定检查，要求错误代码、64 位响应摘要、请求、版本及基础时间线唯一匹配；定向检查覆盖正确绑定、缺失/错误摘要、跨请求、跨版本、跨时间线及重复失败记录。相关检查和 `pnpm run check` 通过。该补强在当前工作树中，尚未部署到上述镜像；后续部署时一并验证，不能把前一次镜像重开写成新代码已部署。

环境声局部恢复：新模型运行使用 `ambient_recovery_policy=advisory-v1`，将用户显式环境声动作及其版本绑定到模型输入；无声音分析、无可信事件或事件未覆盖时保留有效初稿，并在对应版本提示用户检查，证据结构损坏仍拒绝。旧模型记录保留原始严格检查。新手动编辑把环境声动作与输入摘要绑定，允许完整指定原音轨和独立环境声要求同时存在；原音轨来源、完整范围、权限及执行证明仍核验，手动版本显示环境声未确认，旧手动重试保持原始输入身份。定向检查验证有/无证据、静音、损坏证据及提示仅所有者可见；`pnpm run check` 通过。按用户要求未运行 Stage3 套件，新增 Host 重开与手动组合案例尚未运行。下一步构建并使用真实素材验证生产工作流，不能将定向检查当成端到端故障验收。

环境声真实云测：生产镜像 `sha256:ea76fe3b1444b1da5f9fdb431ea73754a99854203de70c1aad940b337e862c11` 使用同一真实素材及第 8 条“30秒vlog”要求，并选择保留原素材环境声，真实 Qwen 两轮响应共 329110 tokens（费用未提供）。无可核验环境声分类时 v4 仍已提交，预览与成片检查均通过；版本详情明确显示无法确认环境声、需用户检查，并有局部静音提示。v1–v3 保留。模型路径的实际恢复得到验证，不等于人工听看或确认素材确有环境声；手动精修并存场景仍需独立集成验证。对生成前去掉完整工作区读取的候选优化，在真实只读项目上比较 466 个历史状态、9 份素材及观察记录，选择结果一致，但工作区读取约 4642 ms、直接重复核验约 11524 ms；候选已撤回，不能作为已完成优化。实际工作台重开和调度仍存在高负载及较长延迟，需继续分析。

v4 工作台导出：项目导出目录成片 `5c4f3d63-6535-46f4-85e8-f27a36817b44.mp4` 为 8,505,773 字节、30.000 秒，SHA-256 `7f483f9ed7360ca83159fc659510e8fffab8c759ae2323ce72ce469e41cb5feb`，与 v4 成片记录一致；工作台显示文件已准备好，浏览器下载保存状态未单独核实。另一性能候选改为仅在无异步素材准备/观察且请求序列未改变时复用刚校验工作区，其他情况重新读取；`pnpm run check` 通过，尚未部署或以生产项目验证耗时，不能声称性能已改善。

文档门禁修正：普通 `docs:check` 对历史 Evidence 不适用和已知 `worker/media-scene-request` / `worker/media-scene-result` 的 v1/v2 并存输出明确 UNVERIFIED 警告，不再因这些历史事项阻断普通开发；仅这两组既存版本可被提示，新增或不同版本的并存、缺失 Evidence、当前文档断链和生成漂移仍报错。`--strict-evidence` 仍因现有未解决问题失败，普通通过不代表能力验收。修正 manifest 内已不存在的旧当前渲染契约路径，并允许 manifest 将真实 legacy 文件列为兼容范围；当前产品文档仍不能把 legacy 当作当前契约。完成工作包仍需要自身当前指纹、能力和验收绑定的证据，但不再由独立历史债额外否决，债务保留可见。`docs-fingerprint` 和 `docs-governance` 定向测试通过；治理测试最初因新增债务 fixture 缺少字段及旧的“无债”断言而失败，已修复并重测。普通 `docs:check` 已通过且带未验证警告，严格检查按预期失败；未运行 Stage3 套件。

工作台性能续查：发现收到事件时 `refresh` 可并发启动完整工作区读取，重叠读取反复校验大量历史记录；当前工作树加入合并刷新：活动读取期间的新请求合并为一次尾随读取，错误继续向调用方传播，切换生命周期时不继续排队。定向 `stage2-workspace` 检查覆盖突发请求、尾随更新、错误重试和生命周期切换并通过；`pnpm run check` 通过。该修改尚未部署或完成真实项目性能验证。生产镜像 `sha256:fa98ac5d631f3fa33ce87b01b3141d136076fca965153a421f41b45cd5ac316f` 已重开 v4，环境声未确认提示及两项 QC 通过状态仍可见；复用既有草稿的操作界面长时间显示执行中，模型调用和草稿计数未增加，不应称其完成或断言耗时优化成功。

生产性能修复与复用复验：刷新合并镜像 `sha256:40a86526acdeb67b22bd82c2b9ea953b3c86f0b9f518abb778de94358dae1da4` 已部署。此前服务持续 unhealthy、高 CPU，无活动模型或关键 Worker 任务，数据库在线备份 `pre-refresh-coalescing-20261114.sqlite` 的 integrity_check 为 ok；为恢复服务而重建容器时中断了本代理发起的旧版复用请求。旧进程锁因 PID 复用导致新服务误判，确认项目卷仅由当前容器挂载且新进程没有打开项目文件后，将旧锁保存在导出目录。v4 重开仍可观看且环境声未确认提示保留。新镜像上再次发起已保存版本复用，界面持续显示执行中超过 8 分钟，健康检查仍超时，未新增模型调用或草稿；实际复用完成及性能改善均未证实。真实项目只读单次草稿执行校验约 1948 ms、成片记录校验约 2000 ms，不能据此确定整体卡顿原因。继续保留当前运行现场，后续排查不得把持续运行误记为成功。

复用卡顿定位：隔离项目副本中，旧实现进入完整工作区读取约 4.5 秒后，在反复读取请求状态与渲染校验阶段持续运行，四分钟内未完成。定位到 `readCreationState` 的每次 watchable 检查会依次完整验证历史渲染记录，而生产过程和素材循环反复调用该检查。现改为先对各凭证对象做摘要校验并读取身份，只对当前草稿匹配的凭证执行原有完整来源、时间线、执行和 QC 校验；过期历史版本不再被当作当前播放证明。对同一真实状态的只读隔离比较，旧读取约 11662 ms，新读取约 2555 ms，状态对象散列一致；在隔离副本修改当前凭证后读取仍因对象散列不符失败。`pnpm run check` 通过。独立隔离计时不证明生产复用已完成；新镜像尚待部署及实际验证。前述扫描摘要/路由摘要微优化对完整工作区没有测出改善（约 4434 对 4553 ms），已撤回。

活跃请求守卫优化进行中：完整当前渲染证明在读取/返回时仍执行；制作和渲染过程反复调用的守卫改为核验请求对象散列、模式、项目/请求身份、草稿引用、授权、版本、取消及期限，不在每个素材检查中递归重做旧渲染证明。渲染复用完成前仍重新读取完整凭证和状态。代码与 `pnpm run check` 通过，隔离篡改和真实运行验证尚未完成，不得提前认定安全和性能效果。此前仅筛选当前凭证的镜像生产复测已运行多分钟，尚未完成。

守卫复验：仅在隔离副本中恢复到前一个可观看状态后，完整读取约 2392 ms、守卫约 4 ms；篡改当前渲染凭证被完整读取拒绝，篡改请求状态被守卫拒绝。最初对最新失败状态测试渲染凭证的预期错误，已确认该状态本身不引用可观看凭证并改用上述副本，不能把首次失败记作通过。真实项目副本离线运行实际 Host：工作区读取约 4.9 秒、复用渲染约 17.4 秒，无网络和模型调用。部署镜像 `sha256:70ba00d34216ab82f49aa42271dfbd63b41a3598959c30a917dda34611aaefa2` 后，真实工作台复用已有版本返回“新版本已就绪”；本次没有声称触发了新的模型生成。容器健康检查仍显示 unhealthy，需继续排查，不能把界面成功等同服务健康。

后续健康检查恢复为 healthy，连续四次探针成功；这是完成复用后的观察，不代表峰值负载时不会再次超时。

刷新事件补充：素材预览释放只取消租约并清理暂存，不修改项目内容；工作台过去却为每次释放重新读取完整工作区。现排除这一事件，并保留会话、制作及其他项目事件的刷新；定向 `stage2-workspace` 测试通过。此变更仍在工作树，尚未部署或证明其改善了生产健康检查。

下一步按放宽规则方向处理 `resolveCreationFeedbackGoals` 的自然语言正则硬约束：将语义解释迁入版本化模型协议并保留旧记录回放，结构化保护目标、来源授权、精确时间和事务检查继续由 Host 强制；同步迁移旧协议测试，不以 Stage3 测试作为本次门禁。完整指定音轨与环境声并存的手动路径、最终输出局部纠错真实故障及服务健康仍需独立验证，不因已有正常云测而标记完成。

旧协议夹具迁移继续：音频资源、混合素材和配乐三个集成夹具分别为其六秒请求提供近似区间；完整原音轨与个性化夹具对无整片时长要求显式返回 `none`。产品闭环的无效结构注入由已移除的 `audio_intent` 改为非法 `selection`，仍用于检验结构错误和有界纠错。尚有其他夹具与旧断言待迁移；按用户要求未运行 Stage3 测试，不能把这些修改称为集成通过。

继续迁移渲染、手动草稿和 QC 选片夹具的无时长要求，并更新产品闭环夹具：明确区分原始 2–3 秒区间、至少两秒、局部编辑保留当前时长及后续约两秒要求；断言读取实际模型测量记录，不再期待 Host 使用旧文本规则生成精确预算。上述夹具和断言尚未运行，仍须按当前用户允许的验证范围独立证明。

分离模型和桌面夹具也显式返回无时长要求。`pnpm run check` 通过；对这 12 个被修改集成夹具作 TypeScript 转译语法检查通过，但这不执行测试，也不证明行为正确。分离模型旧环境声用例仍要求未证明时拒绝提交，与新的可见警告策略冲突，必须继续重写并验证；不能仅凭夹具增加时长字段就声称旧协议迁移完成。

生成和规划 Host 夹具补充：覆盖当前约 12 秒要求替代历史 15 秒，以及约 3 秒节奏请求；无时长请求显式标记为 `none`。不再要求旧 Host 在模型调用之前从文字推导 12 秒精确值。上述修改尚未执行 Stage3 集成测试；自然语言节奏、镜头、灰度等正则硬约束及相应旧断言仍需后续迁移。

反馈语义新路径实施中：新模型运行使用版本化 `creation-feedback.v1` 提示解释自然语言和批注，不再把本地正则推导出的镜头、节奏、灰度、重排或保留目标作为阻断；用户显式保护引用及来源、时基、权限、模拟和提交验证继续执行。已查看版本仅提供视频片段身份、起点、时长和时间基，避免额外发送历史字幕或未授权的音频内容；旧模型记录仍使用当时的已绑定输入重放。版本详情向请求所属用户显示模型理解与制作说明，它们是可供检查的模型陈述，不是完成要求的证明。定向投影检查确认仅所属用户能看到说明，`pnpm run check` 通过；生产部署、真实模型质量、局部范围和历史重开仍待验证，旧语义断言尚未迁移。

生产复验进展：镜像 `sha256:e92817fbaeab2206cefec80558c84f14ad52ad8868da672ccb677fe4ed056371` 启动健康并重开真实项目 v4；提交第 9 条保留现有画面和原声、只解释画面的字幕请求后，真实模型首轮因 `CREATION_LAYOUT_REBOUND` 被拦截，原因是声明保留布局的源范围或静态图时长与当前画面不完全一致；没有产生新草稿。现将该明确的可纠正输出加入单次有界模型纠错，原始源范围校验不变，并修复纠错证据与实际发送的素材能力投影不一致；`pnpm run check` 通过。第二次构建、绑定检查及同一已保存要求的生产重试尚在进行，不能将该次云测记为成功。

布局纠错验证：隔离、无网络、只读真实项目的定向重放使用实际失败记录，正确请求/版本/素材及原始响应可生成纠错提示，改动版本或素材不匹配，改动响应字节被拒绝。首个检查脚本错误地在异常消息而非 `code` 上匹配错误码而失败；修正断言后通过。镜像 `sha256:2dc5eb648e247920285593a2bf86f4cbd4a9b96092b79a12669ca66c64c6c810` 已部署并重开项目，备份数据库 integrity_check 为 ok；同一第 9 条要求已通过工作台重试，结果尚待观察。

实际纠错结果：模型在已有纠错提示的首轮和自动有界纠错轮仍返回 `CREATION_LAYOUT_REBOUND`，第 9 条未产生草稿。首个片段的原结束点是 29184/15360，而模型返回 31744/15360。为减少模型抄写负担，新策略在物理规划输入提供从当前 Timeline 和已授权、含画面证据的可编辑片段推导的精确选片提示；无法映射时标记不完整，不合成或直接提交选片，原校验不变。使用真实失败记录重建的 17 个提示均通过现有测量器，目标为 900 ticks；定向测试覆盖视频、静态图、空隙、越界来源及多轨，`pnpm run check` 通过。该策略使用独立输入版本标记以保持历史回放；新镜像构建和真实模型重试仍在进行。

精确提示真实复验进行中：镜像 `sha256:d1dfd67bef28fe5228a12d80f42260f4d877ff0b98f13e61c6dc8b59824fba87` 重开同一项目，并对已保存的第 9 条要求发起重试。真实 Qwen 两轮共 339948 tokens（供应商未提供费用），已提交 v5，模型记录确认收到完整精确提示及先前布局错误，保留布局为 true；输出 17 条 editorial 字幕。比对持久化 Timeline v4/v5：画面来源、位置、时长、增益和音频路由一致，独立音频轨一致，字幕由 0 增至 17。模型解释和制作说明已保存；预览/成片渲染仍在进行，尚不能称为可播放或人工视听验收。此前失败请求的规划输入在当前代码下重建摘要一致。

精确提示真实复验完成：v5 预览和成片 QC 均通过，局部静音为可见提示；版本详情显示模型理解和制作说明，工作台显示新版本已就绪。实际工作台导出 `c9320b9c-6cae-4182-b4de-79faab0c89f1.mp4` 为 8,644,842 字节、30 秒，SHA-256 `2e00348a5127b397715f9984f23932b3e5e717cd3b0fa4499883ef097c654198` 与 v5 Master 一致。浏览器保存状态未单独核实，不声称已经人工听看或确认环境声。与此独立，旧反馈硬约束及环境声集成断言仍须迁移，字幕/音频最终输出失败后的有界纠错真实触发、多声音手动并存和重复失败后的部分恢复仍未通过完整验证。

复核 v5 已保存模型审计：反馈提示正文摘要匹配，正则推导的反馈硬目标全部为空；首轮模型返回的 17 个选片和 900 ticks 与精确提示完全一致，两轮均未出现 `audio_intent`。该次请求未指定已查看版本，不能据此验证已有查看版本上下文的语义质量。

原子快照绑定补强：新环境声 advisory 模型/手动草稿重开时，校验实际 Timeline 摘要及草稿执行引用均属于同一原子提交事件，不再依靠声音是否已证实来间接发现快照被替换；旧记录保持原读取规则。独立 SQLite 检查覆盖篡改快照、错误项目/草稿、缺失和重复提交；真实 v4/v5 的完整草稿读取在只读生产卷上通过。另在无网络隔离副本中将 v5 时间线引用指向改动过的对象，完整重开按 `CREATION_DRAFT_SNAPSHOT_BINDING_INVALID` 拒绝。第一次隔离副本放在不同目录，因原样本记录的绝对路径绑定正确触发 `CREATION_OBSERVATION_SAMPLE_REBOUND`；将副本放回隔离容器中同一绝对路径后完成上述验证。旧环境声篡改断言已改为验证原子绑定；其余旧环境声断言仍未迁移，此补强尚未部署。

补强部署与旧断言迁移：镜像 `sha256:18a530b15fc6fb28f38cc70ba1f4cca5c697c70a9b73f756ba19c56464f3236d` 的存储源码散列与工作树一致，数据库在线备份完整性为 ok；生产容器 healthy，真实项目重开后 v5 显示可以看片，未发起新的模型调用。环境声旧用例已将静音、冻结、淡入、截断的证据判断改为未确认，并新增独立项目中静音草稿提交、提示及重开的集成场景；按用户要求未运行 Stage3 集成测试，新增场景不计为通过。第一次隔离脚本因 heredoc 结束符被传入 Node 而退出失败，换用单独的临时脚本后完整重开及篡改测试以退出码 0 通过。

多声音真实复验进行中：基于 v5 提交第 10 条要求，保留画面、字幕和原声并加入低音量背景音乐，音乐不可用时保留现有内容并说明。首次在模型调用前报 `worker response timeout after 5000ms`，没有产生新草稿；现有调用路径中该原始五秒超时指向 Worker 握手，现场日志不足以证明是进程启动还是主进程调度延迟。握手期限改为有界 30 秒，超时保留根因并明确阶段；等待握手期间可取消单个尚未派发的任务，不终止其他共享请求。定向真实子进程测试覆盖 5.5 秒启动、两个任务共用一个 Worker、取消不派发并通过。`pnpm run check` 初次因迁移后的三处测试 Timeline 类型为 unknown 失败，已补足类型并重测通过；新镜像和第 10 条真实重试仍待完成。

第 10 条重试已使用握手修复镜像 `sha256:bdf3a54281eb327d56c8fa4c6323a3332e4e37bae29e2fc669d695f4523cf30c` 进入真实模型调用，结果待观察。另补充音频资源连接失败、响应流失败、下载超时及缺失响应体的单次有界恢复；受损哈希、长度/范围、权限和取消仍不进入恢复。失败上下文仍要求绑定真实被选资源、原始响应及输入摘要；定向检查覆盖网络、HTTP、空响应、伪造内容、取消、独立清理失败和绑定篡改。测试首次发现已失败流的 cancel 重复抛出同一根因导致聚合错误，现只合并同一错误并保留独立清理失败；另一次类型检查因测试收窄类型后访问 `code` 报错，修正后相关检查通过。该网络恢复修改仍在工作树，未部署或云端验证；重复失败后的部分恢复仍未完成。

### 2026-11-14：可选创作建议与资源故障恢复

- 真实素材的字幕修订已产出 30 秒初稿，预览与母版 QC 通过；不将结构检查误称为人工听感或审美验收。多声音修订首次遭遇 Worker 握手超时，修复共享启动等待与取消后，真实模型两次返回的可选 Skill 建议把 disposition 写进 result，原协议因此阻断整次制作。
- 新运行使用版本绑定的 advisory-v3：保留原始模型响应，忽略并向请求人报告无效的可选建议；有效建议仍逐项验证知识身份、依据和可执行能力，效果绑定、素材身份、授权和时间校验不放宽。历史运行维持原策略。继续使用现有规划交换契约，不建立第二份契约。
- 对音频资源的网络、超时、HTTP 及空响应故障提供有界恢复与可见警告；取消、哈希、权限、资源释放及其他安全错误仍保留根因。真实多声音结果尚待重新部署并复测，不能据此宣称完成。按用户要求不运行 Stage3 测试套件，以针对性验证和真实生产复测代替；旧协议相关测试迁移仍需逐项完成。

多声音真实复测补充：部署 advisory-v3 后，模型首轮选中的音乐来自授权候选，但提交的 122 条匹配依据中包含 1 条不存在的依据，触发 `AUDIO_SELECTION_INVALID`；没有新草稿，v5 保留。将此精确错误纳入绑定原始响应摘要、请求和素材的有界纠正，引导模型仅引用实际证据或明确说明音乐不可用；不放行错误依据或改变资源身份校验。针对性测试覆盖纠正分类与审计篡改拒绝，`pnpm run check` 通过。下一步重建生产组件并复测，不能将此记为多声音通过。

多声音真实复测结果：更新生产镜像后使用同一 9 份用户素材和真实 Qwen 云模型完成修订 10；两轮模型调用共记录 351,979 tokens，模型输入绑定 `AUDIO_SELECTION_INVALID` 的上一轮失败摘要，生成 v6。SQLite 快照逐项比较：v6 与 v5 的视频轨完全相同，包含 17 个画面片段和 17 条字幕；新增一段独立音频，增益 -18 dB。Preview 和 Master 的 QC 均通过，导出母版 30.000 秒、H.264/AAC，SHA256 `2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`。未做人工听感或美学验收，-18 dB 不证明感知上低于原声。真实项目读取和首轮后的本地处理耗时较长，部分缩略图超时，需后续按证据独立排查；旧语义协议测试仍有待迁移，按用户指示未运行 Stage3 测试，不将本次结果扩大为全部能力验收。

### 后续迁移：模型解释与批注目标

- 迁移生成和时长规划旧集成断言：当前自然语言要求由模型解释，未完全满足的可执行草稿可保存并报告；不存在已查看版本时不再假设或拒绝，存在时向模型提供对应版本。显式素材授权、源时间、结构保护和事务相关负面场景保留。
- 批注夹具从实际结构化批注锚点取得目标，不再读取已移除的 Host 推断灰度范围；历史推断函数测试明确标注为历史兼容。当前 Host 移除对恒为空的旧目标结构执行三组无效检查，编译、模拟、渲染能力和安全检查仍在。
- `pnpm run check` 一次因 Windows 在打开生成文件时返回 UNKNOWN 失败；检查磁盘空间和文件可写后再次执行通过。改动涉及的旧集成测试按用户指令未运行 Stage3 测试，不能称为已通过；还需用受授权的非 Stage3 定向验证覆盖当前 Host 流程。此前 v6 云端结果对应移除空检查之前的镜像。

清理后的生产镜像 `sha256:3c66e5709c769cc5622f88b52a2d09c9a6e28d3bab7ef8bd578d94c1c1a9dce1` 已部署；数据库备份完整性检查为 `ok`。重新打开真实项目，界面显示 v6 可观看、17 个画面和 1 个 15 秒独立音频。该镜像中的改动是移除全空目标对应的无操作检查，v6 云模型生成发生在上一镜像；本次重开不构成新的模型调用。`pnpm run check`、文档检查及音频恢复、建议容错、快照绑定定向检查通过，Stage3 测试未运行。

复核提示时发现当前 `creative_brief` 仍陈述已停用的正则灰度目标及其全局保留规则。新运行的 Host 输入改为要求模型结合当前请求和结构化批注解释，并明确报告不确定或未满足项；授权来源、保护引用和精确时间仍是执行边界。旧运行保留其原始输入，历史审计不重写。`pnpm run check` 通过；需要用新镜像和真实模型复测，不能把之前镜像的 v6 当成该提示改动的验证。

新提示云测准备：生产容器重建后项目首次打开出现 `project is already locked`；保存的锁创建时间早于新容器启动，而新容器中的 PID 10 被重新使用。核对没有活动项目会话后，将旧锁原样改名保存在项目目录，再成功打开 v6。当前锁算法仅凭 PID 不能可靠区分容器重启或跨命名空间的所有者；该问题未修复，不能仅凭 PID 差异自动删除锁，后续需设计跨进程安全的持有者验证与恢复。已用新提示对同一项目发起保留画面、字幕、原声和音乐的真实模型续作。

第 11 次修订云测未提交新草稿：模型把已存在的 17 条生成字幕全部标为 `manual_editorial`，但 Timeline 不存在手工创作标记，执行器以 `CREATION_MANUAL_CAPTION_REBOUND` 拒绝。保留手工字幕身份、内容、时间和来源保护；将此精确错误纳入有界纠正，提示模型只有 Timeline 中 `retention_kind=manual_editorial` 的字幕可按手工来源保留。已用实际失败响应、原始规划回执和素材边界重建并验证纠正绑定，v6 保持可用；尚待新镜像云端重测。

字幕身份纠正后的真实复测完成：生产镜像 `sha256:fe596171d90e17c5e85c67a5db705a4a820f9c376b6351eb2f03f2fae22f9bdd` 使用同一素材、真实 Qwen 模型重试修订 11，两轮共 390,353 tokens；已保存输入绑定 `CREATION_MANUAL_CAPTION_REBOUND` 的原失败摘要。v7 的 17 个画面片段和 17 条字幕与 v6 完全相同；独立音乐的素材、物理身份、位置、时长、增益一致，淡入淡出时间数值等价，语义侧车 metadata 有变化。Preview/Master QC 均 passed 且无问题，母版 SHA256 与 v6 相同：`2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`。工作台显示 v7 可观看，但部分缩略图仍超时；未进行人工听感或审美验收。

### 已选可选音频的局部恢复

新运行绑定 `audio_resource_recovery_policy=advisory-v1`：已授权、已测量的候选音频若没有进入最终决定，不再阻止其余有效内容提交；工作台根据已验证的测量回执与最终决定显示“有选中的音频未加入”提示。错误资源身份、角色、授权、源边界和完整性仍拒绝；没有此策略标记的历史运行继续按原规则校验。无新契约。使用真实 v6 选曲回执的离线变体验证了遗漏可继续、历史策略及错误角色仍拒绝，且缺项提示可见；独立音频恢复与 Renderer 定向检查通过。该变体不是实际云模型输出，新镜像与真实端到端仍待验证。

### 可选 Skill 效果归因

当前模型协议中，某项建议声明可执行但没有效果归因时仍会阻断其他有效编辑。新运行绑定 `skill_recovery_policy=advisory-v4`，缺失归因不再阻断直接编辑，且草稿详情指出该建议没有可核验的效果归因；已提供的归因仍严格校验定义身份、版本、依据、字段和值，未授权效果或篡改仍拒绝。无法绑定实际选片的建议不再要求模型编造效果；v1–v3 历史输入保持原行为。定向测试覆盖未提供归因、合法归因、伪造定义及无可绑定字段，`pnpm run check` 通过；当前生产复测仍使用上一镜像，v4 尚未部署或真实云验。

第 12 次修订真实云测：请求保留现有内容并尝试增加环境音，若不合适则说明。首轮最终输出再次误称手工字幕，生产流程记录失败后自动携带绑定纠正提示，第二次两轮模型调用产出 v8；第二次模型用量 389,063 tokens。模型没有选中新音效，并在反馈说明中指出未找到合适环境音；17 个画面与 17 条字幕同 v7 完全一致，既有音频身份、素材、起止与增益一致。Preview/Master QC 均 passed 且无问题，母版哈希仍为 `2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`。此次实际选择了零个新音频，故不能声称云端触发了“已选音频后来遗漏”分支；该分支仅完成真实回执离线变体验证。`advisory-v4` 归因策略尚在工作区，未参与本次运行。

v4 补充验证：在真实 v7 规划记录上构造有效建议但缺少效果归因的变体，新策略可生成最终决定并提示未归因；v3 仍拒绝。开始时发现 Host 输出 Schema 仍将 `skill_effects` 标为必填，已同时修正新策略的输出及物理响应 Schema，保留历史 Schema 重建。追加独立测试覆盖完整两轮规划证明、被篡改响应拒绝以及有效/伪造效果；v2、v3 的三份真实历史记录两轮投影摘要全部匹配。`pnpm run check` 与定向测试通过，v4 生产真实模型复测仍待进行。

归因提示绑定补充：当一次规划包含多个测量时，工作台按最终决定引用的 query_id 查找建议评估；旧版 effect-bindings-v2 继续使用第一轮，缺失或重复绑定仍报错。已用独立测试覆盖选择较早测量、旧版行为及缺失/重复绑定；`pnpm run check` 通过。此提示投影修复尚未部署，运行中的真实任务使用原镜像。

第 13 次修订真实云测：镜像 `sha256:b98e66b28bf5fa8f7ef007fe7ff608dacf26d0fb3dd5cfdd1407354770666e04` 使用用户原素材和真实 Qwen 模型，两轮共 388,940 tokens，运行绑定 `skill_recovery_policy=advisory-v4` 和 `audio_resource_recovery_policy=advisory-v1`。首轮一项可选建议的 result 字段无效，被忽略而未阻断制作；模型未选中新环境音，并在制作说明中说明未找到合适资源。v9 的 17 个画面、17 条字幕以及已有独立音乐的素材、位置、时长和增益与 v8 一致；Preview/Master QC 均 passed，母版 SHA256 为 `2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`，工作台显示可以看片。模型未选择音频，因此不证明真实运行覆盖了已选择后遗漏的分支；缺失 Skill 效果归因仍以真实记录离线变体和定向测试为依据。未进行人工听感或审美验收。当前多轮测量的提示绑定修复在该次云调用启动后完成，需部署并验证历史结果重开。按用户要求未执行 Stage3 测试套件，已迁移的 Stage3 断言不记为测试通过。

部署及重开验证：含多轮测量提示绑定修复的镜像 `sha256:6c969407eea143476fc30313a37652fc0c8cfbd625a32e7a31cd31bae8324312` 已在正常关闭作品释放锁后部署，容器 healthy。真实项目重开后工作台显示 v9 可观看；版本详情显示模型对环境音缺失的说明、可选建议被忽略的提示及预览/成片检查通过。此次只重开现有真实模型结果，没有新的云调用；多测量选择较早回执的分支由定向测试覆盖，不能称为真实云端触发。真实项目重开及缩略图仍有延迟，应作为后续性能问题调查，不以削弱来源与安全校验换取速度。

多资源下载隔离审计：逐项检查发现，单次规划选择多个音频时，当前 Host 遇到第一个可恢复下载错误仍会终止该轮并借助一次整体纠错；第二个不同资源再次失败时可能耗尽共享调用预算。这并非已选资源在最终决定中被遗漏的分支。继续实现时需要将逐项成功测量和逐项失败根因一同绑定当前请求、模型选择及审计记录，供模型看到可用资源并向用户提示；不能伪造测量回执，也不能吞掉取消、权限、哈希或清理失败。新运行提示中原有“每个新选择都必须安排”的句子与 advisory 策略冲突，已改为允许说明后遗漏不合适的选项；历史已保存输入不改。

多资源局部恢复实现：同一轮最多三项选择按顺序获取与测量，收集各项可恢复下载失败和原始错误信息，继续处理其余项；发生非可恢复错误或取消时立即中止。若有下载失败，绑定并保存该轮多个失败资源，排除它们后在既有模型调用预算内重新规划；成功资源可再次被选用，不伪造失败项的测量回执。兼容旧的单项失败记录。定向验证覆盖多项失败与成功交错、模型原始选择及候选绑定、伪造或完整性错误拒绝和取消优先；`pnpm run check` 通过。当前为组件与审计绑定验证，尚未证明生产完整链在多个实际下载错误下恢复，也未证明重新规划一定产生草稿；按用户要求不运行 Stage3 测试。

第 14 次修订真实云测失败：部署多资源修复镜像 `sha256:079c37781e366883264ed54ff3c4cec02582fd4dd6f92dcd77c482138b222c41` 后，用现有素材与真实模型要求保留现有内容并尝试两种非人声环境音。第一轮最终方案将首条字幕 57 个 Timeline ticks 表为 57 秒，报 `CREATION_CAPTION_RANGE_INVALID`；系统有界纠正后，第二轮改正时间比例但把生成字幕写成 `manual_editorial`，报 `CREATION_MANUAL_CAPTION_REBOUND`，本次没有提交草稿，v9 保留。模型未选中新音频，本次没有触发多资源下载故障，不能算其云端端到端验证。保留精确时间及手工身份校验，在新运行输出说明中同时给出实际 RationalTime 基准和手工字幕身份规则；定向验证及 `pnpm run check` 通过，待部署重试。此前日志的两条失败按时间顺序是范围错误、然后手工身份错误。

第 14 次修订在字幕提示修复后真实重试：部署镜像 `sha256:eccde658d596387621b5dba5960afaf65bdb0a0efc5608304c09363369ecee99`，重用同一请求和素材，真实模型两轮生成 v10；字幕均为 editorial，未再触发上述字幕范围或手工身份错误。模型选择的新音频资源为空，说明授权库没有适合的环境音，因此没有加入新声音；Preview/Master QC 均 passed，母版 SHA256 `2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`，工作台显示 v10 可看片。该结果与 v9 母版字节一致，不证明新增两种声音或多资源下载故障恢复；后者仍只有隔离定向验证。未进行人工听感验收。

多资源失败端到端定向验证：新增 `tests/integration/creation-multisound-recovery.test.ts`，使用真实 Project Host、模型网关、受控模型响应、临时项目和 Worker：同轮选择两项返回 HTTP 503 的资源与一项真实校验通过的音频，校验两个失败均进入绑定诊断、纠正输入排除失败项且允许重选成功项，最终保留该音频、预览及母版 QC passed，关闭重开后 Timeline 和缺失资源警告保留。该测试是独立集成测试，未运行 Stage3 测试套件；模型和失败响应受控，不能称为真实云端同时发生多项下载故障。测试及 `pnpm run check` 通过。

第二轮资源故障恢复：此前自动恢复只接受第一轮选曲失败，已扩展到第二轮测量，并在引用失败轮之前重建前一轮的投影、原始响应、测量和音频回执，校验失败轮输入、身份和测量；失败资源仍须属于该轮真实选项。工作台重开警告按实际失败轮而不是固定第一轮绑定。第二轮测试先给出容量不足的第一轮，再在第二轮让两项下载失败、一项成功，纠错后保留可用声音，预览/母版 QC 和重开通过；篡改前轮输入摘要被拒绝。首次测试使用可行的第一轮，触发现有“仅不可行时允许再次测量”限制，已将测试前提改为实际合法的不可行首轮，不将该失败记作实现通过。受控模型和资源响应，尚需生产部署及真实模型验证；不运行 Stage3 套件。

第二轮恢复修复的生产复验：镜像 `sha256:ebc34d71b8b1a192e82274470c0cd90c01ac0492c352474fa0744e4a1a18443b` 部署后，以真实用户素材和真实 Qwen 模型提交第 15 次要求；两轮生成 v11，工作台显示可看片。模型选择的新音频为零，说明授权库缺少适合的非人声环境音；保留 17 条字幕和 1 条已有独立音乐，未新增音效。Preview/Master QC 均 passed，母版 SHA256 `2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`，与 v10 一致。此真实运行未触发第二轮资源失败；该分支验证是独立受控端到端测试，不能称为真实云故障复现。未进行人工听感验收。

连续局部故障恢复：此前资源故障只允许一次纠错，随后字幕等可纠正输出错误仍直接终止，即使五次总调用预算有剩余。现改为在共享五次物理规划调用内的有界循环，只有至少剩余测量与最终决定所需两次调用时才启动新一轮；每次诊断独立持久化，按失败状态序列选择最新纠正上下文，同时保留同一绑定下的资源故障并排除失败资源。保存草稿及重开时分别显示字幕和资源提示。独立 Host 集成测试以两项资源失败、可用资源成功、下一轮字幕越界、再纠正的顺序完成五次调用，最终保留音频、预览和母版 QC 通过，重开提示保留；重复字幕错误时恰好五次后停止且 Timeline 未提交。两个场景的模型和故障受控，`pnpm run check` 通过；代码待部署真实复验，不运行 Stage3 测试。

连续纠错修复的生产复验：镜像 `sha256:146294c0ea5fbd9aeb51512d074a9a6a5ade200fd17ca9d2ef47a095bd9ad25e` 以真实素材、Qwen 模型执行第 16 次要求，两轮生成 v12；模型未选中新环境音并说明无合适授权资源，保留 17 条字幕和现有音乐。Preview/Master QC passed，母版 SHA256 `2b6836b3754073483c157ba4534751e8b375afa3a6a89f91c4f790a766d50b13`，工作台显示可看片。此运行没有触发连续故障，不能取代其受控 Host 端到端及预算耗尽测试；未进行人工听感验收。

无音频授权的画面字幕首稿验证：新增独立 Host 集成场景，首次使用无音轨图片、不授权音频、模型依据画面输出 editorial 字幕，并检查真实 Preview/Master 及关闭重开。首次运行暴露工作区读取缺陷：虽然草稿已提交和渲染，未启用音频库时仍强制寻找音频测量回执，报 `CREATION_AUDIO_WARNING_INVALID`。修复为仅在输入中存在音频库时投影所选资源警告；有音频库时的完整回执验证不变。修复后该场景和连续多声音故障集成场景、`pnpm run check` 均通过。该测试使用受控模型响应；尚待部署及真实环境复验，未运行 Stage3 测试。

真实无音频首稿复验首轮失败：新建独立作品，从用户上传素材中选取一张真实图片，声音分析和自动配乐均未启用；真实云模型首次选择该图片时保留了正确 asset/span 和 still 显示时长，却给静态图使用含 start/end 且缺少 image 类型的时间范围，测量器以 `CREATION_PLANNING_IMAGE_INVALID` 拒绝，没有草稿。授权记录仅含 request、timeline、evidence、frames、feedback，未授权音频或转写。新增针对该精确错误的绑定有界纠正，要求模型复制图片身份、使用 image 形状及 still 时长，保留测量校验；独立首稿集成测试复现同类错误并验证自动纠正、字幕、渲染及重开通过，正常首稿和 `pnpm run check` 通过。实际模型重试仍待部署，不把模拟结果称为真实云通过。

真实图片纠错复测仍失败：第 2 次要求的模型多次忽略纠正，将静态图写成带 0–1 秒或 0–0 秒占位范围的时间素材，预算耗尽，没有草稿。新增版本绑定的 `image_source_choice_policy=static-placeholder-v1`：仅当选择明确为 still、起点为零、终点为零或一秒，且 asset/span 唯一匹配当前获准并有视觉观测的静态图时，将无意义占位范围解析为该图片身份；保留原始模型响应，实际显示时长仍由 still ticks 决定。其他范围、非静态时长和错误身份不适配，原始执行与授权校验保持。独立 Host 集成测试验证原始响应未改写、最终计划为静态图、无音频授权的字幕渲染与重开通过，以及旧输入、错误身份和其他范围不适配；连续多声音恢复和 `pnpm run check` 通过。适配版本仍待生产真实模型复测。

第 3 次真实无音频图片首稿：模型完成两轮规划并提交 6 秒、含画面说明字幕的 v1，未授权或使用音频分析；渲染未通过 QC，草稿仍可编辑。排查发现该 JPEG 内含不同尺寸的预览图，而无扩展名原件被 FFmpeg 自动识别为图片字节流，错误地将预览图作为后续帧触发滤镜重置，导致编码器返回成功但视频为零帧。静态图片输入现明确指定 image2，保留 QC；真实素材单帧定向验证有视频输出，合成首稿集成回归通过。完整成片复验仍待执行，不将单帧结果视为通过。

真实首稿渲染恢复：在生产容器中重试已保存的 v1，未再次请求模型，Preview 与 Master 均完成并通过 QC；工作台展示实际预览、字幕和 6 秒时长，播放控件进入播放状态。母版 SHA256 为 `ce0c2d367835279f478d366abf8f5d12f907ffbbd914647d19e704a6755c6804`，已导出到本地供查看。生产使用的是 image2 修复；随后 Windows FFmpeg 回归发现无扩展名图片还需指定解码器，已按文件内容选择受支持的解码器；合成的带内嵌预览 JPEG 完整渲染 30 帧，无音频字幕首稿回归通过。解码器补充修复待生产部署验证；本次没有人工审美或逐帧内容验收。

解码器补充修复已部署到镜像 `sha256:a08cfcc40dee21876e5bc3c80826db4259c53a25c44a3af1cade9b7c7de8fda3`；作品关闭重开后仍显示 6 秒可播放预览。最终镜像针对同一真实素材和保存的 RenderGraph 执行了单帧编译编码，明确选中 mjpeg 并输出有效视频帧。重开后沿用了既有完整成片，不能将其记为最终镜像的完整重新渲染；完整 Preview/Master 及 QC 通过对应上一镜像。Windows 独立回归以无扩展名、附有不同尺寸 JPEG 的合成素材输出 30 帧。未运行 Stage3 测试套件。


2026-11-14 文档入口对齐：依用户决定，以本计划为唯一当前执行计划；在现有 Stage3 programme 登记语义工作包，原 P4 包退出活动状态并保留历史和未完成事实。历史段落不再作为当前目录事实或阶段门槛。本次仅对齐文档与登记，未开展产品验证。

文档对齐验证：`pnpm run docs:sync` 通过；`pnpm run docs:check` 退出 0，报告媒体协议双版本、历史 Evidence 适用性和指纹为 UNVERIFIED，文档一致性通过不表示能力验收。生成的 STATUS/WORK 指向语义工作包。

2026-11-14 当前镜像完整渲染复验：确认运行容器镜像为 `sha256:a08cfcc40dee21876e5bc3c80826db4259c53a25c44a3af1cade9b7c7de8fda3`；使用正式 `project.creation.render` 接口和新的操作 ID `render-revalidation:7d395a30-fe33-4f88-a70c-c25bfe761eef`，对已保存的真实图片 v1 草稿重新执行，未请求模型。Host 返回新渲染 `render-452c05999726788ed3715004`；随后从工作区重新读取该渲染记录，Preview 与 Master QC 均为 passed，均有非阻断 `AUDIO_VIDEO_STREAM` 警告（该作品原请求未使用音频）。两者输出 SHA256 均为 `ce0c2d367835279f478d366abf8f5d12f907ffbbd914647d19e704a6755c6804`，与上一镜像保存结果一致；独立操作 ID 与新回执证明本次执行，输出字节一致本身不构成新执行证明。未进行人工审美或逐帧内容验收，不代表语义工作包整体完成。


### 媒体协议迁移：M00 实际基线与调用清单（2026-11-14）

用户授权完成 scene/probe 旧协议迁移。起始 HEAD `d0870122e3fbfd06192297a5eea4bf27f089b61f`；执行前 `git status --short` 显示大量既有修改和未跟踪文件，均保留。唯一当前活动包为 `creative-assistant-stage3/WP-S3-SEMANTIC-FOUNDATION-001`，不创建第二套 programme。

| 入口 | 当前运行与消费 | 后续迁移边界 |
| --- | --- | --- |
| `ProjectHost.inspectMediaCandidate` | `media.probe.v1` 的 `outputs[].value`；指纹另行获取 | 先绑定可信 digest，v2 文件凭证完整校验，保留 image/audio/video 分支和所有原诊断 |
| `ProjectHost` 观察 `project-host.ts:1815` | `media.scene_scan.v1` 返回完整帧与 spans，交 `stage3-creative.ts` 并写观察 | v2 独占 staging，完整校验帧文件；消费中性索引，建立项目拥有的持久内容 |
| `ProjectHost` 精修 `project-host.ts:2158` | 读取缓存或调用 scene v1，验证帧边界 | 禁止复用 v1 分析，迁移到 v2 并绑定身份、取消及清理 |
| Worker `registry.py` | probe 与 scene 的 v1/v2 均已注册 | 在全部调用者迁移验证后撤销 v1 任务与能力，不做隐式回退 |
| `apps/dev-cli/src/main.ts` | 直接消费 probe v1 | 使用 v2 请求和完整凭证，清理 staging |
| `creation-observation.v1.schema.json`、`project-storage.mjs:1487` | 观察合同直接 `$ref` scene v1；持久化对象类型 `creation_observation`、version 1 | 后继观察协议及原子存储；老分析明确要求重建，原项目/时间线保留 |
| `tools/contract-codegen/generate.mjs` | 同时注册 scene v1/v2 schema，生成验证器有索引耦合 | 按 schema ID 核对所有输出后删除旧生成入口，不手改生成文件 |
| Worker 测试 `still_image_bounded_test.py`、`media_protocol_smoke.py`、`mixed_media_acceptance.py`；Host 及架构测试 | 多处 v1 正向任务和安全格式断言 | 保留格式、损坏、资源、安全断言并迁移；按用户要求不执行 Stage3 测试文件 |

核对结果：worker schema 中只有 `media-scene-request`、`media-scene-result` 存在 1/2 两个 current major；probe 只有 v2 schema，v1 是无结构化 schema 的任务。当前 scene v2 同时拒绝 GIF 和 WebP（`MEDIA_SCENE_V2_ANIMATION_UNSUPPORTED`），probe v2 拒绝 JPEG/PNG/GIF/WebP；不能简单替换 task 名。`media-evidence.ts` 已提供文件验证读取器，尚未接入生产调用。后续必须先冻结新分支语义、实现跨 Worker 资源边界并完成所有格式覆盖，再切换 Host；不得用兼容旧 handler、弱化 drift 检查或删除有效测试代替迁移。


媒体迁移 M01/M03 部分进展：probe v2 结果新增明确 `media_kind` 与图像零时序分支；Worker 对真实 JPEG/PNG 使用现有有界图片校验并输出原尺寸、方向和 alpha，移除图像流中虚构时长/帧率字段，NDJSON 保留绑定头尾并允许零时序记录。Host 的 `readProbeEvidence` 核验图像事实、类型和摘要，视频/音频仍要求实际记录。尚未接入生产 Host，GIF/WebP 仍明确拒绝，共享资源租约、动画与旧协议迁移未完成，不将此称为 M01/M03 全部完成。

验证：首次 `pnpm run contracts:generate` 因条件分支的 JSON Schema 缺少 integer 类型而失败；补充类型后生成 121 契约通过。`node --import tsx tests/integration/media-probe-v2-image.test.ts` 通过，真实本地 Worker 覆盖无扩展名 JPEG/PNG、音频/视频、图片无时间行、损坏文件、来源错误与文件篡改；`pnpm run check` 通过（类型、121 契约正反例、架构）。未运行 Stage3 测试套件。

补充验证：伪造图片宽度并同时重算文件及 metadata 摘要仍被 Host 拒绝。`docs:check` 首次因新增测试后的生成 VALIDATION 指纹漂移失败；重新同步后复验，历史 Evidence 与 scene 双版本仍按 UNVERIFIED 记录。

进一步核对：Host 将图片方向校正后的尺寸与 ffprobe 实际流尺寸绑定；测试把宽度改为另一个正整数并重算全部摘要后仍被拒绝。对应独立真实 Worker 测试和 `pnpm run check` 再次通过。


用户最新指令执行：Worker `registry.py` 已移除 `media.probe.v1` 与 `media.scene_scan.v1` 注册及导入；架构检查要求新版并禁止旧任务，独立真实 Worker 测试验证旧任务失败且无输出。注意 Host 目前仍发送 v1，该未完成迁移的工作树处于不可用中间态，不能用于构建部署或称为完成。

`apps/dev-cli/src/main.ts` 的 `inspect-media` 已改为先取真实指纹，再以独占临时目录请求 probe v2、完整验证证据后输出媒体类型及元数据，并在 Worker 关闭后清理临时文件；测试使用真实无扩展名 JPEG，CLI 返回 image、零时序记录，退出码 0。测试还发现 ffprobe 在图片 format 层生成虚构 duration/start_time，现已删除并由 Host 校验拒绝，独立图片测试通过。`pnpm run typecheck` 和 worker boundary 检查通过。待迁移 Host 所有调用、观察合同和存储，动画与安全资源边界仍未完成。

增补：`readVerifiedProbeMetadata` 对输入凭证先做快照，在完整验证所有记录和来源绑定后才返回结构化元数据，CLI 复用该边界；图片记录包含与流像素格式绑定的 `pixel_format`，ffprobe 非空错误输出保留为失败。独立测试覆盖 CLI 实际启动及旧任务拒绝，`pnpm run check`、后续 `pnpm run typecheck` 均通过。这些检查不证明 Host 旧调用已切换。首次更新记录时 Python 默认 GBK 解码失败，未写入；指定 UTF-8 后修正。

修复不可用：恢复 `media.probe.v1`、`media.scene_scan.v1` Worker 注册及匹配的架构断言。独立真实 Worker 测试使用实际音频/视频验证现有 Host 所调用的 probe v1 与 scene v1 成功，并保留 v2 图片/音视频、CLI、损坏输入和篡改验证；定向测试通过。此处修复的是本地工作树调用链，未修改运行中的容器或用户项目，不宣称完成全部 Host 用户旅程。按用户要求修复后停止。


恢复迁移进展：新增跨 Worker 的内核锁资源域和受限子进程执行，Windows 使用 Job Object 限制整个任务树；GIF/WebP v2 分支已接入，真实 JPEG/PNG/静态 WebP/动态 GIF/WebP/音视频用例通过。Host probe 已改为指纹绑定、独占 staging、完整文件校验后的摘要；观察与精修发送 scene v2。新增 observation v2 保存文件回执，将 scene 文件与观察、采样、状态一并纳入现有对象事务，重开验证对象引用及内容摘要。素材准备脚本和任务展示已同步。

已执行 `node --import tsx tests/integration/stage3-observation-host.test.ts`：通过真实 Worker 采样、不等长场景、原子发布故障、权限、取消、临时文件清理和历史重开测试，模型响应为 HTTP 夹具。`pnpm run typecheck` 通过；首次生成遇到一次 Windows 文件打开 UNKNOWN 错误，确认文件存在后再执行成功。精修首次验证被既有夹具缺少新 duration_constraint 阻断，现已补齐六秒请求的明确模型解释后继续验证。v1 尚未删除，资源故障/并发、其余调用测试及最终删除闭包仍在进行；不宣称迁移完成。


### 本轮小节点收尾并停止（2026-11-14）

已通过：
- `node --import tsx tests/integration/media-probe-v2-image.test.ts`：真实本地 Worker JPEG/PNG、静态 WebP、动态 GIF/WebP、视频/音频、来源和文件篡改、CLI；旧入口仍保留并验证可执行。
- `node --import tsx tests/integration/stage3-observation-host.test.ts`：v2 观察、真实媒体采样、对象事务、故障回滚、取消、权限、保存重开。模型为 HTTP 夹具，无云调用。
- `node --import tsx tests/integration/stage3-probe-boundary.test.ts`：真实 v2 探测与 malformed/缺失/Worker 错误边界，保持安全结构摘要与根因，不把原始私有路径直接用于错误展示。
- `node --import tsx tests/integration/stage3-precision.test.ts`：真实媒体网格、原子精修、保护、撤销重做、后续模型夹具编辑、双目标渲染/QC 和重开。首次因旧夹具缺少 duration_constraint 失败，补齐明确六秒解释后通过。
- `pnpm run check`：类型、122 契约正反例、架构检查通过。收尾首次类型检查发现已迁移采样测试中的 receipt 缺少显式类型，修复后通过。
- `pnpm run docs:sync` 与 `git diff --check` 通过；diff 提示既有 LF/CRLF 转换警告。

`pnpm run docs:check` 未通过：`multiple current Contract majors: editorial/creation-observation`。保留新旧合同是本地尚未执行删除阶段的施工状态，不削弱检查、不以普通代码检查代替迁移闭包。历史 Evidence 的 UNVERIFIED 警告仍独立保留。

下一步（尚未执行）：
1. 资源域实现目前以整个预算独占租约串行化，Windows Job Object 与 Linux 地址空间约束已写入；需要双 Worker 竞争、排队取消、超时/崩溃、子进程树与租约释放验证，补齐磁盘边界、原始异常传播及平台证据。当前媒体成功用例不证明这些负例已完成。
2. 核对并改善 Host 中性帧索引当前 250000 帧显式内存预算边界；不截断，但仍需完成计划要求的长素材流式消费。观察对象保存已持久化 scene 文件，尚需补充专门的 scene 文件篡改/缺失重开负例以及旧分析重建提示。
3. `scripts/p5/prepare-samples.mjs` 已迁移，未在镜像执行；`stage3-media-evidence-v2` / `stage3-media-sampling` 测试已开始去掉 v1 参照，尚未运行。Python 的协议、混合素材、低内存图片测试以及剩余夹具仍需迁移并验证。
4. 所有必要验证通过后，统一删除 v1 handler/registry/Schema/例子/生成导出和旧观察依赖，恢复唯一 current major，更新现行文档并运行最终检查。

当前停止位置保持新旧 Worker 入口可执行，Host 已调用 v2；不宣称全部格式资源安全、所有历史项目兼容或完整媒体迁移完成。未启动部署、付费模型或用户原素材验收。无测试进程留在后台。

### 恢复迁移后的资源与重开验证（2026-11-14）

用户授权继续并要求同步文档、消除文档错误。修复资源子进程启动前取消、进程启动失败或 Windows Job 创建失败时遗留工作目录；FFmpeg 子进程输出线程启动失败时，先终止并等待子进程，再传播原异常。观察读取时旧对象版本明确返回 `MEDIA_ANALYSIS_REBUILD_REQUIRED`；场景对象缺失或损坏返回 `CREATION_SCENE_EVIDENCE_UNAVAILABLE`，并保留底层错误原因。

Windows 本机 `python apps/worker-host/tests/media_resource_test.py` 四项通过；WSL Ubuntu 上同一文件三项通过、Windows 专属 Job 测试跳过。覆盖预取消、进程创建失败、两个读取线程的启动失败、独立持锁进程竞争时等待取消和超时、持锁进程退出后的再次获取；Windows 额外覆盖 Job 创建失败。最初恢复断言错误预期了 handler 错误名称；WSL 首次运行该版本还因缺少 Pillow 无法导入 handler。现改为用无需媒体库的模块验证取得锁之后的控制流，两端通过。此测试不证明持锁 Worker 崩溃时其解码进程树已被回收。`python apps/worker-host/tests/test_low_resource_ffmpeg.py` 七项通过。`node --import tsx tests/integration/stage3-observation-host.test.ts` 在真实合成媒体、Worker、SQLite 和 HTTP 模型夹具上通过，新增冷重开后的场景文件篡改/缺失、恢复及旧对象版本检测；Timeline 不受影响。`node --import tsx tests/integration/stage3-media-evidence-v2.test.ts`、`node --import tsx tests/integration/stage3-media-sampling.test.ts`、`node --import tsx tests/integration/media-probe-v2-image.test.ts`、`python apps/worker-host/tests/media_evidence_stream_test.py`、`python apps/worker-host/tests/still_image_bounded_test.py` 和 `python apps/worker-host/tests/media_protocol_smoke.py` 通过，均为本地合成或夹具范围。`pnpm run check` 的类型、122 契约和架构检查通过。

剩余边界：资源测试尚未证明两独立 Worker 的实际解码竞争、持锁 Worker 崩溃后的子进程树和租约顺序或磁盘上限；观察生产消费、项目存储重开和精修仍保留完整帧数组及 250000 帧上限，存储发布/重开还会整文件读取。不能直接去掉上限或删除 v1。执行必要闭包后移除旧接口，并重新生成、检查全部当前文档。`pnpm run docs:check` 目前仍因 `editorial/creation-observation` 新旧 major 并存失败；生成内容需在最后一次源码和计划更新后运行 `pnpm run docs:sync`。历史 Evidence 的 UNVERIFIED 提示不等于当前验收。

### 继续迁移：资源崩溃与对象流式 I/O（2026-11-14）

Linux 媒体解码子进程继承资源域内核锁，持锁执行器异常退出时，只要解码子进程仍在运行租约就不会被其他 Worker 抢占；跨平台外层监督租约持续到 Job/进程组终止和等待完成。Windows 本机和 WSL Ubuntu 的 `apps/worker-host/tests/media_resource_test.py` 各通过适用的四项、各跳过一项平台专属测试；Linux 测试实际杀死锁所有者，验证子进程存活时锁仍不可获取、子进程退出后锁释放。该测试没有证明 Windows 宿主整体崩溃的所有终止顺序，也没有证明实际多 Worker 解码的完整内存预算。

观察发布使用既有内容寻址文件的分块准备与原子事务登记，重开通过分块哈希校验场景文件，同时保留工作区身份追踪。`node --import tsx tests/integration/stage3-observation-host.test.ts` 通过真实合成媒体、Worker、SQLite、重开和故障回滚测试；`pnpm run check` 通过类型、契约和架构检查。场景文件复制及哈希已避免整文件读入，但观察和精修仍使用完整帧数组与 250000 帧限制，因此长素材业务流式消费尚未完成。旧媒体入口与观察合同继续保留，不能声称迁移完成或文档检查已通过。


### 唯一媒体协议切换（2026-11-14）

按用户指令直接完成新旧切换：Worker 不再注册旧 probe/scene 任务，删除对应旧 handler、scene 及 observation 旧 Schema 与示例、生成器和公开导出；媒体协议、低资源静态图片及混合素材测试改为真实新版任务。保留旧观察记录需重建的明确错误，项目和媒体原件不删除。新版场景文件仍存在 250000 帧的显式内存边界，长素材流式消费与多 Worker 解码资源闭包尚未完成，不将本次协议切换称为完整媒体迁移。

定向验证：`media_protocol_smoke.py`、`still_image_bounded_test.py`、`mixed_media_acceptance.py`、`media-probe-v2-image.test.ts`、`stage3-media-evidence-v2.test.ts`、`stage3-media-sampling.test.ts` 和 `stage3-observation-host.test.ts` 通过；后者使用真实本地媒体及 HTTP 模型夹具。`pnpm run check` 通过，文档一致性检查通过但保留历史 Evidence 未验证提示。本轮精修定向测试运行数分钟未完成，已中止，不能计为通过；此前记录的通过不代表本轮结果。未部署、未进行真实云模型或用户原素材验收。


### 精修测试耗时定位与修复（2026-11-14）

复现显示此前数分钟无最终输出不等于死锁：原实现完整精修测试最终通过，约 324 秒（开启 CPU 采样）；样本显示重复草稿引用检查、规范化摘要和对象读取占用较多。精修每次读取完整工作区并验证全部历史草稿和渲染，状态守卫逐草稿重复准备 SQLite 查询，渲染后多次完整检查同一凭证，加剧历史增长时的耗时。现改为只读取并校验当前模型草稿绑定的观察、合并草稿的 IR/时间线存在性查询，以及在已完整读取入口后的内部新鲜度检查使用现有 guard 读取；提交、来源、对象摘要和对外完整渲染证明校验保留。

`node --import tsx tests/integration/stage3-precision.test.ts` 修复后完整通过，用时 203.4 秒，覆盖实际媒体、观察、精修、保护、撤销重做、模型夹具续编、预览/成片 QC、保存重开和取消；不代表真实云模型创意验收。`node --import tsx tests/integration/stage3-draft-storage.test.ts` 通过，包含删除 IR 引用或时间线后均拒绝、回滚恢复；`pnpm run check` 通过。时间受机器负载及采样开销影响，仅作本次观察，不作为性能保证。


### 真实素材及云模型验收（2026-11-14）

经用户授权重建 6095，保留数据卷并在导出目录备份三个项目数据库且完整性检查通过。旧作品打开先后遇到旧音频探测帧数组与新摘要字段不一致、旧观察需重建；修复音频证据校验后，为保留旧作品，新建 `真实素材30秒新版验收-2e05c6f1`，使用同一 7 张照片和 2 段视频。首次分析在内存受限进程内因 FFmpeg 自动解码线程资源不足失败；针对受限媒体进程限制线程后继续，同一真实视频的定向检查和资源测试通过。

真实 Qwen 分析产生 46 片段、124 采样、117 证据，并生成 39 镜头、900 帧 v1；预览及成片 QC passed，ffprobe 验证 30.000 秒、720×1280，包含视频与音频流。渲染准备曾因完整探测逐行反复执行高成本授权检查而耗时很长；保持公开逐行读取的撤权检查，在内部必须完成全部读取后才返回的摘要路径按块检查并在 EOF 复核。实际工作台对第一个片段执行后移，保存 v2；v2 预览和成片 QC passed，ffprobe 同样确认 30.000 秒、720×1280，视频与音频流存在。v1/v2 成片导出副本均保存在 exports/real-media-20261114。此次仅验证一个精修动作和机器检查，未完成主观视听评价。

`pnpm run check`、媒体证据和资源定向测试通过。`tests/property/stage3-source.test.ts` 在已有的音频样本夹具边界上失败，未运行到新增音频历史帧数组断言；独立定向验证通过历史数组、新摘要和数量篡改拒绝。项目恢复曾因重启后容器 PID 重用导致旧锁误判，确认锁创建早于新容器后移除该测试项目的旧锁；通用锁根因仍待修复。工作台缩略图及预览准备仍出现较长等待。


### 项目锁、播放与缩略图修复（2026-11-14）

项目锁改为持有操作系统级锁的辅助进程，异常退出自动释放，避免容器重启 PID 复用误判；仍识别未迁移的旧锁并保守处理。Windows 将锁守卫放在作品同级目录，避免打开句柄阻止作品目录改名。定向测试覆盖 PID 复用、并发独占、异常退出恢复、关闭、回收站及永久删除。

播放器的完整来源和渲染验证结果仅在数据库及全部引用文件身份未变时复用，授权过期与原件检查仍执行；验证前后均核对身份，权限变更触发重新验证。素材浏览避免对已验证原件重复计算指纹，缩略图以最多两个并发任务准备。`pnpm run check`、`project-recovery.test.mjs`、`project-storage.test.mjs`、`stage3-close-storage.test.ts`、`stage3-recent-projects.test.ts`、`web-host.test.ts` 和 `stage3-render-host.test.ts` 通过，后者覆盖预览引用建立后撤权和过期。

6095 实际使用 9 份真实素材作品：播放进度由 0 到 10 秒；片段前移保存 v3，预览和母版 QC passed，成片 30.000 秒。已保存作品状态下模拟容器异常退出并重启，v3 无需手动删锁即重开。最终镜像中 9 份真实素材缩略图均显示，观察到全部就绪在打开后约 47 秒内；该数值依赖硬件负载，不是性能保证，仍存在等待。上述真实崩溃及精修运行使用 Linux 版相同锁/播放实现的前一镜像；最终镜像额外调整 Windows 守卫位置并经实际项目重开和缩略图验证。未重新调用云模型，未完成人工视听质量评价。
