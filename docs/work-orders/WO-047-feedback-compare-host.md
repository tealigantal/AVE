# WO-047：Feedback/Compare Review Artifacts

## 用户结果

反馈诊断和 A/B Compare 结果通过 Project Host 保存，可追溯到 ReviewIssue 和 Timeline 版本。

## 不变量

- Diagnosis 必须是 reviewed 状态且引用已存在 Issue。
- Compare 的 left/right version 必须不同，且 reason 非空。
- Review Artifact 失败不产生持久化记录。

## 验收

- `npm run review-artifact:test`
- `npm run check`
