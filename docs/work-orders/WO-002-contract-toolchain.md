# WO-002：Contract Toolchain

## 用户结果

跨语言协议可以从 JSON Schema 校验并生成 TS/Python 类型，示例错误会在提交前失败。

## 输入与输出

输入为 `contracts/schemas/**/*.schema.json`；输出为 `contracts/generated/`，生成文件带有不可手工修改标记。

## 不变量

Schema 是唯一来源；同一主版本不改变既有字段语义；引用必须可解析；valid examples 必须通过。

## 必跑测试

`npm run contracts:generate`、`npm run contracts:check`、`npm run check`。

## Definition of Done

4 个 Schema 被 Ajv 2020 校验，TS/Python 文件和 manifest 可生成，TypeScript/架构检查继续通过。
