# P0 Timeline 与音频渲染正确性

## Purpose / Big Picture

修复当前 RenderGraph → Worker 链路把 Timeline 当作排序后的 concat 的问题，使用户提交的时间轴位置、空隙、显式视频/音频媒体种类、音频延迟与增益成为可观察的渲染结果；同时修复 QC 和根检查门的假绿。

## Context and Orientation

当前权威文档是 `PROJECT_GOAL.md`、`docs/ARCHITECTURE.md`、`docs/CURRENT_STATUS.md` 和 `docs/CURRENT_WORK.md`。R20 的真实素材尝试已证明导入和渲染可执行，但旧状态把错误阈值下的黑帧结果写成了素材全黑。编译器当前按 `timeline_start` 排序后对视频和音频分别 concat，并从视频输入隐式读取音频。

## Plan of Work

1. 修正 QC 黑场区间解析和逐项回归，加入 `check`。
2. 对齐 RenderGraph v1 Schema、examples、生成物与运行类型。
3. 编译显式 Timeline：视频无隐式音频；音频按起点延迟、裁切、增益后混音；空隙为计划内黑场/静音；默认 `contain`，显式 `cover`。
4. 让最终真实验收经 Project Host 渲染并校验持久结果与重开状态。

## Concrete Steps

- 保留工作树现状；所有改动仅在 `CURRENT_WORK.md` 的 Allowed Paths 内。
- 每个阶段先运行最小定向测试，再更新计划、进度和验证记录。
- 生成目录只由 `pnpm run contracts:generate` 更新，禁止手工修改。

## Validation and Acceptance

`pnpm run worker:qc:test`、`pnpm run timeline:audio-caption:test`、`pnpm run timeline-render:test`、`pnpm run worker:render-graph:test`、`pnpm run contracts:check`、`pnpm run contracts:clean`、`pnpm run check`、`pnpm run acceptance:final:synthetic`；存在授权真实素材时再运行 `pnpm run acceptance:final`。验收必须观察黑场区间、输出时长、A/V delta、源回链、Graph/Output hash 和关闭重开状态。

## Idempotence and Recovery

代码生成可重复运行；测试使用临时目录；失败时保留文档中的已验证结果，不删除用户媒体或回滚用户改动。尚未实现的多视频轨重叠/Transition 通过结构化错误阻断。

## Progress

- [x] 发现当前 R20 状态和编译器语义漂移。
- [x] 修复 QC/根检查门。
- [x] 对齐 RenderGraph contract。
- [x] 实现 Timeline/音频/画布编译。
- [x] 完成 Host 真实验收入口改造与文档收口；用户提供的两段真实媒体正式验收通过。

## Surprises & Discoveries

- 当前工作树干净，未发现用户所述的七个未提交文件；本轮不假设这些改动存在。
- Schema 仅声明了基础节点字段，实际 graph 已使用 target/profile/range/source_refs 及更多 node kind。
- 根 `pnpm run check` 原先没有调用 `timeline:audio-caption:test`，已加入；本轮根检查完整通过。

## Decision Log

- 默认画布适配采用 `contain`；`cover` 只有 profile 明确指定时启用。
- 视频 Clip 不再隐式携带音频；音频必须由音频 Clip/Track 表达。
- 计划内空隙通过黑色 base video 与静音音频填充，计划外黑场仍由 QC 阻断。
- Worker Client 对非法 JSON、非法消息、EOF 残行、spawn/close 和缓冲超限 fail-closed；该边界回归通过。

## Outcomes & Retrospective

本轮本机实现门和真实用户媒体最终验收均已通过；完整多音轨矩阵、外部 NLE 和 ffprobe 负载优化仍留在后续边界。

## Artifacts and Notes

本计划不包含媒体文件；真实验收摘要只记录 hash、probe、版本、Timeline/QC/output hash 等结构化信息。

## Interfaces and Dependencies

依赖 FFmpeg `setpts/asetpts`、`adelay`、`atrim`、`amix`、`blackdetect` 语义；不新增生产依赖。跨语言协议来源为 `contracts/schemas/render/render-graph.v1.schema.json`。
