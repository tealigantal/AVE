<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-019：Coverage Matrix

## 用户结果

用户批准的 Creative Contract 硬约束可以追溯到具体证据；缺失或冲突覆盖会阻断后续故事批准。

## 不变量

硬约束必须有 `covered` 行和已批准证据；偏好不替代硬约束；缺失覆盖不得静默降级。

## 必跑测试

`npm run contracts:generate`、`npm run coverage:test`、`npm run check`。
