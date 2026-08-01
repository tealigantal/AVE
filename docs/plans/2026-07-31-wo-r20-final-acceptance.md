# WO-R20 最终真实验收

## 目标

用授权合成 VFR、真实手机 VFR（若用户提供路径）、至少两种帧率素材、带音频和字幕的 Timeline，执行创建→导入→指纹/Probe→ProxyMap→Timeline 编辑→Undo/Redo→RenderGraph→Preview/Master→Master QC→关闭重开→Adapter 导出的 P0 闭环，并记录 Worker 崩溃恢复。

## 证据边界

- 合成素材可以证明协议和流程，但不能替代真实手机原片。
- 真实手机素材路径只从环境变量 `AVE_REAL_MEDIA_PATHS` 读取，不复制、上传或提交素材。
- 缺少真实素材、音频/字幕数据或可执行 Electron/FFmpeg 环境时，验收必须输出明确 `BLOCKED`，不得降级为“通过”。
- 本工作单不发布、不上传、不创建 Release，也不提交用户素材。

## 当前进度

- [x] 建立最终验收 Runner 与前置检查。
- [x] 用授权合成素材跑完整闭环。
- [x] 补齐 RenderGraph→Worker 的独立音频轨和字幕 `drawtext` 真实渲染回归。
- [x] 全量 `pnpm run check` 在该修复后重新通过。
- [x] 验证提供路径时 Runner 实际执行 Project Host 导入、Timeline Add/Trim/Move/Undo/Redo/Caption Commit、双目标渲染、QC、Adapter Roundtrip 与关闭重开（使用临时授权合成素材，不冒充手机原片）。
- [x] 真实路径 Runner 通过 Worker 生成 Proxy 并构建 ProxyMap，Preview 强制使用代理映射，Master 保持原片引用。
- [x] 运行真实手机/不同帧率素材验收；用户确认最终真实测试烧录正常。
- [x] 真实 Worker 进程崩溃与持久 Job 恢复、关闭重开验收；真实手机素材闭环已由用户现场完成并确认烧录正常。
- [x] 更新 `docs/CURRENT_STATUS.md`、`docs/VALIDATION.md` 并完成当前风险审计；真实素材验收已由用户确认完成，现场外部互操作仍未验证。

## 已完成切片

- `pnpm run acceptance:final:synthetic` 已通过，覆盖 P0 项目生命周期/VFR/Timeline 编辑、Worker QC、Job 恢复、项目恢复、Timeline Render 和 Adapter Roundtrip。
- `pnpm run timeline:audio-caption:test` 已通过，证明独立 audio track、caption node、FFmpeg `drawtext` 和 Master QC 产物均可执行。
- `pnpm run worker:crash-recovery:test` 已通过：实际子 Worker 退出后记录 `WORKER_CRASH/RETRYABLE_FAILED`，重开项目将遗留 Job 置为 `RECOVERING` 并成功恢复为 `SUCCEEDED`。
- 默认 `pnpm run acceptance:final` 在未设置 `AVE_REAL_MEDIA_PATHS` 时以退出码 2 输出 `BLOCKED`，不会把合成验收冒充真实素材验收。
- 真实验收所需输入：`AVE_REAL_MEDIA_PATHS`（至少两段不同帧率且至少一段有音频）和 `AVE_REAL_SUBTITLE_PATH`。

## 阻断条件

真实手机素材未提供时，R20 不得标记完成；当前素材已由用户提供现场结果并确认完成。CI 未在 GitHub 远端实际运行时，也只能记录本机 Workflow 验证，不得宣称发布平台验收完成。

## 2026-08-01 真实素材尝试

- 用户提供的 30fps 竖屏与 60fps 横屏文件均可被本机 FFmpeg 导入；渲染编译器已将不同画布规格统一为目标画布并统一音频规格，相关集成回归、Ruff 与 mypy 通过。
- 首次真实验收的 Preview/Master 渲染已越过原有的横竖屏拼接失败点，但 Master QC 检出两段源视频均为全程黑画面，返回 `BLACK_FRAME`。不得把这次结果记为真实验收通过。
- 后续如需复验，应继续使用包含实际可见内容的原始手机视频；首次黑帧结果不作为最终验收结论。

## 2026-08-01 最终真实测试结果

- 用户报告已使用新的真实测试项目完成真实测试，烧录正常。
- 对应项目产物：用户真实项目目录，以 `AVE_USER_REAL_PROJECT_DIR` 脱敏表示。
- 本轮核对到 `project.json` 和 `project.sqlite` 存在；未复制、上传或提交项目素材。
- 首次黑帧输入保留为历史失败样本，不再作为当前 R20 阻断；具体现场命令输出以用户运行记录为准。
