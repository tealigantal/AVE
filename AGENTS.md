# Agent Rules

## Current Work Order

WO-053：可用蓝图最终审计与运行时收口。仅依据根目录工程架构蓝图、项目治理文件和已登记工作单；`(not avaliable)` 用户体验规范不属于本工作单依据。继续验证三进程边界、P0-P4 Host/CLI 链路和 Electron runtime，不伪造生产模型、平台发布或人工桌面矩阵。

## Allowed Paths

本工作单允许修改根配置、`contracts/`、`packages/core/`、`packages/platform/job-engine/`、`packages/platform/worker-client/`、`packages/platform/observability/`、`packages/platform/model-gateway/`、`apps/dev-cli/`、`apps/worker-host/`、`apps/desktop/`、`database/`、`packages/platform/project-storage/`、`packages/platform/project-api/`、`tests/`、`tools/`、`docs/` 以及项目治理文件。

## Forbidden Paths

未进入工作单的业务 Feature、复杂故事 UI、数据库迁移、渲染器、模型 SDK 集成和真实媒体处理不得提前创建。不得创建 `packages/shared`、`packages/common`、`packages/utils`、`services/ai-service` 或 `services/video-service`。

## Invariants

- Project Host 是项目状态唯一权威，SQLite 只有 Project Host 写入。
- Contracts 是跨语言协议唯一来源；生成文件不得手工修改。
- 所有权威时间使用 RationalTime，不使用浮点秒。
- Renderer 不直连 SQLite、原片、shell、FFmpeg 或模型 SDK。
- Worker 不打开或修改 `project.sqlite`，stdout 只能输出结构化协议消息。
- Timeline 只能通过 Command/Commit 流程修改。

## Commands

已验证：`npm install`、`npm run check`、`npm run contracts:migrate-v0`、`npm run contracts:roundtrip`、`npm run contracts:clean`。pnpm 命令仍未验证，因为本机当前未发现 pnpm 可执行文件。

## Acceptance

WO-050 必须验证 Export Registration 只接受 ready Delivery、匹配 QC/sha256 和支持的 Export Capability；非法格式、哈希或交付状态必须失败，导出登记关闭重开后可读取。

## Stop Conditions

发现需要改变权威边界、公共协议主版本、持久化策略或引入生产依赖时停止并记录 ADR；不得用空实现或兼容分支掩盖失败。

## Generated / Vendored

当前没有生成或 vendored 文件。未来 `contracts/generated/` 将由 Schema 工具生成，禁止手工编辑。

## Definition of Done

协议失败路径、兼容性检查和 generated-clean 均有可执行验证；不得绕过 Schema 校验。
