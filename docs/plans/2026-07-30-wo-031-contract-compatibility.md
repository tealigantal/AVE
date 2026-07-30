# WO-031 Contract Compatibility Hardening

## Outcome

为跨语言协议建立可重复的失败校验、主版本兼容检查、v0 RationalTime 迁移和生成物清洁验证。

## Current Context

仓库已包含 31 个 v1 JSON Schema、TypeScript/Python 生成器和 valid examples。生成目录由 Schema 生成，不允许手工编辑。

## Milestones

1. invalid examples 必须被拒绝，且 Schema `$id` 唯一并显式包含 v1。
2. v0 RationalTime fixture 必须迁移为 v1 `value/timescale`。
3. 生成物必须有 TS/Python 对称数量、生成标记，且 Python `compileall` 通过。
4. `npm run check` 与 `npm run contracts:clean` 必须通过。

## Validation

- `npm run contracts:migrate-v0`
- `npm run contracts:roundtrip`
- `npm run contracts:clean`
- `npm run check`

## Idempotence / Recovery

所有检查只读；生成器可重复运行。若生成结果不一致，删除生成目录后重新运行 `npm run contracts:generate`，不手工修改 generated 文件。

## Progress

- 2026-07-30：v0 migration、双语言生成形状检查、Python compileall 和全仓 check 已通过。

## Surprises & Discoveries

- 生成器按 Schema 子目录输出文件，初版 roundtrip 检查必须递归扫描。

## Decision Log

- 继续使用现有 v1 主版本；v0 仅提供显式迁移 fixture，不引入兼容分支。

## Outcomes & Retrospective

WO-031 的自动化协议收尾证据已具备；Python TypedDict 带字段运行时实例化和 Electron runtime 仍属于后续工作单，不在本工作单伪装完成。
