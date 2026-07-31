# Contract Codegen

`generate.mjs` 从 `contracts/schemas/` 生成带真实字段、required/optional、enum、const、array、nested object、union、nullable、format 和 number/integer 区分的 TypeScript/Python 类型，并写入 manifest/hash。`check.mjs` 遍历全部显式目录绑定的 valid/invalid examples；`roundtrip.mjs` 执行跨语言 JSON roundtrip；`generate.mjs --check` 实现 generated-clean。
