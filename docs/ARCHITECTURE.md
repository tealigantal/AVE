# Architecture

## System Context

当前仓库已实现 P0 CLI 垂直切片及 P1-P4 的协议/核心校验骨架；目标运行形态是 Electron Renderer、Project Host 和 Python Worker Host 三个边界。

## Current Runtime Entry Points

当前已存在 TypeScript 包公共入口、Electron Main/Preload 窄边界和 `apps/worker-host/src/worker_host/main.py` 的 JSON stdin/stdout 握手入口；Electron runtime 已通过编译产物启动验证，完整人工 IPC 操作仍待 smoke。

## Major Components

- `contracts/schemas/`：跨语言协议源。
- `packages/core/timebase`：纯 RationalTime/TimeRange。
- `packages/core/project-kernel`：项目 ID/版本领域类型。
- `packages/core/media-identity`：稳定 Asset ID、内容指纹和 PTS Source Range。
- `packages/core/timeline-core`：Timeline/Track/Clip 与纯命令应用、逆命令。
- `packages/platform/*`：基础设施边界声明。
- `apps/worker-host`：不接触 SQLite 的 Worker 协议入口；只接受显式分析记录并拒绝空/非法证据。

## Request, Control, and Data Flows

未来 Renderer → Project Host → Worker Host；当前验证 Worker 的结构化握手、显式 ASR/OCR/Scene 分析记录路径和 Project Host Evidence 持久化，模型调用尚未接入。

## Data Ownership and Persistence

Project Host 是 SQLite 唯一写入者；SQLite migrations、WAL、锁、Object Store 原子写入、Timeline snapshot、Evidence 和导出登记已通过集成检查。Worker 只处理协议输入输出。

## External Integrations

FFmpeg 已用于 VFR fixture、proxy/preview/master 和 QC；ASR/OCR/Scene 已有真实 Worker→Evidence 接线，LLM 生产提供方和平台发布仍未接入，Electron runtime 已完成主进程启动验证。

## Dependency Directions

`apps → platform → core → contracts/generated`；Worker 只依赖生成协议。Core 不依赖平台、应用或基础设施。架构检查当前覆盖最小边界，后续随包扩展。

## Security and Trust Boundaries

Renderer 不应获得 Node/原片/数据库权限；Worker 不应获得 SQLite 写权限。Electron 安全配置属于后续桌面工作单。

## Current Architectural Constraints

单一权威、单一时间基准、Schema 版本化、Command 修改和不可变提交是蓝图中的强约束。

## Known Legacy or Transitional Paths

没有既有实现；本仓库是空基座。当前 Python Worker 是协议占位入口，不代表业务完成。

## Target Direction

按 WO-001 至 WO-015 逐步建立 P0：项目存储、素材身份、Worker、Timeline、Edit IR、RenderGraph、Preview/Master、QC 与真实垂直切片。

## Architecture Diagrams or Textual Maps

```text
Renderer -> Project Host -> Worker Host
                    |-> SQLite (唯一写入者)
Contracts <- Core <- Platform <- Apps
```
