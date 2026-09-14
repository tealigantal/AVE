# Product Learning System

## Learning loop

```text
AI Decision
  -> User Modification
  -> Consent-scoped observation / optional outcome feedback
  -> Versioned contextual principle / profile update
```

This is a governed evidence loop, **not automatic model training**.

## Event meanings

- **AI Decision** pins the candidate, reason, evidence, confidence, alternatives,
  policy, model, and context versions.
- **User Modification** records the affected decision, exact patch, user reason
  when supplied, and whether the change is project-specific or reusable.
- **Published Outcome** records only consented outcome evidence. Publication is
  not proof that every decision was good.
- **Knowledge Update proposal** suggests a new preference, Skill evaluation,
  rule revision, or benchmark example. Within the user-enabled project/data scope the owner can register a versioned hypothesis without per-observation confirmation; explicit user statements remain distinct. Publication is not a prerequisite for learning.

## Guardrails

No background job may convert private media, feedback, rejection, or publication
into shared training data without explicit purpose-specific consent. No single
acceptance or rejection becomes a universal preference. Outcome metrics cannot
override creator intent, factuality, rights, privacy, or human evaluation.

## Validation

Every learning event needs source identity, actor, scope, retention, consent,
version links, and invalidation rules. The system must prove opt-out, deletion
from future retrieval, stale-context rejection, and precedence of current
instructions over historical learning.

## Product questions

Learning is valuable only if it measurably improves first-useful-cut time,
decision acceptance, patch locality, revision count, explanation usefulness,
or trust without degrading story quality, diversity, or user control.
