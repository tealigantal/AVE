<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-014：Master QC

## 用户结果

Master 交付前得到结构化 QC 报告；解码失败、缺少音视频流或代理误用会阻断交付。

## 不变量

QC 失败不是空成功；报告必须记录 code/severity/message；Master 不能使用 proxy 路径。

## 必跑测试

`npm run media:qc`、`npm run qc:test`、`npm run check`。

## Definition of Done

真实 Master 生成 passed QC report，失败路径有阻断逻辑，报告可被 Schema 校验。
