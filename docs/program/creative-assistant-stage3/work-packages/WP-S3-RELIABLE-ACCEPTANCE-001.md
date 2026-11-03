# WP-S3-RELIABLE-ACCEPTANCE-001 — P5 当前构建端到端验收

## 目标与边界

本包接续已关闭的 P4，在同一当前双服务构建上执行 DOC-007 P5：使用本机已有许可明确的 NPS/USGS 混合素材、当前配置的模型和实际 Worker/FFmpeg，完成 WIN-01–10 与 C1–C9 的真实界面流程，保存连续交互记录、Host状态、输入/输出摘要和完整运行身份。人工审美、故事与听感反馈不是关闭条件；必须如实记录实际机器播放与解码，不得伪称人工听评。

本包是最终验收和文档整理，不拥有新的运行时代码。若发现产品缺陷，保留失败和根因，把修复登记回对应能力包，再在修复后的新构建重跑受影响的步骤；不把模拟数据、API直调、旧构建、截图、健康检查、合成接受或历史 Evidence 充作当前产品验收。使用隔离测试项目与测试档案，绝不覆盖用户作品、Profile、配置、原片、上传、导出、Whisper模型或现有卷；不得读取或输出密钥。

## 来源与构建约束

- 输入从 `docs/evidence/assets/mixed-media-p5/review-manifest.json` 所列许可边界复用；逐个记录实际路径、字节数、SHA-256、来源与用途。必须覆盖真实视频、图片、音频以及已准备的失败/重试样本。
- UI操作走正式 Workbench/系统选择器和产品授权对话；模型请求与取消、修订、比较/采用都由界面触发。Host只作只读状态核对；不直接写SQLite或绕过权限。
- WIN-03、WIN-04、WIN-06、WIN-07须保留实际播放声音的连续录音，并绑定实际解码/输出证据；静音录屏、波形图和音频指标不能替代真实声音捕获。人工听感保持可选。
- 交互记录绑定同一 `code_fingerprint`、build-input摘要、桌面与Whisper image IDs、运行文件清单、Worker/Python与FFmpeg身份、模型/配置来源和时间窗。公开Evidence不得含API Key或私人媒体路径。
- 全量检查使用项目锁定的Python/Worker依赖；默认Python环境下 Pillow 版本不匹配的失败保留为环境事实，不以重跑删改历史。最终 `pnpm run check`、`pnpm run acceptance:final:synthetic`、`pnpm run interaction-acceptance:test` 与 `pnpm run docs:check` 均需有本轮日志。

## DOC-011 适用性续验

本包更新的中英文 README 和 P4 工作包当前状态说明属于 DOC-011 已登记的部分 capability scope。为让当前文档门禁与证据索引保持一致，P5另行复核受影响 scope 的 required tests，并在 `docs/evidence/APPLICABILITY_INDEX.json` 以 index-only 关系登记新指纹；对应工作只能在本节明确的文档、Evidence、索引路径内进行。保留历史 Evidence 原文、产品状态和 Stage2 真实素材／完整时长活动债务；已移除的 `stage2-product-workspace:real` 不再作为当前执行门禁；索引关联只说明当前源码适用性，不将其转换为产品接受。

## 操作清单

| 步骤 | 正式界面操作与可观察结果 | 场景绑定 |
| --- | --- | --- |
| WIN-01 | 空项目通过系统文件选择器导入真实混合素材，核对逐项结果、方向、资产身份和授权边界。 | C1 |
| WIN-02 | 追加素材，取消一项，触发有根因的失败并只重试失败项；成功项不重复、失败项目录与恢复操作仍存在。 | C2、C9 |
| WIN-03 | 在正式预览中缩放图片、播放/seek/全屏视频、试听真实音频并快速切换；录下实际声音且确认无串流。 | C7、C8 |
| WIN-04 | 在产品授权对话后发起真实创作；制作期间输入、取消或修订请求，观察实际模型调用、进度、草稿和Host版本。 | C1、C2、C3 |
| WIN-05 | 多次精修/续改，保护既有内容，比较和采用版本，执行撤销/重做；至少验证同一来源不同意图的输出差异。 | C3、C4、C5 |
| WIN-06 | 在正式 Profile/音频入口试听并选择授权资源；先征求测试档案的学习授权，再在独立留出项目验证实际检索/应用、一次性例外、长期纠正、遗忘和遗忘后的新项目。 | C5、C6 |
| WIN-07 | 固定版本导出，打开真实下载文件，核对画面/声音、Host输出哈希、字幕/音频/署名附件与来源。 | C8 |
| WIN-08 | 刷新并通过作品管理正常关闭、重开，核对导入、输入、版本、问题和导出身份。只有确认无在途任务时才重启本任务的AVE服务；不触碰其它容器或卷。 | C4、C7、C8 |
| WIN-09 | 注入已准备的损坏来源；等待至少30秒、完成无关成功后重新查询同一问题，再用同名有效来源恢复。 | C2、C9 |
| WIN-10 | 从新空项目走到导出页；核对宽窄视口、125%/150%等效比例、键盘、IME、焦点和减少动态，并保留结果。 | C1、C7、C8 |

