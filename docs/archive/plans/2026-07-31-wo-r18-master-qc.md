<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R18 Master QC

## 用户可见目标

把 Master QC 从基础可解码/代理来源检查扩展为可观察的交付阻断：解码、音视频流、黑帧、冻结、静音、削波、响度、AV sync、字幕边界、缺失效果、代理使用、分辨率、帧率、时长、导出配置、Sponsor 和 Privacy 要求。

## 约束

- QC 只能消费 Worker 候选结果，Project Host 负责登记和状态权威。
- Proxy 使用必须依据 Asset ID、Object Ref、ProxyMap 或 RenderGraph Source Node，禁止按文件名判断。
- 每个 Issue 必须包含稳定 code、severity、blocker 和证据引用。

## 当前入口

现有 `apps/worker-host` 已有 decode、black/freeze、silence、clipping 和 proxy 基础检测；本工作单补全检测矩阵和结构化阻断回归。

## 当前进度

- [x] ADR-0009 与 QC report v1 Issue 枚举/可选 blocker/evidence 字段已更新，generated clean 已通过。
- [x] Worker 已接入 Probe stream、分辨率、帧率、时长、AV sync、导出 Profile 和结构化上游 finding 检查。
- [x] Worker 已接入真实 FFmpeg black/freeze/silence/clipping 检测；结构化 Asset/Object/RenderGraph 来源可阻断 Proxy Master。
- [x] 合成黑屏/静音、错误分辨率、字幕边界 finding、代理来源和正常媒体回归均通过。
- [x] Project Host `project.qc.issues` 查询与 Renderer 基础 Issue 展示已接通。
- [x] 完成响度、字幕/效果/Sponsor/Privacy 的端到端 Host→Worker 登记、Renderer 展示，并完成全部人工构造边界验收。

## 收口证据

- Host `render(originalPath, qcRequirements)` 将结构化 QC 要求传入 Worker，登记的 render QC report 由 `project.qc.issues` 查询并在 Renderer 展示 blocker/evidence。
- Worker 使用 FFmpeg `ebur128` 真实测量 integrated LUFS；合成测试覆盖黑帧、冻结、静音、削波、响度偏差、AV sync、分辨率/帧率/时长、字幕边界、缺失效果、Sponsor、Privacy 和 Proxy 来源。
- 实际通过：`npm run worker:qc:test`、`npm run typecheck`、`npm run architecture`；下一工作单为 R19 CI，不在本单提前执行。
