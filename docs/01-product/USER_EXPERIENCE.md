# User Experience

## Experience loop

```text
Media import
  -> AI understanding
  -> Request authorization + always-available conversation
  -> Internal story and audiovisual planning
  -> Edit generation
  -> User feedback
  -> Refinement
  -> Publication approval
```

| Stage | User sees and controls | AVE produces | Failure behavior |
| --- | --- | --- | --- |
| Import | selected sources, rights/privacy choice, missing media | stable media identity, probe, proxy relation | explain and block unavailable or unauthorized sources |
| Understand | people, actions, speech, audio, uncertainty, gaps | observations and Evidence Graph references | uncertain claims stay labeled; corrections are versioned |
| Converse | audience, purpose, duration, voice, protected material | Creative Contract and blocking questions | only materially blocking intent gaps stop the authorized draft |
| Plan | brief real progress; optional directions/beat inspection | Story Plan and Decision Records | unsupported or weakly evidenced beats remain proposals |
| Generate | complete main draft; optional change details | future Edit Intent, Host adaptation, current CommandEditIntent / CommandEditIR, candidate version | any failed check leaves committed Timeline unchanged |
| Review | Preview, difference, explanation, QC, rollback point | Review Artifact and scoped patch options | a failed render or QC never appears deliverable |
| Refine | natural-language feedback or direct edits | Feedback Diagnosis and local patch | ordinary feedback directly creates a reversible draft; consequential ambiguity asks |
| Publish | Master, provenance, rights and QC summary | delivery-ready record after explicit approval | AVE never publishes from confidence alone |

## Interaction contract

Every consequential proposal answers:

- what will change;
- what will remain unchanged;
- why this change serves the approved intent;
- which evidence supports it;
- uncertainty and alternatives;
- required approval and rollback point.

The default surface is conversation plus inspectable cards and comparisons.
Timeline, `CommandEditIR`, commands, manifests, and semantic hashes remain available to
advanced users and reviewers without becoming mandatory for normal use.

## Recovery experience

On failure, AVE keeps the last valid project version, records a structured
diagnostic, explains whether retry is safe, and never hides a fallback. A user
can reopen the project, inspect the decision and source versions, and continue
from the last committed state.

Stage3 以已认可本地工作台为视觉基准，不把 Understand/Plan 表格行变为用户必须逐步确认的页面。完整初稿、插话、感受到剪法、授权学习、手动/版本/恢复见 [Stage3 Plan](../product-intelligence/STAGE3_PLAN.md)。默认视频结果与短说明，开发诊断不要求私有思考过程。
