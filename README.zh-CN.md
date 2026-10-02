# AVE · AI Vlog Co-Editor

把你的素材和一段对话变成有版本记录的 Vlog 初稿。在浏览器里看作品、提出修改，再导出成片。

[English](README.md) · [简体中文](README.zh-CN.md) · [快速开始](#快速开始) · [项目文档](docs/README.md) · [反馈问题](https://github.com/tealigantal/AVE/issues)

[![CI](https://github.com/tealigantal/AVE/actions/workflows/ci.yml/badge.svg)](https://github.com/tealigantal/AVE/actions/workflows/ci.yml)

![AVE 浏览器工作台：对话创作与视频预览](docs/evidence/runs/EVD-20261002-S3-WEB-BROWSER.png)

*真实 Docker 浏览器工作台截图；画面中的素材为合成验证素材。*

## 可以做什么

- **从素材和目标开始。** 上传素材，说清楚想做的作品，在对话工作台生成初稿。
- **修改并保留历史。** 编辑结果有版本记录，容器重启后可以继续已有项目。
- **先看作品，再交片。** 播放 Preview 预览，下载经独立渲染和 QC 检查的 Master 成片。
- **掌控外部分析授权。** 审核哪些素材与上下文可以发送到配置的云端模型。
- **本地依赖全部放进 Docker。** Project Host、媒体 Worker、FFmpeg、Whisper 和 YAMNet 在容器内运行；Windows 用户只需 Docker Desktop 和浏览器。

AVE 正在积极开发。浏览器创作与导出已有自动化及合成素材验证；创作质量和完整规划剪辑范围有独立验收门槛。详见[当前状态](docs/current/STATUS.md)与[已知缺口](docs/current/DEBT.md)。

## 快速开始

### 1. 获取仓库

```sh
git clone https://github.com/tealigantal/AVE.git
cd AVE
```

安装并启动 [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/)。Windows 使用 **Linux containers** 模式。直接在 Windows PowerShell 和浏览器中操作，无需 Ubuntu 桌面，也无需单独安装 Node、Python 或 FFmpeg。

### 2. 首次配置模型

在 PowerShell 中执行：

```powershell
Copy-Item .env.example .env
notepad .env
```

macOS/Linux 使用 `cp .env.example .env`，再用自己的编辑器打开。填写两个 Key：

```dotenv
AVE_VISION_API_KEY=你的视觉模型密钥
AVE_PLANNER_API_KEY=你的规划模型密钥
```

默认使用 Qwen 云端视觉与规划、本地 Whisper-small 转写和本地 YAMNet 声音分析。云端调用需要网络，可能产生提供商费用。请保密 `.env`；它已排除在 Git 和镜像构建之外。已有用户保留现有 `.env` 即可。

### 3. 启动 AVE

```sh
docker compose up
```

就绪后打开 **[http://localhost:6080](http://localhost:6080)**。首次启动构建镜像并下载固定版本的本地模型，后续复用持久缓存；下载时间取决于网络。

Compose 只运行 `desktop`（浏览器 Host 与媒体处理栈）和 `whisper`（转写）。配置和缓存由各自服务初始化，不再留下退出的初始化容器。

后台运行：

```sh
docker compose up -d --wait --wait-timeout 1800
```

## 制作第一部作品

1. 在工作台创建项目，上传视频或音频。
2. 描述目标，审核具体的外部分析授权，再开始创作。
3. 观看预览、提出修改，满意后下载导出的 Master 成片。

关闭浏览器不会停止 Docker。项目与上传素材保存在持久卷中。

## CPU 与 NVIDIA GPU

默认 Compose 不申请 GPU，使用 **CPU**。两种设备使用同一固定版本的 Whisper-small：CPU/int8 或 CUDA/float32。

Windows 双击 `Start-AVE-Docker.cmd` 可检查真实 Docker/CUDA 能力并保存选择到 `.env`，以后继续用 `docker compose up`。手动启用 NVIDIA：

```dotenv
COMPOSE_FILE=compose.yaml|docker/compose.gpu.yaml
COMPOSE_PATH_SEPARATOR=|
AVE_WHISPER_DEVICE=cuda
```

需要兼容驱动与 [Docker Desktop GPU 支持](https://docs.docker.com/desktop/features/gpu/)。明确选择 CUDA 后若不可用，会报告错误，不会静默切换 CPU。

## 数据与日常操作

| 数据 | 存放位置 |
| --- | --- |
| 项目与 SQLite | `ave-desktop_projects` Docker 卷 |
| 上传的原始素材 | `ave-desktop_uploads` Docker 卷 |
| 用户档案、最近项目 | `ave-desktop_profile` Docker 卷 |
| Whisper 缓存 | `ave-desktop_whisper-models` Docker 卷 |
| 私有运行配置 | `ave-desktop_configuration` Docker 卷 |
| 可选素材挂载目录 | `./materials`，只读 |
| 导出视频 | `./exports`，同时支持浏览器下载 |

`.env` 中的 `AVE_MATERIALS`、`AVE_EXPORTS` 可指定其他宿主机目录。已有 Windows 启动脚本配置可能使用 `%LOCALAPPDATA%/AVE/docker/`。原生项目不自动迁移。项目保留在 Docker 卷中，不要改成 Windows 绑定目录；Host 依赖 Linux 文件权限语义。

```sh
# 停止服务，保留项目、上传、导出与缓存
docker compose down

# 拉取更新后重建，保留数据
docker compose up -d --build --wait --wait-timeout 1800

# 查看状态和启动错误
docker compose ps
docker compose logs --tail=100 desktop whisper
```

修改模型密钥或设置后，用 `docker compose up -d --force-recreate --wait --wait-timeout 1800` 加载配置。只有明确要删除持久数据时才用 `docker compose down -v`。公开反馈日志前检查私有信息。

启动失败时，检查 Docker Desktop 是否运行、两个密钥是否填写、6080 端口是否空闲、所选显卡是否可用。配置、下载和模型错误都会明确报告。详见 [Docker 使用说明](docs/04-engineering/DOCKER_DESKTOP.md)。

## 工作原理

浏览器向 **Project Host** 发送类型明确的请求；Host 是项目状态与 SQLite 写入的唯一权威。模型只提出候选，Host 校验后提交剪辑。已提交 Timeline 派生一份 Semantic Render Manifest、独立的 Preview/Master RenderGraph 与 ExecutionPlan，再由 Worker/FFmpeg 渲染并进行 QC。

| 模块 | 源码位置 |
| --- | --- |
| 浏览器适配与工作台 | `apps/web/`、`apps/desktop/src/renderer/` |
| 项目权威与持久化 | `packages/platform/project-host/`、`packages/platform/project-storage/` |
| 媒体执行 | `apps/worker-host/` |
| 类型协议 | `contracts/` |
| 容器打包 | `compose.yaml`、`docker/` |

进一步阅读[系统架构](docs/architecture/SYSTEM_ARCHITECTURE.md)、[产品范围](docs/product/EDITING_CAPABILITY_SCOPE_V1.md)和[路线图](docs/product-intelligence/STAGE3_PLAN.md)。规划、已实现与已接受能力分开记录。

## 开发与贡献

源码开发使用 Node.js 22、pnpm 11.9.0，以及[工程指南](docs/04-engineering/README.md)要求的 Python 和媒体工具。使用安装了[固定 Worker 依赖](apps/worker-host/requirements.txt)的隔离 Python 环境；检查要求 Pillow 12.3.0。先激活该环境，再执行下面的命令。

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run acceptance:final:synthetic
```

从 [AGENTS.md](AGENTS.md)、[文档首页](docs/README.md)、[文档索引](docs/DOCUMENT_INDEX.md)和对应领域权威文档开始。当前状态由工具生成；修改来源后执行 `pnpm run docs:sync`、`pnpm run docs:check`。

欢迎提交问题和聚焦的 PR。请附复现步骤、系统与设备、相关错误和期望行为，移除 API Key 与私有素材。扩展范围前查阅[当前工作](docs/current/WORK.md)。自动验证、真实素材证据与人工接受分开报告。

## 许可证

仓库目前尚未声明项目许可证。源码公开不等于授予开源许可；再分发或复用前请向维护者确认授权。
