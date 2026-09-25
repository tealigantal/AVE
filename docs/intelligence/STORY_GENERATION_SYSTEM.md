# Story Generation System

## Inputs and outputs

Inputs are the approved Creative Contract, Material Evidence Pack, selected
skills, optional Style Profile, optional Trend Pack and a Duration Blueprint.
Stage3 默认产出一个主初稿计划，内部可在预算内比较候选，用户要求“再试一种”才交付另一方向。每个计划 containing a thesis, beat list,
duration budget, emotional curve, evidence bindings, confidence, risks and
alternatives.

`StoryPlan` is the product aggregate; current contracts separately model
`StoryProposalV2` and `ApprovedStoryPlanV2` so approval cannot be erased. Their
single-version object rules are defined in
[Product Intelligence Object Model](OBJECT_MODEL.md), and runtime approval is
defined in [Creative Intelligence Runtime](CREATIVE_INTELLIGENCE_RUNTIME.md).

## Beat record

Every beat has a stable ID, role, target range, source moment IDs, reason,
confidence, alternative moment IDs and unresolved assumptions. For example,
`OpeningHook` may cite `M102`, explain the need to establish conflict quickly,
and retain `M087` as an alternative. No beat without evidence can become an
approved Edit Intent.

## Approval and conversion

Stage3 用户的制作请求在授权内支持主 Story 和草稿，不要求先选 Direction/Story。内部计划固定版本及依据，经 Host 编译提交；采用和发布另记。当前 ApprovedStoryPlanV2 仍是 Stage2 合同，S3-01/04 同步替换，不伪造批准。
