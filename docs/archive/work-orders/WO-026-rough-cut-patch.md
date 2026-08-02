<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-026：Rough Cut Patch

## 用户结果

反馈可生成带版本保护的 Rough Cut Patch 候选，包括 Replace、Remove、J-Cut、L-Cut。

## 不变量

Patch 必须匹配 base_version；目标 Clip 必须存在；J/L Cut 必须有音频偏移；候选不能直接提交 Timeline。

## 必跑测试

`npm run contracts:generate`、`npm run rough-cut:test`、`npm run check`。
