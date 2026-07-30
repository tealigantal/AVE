# WO-049：Delivery/Privacy/Rights Host Gates

## 用户结果

交付前的 QC、隐私、版权和原片回链状态由 Project Host 保存；所有 Gate 通过后才可进入 ready。

## 不变量

- Privacy/Rights 必须经过 Core approve 函数。
- Delivery 必须经过 `validateDelivery`，不能由 Renderer 自行标 ready。
- 状态和事件关闭重开后可恢复。

## 验收

- `npm run delivery:host:test`
- `npm run check`
