<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-025：Compare 与 Reaction Timing

## 用户结果

用户可比较两个时间线版本、记录选择原因和时间点反应，结果用于后续 Patch 候选而不是直接修改项目。

## 不变量

左右版本必须不同；选择必须有原因；Reaction Timing 必须引用同一 Compare；所有时间使用整数 PTS。

## 必跑测试

`npm run contracts:generate`、`npm run compare:test`、`npm run check`。
