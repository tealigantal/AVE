# 当前工作

## 唯一任务

整理和加固 P0 项目基座。

## 本任务范围

- 以代码和已有测试记录重新核对 P0 的真实边界。
- 统一项目文档中的长期目标、稳定架构、当前状态和当前任务职责。
- 保留局部组件测试已经证明的事实，同时明确它们尚未组成真实 P0 垂直切片的部分。
- 为后续 Coding Agent 固定文档读取顺序和状态判断规则。

## 停止条件

本任务不修改工程代码、配置、测试、Schema、数据库或工作流；不开始真实媒体验收、不接入生产模型、不扩展桌面功能、不创建新的 Work Order 列表。

## 完成判定

当 `AGENTS.md`、`README.md`、`PROJECT_GOAL.md`、`docs/ARCHITECTURE.md`、`docs/DOCUMENT_INDEX.md`、`docs/CURRENT_STATUS.md` 和本文件的职责不冲突，且当前状态明确写为“尚未通过真实 Timeline → RenderGraph → Worker → Master 的 P0 垂直切片”时，本任务的文档整理范围完成。后续 Coding Agent 必须先重新读取上述核心文档，再等待新的明确授权。
