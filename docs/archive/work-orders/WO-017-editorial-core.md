<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-017：Editorial Core P1 协议

## 用户结果

系统能保存可追溯的素材观察和待审核解释，不把模型猜测伪装成事实。

## 不变量

Observation 只描述有时间范围的素材事实；Interpretation 必须引用 Observation ID、置信度和审核状态；未知证据和越界置信度必须失败。

## 必跑测试

`npm run contracts:generate`、`npm run editorial:test`、`npm run check`。
