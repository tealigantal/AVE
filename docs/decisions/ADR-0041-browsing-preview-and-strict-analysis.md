# ADR-0041: 浏览预览与严格媒体分析分离

## Status

Accepted for P2 implementation；2026-10-04 已启动独立浏览链实施，工程验证与人工接受分别记录。实施由 [DOC-007 P2 工作包](../plans/2026-10-03-reliable-workbench-real-acceptance.md) promotion 后承担。本文属架构决策层，由 [ADR Index](README.md) 导航；ADR-0038/0040不负责浏览派生物与精确采样证据的分界，历史决策不改写。

## Date

2026-10-03。

## Context

Host `readMediaPreview`组合缩略图、波形和严格 `media.sample.v1` 结果；配乐 `measureCreationAudioResource`复用此链。素材浏览需要完整视频/声音，严格观察与测量需要源摘要、PTS、sample对齐、覆盖区间和实测收据。直接放宽 `MEDIA_SAMPLE_AUDIO_GAP` 会改变配乐测量的证据语义。当前两段失败MP4尚未本轮解码，不能据此认定容器时间边界或真实内部间隙。

## Considered Options

1. 统一入口放宽严格采样：会把可播放误当成可精确测量，拒绝。
2. 让Renderer读取原片并自转码/决定剪辑时间：绕过路径、权限与时间权威，拒绝。
3. Host管理浏览派生与严格分析两种结果，Worker执行准备和测量，调用方明确选择：采用。

## Decision

浏览链负责完整图片/视频/音频播放，Host持久化准备/转换/就绪/失败与恢复问题，Worker生成兼容媒体。画面、声音、波形独立准备；波形失败不阻断播放，声音失败可以显式“仅画面预览”，真实无音轨与声音故障严格区分。兼容来源无需转换时仍须Host核验与授权。

严格链保留源内容摘要、PTS、采样网格、实际覆盖、工具身份和收据检查，观察/精修/配乐测量只消费该链。浏览转码不生成可替代严格收据的证明，不取代原片Master，不绕过Preview/Master共同manifest及各自Graph/Plan。

Browser取得Host授权不透明媒体引用，支持HEAD、Range、越界、失效与来源变化检查；Electron保留相应受限协议与sender验证。引用绑定项目/授权域/会话及来源、策略、工具身份，不泄露路径。授权撤销、来源替换或身份变化使引用与缓存失效。跨项目/会话访问拒绝。

播放时间只作浏览坐标；剪辑前Host依据源PTS及派生映射核验区间，明确舍入后生成RationalTime边界。非零起点/edit list/编码延迟/VFR须有实际解码证明，不用Renderer浮点时间充当权威。映射不完整时明确不能据该浏览位置精修。

准备请求有项目/素材/选择代次、timeout/cancel；旧任务结果不能覆盖新选择。切换、关闭、重开停止旧声音并释放播放器/object URL/监听器/派生句柄。失败问题按精确素材/版本持久化，不能被无关成功抹去。缓存以来源摘要、转换策略、工具身份绑定；清理只触及无引用临时物，登记Original受Host引用保护。

## Rationale

播放可容忍浏览用途的编码适配，而严格测量必须证明来源样本与覆盖。两者分开使用户能够浏览，同时保留分析失败的真实原因和恢复路径；不会把真实间隙填平以满足创作证据。

## Consequences

实施需要新的明确Contracts、Host投影/寿命、Worker准备、Browser/Electron授权访问及Renderer播放器，且同步所有旧严格消费者、schema/examples/generated bindings、adapters/tests/current说明。不能以新接口文件存在宣称能力完成。实际图像、声音、范围映射、严格采样和取消回收分别验证。

## Migration

P2已定位所有 `readMediaPreview` 与 `media.sample.v1`消费者；严格测量保持证据语义，将浏览调用方切到独立链，去除当前接口中混合用途。旧持久采样收据保持历史身份，不能重写。先为当前问题MP4保存PTS/解码基线，再根据确认的缺陷修算法并重验；真间隙仍失败。持久记录兼容策略必须遵循当前项目格式和数据保护授权。

## Rollback

撤回新浏览入口/派生执行代码时保留原片、有效严格收据、历史作品与失败记录；停用派生播放明确显示不可用。不退回放宽采样、吞错或路径直读。涉及新持久格式的回退先核验兼容性与引用，不能自动删库或转换。本文不授权构建、部署、Git出版或Stage Exit。


## P2 implementation limits

The Host retains readMediaPreview/project.media.preview as a strict compatibility entry for existing precision consumers; new material browsing uses project.media.browse and never calls media.sample.v1. Browser coordinates explicitly report time_mapping=blocked and cannot become edit boundaries. Native Electron source streaming currently fails closed when there is not exactly one registered window because its shared default protocol lacks a trusted sender ID. The trusted initiatorOrigin follows the official Electron protocol API; this controlled adapter test is not actual native playback acceptance. Persistent browse audit uses the existing object store/reference table and project format. Fresh human playback feedback remains required before this package can complete.
