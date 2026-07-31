# Contract Tests

Contract 验收由 `npm run contracts:check`、`npm run contracts:roundtrip` 和 `npm run contracts:clean` 执行：所有 Schema 必须有 valid/invalid Fixture，路径显式绑定目标 Schema，roundtrip 经过 TypeScript JSON parse、Python JSON parse 和 Schema 校验。
