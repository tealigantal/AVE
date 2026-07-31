# AI Vlog Co-Editor

由 Project Host 控制的本地 AI Vlog 编译系统。当前仓库是 P0 架构验证原型，包含 P1–P4 的协议与校验骨架；真实 Timeline → RenderGraph → Preview/Master 链路、桌面最小工作台、Adapter、Master QC 和本机 CI 门禁已完成验证，但完整桌面产品、真实手机素材、生产模型和发布平台仍未完成。不得把 smoke test 或 Schema 骨架描述为完整产品能力。

## 环境

- Node.js 22+
- pnpm 11.9.0（仓库锁定版本）
- Python 3.12 与 FFmpeg（Worker/媒体检查）

## 安装与检查

```text
pnpm install --frozen-lockfile
pnpm run check
```

## 文档

- [工程蓝图](AI%20Vlog%20Co-Editor%20工程架构与仓库蓝图.md)
- [架构](docs/ARCHITECTURE.md)
- [当前目标](PROJECT_GOAL.md)
- [当前状态](docs/STATUS.md)
- [当前执行计划](docs/plans/2026-07-31-wo-r20-final-acceptance.md)
