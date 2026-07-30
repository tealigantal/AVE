# WO-006：Worker Protocol

## 用户结果

后台媒体任务通过版本化 JSON 协议报告握手、进度、成功、取消和结构化失败。

## 不变量

Worker 不访问 SQLite；stdout 只输出 JSON；只有可分类的临时错误才允许未来自动重试。

## 必跑测试

`python apps/worker-host/tests/protocol_smoke.py`、`npm run check`。
