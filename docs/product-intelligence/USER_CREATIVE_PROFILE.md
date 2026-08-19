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
Any formal contract requires an additive schema version and governed Work Order.

## Profile principles

1. **Advisory**: profile fit affects ranking and defaults, never approval.
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

The profile helps rank Direction Cards, Story Plans, Creative Skills and local
edit alternatives. Each use must explain the applicable preference and allow a
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
candidates using that snapshot but cannot update the profile. Profile failure or
unavailability degrades to project-local inputs.

No profile can write SQLite directly, mutate Timeline, generate executable
commands, relax rights/privacy, override locks or approve delivery.

## Work Order implications

Implement project-local adaptations before cross-project profiles. The first
profile slice should let a user confirm/correct three preference dimensions,
show source decisions and counterexamples, apply one scoped ranking influence,
disable it, reopen it and prove that current Creative Contract instructions win.
Cross-project persistence requires consent, export/delete, isolation and threat-
model acceptance with representative users.
