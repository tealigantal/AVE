# WO-043：Approved Story Plan Persistence

## 用户结果

用户批准的 Story Plan 被 Project Host 保存并可在重开后恢复；未批准候选不能绕过审批进入后续 Assembly。

## 不变量

- 必须有 `approved_by`、`approved_at` 和至少一个 beat。
- 每个 beat 的 evidence_id 必须已存在 Evidence Graph。
- Story Plan 通过 Project Event 追溯，Renderer 不直接写库。

## 验收

- `npm run story-host:test`
- `npm run check`
