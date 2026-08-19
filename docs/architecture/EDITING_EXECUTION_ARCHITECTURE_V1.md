# Editing Execution Architecture v1

```text
Timeline / Edit IR → RenderGraph V2 → Capability Resolver → Backend Registry
                                                ├─ MLT Backend
                                                ├─ FFmpeg Backend
                                                ├─ Graphic Bake Backend
                                                └─ AI Asset Backend
```

AVE Timeline、Edit IR 和 RenderGraph 是权威；后端只是执行器，不能成为项目状态来源。Project Host 仍是唯一 SQLite 写入者，所有时间仍为 RationalTime，Timeline 改动仍须经 Command/Commit。Preview 与 Master 使用同一语义图，仅输入质量和输出 profile 可以不同。不支持能力必须产生 fallback、bake 或明确 blocker，禁止静默忽略。Skill Library 位于执行原语之上。

所有当前编辑生产者统一进入 `CommandEditIntent → Project Host Resolve → Preconditions → CommandEditIR → Simulate → Validate → CommitPlan → Project Host Commit`。兼容 API 只负责翻译；未来 command-free semantic Edit Intent 需要新的 Host-owned adapter 产出 `CommandEditIntent`。失败检查不得写 Timeline、Command 或关联 artifact。每次成功提交原子保存带 actor、targets、protected/semantic refs、affected ranges、provenance、reason 和 expected effects 的 `CommandEditIR`。详见 ADR-0016。

Resolver 为每节点选择满足 capability、版本、颜色/alpha 语义与确定性要求的 adapter，并记录 backend plan、输入 hash、fallback 链和 blocker。Worker 只执行；结果由 Host 校验、持久化和 QC。

Worker Client 管理单个长驻 Python Worker generation，以独立 request/job identity 路由并发任务。每个 generation 只 handshake 一次；crash 后只有明确声明为幂等的任务可用同一 job identity 重投，非幂等任务进入 blocker。timeout/cancel 先发送取消并等待终态，关闭时终止 Worker 及其媒体子进程树。详见 ADR-0015。

## Preset 与 Creative Skill 边界

Preset Definition 是不可执行纯数据。JSON Schema 是协议唯一来源，生成类型由实现消费，Project Host 在进入 Core 前用 Contract Runtime/AJV 校验外部 Definition 与当前 `CreativeSkillOutputV1`。该输出只能包含有序、精确版本的 typed Preset Selection；`preset-core` 使用受审计 compiler ID 展开为普通 Timeline Commands，并穷举映射实际 Command 能力，要求它们逐 Selection 同时属于 compiler 证明集与当前 Definition 的 execute/fallback 授权集。输出和 Definition 均不能携带任意 Commands、RenderGraph nodes、shell、网络下载、FFmpeg/MLT 串或可执行代码。未来的 Creative Skill Definition 是证据约束的推理知识单元，位于该选择输出之上且不拥有执行权限。

内建定义可执行；project-local 定义必须由 Project Host 精确授权定义摘要；Marketplace 默认隔离。Host 同时检查撤销状态、许可证、content-addressed 素材、构图/时长约束，并为每个声明语义分别记录 Preview 和 Master 的 execute/fallback/bake/block 决策。素材可用性只消费已持久化的 Worker 指纹、验证状态、stat 与 probe，且查询限定为当前 Definition 的 asset ID；Host 不同步读取媒体内容或扫描无关素材。Bake 只有在声明且受信任的素材存在并通过许可证检查时成立。

成功应用使用持久化 Original/Proxy/probe 事实构造候选 Timeline 的真实 RenderSourceRef、target-specific Preview/Master RenderGraphs 与各自 ExecutionPlan，并要求两个 graph 的 target-neutral semantic manifest/payload/hash 相同，再用一个 CommitPlan 在同一 SQLite 事务中登记 Timeline snapshot、Commands、Preset application object reference 和 event。应用记录保留 source identity、plan/cache identity；原子 artifact metadata 不得覆盖对象身份、类型、版本、关系或长度。相同 application ID/内容幂等，不同内容冲突。失败应用只登记 blocker record，不改变 Timeline。定义升级永不隐式发生；迁移必须形成新的 Selection、application record 和 Commit。详见 ADR-0012、ADR-0013 与 ADR-0014。

## Enforced execution boundary

Project Host 必须在提交 Worker 之前生成 schema-version 2 ExecutionPlan。Plan 固定 target/profile、target-neutral semantic manifest/hash、adapter/version、排序后的 capability snapshot、每个语义节点唯一 resolver decision、输入 identity、cache key 与 plan ID。Worker 必须以独立 Python 实现重新计算并验证这些 identity；缺失 plan、额外或遗漏 decision、target/hash/cache 漂移以及 blocked diagnostic 均在 FFmpeg 编译前失败。Host 不允许在 Worker 完成后补写一个描述性 plan。

Preview 与 Master 可拥有不同 source identity、profile、plan ID 和 cache key，但必须共享相同 semantic manifest/hash。不支持的 nested/compound/adjustment、automation、tracked mask 等语义必须产生 blocker bundle，不能降级成空操作。

## Atomic publication boundary

一个逻辑 Render Bundle 是唯一可发布单元。成功 bundle 恰含一个 render run、Preview/Master 两个 result、两个 ExecutionPlan 与两个 OutputManifest；blocked bundle 恰含两个 target plan 和 blocker manifest，且没有媒体 result。Storage 先验证并暂存 content-addressed object，再由 Project Host 在一个 SQLite transaction 中登记全部行。任何阶段失败都回滚数据库并清理新孤儿对象；相同 idempotency identity 只接受相同内容。详见 ADR-0010 与 ADR-0011。
