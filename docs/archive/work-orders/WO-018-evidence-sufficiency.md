<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-018：Evidence 与 Material Sufficiency

## 用户结果

系统能把素材事实组织成 Moment/Event，并在证据不足时明确阻断故事或事件批准。

## 不变量

Moment/Event 必须引用已知证据；只有 `MaterialSufficiency.status=sufficient` 且没有缺失要求时才能生成故事；不能以模型猜测填补素材缺口。

## 必跑测试

`npm run contracts:generate`、`npm run evidence:test`、`npm run check`。
