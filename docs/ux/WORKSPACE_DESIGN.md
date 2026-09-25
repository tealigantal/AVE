# Workspace Design

当前 Desktop 已移除 Stage2 逐级确认入口，接入请求、素材、作品与经验操作；本轮在已有真实工作台容器中落实用户选定原件的黑灰蓝配色与三栏布局。该工程接线不是 Stage3 视觉验收，当前视觉接入以用户最新选择的下述桌面原件为准。
The Timeline is an advanced inspection and escape hatch. All views display the
same project version and link to the same artifacts; no view maintains a
parallel creative state.

The user can compare candidate stories, preview local patches, inspect decision
records, open blockers and recover the last valid commit. Privacy status,
source identity and approval state are visible at the point of use.

## Stage3 当前视觉基准与来源状态

2026-09-24 用户要求在 Desktop 中选择修改时间最新的一套并继续实施，替换此前未取得的 9/13 HTML 基准。
选中 `C:/Users/24179/Desktop/test_1/ave-v12-5-1-apple-cn-refined.zip`，实测修改时间为 2026-08-15 00:25:27（北京时间），SHA-256 `858d8d3ed5b97f1c3d50bafe7a71b638b673160a50a718540a62534b0cb54710`。
原字节保存于 [design-reference/ave-v12-5-1-apple-cn-refined](design-reference/ave-v12-5-1-apple-cn-refined/README.md)。源码与 ZIP 内容逐字节一致；不带 node_modules、锁文件或新运行依赖。

原件 README 明示其为愿景展示稿。采纳中性黑灰/蓝色强调、圆角工作台、左素材故事栏、中央视频、右对话与底部时间线；正式应用沿用已有真实 Renderer/Host，保持可读字号、键盘操作与 reduced-motion。
`src/main.jsx:329–378` 和 `src/style.css:210–245` 是工作台视觉参考；固定东京故事、CSS 假画面、模拟波形、`setApplied(true)`、固定时间码/字幕/收益数字不进入产品状态。
只有实际 Host 观察、模型、提交、版本和渲染结果能够产生制作完成、保留内容与可播放的状态。原件自身无实际媒体、模型或导出能力，不构成 Stage3 验收。

## 页面、操作对象与真实接入

| 页面/区域 | 目标用户操作（非声称原型已实现） | 真实 AVE 接入 |
| --- | --- | --- |
| 作品列表 / 新建 | 打开原作品、创建本地项目；不跳宣传页 | Main 项目生命周期 → Host create/open/close；记录持久项目位置，不用 localStorage 当真相 |
| 看片 | 视频为主要工作对象，短状态；选择镜头/范围显示对应对象 | Host workspace 精确版本及合法 preview binding；播放器只消费获准 URL |
| 素材 | 浏览、选择、导入、失联重连 | media-ingestion + immutable Original 身份；原型媒体不能进正式结果 |
| 对话 | 始终可输入；收起对话仍有输入入口，草稿保留 | 输入绑定项目/请求/所看版本；Host 收到确认后显示 received，模型调整后才 adjusting |
| 精修 | 手动和语言修改同一作品，所选对象清楚 | 窄 Command API → Host；output track 编辑与 AI 同步，不维护 Renderer 副本 |
| 历史 | 看旧版、采用、比较、再试、组合选中部分 | viewed/adopted/latest draft 分离；跨版组合经 Host 新草稿编译 |
| 导出 | 选精确作品版本与目标位置，真实进展和失败 | Host Master/ExecutionPlan/QC/文件登记；不是示例下载，不默许发布 |

新增学习授权、档案纠正、诊断入口只融入上述原布局的缺失状态；摆放与样式依据已选原件工作台区域。中文状态要求“已收到”“正在调整”“已进入当前可观看版本”是本任务确定文案，其余按钮以原件核对为准。

## 连续交互与版本对齐

打开/返回作品、面板展开/收起及选择片段时保持项目、选择和输入上下文；返回作品列表前明确保存结果，重新进入恢复已存草稿和未发送文本。连续点击操作带幂等请求 ID；新选择不被旧异步回调复位。仅禁用冲突提交按钮，不禁用制作中的输入。

新版本就绪只给轻提示，不中断当前播放；看旧版本不自动采用，也不修改当前作品。比较优先按相同 asset identity + source PTS + edit lineage 对齐，不按影片百分比假同步；对应内容被删时显示“该版本没有对应片段”，保留用户播放位置。定格对照仅用于可合理对齐画面；重排、变速和删段不能冒充任意版本完全同步。时码换算使用 RationalTime/PTS，UI 秒数只作显示。

键盘焦点随打开面板进入可操作目标，关闭回到触发按钮，Escape 不清空输入；异步结果不抢焦点。连续点击返回/展开/切版不重复提交、不丢输入。尊重系统减少动态效果：缩短/取消非必要位移，保留状态可理解性和焦点；实际原型支持程度待核对，正式应用须验收。

## 失败、退出与重开

- 已提交草稿：保存 Timeline/原话/要求/上下文/版本血缘，重开可看并明确采用状态。
- 已完成分析：保存摘要/来源和策略身份，重开校验后复用；失联素材不得自动匹配同名文件。
- 运行中模型/渲染：保存请求修订、已完成阶段、实际调用记录和未完成标记；不完整流和临时输出不得冒充完成，后续调用仍校验当前授权范围。
- 暂停/取消：保存合法完成成果，未提交候选不标已应用；晚到结果不提交，退出后释放资源。
- 保存失败：明确哪些未保存，提供保留界面的重试/另存选择；不能显示“已保存”。项目加载损坏时阻断相关写入并保留根因。
- 生成失败：旧版仍可看且标旧，显示失败阶段和原因；允许显式新运行，不以示例/模板充当成功。

C7 验收逐步检查上述状态、输入保留、版本对齐和实际 Electron 重开；HTML 演示不替代 Electron/Host/真实媒体证据。
