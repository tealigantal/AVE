# Feedback to Edit Pipeline

## Stage3：原话到作品的转化

输入保留用户原话、正在看/选中的版本、片段/asset/source PTS、当前要求、保护集、上下文和后续纠正。区分一次编辑请求、技术质量修复、项目硬要求、软偏好和长期偏好。没有指向时结合当前作品定位；只有 materially ambiguous 且会导致不同作品/越权时询问，不能强迫用户给专业操作列表。

```text
原话 + 指向版本/实例 -> 上下文归因（可纠正）
 -> 有范围、例外、来源的剪辑原则
 -> 本次真实素材上的选材/声画字幕计划
 -> Host 编译/模拟/校验/原子草稿提交
 -> 结果检查 + 用户纠正 -> 更新原则和下一次适用范围
```

默认依据请求生成可撤回新草稿，不反复出报告待批准。多镜头与声音/字幕联动形成一个原子逻辑版本；不受影响或用户明确保留的段落以保护条件进入编译，失败不得半改。整个请求不支持的必要语义由 S3-04 补齐，不能自动改成固定一秒 trim。

### 必须走通的具体例子

用户在日常作品 v12 结尾说：“日常视频不要用那种煽情的结尾。”保存原话及 v12 的所指段落，读取该处字幕、旁白、音乐和真实镜头，不只归纳成“自然、真实、克制”。若素材中结尾包含额外感慨字幕、总结旁白和音乐起势，则它们是有例子支持、仍可纠正的反感来源假设，不是用户已确认的心理事实。

形成原则：“日常记录不替普通事件强加感悟，但保留素材本身真实情感”；适用日常结尾，来源为本次原话和片段，例外包括用户主动要求抒情及现场真实表达。具体剪法从实际素材选择自然动作、真实对话或场景收尾；可删除额外总结句、取消人为音乐起势、保留现场音，声画连贯仍要检查。若现场确有情感，不一刀切消除；若不存在所猜的旁白/音乐，不杜撰它们。

用户随后说：“夕阳留着，我只是不喜欢那句话。”新修订仅去掉所指句子（及其关联字幕/旁白如实际存在），夕阳明确保留，其余已满意内容稳定；撤销先前缺证据的音乐/镜头泛化，长期假设缩窄为“反对替日常强加总结语”，保留反例与纠正来源。不能全局禁止夕阳、慢镜头或音乐，也不能把这次操作变成每个视频固定末镜头模板。

普通界面只需“保留夕阳，去掉那句总结”及新视频；诊断可追溯原话、引用、规则、操作和验证结果，不要求模型私有思考过程。验收 C3 同时核对画面、字幕、声音和后续新项目理解。

## 当前 Stage2 受限实现事实

For a local semantic trim, the user duration is a positive exact RationalTime
(a decimal or `numerator/denominator` input), not a floating-point seconds
approximation. The desktop rejects any duration that cannot be represented as
an integral source PTS before native confirmation. That exact duration and its
derived inward source range are retained in Feedback Diagnosis and Edit Intent;
Project Host and the Edit IR compiler independently recompute them against the
current clip before any persisted artifact or Timeline commit.

The Stage 2 workspace separates ordinary material-editable targets from
feedback-trim targets. A feedback target is listed only when the current
Feedback trim compiler supports its exact current-execution output: no track
or range lock, Contract protection, TimeMap, non-unit speed, incompatible
Timeline/source timebase, unsafe RationalTime, stale lineage, or non-current
execution output. Unsupported targets expose one stable reason code, are
included in the workspace digest, and are rejected by Project Host before a
Diagnosis or Intent can be written.
