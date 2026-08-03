# Editing Execution Architecture v1

```text
Timeline / Edit IR → RenderGraph V2 → Capability Resolver → Backend Registry
                                                ├─ MLT Backend
                                                ├─ FFmpeg Backend
                                                ├─ Graphic Bake Backend
                                                └─ AI Asset Backend
```

AVE Timeline、Edit IR 和 RenderGraph 是权威；后端只是执行器，不能成为项目状态来源。Project Host 仍是唯一 SQLite 写入者，所有时间仍为 RationalTime，Timeline 改动仍须经 Command/Commit。Preview 与 Master 使用同一语义图，仅输入质量和输出 profile 可以不同。不支持能力必须产生 fallback、bake 或明确 blocker，禁止静默忽略。Skill Library 位于执行原语之上。

Resolver 为每节点选择满足 capability、版本、颜色/alpha 语义与确定性要求的 adapter，并记录 backend plan、输入 hash、fallback 链和 blocker。Worker 只执行；结果由 Host 校验、持久化和 QC。

## Enforced execution boundary

Project Host 必须在提交 Worker 之前生成 schema-version 2 ExecutionPlan。Plan 固定 target/profile、target-neutral semantic manifest/hash、adapter/version、排序后的 capability snapshot、每个语义节点唯一 resolver decision、输入 identity、cache key 与 plan ID。Worker 必须以独立 Python 实现重新计算并验证这些 identity；缺失 plan、额外或遗漏 decision、target/hash/cache 漂移以及 blocked diagnostic 均在 FFmpeg 编译前失败。Host 不允许在 Worker 完成后补写一个描述性 plan。

Preview 与 Master 可拥有不同 source identity、profile、plan ID 和 cache key，但必须共享相同 semantic manifest/hash。不支持的 nested/compound/adjustment、automation、tracked mask 等语义必须产生 blocker bundle，不能降级成空操作。

## Atomic publication boundary

一个逻辑 Render Bundle 是唯一可发布单元。成功 bundle 恰含一个 render run、Preview/Master 两个 result、两个 ExecutionPlan 与两个 OutputManifest；blocked bundle 恰含两个 target plan 和 blocker manifest，且没有媒体 result。Storage 先验证并暂存 content-addressed object，再由 Project Host 在一个 SQLite transaction 中登记全部行。任何阶段失败都回滚数据库并清理新孤儿对象；相同 idempotency identity 只接受相同内容。详见 ADR-0010 与 ADR-0011。
