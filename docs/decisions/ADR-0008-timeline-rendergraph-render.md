# ADR-0008 Timeline RenderGraph Render Boundary

## Status

Accepted for WO-R10.

## Context

R09 的 Timeline 已成为编辑权威，但现有 Render Service 只对整段 proxy/original 做 stream copy，结果与 Timeline 裁剪和顺序无关。Master 还需要明确阻断 proxy/缺失原片，并记录可审计的渲染输入。

## Considered Options

1. 在 Project Host 直接拼 FFmpeg 命令：会突破 Worker 媒体边界。
2. 为 Preview/Master 分别实现两套效果逻辑：会产生语义漂移。
3. Core 构建纯 RenderGraph，Worker 编译 Graph 为 FFmpeg filter graph，Host 只解析 source refs 和提交 Job：保持三进程边界并共享效果语义。

## Decision

采用选项 3。Graph 节点显式携带 asset/object/source ref 和 source_kind。Preview 可选择 proxy 或显式 original fallback；Master 只接受 `source_kind=original` 且存在的 original ref。Worker 不访问 SQLite，通过 `render.timeline.v1` 执行 Graph compiler。Project Host 保存 RenderResult 的 Timeline version、Graph hash、source refs、profile、Worker/FFmpeg 版本和 output hash。

## Consequences

Core 不依赖 FFmpeg 或文件系统；Worker 仍是唯一媒体子进程边界。旧无 Timeline render API 保留，新增 Timeline render path 可逐步替换。R11 负责 VFR ProxyMap，不在本 ADR 猜测固定帧率映射。

## Migration and Rollback

新增 `render_results` 表和 `render.timeline.v1` Worker capability；旧 `render_runs` 数据继续可读。删除新表不会影响旧 Render/QC 记录，但会丢失新路径审计元数据。

## Date

2026-07-30
