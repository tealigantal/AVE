<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-033：Evidence Graph Project Host 持久化

## 用户结果

明确的 ASR/OCR/Scene 证据经 Project Host 单写入事务保存，项目重开后仍可查询。

## 不变量

- Worker 只输出协议，不打开或写入 `project.sqlite`。
- Project Host 校验分析类型、Asset ID、正向 PTS 区间和非空内容后才写入。
- 证据通过事件记录追溯来源，重复 evidence_id 被拒绝。

## 验收

- `npm run evidence:persistence:test`
- `npm run check`
