---
evidence_id: EVD-20261003-S3-RELIABLE-IMPORT-ENGINEERING
work_package_id: WP-S3-RELIABLE-IMPORT-001
date: 2026-10-03
repository_commit: 13a3ce07fa9b4a7d8a7bf9a338497d9a0cc214de
code_fingerprint: 497a083ffeaebcb16ba8a2c0443916feba1bb767b15b441751ea8d36604a7f7a
scope_fingerprint: 7e0cba4eae5e8b1a6c5d11e1bae50c95ad9edb56fe8ff055dbd142808fc892a6
capability_ids: [CAP-S3-RELIABLE-IMPORT-001]
acceptance_ids: [ACC-S3-RELIABLE-IMPORT-001]
result: blocked
---

# P1 工程实现已验证；真实验收与仓库检查未通过

本记录追加P1当前事实，不改写P0、DOC-007或旧产品Evidence。
P1不完成，不运行docs:complete，不启动P2。工程测试不是Windows实操或主观接受。

## 实现与兼容边界

Host保存批次、逐项状态、私有来源及问题历史，使用现有object_refs/object_store和
project_events，数据库v2没有改表或迁移。资产、位置、批次修订和单项结果联合事务；
坏文件继续，取消保留成功项，失败项重试，内容身份去重和重复点击幂等。
权限、空间和数据库错误停止批次，Worker保留类型化OS错误及组合根因。
上传准入绑定项目/对话框/会话/单项，预先登记私有来源后接收字节，上传完成仍等待校验。
清理依据持久Host引用，保留已登记原片；中断/取消与重开保持终态，不随浏览器会话清理原片。
system.choose-files只返回批次/单项/不透明来源引用，Renderer不取得原片路径。
EXIF缺失、0和1–8以真实像素和透明通道验证；0保存兼容说明，非法值及损坏文件拒绝。
批次卡与恢复入口读取Host结果，通知仅报告对应操作，不声称作品整体成功。
浏览预览/严格分析分离仍属P2；未放宽MEDIA_SAMPLE_AUDIO_GAP，未宣称高级剪辑完成。

## 检查与首次失败

| 检查 | 实际结果与限制 |
| --- | --- |
| contracts:check / typecheck / architecture | exit 0；最终typecheck-frozen-p1、contracts-check-frozen与architecture日志 |
| media-import:storage:test | 最终exit 0，真实SQLite三处事务故障、CAS/重试/丢失提交确认、旧v2重开、独立无依赖validator日期边界 |
| media-import:host:test | 最终exit 0，真实Worker坏文件首中尾、内容身份、选择顺序、取消晚结果、失败重试、数据库故障与重开；权限/空间协议故障另有镜像真实OS测试 |
| web:host:test | 最终exit 0，实际HTTP准入、跨会话拒绝、断流、取消/清理、原片引用保护及不透明选择后导入 |
| stage3:mixed-media:test / stage3:desktop:test | exit 0，纳入Stage3检查；方向真实解码及生命周期故障恢复，非用户问题素材或真实chooser |
| stage2:check | attempt02 exit 0，控制模型工程回归；开始后仅修改取消恢复提示与上传名称上限，这两项由最终Host/Web专项重验 |
| stage3:check | attempt03 exit 0，实际编码/双目标QC/工程Electron、配乐与精修；同样不将开始后的上述两项变化冒充整套最终指纹重验 |
| Worker lint / typecheck | 最终exit 0，无Ruff错误，31个Python源文件mypy通过 |
| docs:architecture:test / docs:fingerprint:test | exit 0，治理转换和指纹回归；不证明产品实操 |
| git diff --check | 最终源码检查exit 0，生成同步后仍需最终差异核对 |
| pnpm run check | final-attempt exit 1，在docs:check停止，下游检查未由本命令执行；历史Evidence applicability/latest fingerprint失败保留 |
| docs:sync | exit 0，只同步生成视图，不使失败Evidence通过 |
| Windows WIN-01/02/08 | not-run，缺用户问题照片/两MP4来源身份，Windows工具无法可靠确认浏览器URL；无真实录屏/声音/选择器记录 |

