# Contracts

`contracts/schemas/` 是跨语言协议唯一来源。`tools/contract-codegen/generate.mjs` 生成 TypeScript interface、Python TypedDict 和 manifest；生成文件位于 `contracts/generated/`，不可手工修改。`contracts/examples/valid/<domain>/` 和 `contracts/examples/invalid/<domain>/` 按相同路径绑定 Schema，覆盖全部当前 Schema。
