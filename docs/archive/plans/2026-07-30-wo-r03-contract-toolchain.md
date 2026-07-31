# WO-R03 重建 Contract Toolchain

## Purpose / Big Picture

让 JSON Schema 成为 TypeScript、Python 和 Example 校验的唯一协议来源，生成真实字段、manifest/hash，并阻止生成物漂移。

## Progress

- [x] 盘点现有生成器、Schema 和 Fixture 缺口。
- [x] 重建 TypeScript/Python 结构化生成器。
- [x] 建立全量 valid/invalid Fixture 路径绑定。
- [x] 实现 manifest、内容 hash 和 generated-clean。
- [x] 实现跨语言 JSON roundtrip 与完整回归。

## Surprises & Discoveries

- 原生成器的 Python `TypedDict` 全部为空，且 TypeScript 只处理顶层简单字段。
- 原 Contract check 根据字段名猜测 Schema，只覆盖 RationalTime 和 WorkerEnvelope。

## Decision Log

- 使用现有 Ajv 作为 Schema runtime validator，不新增生产依赖。
- 以 `contracts/examples/valid/<schema-relative-path>.json` 和 `invalid` 对应目录绑定目标 Schema。
- 生成目录保持忽略；`contracts:clean` 直接比较确定性重新生成内容和 manifest，不依赖 Git 是否跟踪 ignored 文件。

## Outcomes & Retrospective

R03 已完成。31 个 Schema 全量生成、全量 Fixture 校验、跨语言 roundtrip 和 clean 均已通过；未引入 ADR。

## Context and Orientation

Schema 位于 `contracts/schemas/`；工具位于 `tools/contract-codegen/`；生成结果位于被忽略的 `contracts/generated/`；Fixture 位于 `contracts/examples/`。

## Plan of Work

1. 解析 `$ref`、required/optional、enum、const、array、nested object、union、nullable、format、integer/number。
2. 生成两个语言的结构化类型和 manifest。
3. 绑定并验证全部 Fixture。
4. 执行 Node/Python roundtrip 和 clean。

## Concrete Steps

- `npm run contracts:examples`
- `npm run contracts:check`
- `npm run contracts:roundtrip`
- `npm run contracts:clean`
- `npm run check`

## Validation and Acceptance

- Python 生成类包含真实字段。
- TypeScript 生成接口保留 required/optional 和嵌套结构。
- 每个 Schema 有 valid 和 invalid Fixture。
- 修改生成输出后 `contracts:clean` 失败。
- roundtrip 和完整回归通过。

## Idempotence and Recovery

生成器输出按 Schema 路径、字段顺序和 manifest 顺序排序；重复执行结果一致。生成文件可删除后重新生成，业务源码和数据库不受影响。

## Artifacts and Notes

- `tools/contract-codegen/schema-utils.mjs`
- `tools/contract-codegen/generate.mjs`
- `tools/contract-codegen/examples.mjs`
- `tools/contract-codegen/check.mjs`
- `tools/contract-codegen/roundtrip.mjs`
- `tools/contract-codegen/python-roundtrip.py`

## Interfaces and Dependencies

依赖现有 Ajv/Ajv formats、Node.js 和 Python；不改变协议主版本，不新增外部生产服务。
