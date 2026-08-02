<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-042 Project Host Evidence API

## Outcome

Worker 的显式 ASR/OCR/Scene 记录经 Project Host API 校验后写入 Evidence Graph；非法记录失败，关闭重开后可读取。

## Validation

- `npm run evidence:host:test`
- `npm run worker:analysis:test`
- `npm run check`

## Evidence

合法 ASR 记录通过，非法 PTS 被拒绝；`evidence.registered` 事件和 Evidence 记录在重开后存在。

## Remaining Risk

尚未接入真实 ASR/OCR/Scene 模型输出；当前只验证明确外部分析结果的协议接入边界。
