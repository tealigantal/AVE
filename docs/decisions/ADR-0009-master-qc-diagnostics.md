# ADR-0009 Master QC Diagnostic Contract

## Status

Accepted for WO-R18.

## Context

现有 QC report 只覆盖解码、黑帧、冻结、静音、削波、响度和代理来源；蓝图还要求音视频流、AV sync、字幕边界、效果缺失、分辨率、帧率、时长、导出配置、Sponsor 和 Privacy 的可观察阻断。继续复用无关的 `DECODE_FAILED` 会丢失诊断语义。

## Considered Options

1. 保持七个 Issue code，把所有新问题映射为解码失败：无法支持可审计的用户修复。
2. 创建第二套未版本化 QC JSON：会产生协议漂移。
3. 在现有 QC report v1 中增加明确 Issue code、可选 blocker/evidence 字段，并保持旧字段兼容。

## Decision

采用选项 3。Worker 仍负责媒体检测，Host 负责接收候选并登记；`source_identity` 必须携带结构化 Asset/Object/ProxyMap/RenderGraph 来源信息，禁止以路径文件名推断代理使用。

## Consequences

旧的七类报告仍可解析；新增 Issue 可由 UI 显示为稳定 code、severity、blocker 和 evidence。Schema 生成与兼容检查必须随变更运行。

## Migration and Rollback

新增字段均为可选，旧报告无需迁移；若回滚 Worker，可继续读取旧 Issue code。新检测在缺少所需输入时返回结构化 `QC_INPUT_MISSING`，不静默通过。

## Date

2026-07-31
