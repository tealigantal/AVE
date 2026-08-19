# Creator Model

## Purpose

The Creator Model is a consented, versioned view used to improve future
suggestions. It is not a psychological profile, hidden model state, or authority
over current instructions. The detailed future profile view is
[`USER_CREATIVE_PROFILE.md`](../product-intelligence/USER_CREATIVE_PROFILE.md).

## Required evidence classes

| Class | Meaning | Default confidence |
| --- | --- | --- |
| Explicit Preference | user-stated preference with scope and retention choice | high within its declared scope |
| Implicit Preference | repeated behavior inferred from multiple events | provisional and explainable |
| Accepted Decisions | exact creative decisions the user approved | evidence of context-specific choice, not universal taste |
| Rejected Decisions | exact proposals rejected, including reason when supplied | negative evidence limited to cited context |
| Editing History | versioned project actions and affected ranges | factual history, not automatic preference |
| Outcome Feedback | review, satisfaction, publication, or correction evidence | contextual outcome signal, never automatic training consent |

## Precedence

Current explicit instruction and approved Creative Contract outrank current
project decisions, which outrank scoped explicit preferences, which outrank
accepted/rejected history, which outrank implicit preference. Rights, privacy,
safety, source facts, and capability blockers override all preferences.

## User control

The user can inspect why a preference was inferred, correct it, change its
scope, disable cross-project reuse, export it, or delete reusable state.
Deletion prevents future retrieval while immutable historical project records
retain the minimum audit facts required by the project's retention policy.

## Use boundary

The Creator Model may rank alternatives, choose defaults, or suggest a
clarifying question. It cannot silently change a Creative Contract, approve a
Story Plan, mutate Timeline, publish, or train a shared model.
