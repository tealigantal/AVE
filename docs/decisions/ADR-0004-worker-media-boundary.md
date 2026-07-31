# ADR-0004 Worker Media Execution Boundary

## Status

Accepted — 2026-07-30

## Context

R05 后 `packages/platform/render-service` 使用 Node `node:child_process` 直接启动 FFmpeg/FFprobe，Project Host 因而越过三进程边界。Worker Host 只有分析协议入口，不能承接媒体任务、取消、超时和候选结果收集。

## Considered Options

1. 继续由 Node Render Service 启动 FFmpeg，并用静态规则约束调用者。
2. 让 Project Host 直接启动 Python Worker 内的脚本或共享数据库状态。
3. 由 `packages/platform/worker-client` 作为唯一 Node 启动/协议入口，Python Worker Registry 作为唯一媒体子进程执行者。

## Decision

采用选项 3。Worker Registry 暴露 `media.probe.v1`、`media.decode_check.v1`、`media.fingerprint.v1`、`media.proxy.v1`、`media.thumbnail.v1`、`media.waveform.v1`、`render.preview.v1`、`render.master.v1` 和 `qc.master.v1`。Worker 在独立临时工作区执行并收集候选输出；Project Host 只通过 Worker Job 获取结果，验证路径、来源类型和 QC 后才登记 SQLite。

## Rationale

这样 FFmpeg/FFprobe、子进程取消和 stderr 不会进入 Project Host 或 Renderer；Worker stdout 可保持 JSON 协议，Host 仍保留项目状态和 SQLite 唯一写入权。`source_kind=original` 是 Master/QC 的结构化来源声明，不依赖文件名判断代理。

## Consequences

- Node Worker Client 仍需启动 Python 子进程，但这是唯一允许的 Node `child_process` 边界。
- R06 只验证单 Job 的运行时生命周期；Job 持久化、重启恢复和重试留给 R07。
- 渲染输出仍是候选结果，RenderGraph/VFR ProxyMap/完整 Master QC 尚未完成。

## Migration

Render Service 改为提交 Worker Job；旧 Node FFmpeg/FFprobe 命令已删除。Worker runtime 增加 handshake、progress、cancel、structured error、timeout、temporary workspace、output collection、cleanup 和 stderr 隔离；架构检查禁止其他 Node Platform/Application 直接引用媒体子进程。

## Rollback

只能通过版本控制恢复 R05 以前的 Node Render Service；不得在新代码中新增兼容直启 FFmpeg 分支。若 Worker 协议失败，应阻断 Render/QC 候选登记，不写入 Project SQLite。

## Date

2026-07-30
