<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-050 Export Registration/Capability Host API

## Outcome

Project Host 对 ready Delivery 选择的真实导出文件计算 SHA-256，校验 QC/交付关系和平台 capability 后登记到 Storage；Renderer 不接触路径。

## Validation

- `npm run export:host:test`
- `npm run check`

## Evidence

真实文件登记成功，social_1080p 合法 profile 通过，4K 超出 capability 被拒绝；Storage 写入导出记录。

## Remaining Risk

尚未做真实平台发布、Electron runtime 现场操作和最终完整蓝图验收。
