# AI Vlog Co-Editor

AI Vlog Co-Editor 是一个由 Project Host 控制的本地视频协作剪辑系统。它以证据、创作决定、Edit IR、版本化 Timeline 和统一 RenderGraph 为核心，目标是让创作者从真实素材得到可追溯、可验证的成片。

## 当前成熟度

仓库是可以继续建设的架构原型，不需要推倒重来，但尚未通过真实 Timeline → RenderGraph → Worker → Master 的 P0 垂直切片。

当前已有不少协议、核心模型、边界检查和局部集成测试；这些证据不等同于完整产品、真实手机素材验收、外部剪辑软件互操作或生产模型接入。准确状态见 [当前状态](docs/CURRENT_STATUS.md)。

## 安装与检查

环境要求：Node.js 22+、pnpm 11.9.0、Python 3.12，以及 Worker 媒体检查所需的 FFmpeg。

```text
pnpm install --frozen-lockfile
pnpm run check
pnpm run acceptance:final:synthetic
```

完整的验证边界和未验证项见 [当前状态](docs/CURRENT_STATUS.md)。

## 文档索引

- [文档职责索引](docs/DOCUMENT_INDEX.md)
- [长期项目目标](PROJECT_GOAL.md)
- [稳定架构](docs/ARCHITECTURE.md)
- [当前状态](docs/CURRENT_STATUS.md)
- [当前工作](docs/CURRENT_WORK.md)
- [原始工程蓝图](AI%20Vlog%20Co-Editor%20工程架构与仓库蓝图.md)
