# DOC-011 当前源码适用性复核

2026-11-05 P5接续：新增P5工具与专项测试命中历史工作包的宽泛测试路径，README状态修正也改变相关scope；逐项路径/指纹审计见 `../evidence/assets/mixed-media-p5/current-build-20261105/applicability-audit-r1.json`。本轮分类记录 `EVD-20261105-DOC-011-P5-CLASSIFICATION-R1` 只维护既有历史债务的已审阅范围，均保持UNVERIFIED，不向适用性索引登记未完整验证的能力。P4当前交互记录必须在最终P5真实WIN-09/10执行后独立生成并校验，不能用分类或债务替代。

本独立文档工作范围承接 [DOC-007 GATE](2026-10-03-reliable-workbench-real-acceptance.md#gate全局证据与旧模块处理)。DOC-007 管理本次 P4/P5 产品实施；它不能单独维护本轮已受影响的 editing-execution-v1、creative-assistant-v1 与 Stage3 历史 Evidence applicability，因此依照 GATE 建立此独立范围。这里的结果仅证明所列当前源码范围重新通过其 required tests，不更新历史 Evidence、不接受产品/能力、不关闭 Stage Exit 或 Release。

## 目标

针对 `pnpm docs:check` 实际列出的 applicability 与 latest Evidence 指纹失败，按 capabilityScope 对应实现路径、所属包 required_tests、历史 Evidence 与本轮源码差异，保存当前审计、命令日志及哈希；仅在对应验证完整通过时向 `APPLICABILITY_INDEX.json` 增加 index-only 关联，并在来源 programme STATE 更新相应债务与 Evidence 引用。不得刷新未验证的范围或降低能力状态。

## 允许修改

- 本 ExecPlan、`docs/07-work-orders/README.md`、`docs/evidence/README.md`
- `docs/evidence/APPLICABILITY_INDEX.json`
- `docs/evidence/assets/doc-011/**`
- `docs/evidence/runs/EVD-20261012-DOC-011-EVIDENCE-APPLICABILITY-REVALIDATION.md`
- `docs/program/editing-execution-v1/STATE.yaml`
- `docs/program/creative-assistant-v1/STATE.yaml`
- `docs/program/creative-assistant-stage3/STATE.yaml`
- `docs/current/**` 与 `docs/DOCUMENT_INDEX.md` 仅由 `pnpm docs:sync` 生成

实际产品源码和测试仍归其原工作包；DOC-011 不扩大其修改权。历史 Evidence、历史决策、归档文档、产品源码、合同及 generated bindings 均不可由本 DOC 范围修改。

## 执行步骤

1. 保存 docs:check 失败清单；计算当前受影响 capabilityScope、旧/当前源码指纹差异和每个 scope 的所需验证边界。首轮完整失败输出保存在 `docs/evidence/assets/doc-011/docs-check-failures-20261012-at-start.txt`；包含37个过期 capability scope、latest Stage3 Evidence身份、两项generated drift及一个annotation submit v2/v3当前合同歧义。
2. 对同一必需命令去重后执行；日志逐条保存退出码与 SHA-256。外部模型或私有真实素材不可用时记录缺项，不以索引或默认值伪造通过。
3. 生成 DOC-011 Evidence。每个能力只通过完整覆盖其适用 required_tests 的日志重新登记 applicability；历史人评、Stage Exit、产品完成及其原 Evidence 均保持原意。
4. 更新对应 programme 的 DOC-008 相关 Debt 与 Evidence 引用，运行 `docs:sync` 和 `docs:check`，确认生成结果与真实适用性一致。

## 完成条件

所有本轮 docs:check applicability 与 latest Evidence 身份失败均有当前哈希绑定且 required tests 已验证；合同当前版本歧义单独在所属产品包修复；受影响的正式检查及 DOC-011 审计均通过；历史记录未改写，未验证范围保持显式债务。Evidence 只主张工程适用性复核。

## 2026-10-14 执行检查点

- 已按当前 programmes 重算原 37 个受影响 scope；28 个指纹相较 2026-10-12 审计变化。完整 scope 与所需命令见 `docs/evidence/assets/doc-011/scope-audit-20261014-current.json`。
- 89 个唯一测试命令均已执行：88 项退出码为 0；`stage2-product-workspace:real` 返回明确 `STAGE2_DESKTOP_REVIEW_RETIRED`，按退役入口记录，不写成通过，Stage2 真人审阅债务保持 active。三项本机真实输入复核通过；其日志、每次重试和哈希见 `commands-final-20261014.json`。
- 旧 Stage2 Renderer selector 与 Stage3 导出焦点断言已按现行 UI 修正；相关重试及完整 `stage3:check` 通过。Worker render correctness 使用固定 Python 运行时通过，现行默认留边/显式 crop 断言均保留。
- DOC-011 Evidence 已登记当前指纹关联，索引后的 `pnpm docs:sync` 与 `pnpm run docs:check` 退出码为 0。默认 Python 下的全量检查因 Pillow 版本不符失败；固定 Python 3.12.14/Pillow 12.3.0 后完整 `pnpm run check` 退出码为 0；`pnpm run acceptance:final:synthetic` 退出码为 0，明确只接受合成切片。退出码及日志 SHA-256 见 `docs/evidence/assets/doc-011/current-rerun-20261014/post-index-verification.json`。退役的 Stage2 真人入口保持活动债务，不计入通过。

下一步：DOC-011 的索引后复核已按真实运行结果收尾；P4已由 `EVD-20261015-S3-P4-UX-CURRENT-R3` 正式关闭并完成关闭后的 `docs:sync`/`docs:check`。Stage2 真人审阅债务仍保留；执行范围已交回 DOC-007 接续 P5。DOC-011 不关闭Stage Exit或Release。


## 2026-11-05 P5 产品修复后的分类检查点

当前源码指纹 `e71c44fddf5743d379383036e178cf50c7e91a940eb62aec4e6083704ea57a07` 的 40 项 scope、变更路径与所属包 required_tests 记录在 [逐项审计](../evidence/assets/doc-011/p5-qc-final-20261105/scope-audit.json)。38 项历史范围只登记 [blocked 分类 Evidence](../evidence/runs/EVD-20261105-DOC-011-P5-CLASSIFICATION-R2.md)，现有三项历史债务仍为 active / UNVERIFIED；没有登记通过型 applicability index。两项 P4 当前交互能力不纳入延期分类，仍需当前构建 WIN-09/WIN-10 记录及回执。旧结构化日志绑定另一源码指纹，当前完整 Stage3 检查仍在进行，现有日志不覆盖全部所需检查。

### 2026-11-05 r5 源码重分类

界面及 P5 恢复工具修复后，当前源码指纹为 `ce94604ca78c569b50731871b9f92e91a74c391b60a9fe1a9b8ce3427161bb99`；40 项 scope 的路径、所属包必需检查与新旧指纹见 [逐项审计](../evidence/assets/doc-011/p5-current-r5-20261105/scope-audit.json)。[R3 分类 Evidence](../evidence/runs/EVD-20261105-DOC-011-P5-CLASSIFICATION-R3.md) 继续记录 38 项 active / UNVERIFIED 历史范围；两项 P4 当前交互未延期，也未登记通过型索引。前一轮 Stage3 全量在后续源码改动之前退出 0，最新源码的全量检查尚在运行。

### 2026-11-05 r6 源码重分类

共享输入提示及 P5 恢复工具修复后，当前源码指纹为 `ad63e8f8f0cb16b96b979da9f01b0ff3ce14f662f64aa1936b2121df15c343df`；40 项 scope、所属包必需检查与新旧指纹见 [逐项审计](../evidence/assets/doc-011/p5-current-r6-20261105/scope-audit.json)。[R4 分类 Evidence](../evidence/runs/EVD-20261105-DOC-011-P5-CLASSIFICATION-R4.md) 保留 38 项 active / UNVERIFIED 历史范围；两项 P4 当前交互未延期，未登记通过型索引。此前 Stage3 全量在这轮源码改动前退出 0，不自动证明当前范围。

### 2026-11-05 双语使用说明范围分类

双语 README 更新不改变源码指纹 `ad63e8f8f0cb16b96b979da9f01b0ff3ce14f662f64aa1936b2121df15c343df`，但改变 12 项能力 scope。详见 [逐项审计](../evidence/assets/doc-011/p5-readme-20261105/scope-audit.json) 与 [R5 分类 Evidence](../evidence/runs/EVD-20261105-DOC-011-P5-CLASSIFICATION-R5.md)；10 项历史范围仍 active / UNVERIFIED，2 项 P4 当前交互仍需真实重验，不登记通过型索引。

### 2026-11-05 下载传输回归范围分类

`web-host.test.ts` 新增浏览器下载传输回归后，源码指纹为 `a85cc2d90203bfc62ff775a282fcb16771ae19edf10a65731565948068987387`。40 项 scope 与所需检查见 [逐项审计](../evidence/assets/doc-011/p5-download-20261105/scope-audit.json)，[R6 分类 Evidence](../evidence/runs/EVD-20261105-DOC-011-P5-CLASSIFICATION-R6.md) 记录其中 20 项变化；38 项历史能力继续 active / UNVERIFIED，不登记通过型索引。当前 P4 两项交互仍须真实 WIN-09/10 重验；单项 web 测试不代表完整 P5 通过。

### 2026-11-05 P5 阻断状态使用说明分类

双语 README 与 P5 blocked 状态对齐，源码指纹仍为 a85cc2d90203bfc62ff775a282fcb16771ae19edf10a65731565948068987387。40 项 scope 与所需检查见 [逐项审计](../evidence/assets/doc-011/p5-blocked-readme-20261105/scope-audit.json)；[R7 分类 Evidence](../evidence/runs/EVD-20261105-DOC-011-P5-CLASSIFICATION-R7.md) 记录 10 项历史范围及 2 项 P4 当前交互范围变化。38 项历史能力继续 active / UNVERIFIED，P4 交互仍须真实重验；不登记通过型索引，保留 P5 独立 blocked Evidence 和 Debt。

## 2026-11-08 r15 当前范围分类

当前源码指纹 `3facd97732c18907eb81234dc4755fd423c4caa9e058295bea0906a3a13d9ffb`，40 项范围的当前与旧哈希、相对 HEAD 的路径命中、所属包和必需测试见 [逐项审计](../evidence/assets/doc-011/p5-r15-20261108/scope-audit.json)（SHA-256 `a26d534b5effd2fb53bff580b79cd33a6053bcabdc5ed544092180118416c918`）。[R8 分类 Evidence](../evidence/runs/EVD-20261108-DOC-011-P5-CLASSIFICATION-R8.md) 仅记录 36 项变化的历史范围继续为 active / UNVERIFIED，另两项历史范围未变；不登记通过型 applicability index。两项 P4 当前交互范围不纳入历史延期，仍需当前构建证据。R7 不包含逐文件快照，故新增路径清单不是完整内容差异；P5 当前真实流程和 Stage2 真实素材／时长债务保持独立。

分类后 `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，保留两项当前 P4 交互 applicability 失败以及 38 项历史范围 UNVERIFIED 警告，三个 latest Evidence 指纹失败不再出现。日志及退出码保存在 `docs/evidence/assets/doc-011/p5-r15-20261108/`；这不是全局检查通过。

## 2026-11-08 音频事件 v2 当前范围分类

当前源码指纹 `48fa50966c4005b6a5a06cd8267b6806f02d7541197a64f0d1304d59e4817c2e`，40 项范围的当前与旧哈希、相对 HEAD 的路径命中、所属包和必需测试见 [逐项审计](../evidence/assets/doc-011/p5-audio-event-v2-20261108/scope-audit.json)（SHA-256 `f39017f57d64b99141cd8b3f5df9fc57938f09b865605781db3c001b6dc08437`）。[R9 分类 Evidence](../evidence/runs/EVD-20261108-DOC-011-AUDIO-EVENT-V2-CLASSIFICATION-R9.md) 仅记录 32 项变化的历史范围继续为 active / UNVERIFIED，另 6 项历史范围未变；不登记通过型 applicability index。两项 P4 当前交互范围不纳入历史延期，仍需当前构建证据。R8 不包含逐文件快照，故新增路径清单不是完整内容差异。音频事件 v2 仅提供受限工程链，现有本地候选不产生已验证事件，源轨参与不证明最终可听；P5 当前真实流程和 Stage2 真实素材／时长债务保持独立。

分类后 `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，报告当前合同 `editorial/creation-observation-output` 同时存在多个 major，以及两项 P4 当前交互 applicability 失败，并显示 38 项历史范围 UNVERIFIED 警告。日志和退出码保存在 `docs/evidence/assets/doc-011/p5-audio-event-v2-20261108/`。合同冲突属于现行接口问题，不由历史分类消除；这不是全局检查通过。

## 2026-11-08 音频观察合同迁移范围分类

当前源码指纹 `99c280d0129943719b9fc6aed029853117494148c2345aeef7e7c4407e2c82b6`，40 项范围的当前与旧哈希、相对 HEAD 的路径命中、所属包和必需测试见 [逐项审计](../evidence/assets/doc-011/p5-audio-contract-migration-20261108/scope-audit.json)（SHA-256 `d23b52e887176aef71edef17f730a26158a54ae5df808db060c2fecbcd58d8db`）。[R10 分类 Evidence](../evidence/runs/EVD-20261108-DOC-011-AUDIO-CONTRACT-CLASSIFICATION-R10.md) 记录 19 项变化的历史范围继续为 active / UNVERIFIED，另 19 项历史范围未变；不登记通过型 applicability index。旧 v1 声音观察合同及例子迁入 legacy，当前 v2 与历史兼容仍需各自验证。两项 P4 当前交互范围不纳入历史延期；P5、Stage2 真实素材与时长债务保持独立。R9 未保存逐文件快照，新增路径不构成完整内容差异。

分类后 `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，保留两项 P4 当前交互 applicability 失败，并显示 38 项历史范围 UNVERIFIED 警告；先前当前合同多个 major 的失败不再出现。完整日志与退出码保存在 `docs/evidence/assets/doc-011/p5-audio-contract-migration-20261108/`，这不是全局检查通过。

## 2026-11-08 r19 分类范围

活动 WP-S3-RELIABLE-UX-001 已为 DOC-011 本轮新增分类 Evidence 与逐项审计目录登记精确文档路径：r19 同一源码构建使历史范围指纹变化，须保留逐项核查及未验证状态；此扩展仅用于事实分类，不改业务源码，不替代当前 P4 交互或 P5 验收。

已按 r19 源码指纹 `8ffa9685be25ec9214f7076b5dc499b8abe05e965216d86343af0be78bd1a04d` 完成 40 项范围事实审计，审计文件 SHA-256 为 `6a0d73941accd822dd282a33995ca39c6ea8a83466fc1dca3d61f4a24131fa57`；[R11 blocked 分类 Evidence](../evidence/runs/EVD-20261108-DOC-011-R19-CLASSIFICATION-R11.md) 记录 33 项历史范围变化、5 项未变化，均继续 active / UNVERIFIED。两项 P4 当前交互不延期；未登记通过型索引，也不宣称 P5 或 Stage Exit 完成。R10 无逐文件快照，路径差异不是完整内容差异。

**r19 分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，38 项历史范围为 UNVERIFIED 警告，余下两项失败为 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 的当前交互证据适用性，未出现 latest fingerprint mismatch。原始命令输出、退出码和 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-r19-20261108/commands.json)；此检查不代表完成严格证据门禁。

## 2026-11-08 r20 分类范围

活动 WP-S3-RELIABLE-UX-001 登记本轮 DOC-011 分类 Evidence 与逐项审计目录：r20 固定源码后的范围变化须以当前 scope 指纹审计并保持未验证状态；该文档路径扩展不改变业务源码、不替代 P4 当前交互或 P5 真实验收。

已按 r20 源码指纹 `11b3c173ede97409938176ac0ec90fbf55d5cbaaee4846f0fae52069e522e2dc` 完成 40 项范围事实审计，审计文件 SHA-256 为 `7746c8f447c24a3cf02e34a5b26e22c9fba9bdeb26c5e3ed53d899433bc1ed39`；[R12 blocked 分类 Evidence](../evidence/runs/EVD-20261108-DOC-011-R20-CLASSIFICATION-R12.md) 记录 30 项历史范围变化、8 项未变化，均继续 active / UNVERIFIED。两项 P4 当前交互不延期；未登记通过型索引，也不宣称 P5 或 Stage Exit 完成。r19 无逐文件快照，路径差异不是完整内容差异。

**r20 分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，38 项历史范围为 UNVERIFIED 警告，余下两项失败为 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 的当前交互证据适用性，未出现 latest fingerprint mismatch。原始命令输出、退出码和 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-r20-20261108/commands.json)；此检查不代表完成严格证据门禁。

## 2026-11-09 r22 分类范围

活动 UX 包登记本次 DOC-011 分类 Evidence 和审计目录，记录当前源码改变对既有历史债务的事实影响，不扩大产品范围或替代交互验收。40 项 scope 当前及 r20 指纹、所属包和必需测试见 [逐项审计](../evidence/assets/doc-011/p5-r22-20261109/scope-audit.json)，SHA-256 `49052339a875b9cdeb2f90a3b807f05bccb553807b7fa1245ba10ccbbc322731`；其中 38 项历史范围的 28 项相对 r20 变化、10 项不变，全部仍为 active / UNVERIFIED。两项 P4 当前交互未延期或标记通过；WIN-09 为已接受的未验证风险，当前构建的 WIN-10 仍需验证。分类不登记通过型索引，不完成 P5 或 Stage Exit。

r21 与 r22 两份身份文件的 Docker build-input 清单按逐文件 SHA-256 比较，三项纳入构建的源码发生变化：创作授权确认、创作工作区和工作台动作。该比较不覆盖 Docker 输入之外的测试或文档；scope 指纹仅有 r20 作为上一份分类基线，不将其伪称为 r21 逐文件差异。

**r22 分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，38 项历史范围继续列为 UNVERIFIED 警告，剩余两个失败为 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 的当前交互 Evidence 适用性，未出现 latest Evidence 指纹不匹配。原始输出、退出码和 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-r22-20261109/commands.json)；这不是严格证据门禁通过。

## 2026-11-09 r23 分类范围

活动 UX 包为续期后已有草稿渲染修复登记本轮分类证据和审计目录。以正式 `scopeFingerprint` 计算的 [40 项范围审计](../evidence/assets/doc-011/p5-r23-20261109/scope-audit.json) SHA-256 为 `b398c583de52d58befb3ae49f7e8ec81caa2b84a0cb7685c91ec0dc051f85657`，源码指纹为 `6cdcc738fe77dbfbca3fab1dd365b01a71e83dcf512b5b698813c2a8382e9e89`。相对 r22 的 38 项历史范围中 29 项变化、9 项未变化，全部仍为 active / UNVERIFIED；两项当前 P4 交互不延期、不标为通过。[R14 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-R23-CLASSIFICATION-R14.md) 不新增通过型索引，也不完成 P5 或 Stage Exit。r22 与 r23 的 Docker 输入文件列表仅一项纳入构建的 Host 源码变化；测试等不属于该列表，不能把它当作完整仓库差异。

**r23 分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，列出 38 项历史范围 UNVERIFIED 警告和 `CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001` 两项当前交互 Evidence 适用性失败，无 latest Evidence 指纹不匹配。退出码、原始日志及 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-r23-20261109/commands.json)；这不是严格证据门禁通过。

## 2026-11-09 r24 分类范围

活动 UX 包为声音证据不足提示修复登记本轮分类证据和审计目录。以正式 `scopeFingerprint` 计算的 [40 项范围审计](../evidence/assets/doc-011/p5-r24-20261109/scope-audit.json) SHA-256 为 `ff0dd0835b426f79ad480f71facaf5064e994bc947d64ca62d5a56546669eecf`，源码指纹为 `3e2af2edcbc88b1d3afeb569af4c82b08caa6ba49b36e0787fade46ea5abc594`。相对 r23，38 项历史范围中 24 项变化、14 项未变化，均仍为 active / UNVERIFIED；两项当前 P4 交互不延期、不标为通过。[R15 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-R24-CLASSIFICATION-R15.md) 不新增通过型索引，也不完成 P5 或 Stage Exit。r23 与 r24 的 Docker 输入文件列表仅 `creation-errors.ts` 一项变化；测试等不属于该列表，不能把它当作完整仓库差异。真实原声事件正向能力仍未证明。

**r24 分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，列出 38 项历史范围 UNVERIFIED 警告和 `CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001` 两项当前交互 Evidence 适用性失败，无 latest Evidence 指纹不匹配。退出码、原始日志及 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-r24-20261109/commands.json)；这不是严格证据门禁通过。

## 2026-11-09 r24 测试时序诊断范围分类

活动 UX 包登记本次 DOC-011 分类 Evidence 与审计目录：工作台 Electron harness 原先一次运行在 30 秒门限超时，后为区分检查耗时与进程关闭增加固定标签的单调时间和退出诊断，未改变门限或产品代码；一次独立诊断运行 8/8 通过，但不能推断先前超时的确切阶段。以正式 `scopeFingerprint` 计算的 [40 项范围审计](../evidence/assets/doc-011/p5-r24-harness-20261109/scope-audit.json) SHA-256 为 `a4b18d83198e98acdda2920b6c045bef3631105561cd27b90297c6e4402cce3d`，源码指纹为 `10cd75aca4fb29f97941aac9f772033901e667f5c32e72d421d325848ec6c112`。相对 r24，38 项历史范围中 18 项变化、20 项未变，均仍为 active / UNVERIFIED；两项当前 P4 交互不延期、不标为通过。[R16 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-R24-HARNESS-CLASSIFICATION-R16.md) 不新增通过型索引，也不完成 P5 或 Stage Exit。r24 范围审计无逐文件快照，不能把 scope 差异当作完整仓库文件差异。

**时序诊断分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，列出 38 项历史范围 UNVERIFIED 警告和 `CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001` 两项当前交互 Evidence 适用性失败，无 latest Evidence 指纹不匹配。退出码、原始日志及 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-r24-harness-20261109/commands.json)；这不是严格证据门禁通过。

## 2026-11-09 离线声音评估范围分类

新增离线声音评估工具及测试后，以正式 `scopeFingerprint` 生成的 [40 项审计](../evidence/assets/doc-011/p5-audio-eval-20261109/scope-audit.json) SHA-256 为 `8533407fbefff1a4741afe5ad1b503850c13337642c1ee6bc375608a1e9357db`，源码指纹为 `a9f3c3b5c2385001e366fbf964f3490b37be1552e993ed8dde39b70813aeb464`。相对 R16，38 项历史范围中 12 项变化、26 项未变，全部仍为 active / UNVERIFIED；两项当前交互不延期、不标为通过。[R17 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-AUDIO-EVAL-CLASSIFICATION-R17.md) 不新增通过型索引，也不完成 P5 或 Stage Exit。范围指纹比较不构成完整文件差异，探索性声音样本与模型输出不构成产品验收。

**分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，列出 38 项历史范围 UNVERIFIED 警告及 `CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001` 两项当前交互 Evidence 适用性失败，无 latest Evidence 指纹不匹配。退出码、原始日志及 SHA-256 见 [命令账本](../evidence/assets/doc-011/p5-audio-eval-20261109/commands.json)；严格证据门禁未通过。

## 2026-11-09 原音轨保护范围分类

活动 UX 包登记本轮分类 Evidence 与审计目录。以正式 `scopeFingerprint` 计算的 [41 项范围审计](../evidence/assets/doc-011/p5-source-track-20261109/scope-audit.json) SHA-256 为 `162c3c5857854e657d3e3e929575c17859a8c824a00d9f91f43d5e36667985d8`，源码指纹为 `d4770705c0ba0ffe606794e13f391b1e45e5224b5332f3122811cf659e0e3a6d`。38 项历史范围相对 R17 有 33 项变化、5 项未变，均保留 active / UNVERIFIED；两项当前 P4 交互未延期或标记通过；另有 `CAP-CA-RECON-001` 已匹配现有索引，本轮未重新分类。[R18 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-SOURCE-TRACK-CLASSIFICATION-R18.md) 不新增通过型索引，不完成 P5、Stage Exit 或 Release。单条合并或遗漏声音要求的模型误解仍不能由整轨证明排除。

**分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 退出 1，列出 38 项历史范围 UNVERIFIED 警告及 `CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001` 两项当前交互 Evidence 适用性失败，没有 latest Evidence 指纹不匹配或 generated drift。原始日志、退出码与 SHA-256 见[命令账本](../evidence/assets/doc-011/p5-source-track-20261109/commands.json)；严格证据门禁未通过。

## 2026-11-09 独立原轨范围分类

活动 UX 包登记本轮分类 Evidence 与审计目录。以正式 `scopeFingerprint` 计算的 [41 项范围审计](../evidence/assets/doc-011/p5-independent-track-20261109/scope-audit.json) SHA-256 为 `d9245b607eab8966f37136c839c19dda7bb253242c4723040907cc9212635b95`，源码指纹为 `c2a3a2acb5eb3e0126b2a93698bf2749ddc9163ce1612c6aa57c2e9840b665cf`。38 项历史范围相对 R18 有 30 项变化、8 项未变，均保留 active / UNVERIFIED；两项当前 P4 交互范围变化，未延期或标记通过；另有 `CAP-CA-RECON-001` 未变并匹配现有索引。[R19 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-INDEPENDENT-TRACK-CLASSIFICATION-R19.md) 不新增通过型索引，不完成 P5、Stage Exit 或 Release。范围指纹比较不构成完整逐文件差异；本地受控测试不等于 Docker/Chrome 真实流程验收。

**分类后命令：** 首次 `pnpm run docs:sync` 退出 0，首次 `docs:check` 除两项当前 P4 交互证据适用性外，还报告三个 programme 的 latest Evidence 指纹不匹配：新分类已加入债务但未更新 latest Evidence 指针。将指针指向本轮 blocked 分类后，第二次 `docs:sync` 退出 0，`docs:check` 仍因 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 的当前交互 Evidence 适用性退出 1，38 项历史范围保留 UNVERIFIED，未再报告 latest Evidence 指纹不匹配。两次日志、退出码及 SHA-256 见[命令账本](../evidence/assets/doc-011/p5-independent-track-20261109/commands.json)；这不是严格证据门禁通过。

## 2026-11-09 手动原轨范围分类

活动 UX 包登记本轮分类 Evidence 与审计目录。以正式 `scopeFingerprint` 计算的 [41 项范围审计](../evidence/assets/doc-011/p5-manual-track-20261109/scope-audit.json) SHA-256 为 `433e5695c261c7275ff6b3923732ea0d6749e3db269cb63eb8504b89beca523c`，源码指纹为 `15b6d9e91350d1c79d672eb754ae1e6f51476074c7d8058c2ba2ea5aa57d5c03`。38 项历史范围相对 R19 有 32 项变化、6 项未变，均保留 active / UNVERIFIED；两项当前 P4 交互范围变化，未延期或标记通过；`CAP-CA-RECON-001` 未变并匹配既有索引。[R20 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-MANUAL-TRACK-CLASSIFICATION-R20.md) 不新增通过型索引，不完成 P5、Stage Exit 或 Release。范围指纹比较不构成完整逐文件差异；本地受控测试不等于 Docker/Chrome 真实流程验收。

**分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 因 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 当前交互 Evidence 适用性退出 1，38 项历史范围保留 UNVERIFIED，没有 latest Evidence 指纹不匹配或 generated drift。原始日志、退出码与 SHA-256 见[命令账本](../evidence/assets/doc-011/p5-manual-track-20261109/commands.json)；严格证据门禁未通过。

## 2026-11-09 播放头与同源原声范围分类

活动 UX 包登记本轮分类 Evidence 与审计目录。以正式 `scopeFingerprint` 计算的 [41 项范围审计](../evidence/assets/doc-011/p5-seek-audio-20261109/scope-audit.json) SHA-256 为 `b05f0ca03269f9b753015f09619aa214d66bd31eb6031ebe69e19c557a7765c1`，源码指纹为 `5265f2e54250345a245491303f47d7cc919454a9bcee22c1cb06ee918bf5438d`。38 项历史范围相对 R20 有 30 项变化、8 项未变，均保留 active / UNVERIFIED；两项当前 P4 交互范围变化，未延期或标记通过；`CAP-CA-RECON-001` 未变并匹配既有索引。[R21 blocked 分类 Evidence](../evidence/runs/EVD-20261109-DOC-011-SEEK-AUDIO-CLASSIFICATION-R21.md) 不新增通过型索引，不完成 P5、Stage Exit 或 Release。范围指纹比较不构成完整逐文件差异；本地受控测试不等于 Docker/Chrome 真实流程验收。

**分类后命令：** `pnpm run docs:sync` 退出 0；`pnpm run docs:check` 因 `CAP-S3-P4-DEMO-INTEGRATION-001` 与 `CAP-S3-RELIABLE-UX-001` 当前交互 Evidence 适用性退出 1，38 项历史范围保留 UNVERIFIED，没有 latest Evidence 指纹不匹配或 generated drift。原始日志、退出码与 SHA-256 见[命令账本](../evidence/assets/doc-011/p5-seek-audio-20261109/commands.json)；严格证据门禁未通过。
