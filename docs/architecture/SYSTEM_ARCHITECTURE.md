# 稳定架构

本文只描述稳定的架构、不变量和目标边界，不记录当前完成度、工作单或临时验收结论。当前完成度统一见 `docs/current/STATUS.md`。

## 系统边界

目标运行形态由三个主要边界组成：Electron Renderer、Project Host 和 Python Worker Host。Dev CLI 与 Electron Main 都通过 Project Host 使用项目能力；Renderer 不拥有项目状态。

```text
Electron Renderer / Dev CLI
            |
            v
      Project Host  ----->  Project Storage / SQLite
            |
            v
       Worker Client -----> Python Worker Host -----> FFmpeg / FFprobe / 临时产物

Contracts <----- Core <----- Platform <----- Apps
```

## 核心组件

- `contracts/schemas/`：跨语言 JSON Schema 协议源；TypeScript/Python 生成物只能由工具生成。
- `packages/core/timebase`：RationalTime、TimeRange 和时间映射等纯领域算法。
- `packages/core/project-kernel`：项目标识、版本和项目级领域类型。
- `packages/core/media-identity`：稳定 Asset ID、Fingerprint 类型和源媒体范围；文件读取与哈希属于 Platform。
- `packages/core/timeline-core`：Sequence、视频/音频轨道、Clip、Caption、Effect、Audio Routing、Command、Apply/Inverse、校验和 CommitPlan。
- `packages/core/preset-core`：消费 Schema 生成类型的纯数据 Preset 注册表、精确版本/定义摘要、`CreativeSkillOutputV1` typed Preset Selection 业务校验、信任/许可证/素材决策和到普通 Timeline Command 的确定性展开；实际 Command 能力必须逐 Selection 属于声明授权集；不拥有 I/O 或提交权限。未来的 Creative Skill Definition 是上层推理知识单元，不是该执行输出。
- `packages/core/render-graph`：从同一 Semantic Render Manifest 构造
  target-specific Preview 与 Master RenderGraphs，表达各自来源和能力要求。
- `packages/platform/project-host`：项目会话、领域用例、事务、Timeline 提交、渲染/QC 调度和业务状态查询的权威应用层。
- `packages/platform/project-storage`：Project Host 使用的 SQLite、迁移、锁、WAL、对象引用和持久化适配器。
- `packages/platform/job-engine`：Job 状态、输入哈希、幂等、失败分类、取消、重试和恢复策略。
- `packages/platform/worker-client`：唯一的长驻 Worker 生命周期边界；每个进程 generation 只握手一次，以 request/job identity 路由并发 progress/result，且只按显式幂等策略进行 crash replay、cancel 和 timeout 收敛。
- `apps/worker-host`：协议注册、媒体探测、Proxy/ProxyMap、Render、QC 和分析 Handler；媒体子进程只在此边界启动。
- 高级 FFmpeg 执行保持注册表约束：仅显式 overlap 的 Cross Dissolve、注册的 x/y 曲线、定尺寸矩形跟踪位置及已声明的时间/调色/字幕/音频节点可执行；其他高级语义继续由 Host resolver 和 Worker 双重阻断。详见 ADR-0017。
- `packages/features/*`：产品领域 Feature 的公开边界；Feature 之间不直接调用彼此内部实现，由 Project Host 编排。
- `packages/adapters/*`：Web Preview、OTIO、FCPXML、EDL 和桌面文件系统等外部交换边界。
- `apps/desktop`：Electron Main、Preload、IPC 和 Renderer 工作台；只通过白名单 API 访问 Project Host 能力。

## 权威与数据流

Project Host 拥有项目状态和事务边界，并通过 Project Storage 作为 SQLite 唯一写入路径。Renderer、Dev CLI 和 Worker 都不能绕过该边界写项目状态。

媒体流程遵循：

```text
用户选择媒体
  -> Project Host 登记项目意图
  -> Job Engine / Worker Client
  -> Worker Host 生成 probe、fingerprint、proxy、render 或 QC 候选
  -> Project Host 校验来源、哈希、Graph、QC 和权限
  -> Project Storage 登记可接受的结果
```

