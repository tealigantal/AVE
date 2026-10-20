---
evidence_id: EVD-20261009-S3-P4-UX-ENGINEERING-RECHECK-R3
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-09
recorded_at: 2026-10-09T14:51:31Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: 8d2fb61a36d1f543000c23e8c57db91ac16e3b95d0b35614b98ef6cd1cb4277e
dirty_build_diff_digest: 3da2d8555dc222560a4ef03d2792f8dc8dbb4c76721f096b28b002d3dc65065c
build_input_digest: 6dbcd55a233404b919dfdf160b5008ec1ae6d4324e865fa659d5384230642319
scope_fingerprint: fc7d64962e43cb20b5a6746cc2b3a6c2e8ef2a4ba3dc9be0f4c58615cefc355f
capability_ids: [CAP-S3-P4-TIMELINE-001, CAP-S3-P4-ANNOTATION-001, CAP-S3-P4-RECYCLE-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-TIMELINE-001, ACC-S3-P4-ANNOTATION-001, ACC-S3-P4-RECYCLE-001, ACC-S3-RELIABLE-UX-001]
result: engineering_recheck_passed_runtime_provenance_verified_human_acceptance_pending
---

# P4 整合工程与当前运行构建复核 R3

## 当前构建身份

在 2026-10-09 14:51 UTC 只读取证：`desktop` 与 `whisper` 均运行且健康，`localhost:6080` 返回 HTTP 200。两服务运行镜像的 build-input digest 均与当前工作区一致；仓库 `assertRuntimeBuildProvenance` 校验通过。该检查只证明当前产品构建的来源/产物绑定及运行身份，不是界面操作或用户接受。

| 服务 | 镜像 ID | 配置摘要 | 运行摘要 | Build-input digest |
| --- | --- | --- | --- | --- |
| desktop | `sha256:98fcc81d5c581be9060002af2e77646633083793ae51f0778acf73c8015188f4` | `374853fbd815ddebde1748497375374586501767e43912d2a3e4ff0d0efae286` | `f65f4dcd1bca79424d2add6af28f8f947e4745c855e3e877099e3ef6f79dfd29` | `6dbcd55a233404b919dfdf160b5008ec1ae6d4324e865fa659d5384230642319` |
| whisper | `sha256:8b61fffd5f5d67514066f21da62a13d11acd06b9d30743af9372668299fe0731` | `d28bc4cb322cc9647719378b660ad4ccf5dd36dd5bc43cd1a5c2a8c47bcd6823` | `7dd1defa304c3673d4704098b624293f0a85b2b80fdbb98739df62137ad8ae37` | `6dbcd55a233404b919dfdf160b5008ec1ae6d4324e865fa659d5384230642319` |

Aggregate runtime digest: `496713ac055cae2fb1a900e87a1dcb7ab979d6ed26364c3789b0a9f68eabf66c`. The verified desktop provenance source digest is `dc193f82552b2ba8454322185df64ff5d3bdbd3e169443b9e2549f48c83fbec8`; output digest is `1a7e0f7fdacb837c0d415a24dc5b466dd36dc7c6f97662797d7a49e7872ec6af`. No service was rebuilt or restarted, and no persistent volume was changed.

## 本次复验

| 检查 | 结果 | 实际范围 |
| --- | --- | --- |
| `pnpm run stage3:p4-integration:test` | 通过 | 页面路由/偏好/焦点恢复；并串行覆盖时间线、草稿、批注存储与 Host、回收站及近期作品集成 |
| `pnpm run renderer:workbench:test` | 通过 | Renderer/Host 边界与工作台入口 |
| `pnpm run interaction-acceptance:test` | 通过 | 记录完整性、失败拒绝、P3历史关闭回归；fixture 不构成 UI 接受 |
| `pnpm run typecheck` | 通过 | 生成 91 份合同产物并通过 TypeScript 检查 |
| `pnpm run contracts:check` | 通过 | 91 个 Schema、91 个有效与 91 个无效示例 |
| `pnpm run architecture` | 通过 | 扫描 1491 个源码文件 |
| `pnpm run docs:sync` | 通过 | programme/current 生成视图同步 |
| `git diff --check` | 通过 | 无空白错误；Git 输出现有 LF/CRLF 转换提示 |
| `pnpm run docs:check` | 未通过 | 仍报告 31 项非本活动 P4 能力的历史 Evidence 适用性错误；没有 P4 能力范围错误 |

本次四项 P4 能力范围指纹与前次 R2 复核相同：

- `CAP-S3-P4-TIMELINE-001`: `1b8e73b58162cb6d5e015c34a04a94d694fede69d2c9849523cc3371b4e1a782`
- `CAP-S3-P4-ANNOTATION-001`: `efcfbe8650435affa7e7eb270ccd4eaa2dfc728569edfc51d5aa065efc15bf54`
- `CAP-S3-P4-RECYCLE-001`: `b29516cab8d6ecd4cb5e0f032d8ebd056a6099b2daf714f3affa1396b37df54d`
- `CAP-S3-RELIABLE-UX-001`: `fc7d64962e43cb20b5a6746cc2b3a6c2e8ef2a4ba3dc9be0f4c58615cefc355f`

## 未关闭项

当前自动化证据目录只含 `known-invalid-import.mp4` 测试输入，没有 WIN-09/WIN-10 的人工录屏或记录。WIN-09 的故障持续、无关成功后同一问题仍可查询，以及 WIN-10 的当前构建实操和用户整体界面接受，均未运行。本记录不把 HTTP、健康状态、工程检查或构建来源校验升级为人工接受；活动包保持 pending，不代表 Stage Exit 或 Release。
