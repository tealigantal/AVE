---
evidence_id: EVD-20261005-S3-RELIABLE-JOURNEY-CLOSEOUT
work_package_id: WP-S3-RELIABLE-JOURNEY-001
date: 2026-10-05
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: a0928ac1b2e4a53cd583c32feabe53af0031adf4b9d095f6a7e662e5ad26f02a
scope_fingerprint: 634a216e2bfb514984d5cde21ecfdd321fe624bc7e931ba9f804944299c1f2db
capability_ids: [CAP-S3-RELIABLE-JOURNEY-001]
acceptance_ids: [ACC-S3-RELIABLE-JOURNEY-001]
result: blocked
---

# P3 收尾修复与正常服务验收

本记录属于执行 Evidence。用户授权执行 P3 收尾，并要求仅用现有 6080 服务，不新增隔离运行环境。沿用既有计划和 UX 权威，保留未提交变更、历史 Evidence、项目和所有卷。未提交、推送、合并或发布。此前用户确认的真实下载与人工试听继续视为通过，不重复要求。

## 已修复及运行身份

- Host 未显式竖屏构图时以首个启用画面镜头的原画幅为画布；模型上下文说明这一规则。Worker 默认等比居中留边，避免强制竖屏、裁切或拉伸。已有草稿保留已绑定执行画布；显式竖屏仍要求画面镜头一致。
- Renderer API 对所有公开业务的既有 typed cancellation/revoke 控制结果保留失败值，但不登记成故障。真实错误仍保留。无可管理原则时撤回入口禁用。
- 档案来源作品、学习操作、保留时间改为必填，浏览器原位校验；缺项不再直接送到 Host 形成 CONTRACT_CREATOR_PROFILE_INVALID。首次实际缺项失败保留，未伪造成功或删除记录。

最终正常服务构建输入 `51257e07adb77263ef8df0bd3344027fd854b9a17690beaecbf9259b6343a607`。Desktop image `sha256:616960a9ea5aeaea01c0138053be17aff4ecf7cc87cd9d06b8fd72b8f2bdc82a`，Whisper image `sha256:30c049f63d587815f473681658e6633f8b219413a3a0d8ff7464f8a9d68103ea`。两服务 healthy，所有挂载身份及权限保留；只规范化 Docker Desktop 同一 Windows 驱动器的路径拼写。无关容器及先前停止的测试容器身份不变。见 [最终运行身份](../assets/reliable-journey/p3-close-runtime-final-provenance.json)。中间构建记录保留，不当作最终运行身份。

## 6080 实际流程

旧验收作品重开保留 v1–v4、采用的 v2、中文输入和已学习经验。实际选定经验的撤回确认窗口取消后，不再弹出问题窗口；未永久删除任何经验。

新作品 `6f5cc560-9cf8-4d18-ba81-6804f9bd19c9`，目录 `P3收尾-原画幅与新素材-0f62e438`，公开导入两项自制素材 2/2：新视频 moving-heldout.mp4 128×72、2 秒，无音轨；own-sky.png 320×180。请求原画幅、不重构图、不加字幕音乐。读取先前学习的验收情境原则后，实际云制作得到 v1：视频 2 秒、图片 3 秒，总长 5 秒。不可变决策记录明确引用 `principle:bf58324cbb44d8a7f9ae6e520b394dd9531dc8cdc159ced649cbb1b9a9e1e681`，并绑定新视频 asset hash；不是仅按结果时长推测个性化有效。执行画布 128×72，浏览器 video 元素实际解码相同尺寸，readyState=4、完整播放结束于 5 秒且无 media error。见 [决策与原画幅身份](../assets/reliable-journey/p3-close-public-native.json)、[公开作品截图](../assets/reliable-journey/p3-close-native.png)。本次静音作品不重复冒充人工听音验收。

