# WO-R22 全量验收审计

## 目标

复跑当前检出版本的完整本地门禁、最终合成验收和用户提供项目的完整性核对；若发现当前回归，在现有 Allowed Paths 内修复并复验。外部剪辑软件、生产模型和远端平台不因本机代码通过而被宣称完成。

## 执行记录

- `pnpm run check`：通过；架构扫描 209 个源码文件，TypeScript、Python lint/typecheck、协议、持久化、崩溃恢复、渲染和 Timeline Render 均通过。
- `pnpm run acceptance:final:synthetic`：首次发现 `timeline:audio-caption:test` 旧 filter 断言与当前生成顺序不一致；将 Worker 音频 filter 的 `asettb` 放回输入标签后复验通过。
- `pnpm run timeline:audio-caption:test`：通过。
- `pnpm run acceptance:final:synthetic`：修复后通过，明确未宣称真实媒体。
- `verify-project`、`inspect-project`：对 `AVE_USER_REAL_PROJECT_DIR` 对应目录通过，manifest 和 SQLite integrity 均为 `ok`，Schema version 为 18。

## 未完成边界

- 外部剪辑软件人工导入/导出互操作：尚未有外部 NLE 现场证据。
- 生产 ASR/OCR/Scene/LLM Provider：尚未配置并执行真实供应商调用，不能推断质量、成本或隐私边界已验证。
- GitHub 远端 Check 和正式发布平台：本轮只验证本地 workflow contract，未推送或发布。

## 结论

本地可执行验收闭环通过；产品整体仍是架构原型，以上外部依赖项保持未完成状态。
