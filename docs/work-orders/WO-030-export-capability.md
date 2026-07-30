# WO-030：Export Capability Matrix

## 用户结果

用户选择的导出格式会在渲染前经过明确能力矩阵校验，不支持的参数会给出阻断原因。

## 不变量

容器、编解码器、尺寸、帧率和采样率必须同时满足 Capability；不得自动降级或静默改变导出语义。

## 必跑测试

`npm run contracts:generate`、`npm run export-capability:test`、`npm run check`。
