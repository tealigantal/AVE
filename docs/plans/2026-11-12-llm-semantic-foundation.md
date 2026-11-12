> 唯一当前执行计划。最新指令：补齐媒体契约迁移的详细任务并同步远端，本轮只编辑计划，不实施迁移或产品验收。

# LLM semantic foundation — implementation plan

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

The user removed the old programme directories, stage work orders, STAGE3_PLAN.md and all prior files under docs/plans. A subsequent read-only check found only this plan remaining and confirmed the new programme, Evidence, decisions and generated-current directories remain present. Historical product acceptance is not inferred from deletion.

## 媒体契约唯一新版迁移：M00–M08（新增，全部待实施）

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

contracts:identity包含roundtrip/生成，重复不是刷绿而是现有脚本结构；若脚本变化先说明新检查覆盖。追加M06新资源租约、Host事务故障用例的实际命令。带stage3名字的现存测试可按代码覆盖使用，名字不意味着重新启用旧工作包或旧验收门槛。不要启动stage3:check/P4/P5整包、真实云调用、原用户媒体验收、Docker部署；本轮范围不需要它们。

出现失败先保留首次日志并找根因；不弱化断言、不删除失败用例、不改文档门禁为警告。docs:check的multiple current Contract majors必须真实消失；若新增其他失败，记录具体代码/文件，不写“全通过”。

最终Evidence至少包含：唯一新版合同清单、旧入口删除清单、M00调用表最终状态、媒体矩阵、两平台资源检查范围、Host真实收发与重开证据、故障原子性、所有命令结果、未运行的真实媒体验收。迁移子任务完成不代表LLM基础设施整包完成，不能调用docs:complete提前关闭该包。更新本计划M00–M08状态后停止等待审核。

### 授权、远端及恢复边界

本次只补计划并同步该文件。生产代码/契约及大量既有dirty改动不包含在本次提交；远端检出必须先检查其实际基线与本地工作树差异，不能假设本计划描述的候选改动已随计划推送。新执行者从M00恢复；若尚无新programme按M00登记，禁止重启旧包。不要恢复已删除旧计划来补信息，本节是媒体迁移的完整执行入口。

新旧迁移中间状态不得部署。若中途失败，保留用户原文件和未提交工作，在本文件记断点；不重新开启v1以宣称恢复成功。提交/推送本计划已获本轮授权；未来实现的提交/部署遵循届时明确授权，不能由本次文档同步推断。
