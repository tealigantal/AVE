# WP-S3-P4-ANNOTATION-001 — 持久化时间线批注

本包实现 DOC-007 P4.5 的真实批注路径。它依赖 `WP-S3-P4-TIMELINE-001`，不把 DOM 点击坐标、
自然语言拼接或 `demos/p4-workbench/` 内存数据冒充持久化能力。

## 合同与数据权威

- 新版本化 Schema 定义批注消息：项目、请求/草稿、基准 Timeline 版本、轨道、可空片段、
  精确 RationalTime 锚点、独立批注正文、稳定 annotation/message ID 与幂等 operation ID。
- Renderer 的像素坐标仅用于解析语义目标；Main/preload 传输通过合同验证的类型化字段。
  Project Host 校验当前项目权限、请求/草稿关系、基准版本、目标轨道/片段和锚点范围。
- Host 在一个原子持久写中提交共享对话修订、消息与批注；重复相同 operation 可重放回执，
  同一 ID 的不同内容为冲突。Renderer 仅收到成功回执后清空输入；断线、冲突、拒绝和存储
  失败保留批注正文及锚点。
- 创作与精修共用同一会话、消息列表和普通输入框；批注正文单独编辑并作为类型化消息进入会话，
  不替代普通创作文本，也不直接成为系统指令或可执行编辑。
- 后续 Timeline 变更按 clip lineage 与明确的编辑映射解析锚点。唯一可证明时更新当前定位；
  分裂映射、多义、删除或缺少映射均保留原始版本锚点并展示 unresolved，绝不按同名片段静默迁移。

新增项目格式对象如需升级，必须保持 format v2 原子创建/打开一致性和旧用户项目数据；
`ADR-0044` 记录新增持久化权威边界。所有修改仍遵守 Project Host 唯一 SQLite writer。

## 验收与退出

覆盖正常发送、相同重试、冲突重试、权限拒绝、陈旧版本、轨道/片段消失、数据库中断、关闭重开、
锚点移动/分割/删除解析，以及页面间共享会话和输入。验证消息与批注不会改写 Timeline/RenderGraph。
运行 manifest 登记的 `stage3:p4-annotation:test`、`contracts:check`、`typecheck`、
`architecture`、`docs:check`。未通过根因校验、事务或重开断言时不得关闭。

