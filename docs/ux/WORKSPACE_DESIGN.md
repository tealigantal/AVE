# Workspace Design

当前 Stage2 workspace 使用四视图：Goal/Contract、Material/Evidence、Story/Direction、Review/Timeline；这不是 Stage3 默认布局，目标沿用下述已认可 HTML。
The Timeline is an advanced inspection and escape hatch. All views display the
same project version and link to the same artifacts; no view maintains a
parallel creative state.

The user can compare candidate stories, preview local patches, inspect decision
records, open blockers and recover the last valid commit. Privacy status,
source identity and approval state are visible at the point of use.

## Stage3 唯一视觉基准与来源状态

用户明确认可的文件：`AVE_本地剪辑工作台_动效精修_2026-09-13.html`。
用户提供 SHA-256：`de7669f595cd4272ccf860aaabec4bd2b699cf5304a6ef0a588202b6f69ce644`。
不得用“动效精修02”“连续动效版”或网站展示稿替代。原件不改写；取得后以原字节存入本目录的设计参考子目录并从本文登记相对路径/计算摘要，不把临时截图当新设计。

2026-09-14 本轮在仓库、附件、桌面、Documents、Downloads 和用户目录按指定文件名/动效/本地剪辑模式查找未找到，已请求其路径。**未打开或在浏览器操作该 HTML，未计算文件摘要，未读取布局尺寸、色值、字体、按钮逐字文案或 DOM 行号。**所列摘要是用户提供值而非实测。以下按任务正文记录接入规格，不冒充原型观察。

| 证据层 | 本轮结论 |
| --- | --- |
| 已接受视觉与交互设计 | 用户确认上述唯一文件；沿用布局、明暗、按钮、中文和连续动效 |
| 原型中真实可操作 | 原件缺失，作品列表/新建/看片/素材/对话/精修/历史/导出逐项待浏览器核对 |
| 模拟演示 | 任务说明提到浏览器存储、示例媒体、模拟制作、自由文本记录及示例下载；尚未从原件核对实现位置 |
| 待接入实际 AVE | 真实项目保存、模型生成、Job/修订状态、版本、最终渲染都须 S3-05 实接；不能以原型按钮证明 AI 能力 |

缺文件仅阻断视觉逐项实查与像素/动效忠实度验收，不阻断已确定产品/运行时规划。取得后记录每个页面的 DOM id/函数/行号、主次操作与原文案、展开收起/返回状态、键盘和 reduced-motion 的实际支持；实现/模拟/缺失分列，保持本规格的状态诚实。

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

新增学习授权、档案纠正、诊断入口只融入上述原布局的缺失状态；准确摆放和样式等待原件实查，不重新设计三套风格。中文状态要求“已收到”“正在调整”“已进入当前可观看版本”是本任务确定文案，其余按钮以原件核对为准。

## 连续交互与版本对齐

打开/返回作品、面板展开/收起及选择片段时保持项目、选择和输入上下文；返回作品列表前明确保存结果，重新进入恢复已存草稿和未发送文本。连续点击操作带幂等请求 ID；新选择不被旧异步回调复位。仅禁用冲突提交按钮，不禁用制作中的输入。

新版本就绪只给轻提示，不中断当前播放；看旧版本不自动采用，也不修改当前作品。比较优先按相同 asset identity + source PTS + edit lineage 对齐，不按影片百分比假同步；对应内容被删时显示“该版本没有对应片段”，保留用户播放位置。定格对照仅用于可合理对齐画面；重排、变速和删段不能冒充任意版本完全同步。时码换算使用 RationalTime/PTS，UI 秒数只作显示。

键盘焦点随打开面板进入可操作目标，关闭回到触发按钮，Escape 不清空输入；异步结果不抢焦点。连续点击返回/展开/切版不重复提交、不丢输入。尊重系统减少动态效果：缩短/取消非必要位移，保留状态可理解性和焦点；实际原型支持程度待核对，正式应用须验收。

## 失败、退出与重开

- 已提交草稿：保存 Timeline/原话/要求/上下文/版本血缘，重开可看并明确采用状态。
- 已完成分析：保存摘要/来源和策略身份，重开校验后复用；失联素材不得自动匹配同名文件。
- 运行中模型/渲染：保存请求修订、已完成阶段、剩余预算和未完成标记；不完整流和临时输出必须重新执行，需外部调用/额外预算时重新确认范围。
- 暂停/取消：保存合法完成成果，未提交候选不标已应用；晚到结果不提交，退出后释放资源。
- 保存失败：明确哪些未保存，提供保留界面的重试/另存选择；不能显示“已保存”。项目加载损坏时阻断相关写入并保留根因。
- 生成失败：旧版仍可看且标旧，显示失败阶段和原因；允许显式新运行，不以示例/模板充当成功。

C7 验收逐步检查上述状态、输入保留、版本对齐和实际 Electron 重开；HTML 演示不替代 Electron/Host/真实媒体证据。
