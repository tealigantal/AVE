# ADR-0001 Three Process Model

- Status：Accepted as target direction
- Date：2026-07-29

## Context

蓝图要求 UI、项目权威和媒体计算互相隔离，避免 Renderer 或 Worker 越权。

## Considered Options

1. 三边界：Renderer、Project Host、Worker Host。
2. 单进程直接共享数据库和媒体路径。

## Decision

采用三边界模型；Project Host 是唯一项目状态权威和 SQLite 写入者。

## Rationale

它明确隔离 UI、持久化和高风险媒体/模型执行，并支持恢复与协议演进。

## Consequences

需要版本化 Command/Worker 协议和进程间验证；当前只实现最小 Worker 入口。

## Migration

空仓库无需迁移；后续每个运行时入口按该边界加入。

## Rollback

若后续证据要求改变模型，必须新建 ADR 并保留协议迁移和旧项目打开策略。
