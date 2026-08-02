<!-- HISTORICAL ARCHIVE: retained evidence; not current authority. -->

# WO-008：Timeline Model

## 用户结果

用户的剪辑时间线由可验证的 Sequence/Track/Clip 结构表达，所有 Source Range 都回链稳定 Asset。

## 不变量

Timeline 版本单调；Clip ID 唯一；修改只能通过命令；失败命令不得产生新状态。

## 必跑测试

`npm run typecheck`，并在获得测试运行器后执行 `timeline-smoke.ts` 与 property tests。
