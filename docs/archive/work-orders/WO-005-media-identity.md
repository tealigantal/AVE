<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-005：Media Identity

## 用户结果

素材即使改名或重新连接路径，也能通过稳定身份和内容指纹保持引用正确。

## 不变量

文件名和路径不是 Asset ID；Source Range 必须属于具体 Asset 且结束点大于起始点；时间使用整数 PTS。

## 必跑测试

`npm run typecheck`、`npm run contracts:check`。

## Definition of Done

Asset、Fingerprint、Location、SourceRange 公共接口和 Asset Schema 存在，且不依赖 UI、SQLite 或 Worker。
