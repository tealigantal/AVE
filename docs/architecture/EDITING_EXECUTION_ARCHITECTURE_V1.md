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
