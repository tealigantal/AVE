# WO-046：Rough Cut Patch Project Host

## 用户结果

用户的 Rough Cut Patch 经过版本和目标 Clip 校验后应用到真实 Timeline；冲突、非法范围和当前不支持的 J/L 音频操作明确失败。

## 不变量

- 先用 Core `validateRoughCutPatch` 校验完整 Patch，再开始任何提交。
- replace/remove 复用 Timeline Command/Commit；J/L Cut 在音频轨接入前 fail closed。
- 不允许半个 Patch 成功后再报告整体成功。

## 验收

- `npm run rough-cut:host:test`
- `npm run check`
