# Story Generation System

## Inputs and outputs

Inputs are the approved Creative Contract, Material Evidence Pack, selected
skills, optional Style Profile, optional Trend Pack and a Duration Blueprint.
Outputs are two or more Story Candidates, each containing a thesis, beat list,
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

The user compares candidates and may edit the thesis, beats, evidence or
duration. Approval freezes the Story Plan version. A compiler then emits
bounded Edit Intent operations; it does not directly mutate Timeline. Rejected
plans remain auditable but cannot be executed.
