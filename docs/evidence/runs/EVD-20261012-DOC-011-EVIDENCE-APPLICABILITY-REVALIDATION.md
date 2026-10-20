# EVD-20261012-DOC-011：当前源码 Evidence applicability 复核

## 目的和范围

本记录复核 DOC-011 开始时 `docs:check` 报告的 37 个历史 capability scope 与 programme latest Evidence 身份。它只登记历史 Evidence 对当前源码范围的适用性，不改写历史 Evidence，不表示产品能力已接受，不关闭 Stage Exit 或 Release，也不完成任何产品 Work Package。

当前源码 `code_fingerprint`：`30d4731e157742f8a1c7c0d004ac044dc7609b0f622c699d826ae1a62b49adae`。

当前审计：`docs/evidence/assets/doc-011/scope-audit-20261014-current.json`，SHA-256 `b3d5932beeB901044062bc7dce0470db4b79d01be05ce9191fcc9cc3520309e3`。它保留基线 37 个过期 scope 的历史指纹，并记录 37 个当前 scope；其中 28 个相较 2026-10-12 审计又发生变化。required-test 清单有 92 个不同命令名，其中 89 个是本轮测试命令，另有 `docs:sync`、`docs:check`、`check` 在索引更新后执行。

## 验证结果

完整 89 项命令结果、各次重试、退出码与日志 SHA-256 见 `docs/evidence/assets/doc-011/current-rerun-20261014/commands-final-20261014.json`，文件 SHA-256 `77fedd96b3d78e4537c18892c008b30ebf6e6106c912f948d14f2cc1cbb2009d`。88 项最终退出码为 0；一项旧入口明确返回 `STAGE2_DESKTOP_REVIEW_RETIRED`，不记作验收通过，历史 Stage2 真人审阅债务继续保持 active。

现有本机输入下重新执行的 `acceptance:basic-vlog:real-review`、`acceptance:foundation:real`、`intelligence-pipeline:real` 均以退出码 0 完成。输入清单与外部审阅根目录留在仓库外；账本只保存脱敏日志，不包含密钥或私有素材路径。

原 `stage2-workspace-renderer:test` 和 `stage2:check` 首次失败源于测试选择器仍假设旧导出 DOM；修正 selector 后两项重跑通过。Stage3 导出焦点断言已改为检查现行 `.export-dismiss`（“返回创作”），Renderer 在导出页保留弹窗焦点所有权；`stage3:desktop-workspace:test` 与完整 `stage3:check` 均通过。`worker:render-correctness:test` 使用固定 Python 运行时通过；现行断言分别验证默认留边与显式 fill/crop，未削弱断言。

复核期间发现的 6 个 creative-assistant-v1 scope 仍包含已退役 Stage2 真实审阅入口。日志确认该入口被显式拒绝；对应产品/真人接受债务仍 active。本索引只绑定当前源码指纹和复核账本，不将拒绝结果表述为产品或真人验收。

## 当前源码索引与关闭检查

37 个 scope 的 index-only 关联均引用本记录和上述审计账本。它们让当前源码适用性可核对，历史 Evidence 内容与 capability 状态保持原样。索引更新后的 `docs:sync`、`docs:check`、`check` 结果及日志哈希记录于 `docs/evidence/assets/doc-011/current-rerun-20261014/post-index-verification.json`。

DOC-011 的剩余限制保留在相应 programme active Debt；本记录不取代仍未完成的媒体/真人接受，也不把受控 fixture、命令退出或源码指纹说成用户可见能力。

## 索引后检查补记（2026-10-15）

已补齐原定的 `post-index-verification.json`。索引后的 `docs:sync`、`docs:check`、固定 Worker Python 环境下完整 `pnpm run check`、`pnpm run acceptance:final:synthetic` 均退出码为 0；各日志 SHA-256、命令账本与审计摘要绑定见该 JSON。默认 Python 下的完整检查因 Pillow 版本不是锁定的 12.3.0 而失败，失败日志保留；在 Python 3.12.14/Pillow 12.3.0 环境完整检查通过。旧 `stage2-product-workspace:real` 仍是显式退役入口并保留活动债务，不计为通过或接受。上述补记仅收尾 DOC-011 独立适用性记录，不推进或关闭任何产品能力。
