# Agent Rules

## Current Work Order

WO-R20：最终真实验收。严格按附件任务清单施工，每次只执行一个工作单；当前只验证真实/授权素材闭环、关闭重开和 Worker 崩溃恢复，不宣称生产素材或发布完成。

## Allowed Paths

本工作单允许修改根配置、`contracts/`、`packages/core/`、`packages/features/`、`packages/adapters/`、`packages/platform/media-filesystem/`、`packages/platform/project-host/`、`packages/platform/job-engine/`、`packages/platform/worker-client/`、`packages/platform/observability/`、`packages/platform/model-gateway/`、`apps/dev-cli/`、`apps/worker-host/`、`apps/desktop/`、`database/`、`packages/platform/project-storage/`、`packages/platform/project-api/`、`packages/platform/render-service/`、`tests/`、`tools/`、`docs/` 以及项目治理文件。

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

已验证：`pnpm install --frozen-lockfile`、`pnpm run check`、`pnpm run architecture:test`、`pnpm run contracts:check`、`pnpm run contracts:examples`、`pnpm run contracts:migrate-v0`、`pnpm run contracts:roundtrip`、`pnpm run contracts:clean`、`pnpm run acceptance:final:synthetic`。当前根包管理器为 pnpm 11.9.0；`npm` 历史命令仅保留在旧验证记录中。

## Acceptance

当前工作单必须验证：授权合成 VFR、真实手机 VFR（若路径已提供）、不同帧率素材、音频/字幕 Timeline、关闭重开、Worker 崩溃恢复、RenderGraph/Preview/Master/QC 和 Adapter 导出；缺少真实素材时必须明确阻断，不以合成素材替代真实验收。

## Stop Conditions

发现需要改变权威边界、公共协议主版本、持久化策略或引入生产依赖时停止并记录 ADR；不得用空实现或兼容分支掩盖失败。

## Generated / Vendored

`contracts/generated/`、`contracts/generated/typescript/` 和 `contracts/generated/python/` 均为 Schema 工具生成目录，文件带 `GENERATED FILE - DO NOT EDIT` 标记并被忽略；禁止手工编辑。生成 manifest 记录 Schema、文件和内容哈希。

## Definition of Done

协议失败路径、兼容性检查和 generated-clean 均有可执行验证；不得绕过 Schema 校验。
