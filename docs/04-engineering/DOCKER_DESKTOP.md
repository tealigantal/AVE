# Docker Compose Browser Host

Authority: Docker Compose Browser Host operation. This is the active user-facing deployment used for the current AVE workbench task. Electron remains a separate runtime with a different transport; Project Host remains the sole project-state authority.

## 当前全云模型配置

产品目标采用全云端模型，并允许云端渲染；本地部署暂缓。现有容器仍执行 Host/Worker/FFmpeg，尚未实现远端渲染。新实例按照根目录 [README](../../README.md#docker-quick-start) 的全云 overlay 配置；只启动 desktop，不启动本地 Whisper/YAMNet。

现有 6085 全云模型实例与 6084 混合实例应保留各自端口、项目名、卷及模型配置。方向调整没有重建容器。不能把通用 6080 命令直接用于替换这些实例。

## 当前本地配置与凭据

原 Stage3 model-services JSON 保留不变。启动脚本只在 .env 不存在时导入原配置，将 API Key 单独写入 .env，其余模型参数完整保留在 AVE_MODEL_SERVICES_JSON。已有 .env 不会被原 JSON 覆盖。本机 .env 已保留现有 keys，可直接使用；新用户须填写自己的 keys。

.env 被 Git 忽略并排除在构建上下文外。Host 启动入口读取 .env，原子生成 mode 0600、UID 1000 所有的配置文件。配置卷由该服务独占并可写，以支持每次启动更新；初始化后清空补充用户组、降为普通用户并移除原始密钥和模板环境变量，再启动 Host/Worker。凭据不写进镜像、不输出到日志。Docker 管理者仍可通过 inspect 查看容器启动环境，因此不要分享 .env、展开的 compose config 或 inspect 输出。

全云入口的视觉、规划、转写和声音分析均使用云端模型；旧混合实例保留本地音频配置，仅作为现存运行事实。浏览器直接展示 AVE 页面，容器不运行 Electron、XFCE 或远程桌面。上传、明确授权和成片下载通过 Host 管理的会话完成。只有本地 loopback 端口暴露。

### 全云配置与凭据来源

推荐入口同时叠加 `compose.cloud.yaml` 和 `compose.cloud.profiles.yaml`，选择内置全云配置。可用私有 `AVE_CLOUD_MODEL_SERVICES_JSON` 显式配置各角色；全云入口屏蔽旧 `AVE_MODEL_SERVICES_JSON`，不允许其改回本地模型。远程角色可在同一个 `.env` 中设置 `AVE_TRANSCRIPTION_API_KEY_SOURCE=AVE_VISION_API_KEY` 和／或 `AVE_SOUND_API_KEY_SOURCE=AVE_VISION_API_KEY`，以指定使用已有 Vision 凭据。也可将来源设为 `AVE_TRANSCRIPTION_API_KEY`、`AVE_SOUND_API_KEY` 或 `AVE_PLANNER_API_KEY`；被选变量必须存在且非空。未选择来源时保留 JSON 内已有凭据，远程端点缺少凭据会明确报错。不要在终端输出展开后的配置、环境变量或密钥。

如 transcription 也已显式配置为云端，可叠加 `docker/compose.cloud.yaml`：默认只启动 desktop；如果仍使用本地 Whisper，应启用 `local-transcription` profile。sound 为云端时不会启动或探测本地 YAMNet。启动和健康检查只等待所选的本地服务；云端服务是否可用仍须通过真实调用验证。云端音频处理会将获授权的音频发送至所选服务商。该 profile 不会停止原来已运行的 Whisper 容器，切换现有部署时须单独安排停机和保留原卷。

### 保留旧混合实例的运行事实（暂停建设）

`docker/compose.mixed.profiles.yaml` 是独立的混合配置入口；与 `docker/compose.cloud.profiles.yaml` 的全云专用入口互斥。混合入口继承原 `AVE_MODEL_SERVICES_JSON` 中四角色的全部参数作为默认“本地音频”档，要求原来的本地 Whisper-small 与 YAMNet 身份，视觉/规划继续使用原 Qwen 云端配置。另复用内置云端模板提供“全云端·经济”和“全云端·增强”选项，不隐式修改原模型或参数。新用户可以省略原 JSON 使用默认模板，仍须配置 Vision/Planner 凭据；云端音频凭据按所选来源单独验证，本地角色不注入云密钥。

在创作设置 → 创作要求 → 本次模型配置中选择已注册配置，四角色位置和模型会同步显示。选项用于新请求；授权确认、已有请求和重新打开仍绑定原 deployment digest，不随下拉选择改绑。找不到旧配置、模型或权限变化会明确阻断，不自动切换。原来的单配置格式仍支持。

混合实例按全部已注册配置启动所需本地服务，因此选择全云端也不会自动删除 Whisper 容器或停止 YAMNet；健康检查不加载模型，推理仍按需。低资源实例继续使用同一 Host 资源队列和 768/1280MiB 硬限。全云专用实例不启动本地服务，也不接受本地配置。

本机既有实例的部署必须显式指定原 Compose 项目、端口环境文件、低资源 overlay 和对应镜像；6084 使用混合入口，6085 沿用其独立全云项目与卷。不要直接套用默认6080端口或把两个项目挂到同一个项目卷。切换模型位置不改变 Docker/FFmpeg 渲染位置，也不代表长素材或完整2GiB制作验收已通过。

## 数据

新用户默认 ./materials 和 ./exports 自动作为绑定目录；本机沿用 %LOCALAPPDATA%/AVE/docker/materials 和 exports。原素材只读。项目位于 Linux Docker volume ave-desktop_projects，容器路径 /workspace/projects；Windows bind 不支持 Host 的 immutable-file fchmod，因此项目不能换成 Windows bind。profile 和 Whisper cache 也是持久卷。不要执行 down -v 或清除 Docker data，除非已经备份并明确要删除。

已有 Windows 原生项目和启动配置不迁移、不覆盖。停止本 Compose 项目不影响其他 Docker 应用。

## 验证边界

既有构建工具使用`node scripts/docker/build-reliable.mjs`生成带完整输入label的两服务镜像，
然后在对应工作包授权内以`docker compose up -d --no-build --wait`启动它们。
构建不会自动重启服务；验收同时核对源码、输入、镜像、运行文件与模型身份。
普通`docker compose up --build`仍可启动产品，但未带本轮出处记录的镜像不能用于完成本轮产品包。
本次文档整理未重构或重启任何容器。

实际执行进展见 [直接浏览器 ExecPlan](../plans/2026-10-02-direct-browser.md)。健康检查必须看到 Node Host 工作台接口；全云配置不要求本地模型健康。健康状态不能代表云服务可用、完整创作、浏览器音频、导出或用户接受。

Browser transport verification: [EVD-20261002-S3-WEB-FINAL](../evidence/runs/EVD-20261002-S3-WEB-FINAL.md) records upload, exact authorization, configured-model creation, Preview/Master QC, Windows download and reopen. [Two-service final Evidence](../evidence/runs/EVD-20261002-S3-DOCKER-CLEAN-FINAL.md) records current startup, failure tests, persistence and repository checks; the [cleanup ExecPlan](../plans/2026-10-02-docker-cleanup-readme.md) preserves progress and recovered failures. Prior remote desktop evidence remains historical. After changing cloud keys/settings, run `docker compose up -d --force-recreate --wait --wait-timeout 1800` to reload them.

上传素材保存在 ave-desktop_uploads 卷；项目、用户 profile 和模型 cache 沿用原有卷。成片会由浏览器下载到 Windows，同时保存在 exports 绑定目录。无需安装 Node、Python、FFmpeg 或 Ubuntu 桌面。

## Current entry and historical verification boundary

The generic Compose Browser default is `http://127.0.0.1:6080/`. The user's current isolated evaluation entries are port6084 for mixed local-audio/cloud selection and port6085 for cloud-only models; exact build and verification boundaries are recorded in [the current engineering Evidence](../evidence/runs/EVD-20261111-S3-P4-UX-MIXED-PROFILES-VISION-R2.md). Docker builds the web service from TypeScript at `apps/web/src/server.ts`; `docker/start-desktop.sh` launches the compiled image artifact at `/opt/ave/app/apps/web/src/server.js`. The server serves the shared Renderer and routes Browser requests through `/api/invoke`; `apps/desktop/src/renderer/browser/entry.js` supplies the Browser transport. Electron uses preload IPC instead. A failure from an Electron-only journey is evidence about that Electron run and may signal shared Renderer behavior, but it does not prove that this Browser deployment fails.

The linked October 2 Browser and Compose Evidence remains build-specific historical evidence. It records the exact run and environment at that time; it is not current-source P4/P5 acceptance. Current P4 interaction acceptance remains unverified; required checks and the accepted unverified WIN-09 risk are recorded by the active package. Container health or HTTP 200 alone does not satisfy those interactions.
