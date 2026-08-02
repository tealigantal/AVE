<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-027：Delivery Gates

## 用户结果

最终交付在 QC、隐私、版权和原片回链均通过后才可标记 ready。

## 不变量

QC blocked、Rights unknown、Original link blocked 或敏感素材未处理都会阻断交付；隐私记录必须先审批。

## 必跑测试

`npm run contracts:generate`、`npm run delivery:test`、`npm run check`。
