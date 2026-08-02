<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-045 Assembly Edit IR 到 Timeline

## Outcome

validated Assembly Cut 经 Core 编译为 Edit IR add 操作，再由 Project Host 转换为 Timeline Commands 并提交不可变版本。

## Validation

- `npm run assembly:timeline:test`
- `npm run check`

## Evidence

合法 Assembly 生成 Timeline v1；重复用旧 base version 被拒绝；所有变更通过 `applyCommand`/`commitTimeline`。

## Remaining Risk

当前使用固定 30 timescale 的最小编译配置；多轨、音频、完整 Edit IR metadata 和桌面 Assembly UI 仍待后续工作单。
