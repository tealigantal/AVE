<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-042：Project Host Evidence API

## 用户结果

明确的 ASR/OCR/Scene 结果可通过 Project Host API 注册并在项目重开后读取；缺失或非法结果被阻断。

## 不变量

- Worker 只产生协议输出，Project Host 执行唯一 SQLite 写入。
- Evidence API 只接受显式 `analysis_type`、Asset ID、正向 PTS 区间和非空内容。
- 不从缺失分析结果推断 Observation。

## 验收

- `npm run evidence:host:test`
- `npm run check`
