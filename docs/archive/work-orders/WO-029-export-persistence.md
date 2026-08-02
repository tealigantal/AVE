<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-029：Export Persistence

## 用户结果

已通过 Gate 的导出文件在 Project Host 中保存文件路径、SHA-256、Delivery ID 和 QC Report ID，关闭重开后仍可追溯。

## 不变量

登记前重新计算文件哈希；重复/哈希不一致失败；导出登记和领域事件同一事务提交。

## 必跑测试

`npm run export:persistence:test`、`npm run check`。