同一连续记录须包含全部十步及C1–C9。C5必须以同一批真实来源、不同自然语言意图产生可核对的镜头选择/顺序/节奏/视听差异，不输入时间码代替意图；C6必须在新的独立留出项目执行真实学习链，证明新项目此前未参与学习，测试档案与用户Profile分离，并在遗忘后验证排除结果。C7按本包当前正式运行面执行，不以旧版固定布局截图替代。C9必须保持不同失败根因，不把错误改写成成功。

## 关闭条件

1. 全部WIN步骤结果均为 `pass`；每步具有录音段、日志、与对象身份及输入清单一致的Host状态。含声音步骤必须有声音捕获，WIN-07包含真实下载文件及输出哈希。
2. C1–C9均映射到对应实际步骤并通过交互记录工具检查；单一连续录音完整覆盖记录的开始和结束。
3. 当前构建和两服务身份与运行时文件清单完整绑定；C5、C6的真实对象/模型调用/档案事件可复核。
4. 完整工程检查、最终合成验收、交互记录校验、Evidence applicability、`docs:sync` 和 `docs:check` 通过；更新现行中英文使用、限制与恢复说明。
5. 生成 `EVD-*S3-RELIABLE-ACCEPTANCE*` 后，按程序工具正式关闭本包。Stage Exit 与 Release 另行报告，不由本包自动声明。

## 运行检查点

在此记录每个步骤的实际结果、当前构建身份、日志/录音/Host状态引用、失败及修复所属包、下一动作。未运行的步骤保持 `not-run`，不得用旧Evidence补写为本轮通过。

### 2026-10-15 起始

- P5 已通过 `pnpm docs:start -- WP-S3-RELIABLE-ACCEPTANCE-001` 启动；起始 dirty baseline 保存在 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-start-dirty-baseline.txt`。
- 当前 desktop/Whisper 服务均 healthy，image IDs 为 `sha256:df69a9c24ba3f3207b565a63adcf5cec1e08a923945d0eee10d77d5a2b20eb0b`、`sha256:2a6c53ddf1513f1cd2d1a3b81b56a0a57cd4e1124b0ee5ac32c67725d27a422b`，build-input digest `c558d1edffc7a549d76586bff3549a4dc65367cd0f55e67133ec5f1916a3c398`；未重启或替换服务。
- P5 已起独立双服务运行面 `ave-p5-current-20261015`（6081），其 profile/project/upload/export 使用独立新卷，模型配置取本机 `.env` 注入到测试容器，Whisper 缓存从现有卷复制到新卷后使用；源缓存与副本文件内容聚合哈希、树哈希、大小均一致，验证日志哈希 `28EEB98A4A289FB36A6A51C851CADE3C54414CF854DC354947465DF7481B7421`。原 `ave-desktop` 两容器仍健康，未被重启或挂载写入。当前 runtime 身份文件 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-runtime-identities-20261015.json` SHA-256 `56DC4DCF924F010557ED4801DA16B86D7630B9A2897006582962C9490573D1E5`，四个服务记录的 build-input digest 均为 `c558d1ed…`。
- 初始化遇到两项真实环境要求并已修复：desktop 启动脚本需要模型环境变量；Whisper 需要可写缓存和GPU reservation。修复只作用于 P5 隔离面。P5 desktop 页面目前显示空作品库；已在新隔离卷创建一项空作品。后续开始交互记录时会从该空作品导入开始；其余 WIN 步骤与 C1–C9 仍为 `not-run`。
- 首轮 `pnpm run docs:check` 退出1，发现 12 个 applicability 指纹：10 个历史 scope（`CAP-CA-EXIT-001`、`CAP-CA-GOV-002`、`CAP-S3-DOCKER-001`、`CAP-S3-WEB-001`、`CAP-S3-DOCKER-CLEAN-001`、`CAP-S3-MEDIA-001`、`CAP-S3-AUDIO-PACK-001`、`CAP-S3-SOUNDTRACK-001`、`CAP-S3-PRECISION-001`、`CAP-S3-MEDIA-CLOSEOUT-001`）及2个 P4 scope（`CAP-S3-P4-DEMO-INTEGRATION-001`、`CAP-S3-RELIABLE-UX-001`）。日志 `docs/evidence/assets/mixed-media-p5/current-build-20261015/p5-docs-check-applicability-failure.log`，SHA-256 `F14171672661848F8031C7FF83CA323571AE2C63BC20EE6F8D4A1EA226740B04`。
- 本轮 WIN-01–10、C1–C9 均为 `not-run`。下一步按 DOC-011 对当前指纹对应的 required tests 逐项验证；退役命令的历史失败记录保留，当前不再执行其占位检查；Stage2 真实素材／完整时长债务仍未通过。完成该复核后在同一双服务构建上执行真实媒体与模型交互。