首次真实Worker测试发现损坏PNG被FFprobe描述为空流却登记成功，随后增加实际解码帧
有效性检查并保留error级解码诊断。Web清理返回旧恢复提示与测试finally覆盖原始错误
已分别修复。关闭回归暴露retiring会话阻断原数据库关闭重试，修复活动会话守卫。
Stage3 attempt01暴露返回顺序变化导致音频被当作镜头，修复按批次选择顺序返回并检查
对应资产/位置；manual-after-order-fix通过。attempt02实际Electron暴露孤立runtime缺
ajv-formats依赖，生成工具内联现有严格日期validator并测试无npm依赖导入。
focused desktop首次fixture缺pending/importBatches，修复fixture后实际工程旅程通过。
这些首轮日志保留，attempt03建立在具体修复之后，不用重复运行抹去首次失败。

## 当前候选构建与运行区别

build-images-attempt05实际完成，两镜像完整输入摘要：
`28a0a84c9b9a7091c86a442fb6f842234f90750cf5ebedde1a05460b7d42c32f`。

| 服务 | 候选镜像身份 |
| --- | --- |
| desktop | sha256:51da113b091e745d84caf17b892f4aafa7e58610438ac24032834bd2a55b6b66 |
| whisper | sha256:90ed456d05f6ae2fbced127b7c30e32abb215e7b1edbc45e7b9bc2f0ba5d2876 |

image-provenance-check-attempt03逐项比对826个源码输入、688个实际输出，source摘要
`606c8a41a461c92ff78aca6688e514e62a22d854c3fe3e0ecaef3128bb4a774f`，output摘要
`a6f21da2b90312badbd986a152bc18f38adf1332f6305d8ad67f894eb1d16fc4`。
image-import-smoke-attempt03在此精确desktop镜像的隔离只读、断网、非root临时容器中，
实际chmod权限拒绝与tmpfs低空间停止、坏文件继续、顺序和SQLite重开通过。
使用合成素材，无用户卷、模型调用、UI注入或Windows成功主张。

现有运行服务仍是desktop sha256:27ae7d4714354f86e469177e07ee3df513e324206edba05a46cceab10207daf7、
whisper sha256:03ef0528e1fdc25fdb89d5d6ac9a57fa3b47e11fa43a5448937315f26e388f09。
本轮没有重启/替换现有服务，不能用候选镜像工程检查证明运行工作台通过。

## 阻塞、数据保护与恢复

DEBT-S3-RELIABLE-IMPORT-ACCEPTANCE记录当前门槛：当前来源身份、可操作Windows的URL校验、
运行候选构建的WIN-01/02/08有效记录，以及docs:check真实失败的合法处理。
工具不能操作的步骤保持not-run；不使用后台接口、模拟授权、合成文件或自填pass替代。
恢复时先核对来源/实际页面和保存状态，再重新激活同一P1；不重复已经成功的导入或云调用。
新源码/镜像影响实操时重验，不沿用本记录证明尚未执行的动作。

四项原改动逐字节SHA256仍等于DOC-007/P0基线；35个P0后构建输入差异均在P1 allowed paths。
构建输入审计不替代完整Git授权历史。项目、原片、配置、模型缓存和五个现有AVE卷未清理。
没有提交、推送、合并、发布或真实云模型调用。
工程检查有范围通过；真实实操、用户美学/故事/听感接受、Stage Exit、Release均未完成。

本地日志、首轮失败、构建/输出身份及摘要见
[artifact-manifest-engineering.json](../assets/reliable-import/artifact-manifest-engineering.json)。
此清单只证明工程文件身份，不是产品交互收据；私有素材与操作证据仍未取得。

阻塞登记后的追加核验：docs:architecture:test与git diff --check均exit 0；docs:sync
exit 0，docs:check仍exit 1，旧capability Evidence适用性失败保持原状。生成WORK已无
active包，P1为blocked；其他programme的ready backlog不属于本次P0–P5顺序，不启动。
最终追加日志SHA256：docs-check-blocked.log
`1d8e673f1a4f9a796811ce36f18573b46010d48c20c5b04316b60d887dc5a46f`，
docs-sync-blocked.log `79460c953b9923a8cd410ff999495c6f17c04ecc4d69361a7b80836871728725`，
diff-check-blocked.log `8c6957a88095004f189b3616f2746cf13900185a0490a26e8fc17bb88bbbd1023`。
此前工程清单摘要为`13bea84339286796b0b18aa6251ce17e624aef0fb82737f48a14a941ae4266be`；
追加日志不覆盖该清单或任何首次失败记录。
