<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-024：Feedback Diagnosis

## 用户结果

用户反馈被拆成可审阅的 Review Issue 和 Diagnosis，后续修改仍必须通过 Edit IR。

## 不变量

诊断必须引用已存在 Issue；空反馈和未知 Issue 失败；Diagnosis 不直接写 Timeline。

## 必跑测试

`npm run contracts:generate`、`npm run feedback:test`、`npm run check`。
