# WO-028：Export Registration

## 用户结果

通过交付 Gate 的 Master 被登记为带 SHA-256、媒体类型、QC 报告和 Delivery ID 的可追溯导出物。

## 不变量

Rights 必须 approved；Export 必须关联 ready Delivery 和对应 QC 报告；哈希必须是 64 位十六进制；未登记文件不是交付结果。

## 必跑测试

`npm run contracts:generate`、`npm run export:test`、`npm run check`。
