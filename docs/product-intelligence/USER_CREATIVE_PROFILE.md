# User Creative Profile

## Purpose, authority and status

The User Creative Profile is the product-facing view of consented, versioned
creator preferences used to improve future suggestions. It does not replace the
user, the current Creative Contract or project decisions. It is not an
implemented cross-project profile and does not define a second `StyleProfile`
schema.

The future protocol should extend or specialize the creator-kind profile rules
in [Style Knowledge Model](../intelligence/STYLE_KNOWLEDGE_MODEL.md) and consume
the policies in [Creative Memory Architecture](CREATIVE_MEMORY_ARCHITECTURE.md).
Formal contracts are introduced through S3-01/03; replacement updates the one current family and its consumers without old readers.

## Profile principles

1. **Advisory**: profile influences selection, story, pacing, captions, sound and agreed visual treatment, never grants authority.
2. **Contextual**: a preference states where it applies and known exceptions.
3. **Evidence-based**: every claim links to explicit choices or reviewed
   feedback, not inferred identity stereotypes.
4. **Uncertain**: confidence, recency and counterexamples remain visible.
5. **Controllable**: users can inspect, correct, scope, export, disable or delete
   reusable profile data.
6. **Versioned**: material changes create successor versions; historical
   CreativeRuns keep exact pinned inputs.

## Profile view

A target profile view should expose, without declaring a final schema:

- stable profile/user scope and version/digest;
- consent, retention and allowed-project scope;
- narrative identity and forbidden misrepresentation;
- pacing, rhythm and tolerance for pauses;
- story structure, point of view and emotional-intensity preferences;
- shot-selection, transition/effect and composition preferences;
- subtitle language, density, typography and animation preferences;
- music character, prominence, ducking and silence preferences;
- color/visual treatment preferences;
- platform- or audience-specific adaptations;
- disliked/rejected patterns with context;
- source Decision/Feedback refs, confidence, recency and counterexamples;
- unresolved conflicts and user corrections.

The profile stores transferable preferences, not exact copies of a prior
project's story, footage or protected expression.

## Example

```yaml
profile_view: User A
scope: user opt-in; documentary projects
style: documentary
narrative_preference:
  value: observational, character-led
  confidence: medium
pacing:
  value: slow emotional pacing with room for reactions
  exceptions: short platform openings may use a concise evidence-backed hook
dislike:
  - overused transitions
  - music that masks dialogue or emotional silence
music:
  value: cinematic, restrained, source-appropriate
evidence:
  accepted_decisions: [decision-v12, decision-v31]
  rejected_patterns: [decision-v18]
status: suggested; awaiting user confirmation
```

This example is a UI/read-model view, not a storage schema. "Documentary" does
not authorize factual overclaim, slow pacing does not override a hard duration,
and cinematic music does not bypass licensing or audio QC.

## Preference lifecycle

```text
explicit setting or reviewed repeated decisions
  -> candidate preference with context and counterexamples
  -> user confirmation or policy-qualified status
  -> versioned profile view
  -> exact snapshot selected for a CreativeRun
  -> later correction/supersession, never history rewrite
```

Suggested states may include `candidate`, `confirmed`, `disputed`, `disabled`
and `superseded`. A single interaction cannot silently become `confirmed`.

## Use in creative reasoning

The profile enters generation and editing of actual material, structure, rhythm, captions, sound and agreed picture treatment, as well as internal candidate evaluation. Each use must explain the applicable preference and allow a
one-project override. The ranking precedence is:

```text
current explicit user instruction
  > approved Creative Contract and protected identity
  > current project decisions/feedback
  > confirmed applicable profile preference
  > candidate preference
  > generic Skill/style/trend/default advice
```

If the user says "make this one fast and playful," AVE must not defend an old
slow-documentary preference. The explicit project instruction creates a project
adaptation; it does not necessarily erase the long-term preference.

## Rejection and correction

Rejected suggestions record the exact proposal, context, reason if supplied and
whether the rejection concerns story, execution, quality, rights or preference.
Repeated rejection may create a candidate dislike only after bias and context
checks. Lack of response, undo, low watch time or publish choice alone is too
ambiguous to infer a durable preference.

Users can correct the profile in plain language. A correction creates a new
version, stales future retrieval snapshots and preserves prior pinned decisions
for audit. It cannot retroactively change an already committed Timeline.

## Privacy and safety

Cross-project profiling is opt-in. The profile must not infer sensitive traits,
relationships or identity from appearance, voice or private footage. Model
providers do not receive reusable profile data unless the request's explicit
privacy policy permits the minimum required fields. Logs redact private content
and paths.

Profile deletion and project-audit retention must be separately explained. A
deleted reusable preference cannot be selected into future contexts; historical
project records may retain the decision inputs required for integrity under the
declared retention policy.

## Engineering boundary

Project Host assembles a bounded, exact-version profile snapshot and passes only
authorized fields through the `CreativeContextBundle`. Model Gateway may return
candidates using that snapshot but cannot update the profile. 关闭、首次无档案和成功无匹配为正常模式；读取/索引/版本失败必须终止依赖该快照的请求，不隐藏退回 project-local inputs.

No profile can write SQLite directly, mutate Timeline, generate executable
commands, relax rights/privacy, override locks or approve delivery.

## Work Order implications

S3-02/03/04 共同实现完整情境化档案及跨项目真实作品作用，不以三个偏好和排序为终点。一次开启指定学习范围后无需逐项确认观察；早期假设必须可纠正，不能据敏感身份推断。验证覆盖全部创作维度、留出新项目、关闭/例外/纠正/排除/遗忘。

## 感受、原则与具体操作

档案保存可复用取舍及上下文，不固定某次成功操作。区分一次编辑请求、质量修复、项目硬要求、项目软偏好、长期偏好；同一条原话可有项目修订与获准长期假设两个关联记录，不能混为一个确认。每条记录保留原话/例子、来源版本、适用题材、例外、依据与反例。

“日常视频不要用那种煽情的结尾”的完整转化和“夕阳留着，我只是不喜欢那句话”的纠正见 [Feedback Pipeline](../pipeline/FEEDBACK_TO_EDIT_PIPELINE.md)。当前要求胜过档案；旅行/演出/日常各有情境，不把用户固定成模板。

实现由单一用户档案所有者管理版本、授权和删除代次；Project Host 只固定获准快照。删除规则与来源排除统一见 [Memory Architecture](CREATIVE_MEMORY_ARCHITECTURE.md)，不另建独立记忆真相。
