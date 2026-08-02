<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-023：Assembly Edit IR Compiler

## 用户结果

已验证 Assembly Cut 可以生成带 Beat/证据来源的 Edit IR 候选，后续仍需标准 Edit IR 验证和 Project Host 提交。

## 不变量

只有 validated Assembly Cut 可编译；非法范围失败；编译结果不能直接写 Timeline 或 SQLite。

## 必跑测试

`npm run assembly-compiler:test`、`npm run check`。
