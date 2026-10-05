---
evidence_id: EVD-20261003-DOC-007-BASELINE
date: 2026-10-03
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: d5547cc3b77637c81540bd6d25314d42bf17d9ffb886f49e40609e767ce7e6d1
result: baseline_docs_check_failed_runtime_acceptance_not_run
---

# DOC-007 首次只读基线

工程执行事实层，归属 [DOC-007](../../plans/2026-10-03-reliable-workbench-real-acceptance.md)。
本记录不绑定产品WP或提升能力状态；后续结果新增Evidence，不改写此首次失败。

## 环境与范围

2026-10-03 Asia/Shanghai，Windows PowerShell，Node v22.16.0，实际pnpm 11.19.0
（packageManager声明11.9.0）。分支main，上方HEAD为读取基线。generated状态无活动WP，
Stage3为tested，高级editing能力仍blocked。未执行docs:start/complete或业务写入。

## 数据与四项已有变更

`git status --short`恰有下列四项；`git diff --stat`为4 files、10 insertions、1 deletion。
以下是文件实际SHA256，包含用户当前未提交内容，后续必须逐字节保持：

| 文件 | SHA256 |
| --- | --- |
| `.dockerignore` | f0d8ca1aab3056f6a7e6812a35a511692832fe6cdcac5baec931555a7d023a99 |
| `docker/Dockerfile` | 89194af26baf96127986c13119474a4ff39c6a6307530cb9d5e7a4823c9e1d8e |
| `docs/plans/2026-10-02-mixed-media-resource-packs.md` | 935d675a252c74cf592ab908d5da7948d8e33b9cb32ff759b04d7f16c33b46d2 |
| `tests/integration/docker-packaging.test.mjs` | dea1c3e09d3b233d607f13e540b676023a3ca6f016f38b2ee8a0d7995726d431 |

源码指纹由 `node scripts/docs/fingerprint.mjs`计算为上方值；它不涵盖全部Docker/资源输入，
不当成完整镜像指纹。项目、素材、上传、profile、configuration及模型缓存未改动，
未读取凭据正文、未删除卷、未重构/停止容器、未外传媒体。

## 首次 docs:check 原始失败

命令 `pnpm run docs:check`，exit 1。执行在本轮文档写入前；SQLite experimental warning
不是此次失败根因。失败输出完整保留如下：

```text
generated drift docs/current/VALIDATION.md
evidence applicability CAP-RENDER-001
evidence applicability CAP-PRESET-001
evidence applicability CAP-FND-001
latest evidence fingerprint mismatch editing-execution-v1
evidence applicability CAP-CA-CONTEXT-001
evidence applicability CAP-CA-STORY-001
evidence applicability CAP-CA-PIPELINE-001
evidence applicability CAP-CA-FEEDBACK-001
evidence applicability CAP-CA-PRODUCT-001
evidence applicability CAP-CA-PRODUCT-002
evidence applicability CAP-CA-UX-001
evidence applicability CAP-CA-EXIT-001
latest evidence fingerprint mismatch creative-assistant-v1
evidence applicability CAP-S3-DOCKER-001
evidence applicability CAP-S3-WEB-001
evidence applicability CAP-S3-DOCKER-CLEAN-001
latest evidence fingerprint mismatch creative-assistant-stage3
[ELIFECYCLE] Command failed with exit code 1.
```

只记录本次失败，不预判每项全部根因、不改历史Evidence/适用性索引来修绿。

## 只读运行与镜像身份

`docker compose ps --format json`显示desktop/whisper两服务running/healthy；这里只证明
进程健康状态，没有播放、授权、导出或恢复操作。当前实际运行image ID与下面本地tag
inspect结果一致；当前Compose使用GPU覆盖文件。身份来自只读Docker输出，未读环境key。

| 服务/tag | 镜像ID与RepoDigest | 容器ID前缀 | 镜像Created UTC |
| --- | --- | --- | --- |
| `desktop` / `ave-desktop:local` | `sha256:27ae7d4714354f86e469177e07ee3df513e324206edba05a46cceab10207daf7`；`ave-desktop@sha256:27ae7d4714354f86e469177e07ee3df513e324206edba05a46cceab10207daf7` | `8db616b62a30` | `2026-10-03T10:08:49.606151024Z` |
| `whisper` / `ave-whisper:local` | `sha256:03ef0528e1fdc25fdb89d5d6ac9a57fa3b47e11fa43a5448937315f26e388f09`；`ave-whisper@sha256:03ef0528e1fdc25fdb89d5d6ac9a57fa3b47e11fa43a5448937315f26e388f09` | `fef46bab61b2` | `2026-10-03T10:07:41.222095883Z` |

完整build-input/runtime清单摘要、镜像内文件与当前源码一致性均未测；不能把这些现有镜像
当作本计划最终构建。最终身份与重新实操由实施P0/P5绑定。

## 明确未运行

问题照片和两段失败MP4未在本轮获取精确来源/解码；无真实模型费用、Windows文件选择器、
播放/声音、导出文件打开、连续有声录屏、用户主观接受或Stage Exit/Release。本轮是计划，
不是上述步骤失败后的自动代操作。当前会话原生电脑API不可用，所需实操能力仍待验证。
