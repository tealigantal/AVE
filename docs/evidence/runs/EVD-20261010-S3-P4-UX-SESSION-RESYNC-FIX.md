---
evidence_id: EVD-20261010-S3-P4-UX-SESSION-RESYNC-FIX
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-10-10
recorded_at: 2026-10-09T17:11:37Z
repository_commit: b600b38f2afe280f0152c1811e6b2d928e5e3a95
code_fingerprint: beaff1a64b8a33b91bd192419e26a5b4f174f4ebc91514ecd63e65006b7e1a9b
dirty_build_diff_digest: d407b83e239f22cac7d529d4a76762d89fbfe1d8ef105963aac7ca6e353cdfbf
build_input_digest: afaf03f65aab0e5bf640dcaf26f54eb76fd75818cb171092f5772519afa30e88
scope_fingerprint: 732c24244c32934a2b2e23249a6f0e7db500f4bb447d34280ee613edc5251bf8
capability_ids: [CAP-S3-PROJECT-DELETE-001, CAP-S3-P4-TIMELINE-001, CAP-S3-P4-ANNOTATION-001, CAP-S3-P4-RECYCLE-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-PROJECT-DELETE-001, ACC-S3-P4-TIMELINE-001, ACC-S3-P4-ANNOTATION-001, ACC-S3-P4-RECYCLE-001, ACC-S3-RELIABLE-UX-001]
result: session_resync_fix_engineering_passed_human_acceptance_pending
---

# P4 过期项目会话同步修复

## 根因与处理

6080 Browser Host 在多个已注册浏览器窗口间共享单一活动 Project Host。一个窗口切换项目后，其他窗口可能在收到同步事件前仍发送旧 `project_id`。Main 原先以 `DESKTOP_PROJECT_MISMATCH` 拒绝，保持了数据边界，却让 Renderer 把可恢复的陈旧会话显示成普通操作失败。第一次修复后用户仍看到弹窗；新日志表明当前复现并非旧项目身份，而是没有打开项目时全局刷新回收站触发的同一错误。

旧身份在捕获时以 `DESKTOP_SESSION_STALE` fail closed。Main 在 250ms 窗口内合并同步通知；所有已连接 Renderer 收到无项目绑定的 `project.session.changed` 后刷新权威状态。Renderer 将该码作为控制流处理，命令路径读取新状态，不产生持久问题或错误 toast。此次补齐 `app.projects.recycle-bin` 的无项目全局查询分类，使其能在项目关闭/首页状态正常刷新。其他必需项目请求仍为 `DESKTOP_PROJECT_MISMATCH`；不会跨项目执行请求或回退到旧项目内容。

错误发生在读取旧项目数据之前，没有证据表明项目格式不兼容。本次未增加迁移/兼容逻辑，也未删除、打开或修改现有项目数据。

## 验证

- `pnpm run stage3:p4-integration:test`：通过；新回归证明旧项目请求在到达 Host 前被拒绝，并向连接窗口发同步事件；同命令下时间线、批注、回收站及近期项目测试通过。
- P4 集成回归新增 `P4 recycle-bin query works without an open project`，直接验证上述触发条件及返回值。
- `pnpm run stage3:desktop:test`：通过；覆盖桌面生命周期、旧会话拒绝、真实 SQLite 关闭与授权边界。
- `pnpm run renderer:workbench:test`：通过。
- `pnpm run interaction-acceptance:test`：通过；夹具/完整性检查不等同于真实 UI 接受。
- `pnpm run typecheck`：通过，91 项合同生成及 TypeScript 检查成功。
- `pnpm run contracts:check`：通过，91 个 Schema 与有效/无效示例检查成功。
- `pnpm run architecture`：通过，扫描 1491 个源码文件。
- `pnpm run docs:sync`：通过。
- `git diff --check`：通过。
- `pnpm run docs:check`：此前结果仍有非本活动包历史 Evidence 适用性错误；本次修改后需重新确认。
- 针对本次修复使用 `node scripts/docker/build-reliable.mjs` 后执行 `docker compose up -d --timeout 60 desktop whisper`；两个服务现均 healthy，`http://localhost:6080/health` 返回 `ready`，部署后最近 3 分钟日志未见 `DESKTOP_PROJECT_MISMATCH`、`QUERY_FAILED` 或来源错误。用户真实 UI 复测仍未完成。

## 当前运行身份

- Repository commit: `b600b38f2afe280f0152c1811e6b2d928e5e3a95`
- Code fingerprint: `beaff1a64b8a33b91bd192419e26a5b4f174f4ebc91514ecd63e65006b7e1a9b`
- Dirty build diff digest: `d407b83e239f22cac7d529d4a76762d89fbfe1d8ef105963aac7ca6e353cdfbf`
- Build input digest: `afaf03f65aab0e5bf640dcaf26f54eb76fd75818cb171092f5772519afa30e88`
- Runtime digest: `ea8f0184e080869493eb7ddf39d35f67559e69ff15c6158ca33a13f13c851493`
- Desktop image: `sha256:0c1d9b1d6cf0fdbc3994fed87101636b57cb5da5ec41aa8db604b0279d6ce008`
- Whisper image: `sha256:49a6459d72d7e558fdc9367f1e594ffc4c1d34856fd06e5fd8055340b371088e`
- Both services report healthy; `http://localhost:6080/health` reports `ready`.
- Existing project, profile, configuration, upload, export and Whisper model mounts retained the same volume/bind identities across the two-service update.
- Full current runtime manifest: [p4-recycle-query-build-identity.json](../assets/p4-ux/p4-recycle-query-build-identity.json).

## 尚未验收

本 Evidence 只证明工程回归、构建来源和运行挂载身份。用户仍需在当前 6080 构建中复测跨窗口项目切换同步及原 WIN-09/WIN-10 全流程；P4 人工接受与工作包完成状态保持 pending。

## 当前 scope fingerprints

- `CAP-S3-PROJECT-DELETE-001` scope_fingerprint: 6da011e4ee74bb31840cf7f6abfae778da331ab1a26e3ad2b7bd24e8ee3215ba
- `CAP-S3-P4-TIMELINE-001` scope_fingerprint: c18fa50172ad3049e89b0974216f0db08ed1e335d2190cdd2c4cad9999f87df8
- `CAP-S3-P4-ANNOTATION-001` scope_fingerprint: 7e7d7fcf7a5321c73b1bdd51a481e78c10c124ab59c7a1eee6937e415afa02bd
- `CAP-S3-P4-RECYCLE-001` scope_fingerprint: 81b92f157f5a08165c8ab389f60e6b128c426532f7bba50d0b759f1d9e28cb37
- `CAP-S3-RELIABLE-UX-001` scope_fingerprint: 27964f648a1f28056a37cb3da13f8e69a78a1128383394315d8634f2df18c14b
- `CAP-S3-RELIABLE-UX-001`: `732c24244c32934a2b2e23249a6f0e7db500f4bb447d34280ee613edc5251bf8`
