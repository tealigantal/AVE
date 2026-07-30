# WO-007：Media Probe 与 Proxy

## 用户结果

系统可以探测真实 MP4 的音视频流，并用可重复的合成 Fixture 验证媒体输入边界。

## 不变量

ffprobe 是媒体事实来源；素材身份仍由指纹确定；代理必须保留可回链的时间映射，不能用于 Master。

## 必跑测试

`npm run media:fixture`、`npm run media:probe`、`npm run check`。
