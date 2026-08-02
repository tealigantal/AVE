<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-045：Assembly Edit IR 到 Timeline 提交

## 用户结果

validated Assembly Cut 能转换为 Edit IR 操作并提交真实 Timeline；候选 Assembly Cut 不得绕过校验。

## 不变量

- 编译入口只接受 `status=validated` 的 Assembly Cut。
- 每个 Edit IR add 操作通过 Timeline Core 变成 Command，带当前 base version。
- 任一版本冲突或非法 Track/Clip 都失败，不伪造提交成功。

## 验收

- `npm run assembly:timeline:test`
- `npm run check`
