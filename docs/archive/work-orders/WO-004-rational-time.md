<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-004：RationalTime

## 用户结果

VFR 媒体的时间、PTS、代理和原片映射使用精确有理数，不因浮点秒产生边界漂移。

## 不变量

时间尺度为正；TimeRange 为半开区间；代理映射不可在空映射上计算。

## 必跑测试

`npm run typecheck`；后续加入 VFR fixture 后执行 PTS roundtrip 与 ProxyTimeMap property tests。

## Definition of Done

RationalTime、TimeRange、PTS 和 ProxyTimeMap 公共入口存在并保持纯领域依赖。
