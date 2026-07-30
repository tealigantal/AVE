# WO-013：Preview/Master

## 用户结果

用户可以从同一 RenderGraph 产生可解码 Preview 和回到原片的 Master；代理不能被静默用于 Master。

## 不变量

Preview/Master 共享图语义；Master 输入必须是 original；任何代理无法回链原片的情况必须阻断。

## 必跑测试

`npm run media:fixture`、`npm run media:render`、`npm run render:path:test`、`npm run check`。

## Definition of Done

真实 MP4 生成 Preview/Master，ffprobe 可解码，输出路径与原片输入证据可验证。
