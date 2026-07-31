# WO-R17 Adapter 层

## 用户可见目标

在内部 Timeline 保持唯一权威的前提下，提供 web preview、OTIO、FCPXML、EDL 和 desktop filesystem 的明确适配边界；所有交换格式导出都保留 Semantic Sidecar，不支持的 Timeline 语义必须返回显式 Issue，不能静默丢失。

## 施工范围

- 建立五个 Adapter 包，各自只有 `src/public.ts` 作为跨包入口。
- 把时间、轨道、片段和语义侧车转换为可序列化交换文档。
- 提供导出 Issue 和 Roundtrip Validator，验证 Clip 范围与轨道一致性。
- 不修改 Project Host 的 Timeline 权威，不引入新的持久化或生产依赖。

## 当前进度

- [x] 五个 Adapter public 入口和基础边界已建立。
- [x] web preview、OTIO、FCPXML、EDL、desktop filesystem 的基础序列化/导入导出已实现。
- [x] Semantic Sidecar 和不支持语义 Issue 已进入交换文档。
- [x] 基础 Clip/轨道/PTS Roundtrip 已通过。
- [x] 统一 Roundtrip Validator 与 Project Host/Dev CLI 导出入口。
- [x] 完成 R17 工作单完整验收。

## 验收证据

- `npm run adapter:boundary:test`
- `npm run adapter:roundtrip:test`
- `npm run typecheck`
- `npm run architecture`
- `npm run check`

2026-07-31：`npm run typecheck`、`npm run architecture`、`npm run adapter:boundary:test`、`npm run adapter:roundtrip:test` 和完整 `npm run check` 均通过；架构扫描 202 个源码文件。Host 导出与统一 Roundtrip Validator 也在集成测试中通过。

## 未完成风险

当前工作单不实现 Master QC、CI 发布矩阵或真实剪辑软件人工导入；这些属于 R18–R20。
