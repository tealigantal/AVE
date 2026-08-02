<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-R23 真实成片 QC 复核

## 目标

核对用户真实项目的 Master、Timeline 和 Project Host QC 是否一致；修复已证明会漏检可见黑帧的 QC 规则。通过 Project Host 提交必要的 Timeline 修正并重新渲染，不复制、上传或提交用户媒体。

## 当前证据

- 用户项目 Master 为 `renders/master.mp4`，FFmpeg `blackdetect=d=0.1` 检出约 `2.533333–3.533333` 秒黑帧，`freezedetect` 也检出同一段冻结。
- Timeline v6 将第二个视频片段从 `227943n` 移到 `317943n`，形成约 1 秒空档；这解释了黑帧来源。
- 旧 Worker QC 使用 `blackdetect=d=1`，对这段边界长度黑帧漏检，因此数据库 `qc_status=passed` 不足以证明成片无黑帧。
- 已将 `blackdetect` 最小检测窗口收紧为 0.5 秒，保留 `freezedetect` 1.5 秒以避免把合法的静态色块测试素材误报为冻结；显式 QC finding 顺序保持兼容。
- `worker:qc:test`、`timeline-render:test`、合成最终验收均已复验通过；用户 Master 使用新 QC 只读复核为 `BLACK_FRAME` blocked。
- Project Host 已提交 Move-back Command，将第二个视频片段从 Timeline v6 的 `317943n` 移回 `227942n`，形成 Timeline v7 的连续视频区间；未复制、上传或提交用户媒体。
- 在 `renders/r23-no-gap-v2` 生成第二版 Preview/Master；Worker QC 为 `passed` 且无 issues，关闭 Project Host 后重新打开仍为 Timeline v7、render available、QC passed。
- 第二版 Master/Preview 均为 229 帧；音频均为 5.077 秒；FFmpeg `blackdetect=d=0.1` 与 `freezedetect=d=0.5` 均未检出事件。
- 远端 Check 审计发现并修复两个本地可复现问题：Worker media smoke 不应依赖被忽略的 generated fixture；Security workflow 不应扫描自身的绝对路径正则。当前本地完整 check、audit 和等价扫描通过，尚未推送。

## 结论与边界

- R23 本地真实项目验收：`PASS`。
- 外部剪辑软件、生产 Provider、GitHub 远端 Check 和正式发布平台仍是独立未验证项；当前工作树修复尚未推送，因此不得宣称远端 Check 已通过。
