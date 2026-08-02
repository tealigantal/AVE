# Render Backend Architecture v1

Backend Adapter 接收版本化 RenderGraph 子图、Capability Registry 快照、输入资产和 profile，返回输出、可重复 output manifest、cache key、结构化错误和 fallback/bake。Registry 记录参数映射、supported capability/version、颜色/alpha 语义与 Preview/Master 限制。错误区分 invalid graph、unsupported capability、missing dependency、input failure、transient execution 与 deterministic QC failure。

FFmpeg 保留为 Worker Host 管理的现有后端；MLT 是候选 adapter，不能接管项目状态。Graphic Bake 接收 GraphicScene 并输出登记媒体；AI Asset 输出可追溯资产，均不能直接改 Timeline。缓存按 graph/input/profile/backend-version 失效，后端差异测试比较同图 manifest、时间和定义的输出容差。

Project Host 生成的版本化 ExecutionPlan 是 adapter 执行授权，不是事后日志。Worker 必须独立重算 semantic hash、target-specific cache key、plan ID 并核对 capability snapshot 和逐节点 resolver decision；缺失或被篡改的 plan 在编译前失败。输出只有在 Host 校验 plan/hash/cache/output SHA 后，才可通过一个原子 Render Bundle transaction 同时登记 Preview、Master、plan、manifest 与 object refs。blocked bundle 只登记两个 target plan 与诊断，不产生媒体结果。

当前经过媒体级测试的 FFmpeg 子集与仍 blocked 的完整 v1 范围，以 CAPABILITY_MATRIX、ACCEPTANCE_MATRIX 和 EVD-20260802-WP-RENDER-002 为准。MLT、Graphic Bake 和 AI Asset 仍不是可用 fallback。
