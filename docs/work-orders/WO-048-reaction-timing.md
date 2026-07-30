# WO-048：Reaction Timing Review Artifact

## 用户结果

用户对 Compare 的反应时间点可被记录并追溯；非法时间或未知 Compare 被阻断。

## 不变量

- `compare_id` 必须对应已持久化 CompareResult。
- `timeline_pts` 必须为非负 Rational/PTS 值。
- Reaction Artifact 通过 Project Host 事务写入。

## 验收

- `npm run reaction-host:test`
- `npm run check`
