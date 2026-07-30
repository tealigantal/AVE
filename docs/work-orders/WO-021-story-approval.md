# WO-021：Story Planning Approval

## 用户结果

系统能提出可审阅的故事候选，用户批准后才形成 Approved Story Plan，且每个 Beat 都可回溯到证据。

## 不变量

Story Proposal 不是可执行时间线；批准必须通过 Coverage Matrix、已批准证据、身份和时间；未批准候选不得进入 Edit IR。

## 必跑测试

`npm run contracts:generate`、`npm run story:test`、`npm run check`。
