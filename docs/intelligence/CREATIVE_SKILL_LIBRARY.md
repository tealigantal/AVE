# Creative Skill Library

## Skill definition

A Creative Skill is a versioned, reusable knowledge unit, not a fixed video
template. Its minimum record contains: `skill_id`, version, purpose, applicable
contexts, required evidence, decision logic, parameters, conflicts, failure
cases, evaluation criteria, provenance, license/trust status and supported
downstream capabilities.

The future knowledge contract is named `CreativeSkillDefinition` to distinguish
it from the already implemented `CreativeSkillOutputV1` Preset-selection
boundary. See [Product Intelligence Object Model](OBJECT_MODEL.md) and the
authoritative execution boundary in
[`PRESET_AND_SKILL_INTERFACE.md`](../specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md).

Example: **Emotional Contrast Introduction** seeks early curiosity by showing a
consequential reaction before its explanation. It requires a causal pair of
evidenced moments, rejects unrelated reactions or manufactured emotion, and
reports alternatives when the causal link is uncertain.

## Evaluation

Skills are selected only when context, evidence sufficiency and creator voice
are compatible. The evaluator records expected benefit, risks, conflicts with
other skills, confidence and a human-readable reason. A skill can recommend a
story decision without being executable; executable selections must comply with
the typed Preset/Skill interface and ordinary Timeline Commands.

## Governance

Definitions are immutable by version and content digest. New evidence can
produce a new version or retire a skill; it cannot rewrite prior decisions.
Marketplace or untrusted skills are quarantined. A skill never learns directly
from private media or user feedback without explicit consent and provenance.
