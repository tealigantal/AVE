# WO-020：Analysis Evidence Adapters

## 用户结果

ASR、OCR、Scene 分析结果以版本化协议进入 Evidence Graph，且每条 Observation 都能回链素材和时间范围。

## 不变量

分析适配器只转换明确输入；空文本、非法时间范围或缺少 Asset 时失败；不得从缺失分析结果推断事实。

## 必跑测试

`npm run contracts:generate`、`npm run analysis:test`、`npm run check`。