公开本地精修产生 v2/v3/v4，各历史版本保留。v4 渲染期间检测到该作品路径的实际 FFmpeg pid 337 后，精确终止本地 Worker pid 213；Host 启动新 Worker 完成本地渲染，Preview/Master QC 通过，模型调用总数始终为 2。没有自动重发云模型。当前 jobs/attempts 显示成功，不能宣称页面出现失败窗口或进行了人工显式重试。见 [活动渲染中断](../assets/reliable-journey/p3-close-public-worker-v4.log)、[恢复任务记录](../assets/reliable-journey/p3-close-public-recovery.json)。早先两次观察器未命中任务，没有发信号；另一次 v3 后终止 Worker 时无子进程，属空闲中断。这些失败尝试保留，不计为活动故障通过。

Host 异常退出前，未提交中文输入已获“输入已保存”确认；随后精确 SIGKILL 当前 Host，container exit=137。只启动 desktop 发现页面不可用：Whisper 的 `network_mode: service:desktop` 仍绑定旧网络命名空间，desktop 等待本地 18080，不能自行恢复。明确重启 Whisper 后，两服务 healthy，公开重开仍有 v1–v4、原问题、中文输入，模型调用仍为 2。见 [异常退出注入](../assets/reliable-journey/p3-close-public-host-crash.log)、[恢复后身份](../assets/reliable-journey/p3-close-host-restored.json)、[恢复后截图](../assets/reliable-journey/p3-close-host-recovered.png)。这不是自动恢复接受，也不是云调用中途崩溃的实测。

当前恢复操作必须恢复两个服务：在 AVE 根目录执行 `docker compose -f compose.yaml -f docker/compose.gpu.yaml restart desktop whisper`；若 desktop 已启动而页面仍等待，则 `docker compose -f compose.yaml -f docker/compose.gpu.yaml restart whisper` 可重接当前命名空间。不得只根据容器 running 宣称页面可用。未改 Docker 架构或重启 Docker Desktop。

## 验证与剩余边界

通过：typecheck（最终表单修复后重验）、contracts:check、web:host:test、renderer:workbench:test、stage2-workspace-renderer:test（最终表单版本）、stage3:render:test、stage3:check、architecture、worker:python:lint、worker:python:typecheck。对应 `p3-close-*.log` 保留在同目录。Stage3 全检查在最后表单必填修复前完成；相关 Renderer 和 typecheck 在最终表单修复后再次通过，不冒充全检查在最后修订后重跑。

新增混合画幅集成测试实际编码96×64与128×72素材，解码像素断言输出96×64、顶部黑色留边且中央红色，验证等比适配。新测试前三次设置错误（已关闭旧Host/缺素材授权/缺grant）保留日志，第四次正确建立测试夹具后完整通过；这是工程临时目录，未新增验收服务。

`docs:check` 仍失败：28 项历史能力 Evidence applicability 及旧 latest fingerprint mismatch。本 Evidence 刷新当前 P3 指纹，不改写历史或为未复验能力补假通过。P3正式包完成仍需文档门禁通过。

实际永久遗忘已准备最终确认：仅自建旧验收项目的1条经验/1条原则；作品和历史保留。Computer Use 策略要求永久删除在动作时确认，已请求用户确认，尚未执行。[具体审查截图](../assets/reliable-journey/p3-close-forget-review.png)。学习当前停用，不新增学习。

公开音频库署名完整导出仍未接受；此前不含音乐的真实下载试听不能覆盖此项。当前工作不扩大为 Stage Exit/Release。P4 保留 Apple 简约和颜色冻结，只整合交互、排版、原位表单校验和适用恢复入口。P3继续blocked及active Debt，未调用 docs:complete 伪造通过。

## 最终文档校验追加

新 Evidence 发布后，首次状态校验发现 blocked 包仍留在 active_work_package，已将机器状态纠正为 null 并通过工具重新生成。最终 `p3-close-docs-final-02.log` 的错误剩余27项历史能力 applicability：当前P3适用性和 latest fingerprint mismatch 已解除，仍未通过全局门禁。上述28项是发布前检查结果，保留其时间顺序。所有本次相关 diff whitespace 检查通过。永久遗忘确认仍等待用户回复。