Timeline 当前流程遵循：`CommandEditIntent` → Project Host Resolve/Preconditions → `CommandEditIR` → 内存模拟/校验 → CommitPlan → 单一逻辑版本和事务提交。Manual、Model、Assembly、Rough Cut 与 Preset 只能翻译到该 Host 用例；command-free Edit Intent 当前仅有 Host-owned `select_evidence` v1 adapter 可进入 `CommandEditIntent`，其他 semantic operations fail closed。该 adapter 必须按批准顺序完整覆盖 Story 的全部 Beat，以 unit-speed RationalTime 证明每个 Beat 的 Evidence ranges 精确等长；素材保留在 disabled reference track，目标必须是唯一 enabled、empty、target-neutral output track。适配器的 exact execution approval、Permission Decision、`CommandEditIR`、Timeline 与 execution record 属于同一外层原子提交；相同 execution ID 可只读重试，rebound 冲突。`CommandEditIR` 与 Timeline 在同一提交中留下对象引用。Project Host 从已提交 Timeline 构建一份 target-neutral Semantic Render Manifest，再构建 target-specific Preview 与 Master RenderGraphs 及各自 ExecutionPlan；两者必须共享同一 semantic manifest/payload/hash。Preview 可以使用经验证并与 Original 关联的 proxy，Master 的 original 必须由 Host 根据当前内容指纹与持久化位置解析，并在来源不足时阻断。

素材身份是流式 SHA-256 内容身份；Original/Proxy 路径、stream facts 与二者关系是独立持久化事实。迁移在项目锁内对待迁移数据库创建一致性备份，并逐 migration 事务执行；失败恢复备份。对象先完成 temp write、文件 fsync、atomic rename 与目录 durability，才允许 SQLite pointer commit。

Creative Context 流程遵循：Contract Runtime 只校验当前 Creative Contract schema → Project Host 直接构造当前 draft 并精确绑定当前 head/version/digest 和审批 actor → Project Storage 写入 canonical content-addressed version/head；旧 schema 输入失败关闭，不存在升级 adapter、双 validator 或双持久化形状。Project Host 仅从已审核 Evidence、精确 RationalTime、当前 Original 身份/文件事实/权限和可选当前 Timeline 组装 immutable Material Evidence Pack。新的素材授权先从 mutable import 读取并创建 Project-owned immutable Original snapshot；Pack、execution 和 execution-bound Render 只绑定该 snapshot 的 exact row/content/policy authority，mutable path 以后只用于新授权或缺失 snapshot 的显式重建。Host 以独占句柄、非链接祖先、单硬链接、no-clobber publish 和事务内 path/handle identity 复核闭合文件与 SQLite 登记；失败补偿只作用于本次创建的同一文件身份。Original 的精确 SHA-256 当前性校验异步委派给 Worker，Host 主线程不读取整段媒体；单次 Pack 列表按 location 去重校验，且 Host 在 record/assemble/read/list 之间共享两任务并发上限，避免无界全文件读取扇出。合同 successor、rights policy 回弹、snapshot 损坏或丢失会令相关 Pack/execution/render stale；路径只参与 Host 内部可用性核验，不进入 Pack。详见 ADR-0024。

Creative Skill 知识流程独立于现有 `CreativeSkillOutputV1` Preset Selection：Contract Runtime 校验 immutable Definition/Evaluation → Project Host 只 pin 仓库内 exact published/trusted/licensed Definition，并以独立项目 control 记录当前 active/retired/revoked 状态 → pure evaluator 重新计算 canonical Contract/Pack digest，核对 Pack 的 project、Contract 和 policy exact edge 后消费 approved Contract 与 current sufficient Material Evidence Pack → Project Storage 登记 Definition pin 和 context-bound Evaluation。Evaluator/policy/object version 均由 Host 固定，调用方不能声明权威 provenance；withdrawal 保留历史 Definition/Evaluation 可读但阻断新使用并将旧 Evaluation 标 stale。Definition/Evaluation 只允许 Direction/Story/Decision/semantic Edit Intent proposal output kinds；执行形状字段失败关闭，自由文本只是不透明数据，永不送入 Worker、Renderer、shell、模型或 backend resolver，任意外部/项目内 Definition 即使能作为历史数据存储，也不能绕过当前仓库目录精确匹配获得使用权。任何评估结果都不创建 Preset application 或 Timeline 版本。详见 ADR-0020。

Duration Blueprint 流程是独立的只读可行性边界：Contract Runtime 校验 30 秒、60 秒、2 分钟、5 分钟、10 分钟和 30 分钟六种 immutable profile → Project Host 只 pin 当前仓库内 exact published/trusted Blueprint，并要求 exact current approved Creative Contract 与 current sufficient Material Evidence Pack → editorial-core 使用整数分数交叉乘法校验 RationalTime、beat/role budget、ending reserve 和 acceptable variance，再按固定 role 顺序确定性分配 → Project Storage 以 Blueprint/Contract/Pack 三组 version+digest edge 和 Host-owned allocator/policy version 持久化 immutable feasibility。相同 exact context 幂等复用；Contract head、Pack 当前性、Blueprint catalog 或 Host authority 改变时读取结果为 stale。该路径不调用模型、Worker、Renderer 或执行适配器，也不写 Story、Timeline 或 Preset。

