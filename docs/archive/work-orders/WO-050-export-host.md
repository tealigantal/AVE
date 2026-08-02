<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-050：Export Registration/Capability Host API

## 用户结果

用户选择真实导出文件后，Project Host 校验交付门槛、QC 关系、文件 SHA-256 和目标平台能力，成功后登记导出。

## 不变量

- Renderer 不接收文件路径，不计算或伪造哈希。
- 未 ready Delivery、错误 QC、非法 SHA-256 或不支持 profile 均 fail closed。
- 导出文件登记写入 Storage 和 Project Event。

## 验收

- `npm run export:host:test`
- `npm run check`
