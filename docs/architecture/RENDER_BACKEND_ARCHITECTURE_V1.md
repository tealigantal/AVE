# Render Backend Architecture v1

Backend Adapter 接收版本化 RenderGraph 子图、Capability Registry 快照、输入资产和 profile，返回输出、可重复 output manifest、cache key、结构化错误和 fallback/bake。Registry 记录参数映射、supported capability/version、颜色/alpha 语义与 Preview/Master 限制。错误区分 invalid graph、unsupported capability、missing dependency、input failure、transient execution 与 deterministic QC failure。

FFmpeg 保留为 Worker Host 管理的现有后端；MLT 是候选 adapter，不能接管项目状态。Graphic Bake 接收 GraphicScene 并输出登记媒体；AI Asset 输出可追溯资产，均不能直接改 Timeline。缓存按 graph/input/profile/backend-version 失效，后端差异测试比较同图 manifest、时间和定义的输出容差。