Stage 2 权限流程是每个 Creative Context、Evidence、Skill、Duration、Direction、Story、Decision 和 semantic Edit Intent Host 用例内部的强制前置门禁，而不是调用者可选的旁路授权 API。自治操作的 actor 由 Project Host 固定派生；人审操作只接受 Host 已持久化的 approval ID，approval 必须由构造时注入的可信对象能力审核通道签发。记录绑定当前内置 policy snapshot、完整 effect digest、exact subject/context refs、候选集合、数据字段、作用域和 Host 时钟 expiry，业务 payload 不能声明 actor、role、capability、permission 或 provenance。Host 先完成全部业务预检和 permission evaluation；拒绝与后续业务冲突不登记 Permission Decision，成功用例才保留 content-addressed Decision/edges。查询执行同一纯 gate 但不写审计状态。semantic Intent approval 仅批准 proposal；独立的 `editorial_edit_intent.execute` approval 才可授权一个当前重新编译并精确绑定的 Timeline effect。详见 ADR-0021、ADR-0022。

Stage 2 桌面 Product workspace 只消费 Project Host 在同一存储读取边界内生成的白名单快照：Goal/Contract、Material/Evidence、Story/Direction 和 Review/Timeline 四个视图共享一个 workspace digest 与 exact object/version/digest refs。投影不包含原片路径、存储行、可执行 Command 或审批 credential；公开媒体列表也只投影 `original`/`proxy`，内部 `immutable_original` 与未知 location type 留在 Host。Renderer 只用 text-safe DOM 展示和缓存查询结果。后果性 Product action 必须先在 Electron Main 的 native modal 中显示 exact action/effect/targets/workspace/reason，默认取消；只有确认后 Main 才能使用未导出的对象能力 credential 进入现有 Host human channel。Render 只在 exact execution ID、Timeline、semantic graph、source identity、Preview/Master plans 和 current immutable Original/policy 全部匹配时显示为 current；feedback 的 diagnosis/base Timeline/target 任一变化即 stale，并清空 Renderer-only 局部预览。详见 ADR-0023、ADR-0024。

Preset 流程遵循：Project Host Contract Runtime/AJV 校验 → `CreativeSkillOutputV1` typed Preset Selection → Preset Core 业务校验/路由/确定性展开及实际 Command 能力授权 → Project Host 使用持久化 Worker 媒体身份构造 target-specific Preview/Master RenderGraphs 与各自 ExecutionPlan，并校验二者共享同一 target-neutral semantic payload/hash → Timeline 与不可变应用记录同事务提交 → 正式 `renderTimeline` 通过 Worker 重新 probe 实际 Original/Proxy、忽略调用方音频声明并核对持久化 Original 权威 → 在 Worker render 提交前把记录的语义节点逐一链接到实际 Preview/Master ExecutionPlan → 两个 output manifest 持久化 candidate/actual source 与 plan 身份。Preset 声明的语义子图只用于授权 Command 和校验 Preview/Master 决策，不能注入 RenderGraph。缺失 Original、Proxy 映射、相互矛盾的 Original/Proxy 音频 probe、被 enabled/muted/solo/routing 排除的音频或任何身份状态时失败关闭；失败或隔离状态登记 blocker 记录而不修改 Timeline。

Model Gateway 只生成经过 Contract 校验的候选和审计元数据；模型输出不能直接提交 Timeline 或覆盖项目权威状态。

## 不变量

- Project Host 是项目状态唯一权威；SQLite 只有 Project Host 写入。
- Contracts 是跨语言协议唯一来源；生成文件禁止手工修改。
- 所有权威时间使用 RationalTime，不使用浮点秒表达协议时间。
- Renderer 不直连 SQLite、原片、shell、FFmpeg 或模型 SDK。
- Worker 不打开或修改 `project.sqlite`，stdout 只输出结构化协议消息。
- Renderer 不持有权威 Timeline、Job、QC 或模型状态。
- Timeline 只能通过 Command/Commit 流程修改；失败 Command 不产生部分提交。
- Master 不能使用 proxy 冒充 original；缺少原片回链、能力或 QC 条件时必须显式阻断。
- 外部格式导出必须经过 Adapter 和统一 Validator，不能绕过领域约束。

## 安全与信任边界

Renderer 只获得受限的 Project API。Electron sender、窗口身份和当前 Project Session 必须被校验。Worker 只能获得执行任务所需的输入和临时工作区，不获得 SQLite 写权限。模型、媒体和外部文件路径都必须经过 Project Host 的权限、来源和协议检查。

## 目标边界

P0 的目标是建立真实媒体从导入、Timeline 提交、RenderGraph、Worker 执行到 Master/QC 的可恢复闭环。Story、Evidence、Review、Delivery、Export、生产模型和复杂桌面体验都必须建立在这个权威边界之上，不能通过额外的旁路状态绕过 P0。
