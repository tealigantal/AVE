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
- `packages/core/render-graph`：以统一 Graph 表达 Preview 与 Master 的渲染语义、来源和能力要求。
- `packages/platform/project-host`：项目会话、领域用例、事务、Timeline 提交、渲染/QC 调度和业务状态查询的权威应用层。
- `packages/platform/project-storage`：Project Host 使用的 SQLite、迁移、锁、WAL、对象引用和持久化适配器。
- `packages/platform/job-engine`：Job 状态、输入哈希、幂等、失败分类、取消、重试和恢复策略。
- `packages/platform/worker-client`：唯一的 Worker 启动、JSON-lines correlation、handshake、progress、result、cancel 和 timeout 边界。
- `apps/worker-host`：协议注册、媒体探测、Proxy/ProxyMap、Render、QC 和分析 Handler；媒体子进程只在此边界启动。
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

Timeline 流程遵循：Command → 内存模拟/校验 → CommitPlan → 单一逻辑版本和事务提交。RenderGraph 从已提交 Timeline 构建；Preview 可以使用 proxy，Master 必须显式引用 original，并在来源不足时阻断。

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
