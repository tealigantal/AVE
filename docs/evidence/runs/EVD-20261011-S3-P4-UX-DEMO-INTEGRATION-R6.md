---
evidence_id: EVD-20261011-S3-P4-UX-DEMO-INTEGRATION-R6
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-11
recorded_at: 2026-10-10T18:01:27Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 102a067a8b695240117d05e04ccf70b59ea6c9c8e4b88760c7a5745913f8388b
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: p4_engineering_passed_current_images_deployed_user_acceptance_pending_global_docs_check_blocked_by_historical_applicability
---

# P4 demo 预览批注坐标接入复验

## 本轮接入

- 对照 `demos/p4-workbench/index.html`、`demo.js` 和 `demo.css` 核实：demo 支持在精修预览画面右键添加位置批注；画中画预览显示叠画但没有画面内拖动手柄。本轮按实际 demo 交互实现，没有新增预览画中画拖拽操作。
- 正式播放器在当前精修页右键打开“添加画面批注”；坐标相对解码视频内容区域归一化，排除 letterbox；播放位置换算为当前 Timeline 的精确 RationalTime。所选轨锚定当前播放帧可见的上层视频片段，没有活动片段时回落到主视频轨。
- 新的 Timeline annotation v2 合同明确区分 `timeline`/`preview` surface，预览点范围为 `[0,1]`，预览锚点只接受视频轨和单一精确帧。Project Host 校验当前项目、授权、请求修订、草稿、Timeline 版本及目标轨/片段；v2 以独立追加事件写入，不改 project-format-v2 或 v1 历史。
- v1 schema 和有效/无效示例归档于 `contracts/schemas/legacy/editorial/` 及对应的 examples legacy 路径；稳定 `$id` 与历史 payload 不变，v2 是该合同族唯一当前版本。
- Renderer 通过同一共享对话收集正文和提交；已确认回执前队列固定，保留原操作重试身份。提交或排队中的预览点只在该精确帧显示；项目重开后读取 v1/v2 历史，唯一来源映射后沿用归一化点，失去唯一片段映射时不伪造点位。
- 新增回归覆盖预览内容矩形坐标映射、letterbox 拒绝、当前叠加片段选择、精确 RationalTime、队列 v1→v2 升级、幂等身份、v1/v2 事件读回和 Host 片段移动/分割/删除后的锚点解析。

## 工程检查

- `pnpm docs:start -- WP-S3-RELIABLE-UX-001`：成功（本工作包已登记为活动包）。
- `pnpm run stage3:p4-integration:test`：成功；页面状态、时间线、属性命令、含内容 PiP 轨删除/撤销/重做/重开、v1/v2 批注 Host/存储、回收站和近期项目回归通过。
- `pnpm run timeline-render:test`：成功；当前 Timeline 渲染接受检查通过。
- `pnpm run worker:render-graph:test`：成功；Worker RenderGraph 协议 smoke 通过。
- `pnpm run renderer:workbench:test`：成功；工作台 Renderer 边界检查通过。
- `pnpm run interaction-acceptance:test`：成功；该检查明确说明 fixtures 不是 UI 验收。
- `pnpm run typecheck`：成功；生成 94 份合同并通过 TypeScript 检查。
- `pnpm run contracts:check`：成功，94 个 schema、94 个有效示例和 94 个无效示例通过。
- `pnpm run architecture`：成功，扫描 1493 个源码文件。
- `node scripts/docker/build-reliable.mjs`：成功构建当前两服务镜像；`build_input_digest` 为 `5d192b829738cb87c3bab88790008ccfa5c68ec6fccdb6c7714681e160af0fb6`，desktop 镜像 `sha256:f9cd4081aa50ff8ac9de91b7a7158f606ccf758bf39e39922e8006eb0d128687`，Whisper 镜像 `sha256:f85af05a7e7e92611462cf303dc7ead52f6486c45f92854e48ef8a28dba3499d`。
- 用户明确授权本机部署后，`docker compose up -d --no-build --wait --wait-timeout 1800`：成功，仅重建 desktop/Whisper 两服务，退出码 0，两个容器均达到 `healthy`。desktop 容器 `8f9c25f2becc4de1308c45ee17015c59967d97947fc90fc2f846dff75902882f` 使用 `sha256:f9cd4081aa50ff8ac9ce91b7a7158f606ccf758bf39e39922e8006eb0d128687`；Whisper 容器 `bca0f45e94cf8d19f2bd7a0c8475bd7645d2364a08bb9dfe436870638ef877a9` 使用 `sha256:f85af05a7e7e92611462cf303dc7ead52f6486c45f92854e48ef8a28dba3499d`；两者都标记本轮输入摘要 `5d192b829738cb87c3bab88790008ccfa5c68ec6fccdb6c7714681e160af0fb6`。
- 部署前后 Compose 项目数据卷一致：`ave-desktop_configuration`、`ave-desktop_profile`、`ave-desktop_projects`、`ave-desktop_uploads`、`ave-desktop_whisper-models`；挂载继续分别用于 `/run/ave`、`/config`、`/workspace/projects`、`/workspace/uploads` 与 Whisper 模型缓存。未执行 down、卷删除或项目数据迁移。
- 部署后 `http://127.0.0.1:6080/` 返回 HTTP 200。容器健康和 HTTP 可达只证明运行可用，不作为工作流或 UI 人工验收。
- `node --check apps/desktop/src/renderer/features/player-panel.js` 与 `node --check apps/desktop/src/renderer/features/timeline-annotation-queue.js`：成功。
- `git diff --check`：成功；输出为仓库现有 LF/CRLF 行尾提示。
- `pnpm run docs:sync`：成功。
- `pnpm run docs:check`：失败，仅报告 37 项历史/非活动 Capability Evidence applicability mismatch；活动 P4 两项能力未触发该问题，当前 Evidence 指纹匹配。不得为得到通过而改写历史 Evidence。

## 尚未接受的范围

本轮完整构建现已部署到 6080；容器健康和 HTTP 200 不等于真实工作流或 UI 接受。Renderer/Host 工程回归也不替代真实窗口操作。下一步由用户在该当前完整构建上右键预览图像、填写并发送批注、定位回同一帧并重开项目确认点位；WIN-09/WIN-10 的错误恢复、空项目到导出、键盘/中文输入/焦点/缩放/reduced-motion 及整体视觉接受仍待人工完成。两个 P4 Capability/Acceptance 与活动工作包保持 `pending`。
