# Contracts

`contracts/schemas/` 是跨语言协议唯一来源。`tools/contract-codegen/generate.mjs` 生成 TypeScript interface、Python TypedDict 和 manifest；生成文件位于 `contracts/generated/`，不可手工修改。`contracts/examples/valid/<domain>/` 和 `contracts/examples/invalid/<domain>/` 按相同路径绑定 Schema，覆盖全部当前 Schema。

仓库开发期的单一当前版本规则见 [`CURRENT_VERSION_POLICY.md`](CURRENT_VERSION_POLICY.md)：非当前 AVE-owned identity 在写入或执行前失败，不迁移、不转换、不双读。
