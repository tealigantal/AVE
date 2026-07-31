# WO-048 Reaction Timing

## Outcome

Reaction Timing 只引用已持久化 CompareResult，PTS 非负，并通过独立表和项目事件保存。

## Validation

- `npm run reaction-host:test`
- `npm run check`

## Evidence

合法 reaction 写入 `reaction_timings`，未知 Compare 和负 PTS 被拒绝，BigInt PTS 序列化可恢复。

## Remaining Risk

尚未接入桌面 Review UI 和真实用户反应采集；P4 交付/导出与 Electron runtime 仍待完成。
