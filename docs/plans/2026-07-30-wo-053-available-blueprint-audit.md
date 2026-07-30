# WO-053 Available Blueprint Audit

## Source of Truth

本工作单只使用以下可用来源：

- 根目录 `AI Vlog Co-Editor 工程架构与仓库蓝图.md`；
- `AGENTS.md`、`PROJECT_GOAL.md`、`PLANS.md`；
- `docs/ARCHITECTURE.md`、`docs/PRODUCT.md`、`docs/VALIDATION.md`、`docs/PROGRESS.md`；
- `docs/work-orders/` 和 `docs/plans/` 中已登记工作单。

根目录以 `(not avaliable)` 开头的用户体验规范文件明确不属于当前依据，不读取、不引用、不作为验收标准。

## Current Evidence

- `npm run check` 已覆盖 Contract、SQLite、Worker、P0-P4 Host/CLI、Render/QC、Delivery/Export、Desktop boundary 和 Electron runtime smoke。
- 体验规范专属 Renderer、Workbench 静态校验和 runtime smoke 文件已按本次清理要求物理移除；Electron Main/Preload/Project Host 工程边界保留。

## Remaining Scope

- 生产 ASR/OCR/Scene/LLM 提供方与隐私策略；
- 平台发布适配器；
- 完整人工桌面 IPC/文件选择器/交互矩阵；
- 用户手机原片和最终专业导出矩阵现场验收。

## 清理记录（2026-07-30）

- 已物理移除 `(not avaliable)` 用户体验规范文件本身，以及据其制作的 Renderer 页面、样式、交互脚本、Workbench 静态检查、专属 runtime build/smoke 文件和 WO-034/WO-038 专属文档。
- 保留 Electron Main、Preload、Project Host、Project API、Core/Platform、Contracts、Storage、Worker、CLI 和 Host 工作单；这些属于工程蓝图规定的基础架构或业务权威边界。
- 清理后 `npm run check` 通过；全仓不再存在已删除文件的命令、路径或 UX 工作单引用。
