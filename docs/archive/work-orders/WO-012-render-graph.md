<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-012：RenderGraph

## 用户结果

Preview 与 Master 由同一 RenderGraph 表达效果语义，目标能力不支持时在渲染前明确阻断。

## 不变量

节点 ID 唯一；边必须引用存在节点；图必须有 source 和 sink；capability 必须分别声明 preview/master 支持。

## 必跑测试

`npm run contracts:generate`、`npm run edit-ir:test`、`npx tsx tests/property/render-graph.test.ts`、`npm run check`。

## Definition of Done

RenderGraph Schema、基础图、capability 和 validator 已实现并通过 preview/master/非法图测试。
