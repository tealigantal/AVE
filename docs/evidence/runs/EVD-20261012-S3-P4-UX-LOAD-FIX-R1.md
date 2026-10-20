---
evidence_id: EVD-20261012-S3-P4-UX-LOAD-FIX-R1
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-12
recorded_at: 2026-10-12T06:37:59Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 16d6d40dbb50abdec667f76c02c6b58c783a6b9daa7ec4eb283de241e8bc4983
build_input_digest: 4672455c83e3a343098fc907f9e8776ef7d4c9e25f320a082c01bd67fa799547
capability_ids: [CAP-S3-P4-TIMELINE-001, CAP-S3-P4-ANNOTATION-001, CAP-S3-P4-RECYCLE-001, CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-TIMELINE-001, ACC-S3-P4-ANNOTATION-001, ACC-S3-P4-RECYCLE-001, ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
result: p4_load_root_cause_fixed_current_images_deployed_browser_module_graph_reachable_ui_acceptance_pending
---

# P4 工作台加载失败修复

## 根因

6080 的 HTML 壳和 `/browser/entry.js` 可正常返回，但 Renderer `workbench.js` 直接导入 `../../../../../packages/core/timeline-core/src/public.js`。浏览器将该引用解析成 `/packages/core/timeline-core/src/public.js`；桌面静态服务仅在 Renderer 静态根目录内提供文件，因此容器日志出现 `ENOENT`，动态模块导入失败，页面一直停在“正在加载工作台…”。

Docker 已执行 `pnpm install --frozen-lockfile` 并编译 workspace 包；缺失的是浏览器可访问的静态路径，不是容器依赖列表或 Python `requirements`。

## 修复

- 删除 Renderer 对不可达 timeline-core 包路径的浏览器导入。
- 对新增工作台轨道后的本地命令组装，以及空可选轨的清理判断，改为限定范围的 Renderer 侧计算。
- 时间线写入仍经过当前 Host 验证和原子提交链；没有把本地计算当作权威 Timeline 状态。

## 验证与运行身份

- `node --check apps/desktop/src/renderer/workbench/workbench.js`：通过。
- `git diff --check`：通过；仅有仓库已有的 LF/CRLF 提示。
- `pnpm run stage3:p4-integration:test`：通过；9 项 P4 集成检查以及下游时间线、批注、回收站回归通过。
- `pnpm run renderer:workbench:test`：通过；Renderer 工作台边界检查通过。
- `node scripts/docker/build-reliable.mjs`：通过；构建输入摘要 `4672455c83e3a343098fc907f9e8776ef7d4c9e25f320a082c01bd67fa799547`；desktop 镜像 `sha256:c0606f65ca29c72f38212d34900eff2f72d48e772c70c57ebb0bc95566b16b53`，Whisper 镜像 `sha256:65a519b1174292f0b78e69d1e6ab3325b40c8beea2b31bf8bd3c32ef5965923a`。
- `docker compose up -d --no-build --wait --wait-timeout 1800`：成功；desktop 和 Whisper 均 healthy，restart count 为 0，镜像 build digest 与本轮输入一致。
- `http://127.0.0.1:6080/`、`/browser/entry.js`、`/app/main.js`、`/workbench/workbench.js`、`/styles/workbench.css` 均返回 HTTP 200；返回的工作台脚本不再含不可达包路径。
- 从浏览器入口递归抓取静态模块依赖树：24 个模块全部可取，无失败请求或未解析的相对/绝对模块依赖。
- desktop/Whisper 的五个项目数据卷仍挂载在原名称：`ave-desktop_configuration`、`ave-desktop_profile`、`ave-desktop_projects`、`ave-desktop_uploads`、`ave-desktop_whisper-models`。
- `pnpm run docs:sync`：通过。`pnpm run docs:check`：仍报告 34 个既有/非本 P4 范围 Capability Evidence applicability mismatch；本轮涉及的 P4 Timeline、Annotation、Recycle 能力不再出现该错误，未修改历史 Evidence。
- 本轮没有运行 Stage3 全量检查。HTTP、健康检查和模块可达性只验证资源/服务加载条件，不等于实际窗口交互或 P4 人工验收。

## Current scope fingerprints

- CAP-S3-P4-TIMELINE-001 scope_fingerprint: 00464248e577d117dc2a91bd9560a9f29eee67830bcddec742fa57c7b492a7c6
- CAP-S3-P4-ANNOTATION-001 scope_fingerprint: e5d6e8960b016a373c1e14aa03aeedca82f7c84d519b6ecbedaae61a3cfe48ef
- CAP-S3-P4-RECYCLE-001 scope_fingerprint: 5939185dcd23108e6e2de0dbe40bc507729ce96497dd2363bd85142c05d31b02
- `CAP-S3-P4-DEMO-INTEGRATION-001`: `6b3bd9707590aaf210191af25c0174a88b6e13d4f02537e63bc534e480353e28`
- `CAP-S3-RELIABLE-UX-001`: `fd0a363a251924e614605e59b3294a1c9c0ec39c0ddc2bd05969287acdbea2ef`

## 尚未接受

请在浏览器中刷新 `http://localhost:6080`。本 Evidence 记录修复已部署，但不代表用户已确认工作台真实显示、WIN-09/WIN-10 流程或整体 P4 视觉接受。工作包保持活动，未执行完成或推进操作。
