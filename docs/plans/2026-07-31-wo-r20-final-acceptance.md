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
- [ ] 补齐 RenderGraph→Worker 的独立音频轨和字幕 `drawtext` 真实渲染回归；局部回归已通过，但完整 Timeline 语义仍在 P0-TIMELINE 工作单中。
- [x] 全量 `pnpm run check` 在该修复后重新通过。
- [x] 验证提供路径时 Runner 实际执行 Project Host 导入、Timeline Add/Trim/Move/Undo/Redo/Caption Commit、双目标渲染、QC、Adapter Roundtrip 与关闭重开（使用临时授权合成素材，不冒充手机原片）。
- [x] 真实路径 Runner 通过 Worker 生成 Proxy 并构建 ProxyMap，Preview 强制使用代理映射，Master 保持原片引用。
- [ ] 运行真实手机/不同帧率素材验收（路径可用时）。
- [x] 真实 Worker 进程崩溃与持久 Job 恢复、关闭重开验收；真实手机素材闭环仍待路径。
- [ ] 更新当前状态、验证记录并完成风险审计；真实素材和现场外部互操作仍按阻断项保留。

## 已完成切片

- `pnpm run acceptance:final:synthetic` 已通过，覆盖 P0 项目生命周期/VFR/Timeline 编辑、Worker QC、Job 恢复、项目恢复、Timeline Render 和 Adapter Roundtrip。
- `pnpm run timeline:audio-caption:test` 已通过，证明独立 audio track、caption node、FFmpeg `drawtext` 和 Master QC 产物均可执行。
- `pnpm run worker:crash-recovery:test` 已通过：实际子 Worker 退出后记录 `WORKER_CRASH/RETRYABLE_FAILED`，重开项目将遗留 Job 置为 `RECOVERING` 并成功恢复为 `SUCCEEDED`。
- 默认 `pnpm run acceptance:final` 在未设置 `AVE_REAL_MEDIA_PATHS` 时以退出码 2 输出 `BLOCKED`，不会把合成验收冒充真实素材验收。
- 真实验收所需输入：`AVE_REAL_MEDIA_PATHS`（至少两段不同帧率且至少一段有音频）和 `AVE_REAL_SUBTITLE_PATH`。

## 阻断条件

真实手机素材未提供时，R20 不得标记完成；CI 未在 GitHub 远端实际运行时，也只能记录本机 Workflow 验证，不得宣称发布平台验收完成。

## 2026-08-01 真实素材尝试

- 用户提供的 30fps 竖屏与 60fps 横屏文件均可被本机 FFmpeg 导入；渲染编译器已将不同画布规格统一为目标画布并统一音频规格，相关集成回归、Ruff 与 mypy 通过。
- 首次真实验收的 Preview/Master 渲染已越过原有的横竖屏拼接失败点；复核确认旧记录使用了错误的 `pix_th=0.98`，不能据此断言两段源视频全程黑画面。正确语义为 `pix_th=0.10:pic_th=0.98`。
- 该次输入仍不能记为最终通过：完整 Timeline/音频编译语义和最终验收门尚未在当时闭合；需在 P0-TIMELINE 修复后重跑并保留可见内容证据。
