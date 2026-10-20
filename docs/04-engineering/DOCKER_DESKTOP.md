# Docker Compose Browser Host

Authority: Docker Compose Browser Host operation. This is the active user-facing deployment used for the current AVE workbench task. Electron remains a separate runtime with a different transport; Project Host remains the sole project-state authority.

## 使用

先安装并启动 Docker（Windows 使用 Docker Desktop Linux containers），把仓库根目录 .env.example 复制为 .env，填写 AVE_VISION_API_KEY 和 AVE_PLANNER_API_KEY，然后在仓库根目录执行：

```text
docker compose up
```

后台运行使用 `docker compose up -d --wait --wait-timeout 1800`。首次启动构建 Node Host/Worker/FFmpeg/YAMNet 和 Whisper 镜像，需要网络下载。Compose 只包含 desktop 与 whisper：Host 服务内部原子生成配置后立即降为 UID/GID 1000，Whisper 内部检查缓存并在不完整时下载精确版本模型。不存在独立 configuration/model-cache 初始化容器。启动与健康检查为首次下载预留 30 分钟。浏览器打开 http://localhost:6080，直接进入 AVE 工作台，上传 Windows 本机素材，观看预览并下载成片。关闭浏览器不会停止容器；执行 `docker compose down` 停止，数据卷保留。

默认 CPU 不需要 NVIDIA GPU。CPU 转写使用 int8，CUDA 使用 float32；模型始终为同一 pinned Whisper-small，没有模型替换。Docker 创建容器前需要确定 GPU reservation，因此直接 Compose 的默认配置不会探测宿主机 GPU。NVIDIA 主机可在 .env 中设置：

```text
COMPOSE_FILE=compose.yaml|docker/compose.gpu.yaml
COMPOSE_PATH_SEPARATOR=|
AVE_WHISPER_DEVICE=cuda
```

GPU 还需要宿主机驱动及 Docker GPU 支持。需要选择设备时，可显式设置 `.env` 中的 Compose GPU 配置；强制 CUDA 不可用或选定后的推理失败会报错，不自动重试 CPU。

## 当前本地配置与凭据

原 Stage3 model-services JSON 保留不变。启动脚本只在 .env 不存在时导入原配置，将 API Key 单独写入 .env，其余模型参数完整保留在 AVE_MODEL_SERVICES_JSON。已有 .env 不会被原 JSON 覆盖。本机 .env 已保留现有 keys，可直接使用；新用户须填写自己的 keys。

.env 被 Git 忽略并排除在构建上下文外。Host 启动入口读取 .env，原子生成 mode 0600、UID 1000 所有的配置文件。配置卷由该服务独占并可写，以支持每次启动更新；初始化后清空补充用户组、降为普通用户并移除原始密钥和模板环境变量，再启动 Host/Worker。凭据不写进镜像、不输出到日志。Docker 管理者仍可通过 inspect 查看容器启动环境，因此不要分享 .env、展开的 compose config 或 inspect 输出。

Vision/Planning 继续访问配置的云端 Qwen；Whisper 和 YAMNet 在本地容器中运行。浏览器直接展示 AVE 页面，容器不运行 Electron、XFCE 或远程桌面。上传、明确授权和成片下载通过 Host 管理的会话完成。只有本地 loopback 端口暴露。

## 数据

新用户默认 ./materials 和 ./exports 自动作为绑定目录；本机沿用 %LOCALAPPDATA%/AVE/docker/materials 和 exports。原素材只读。项目位于 Linux Docker volume ave-desktop_projects，容器路径 /workspace/projects；Windows bind 不支持 Host 的 immutable-file fchmod，因此项目不能换成 Windows bind。profile 和 Whisper cache 也是持久卷。不要执行 down -v 或清除 Docker data，除非已经备份并明确要删除。

已有 Windows 原生项目和启动配置不迁移、不覆盖。停止本 Compose 项目不影响其他 Docker 应用。

## 验证边界

本次可靠性工作包使用`node scripts/docker/build-reliable.mjs`生成带完整输入label的两服务镜像，
然后在对应工作包授权内以`docker compose up -d --no-build --wait`启动它们。
构建不会自动重启服务；验收同时核对源码、输入、镜像、运行文件与模型身份。
普通`docker compose up --build`仍可启动产品，但未带本轮出处记录的镜像不能用于完成本轮产品包。
当前P0仅实现构建/验收工具，未重构或重启现有容器。

实际执行进展见 [直接浏览器 ExecPlan](../plans/2026-10-02-direct-browser.md)。健康检查必须看到Node Host 工作台接口并确认本地模型服务。健康状态不能代表完整创作、浏览器音频、导出或用户接受。

Browser transport verification: [EVD-20261002-S3-WEB-FINAL](../evidence/runs/EVD-20261002-S3-WEB-FINAL.md) records upload, exact authorization, configured-model creation, Preview/Master QC, Windows download and reopen. [Two-service final Evidence](../evidence/runs/EVD-20261002-S3-DOCKER-CLEAN-FINAL.md) records current startup, failure tests, persistence and repository checks; the [cleanup ExecPlan](../plans/2026-10-02-docker-cleanup-readme.md) preserves progress and recovered failures. Prior remote desktop evidence remains historical. After changing cloud keys/settings, run `docker compose up -d --force-recreate --wait --wait-timeout 1800` to reload them.

上传素材保存在 ave-desktop_uploads 卷；项目、用户 profile 和模型 cache 沿用原有卷。成片会由浏览器下载到 Windows，同时保存在 exports 绑定目录。无需安装 Node、Python、FFmpeg 或 Ubuntu 桌面。

## Current entry and historical verification boundary

The active Browser URL for the user's existing Compose deployment is `http://127.0.0.1:6080/`. Docker builds the web service from TypeScript at `apps/web/src/server.ts`; `docker/start-desktop.sh` launches the compiled image artifact at `/opt/ave/app/apps/web/src/server.js`. The server serves the shared Renderer and routes Browser requests through `/api/invoke`; `apps/desktop/src/renderer/browser/entry.js` supplies the Browser transport. Electron uses preload IPC instead. A failure from an Electron-only journey is evidence about that Electron run and may signal shared Renderer behavior, but it does not prove that this Browser deployment fails.

The linked October 2 Browser and Compose Evidence remains build-specific historical evidence. It records the exact run and environment at that time; it is not current-source P4/P5 acceptance. Current P4 interaction acceptance is still unverified until WIN-09/WIN-10 are exercised against a current Docker Browser build. Container health or HTTP 200 alone does not satisfy those interactions.