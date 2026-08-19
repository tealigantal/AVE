# Creative Skill Definition Runtime

## Skill is not a template

A template fixes an arrangement. A future Creative Skill Definition is a
versioned reasoning knowledge unit that decides whether and how a creative
pattern fits the current intent and evidence.

Incorrect: “Travel Vlog Template.”

Correct: “Establish place through a verified arrival-to-orientation sequence
when the creator goal and available evidence support it.”

## Minimum Skill contract

- **Intent**: the creative problem and applicable contexts;
- **Reasoning Pattern**: ordered judgment steps and meaningful alternatives;
- **Evidence Requirement**: facts, coverage, confidence, rights, and conflict
  conditions required before recommendation;
- **Evaluation**: expected benefit, observable success, failure cases, and
  human-review questions.

Each definition also needs stable ID/version/digest, parameters, provenance,
license/trust status, incompatibilities, retirement rules, and supported
downstream capability requirements.

## Runtime sequence

```text
context snapshot -> applicable Skill candidates -> evidence sufficiency
-> conflict and rights checks -> Skill Evaluation -> ranked recommendation
-> user/policy selection -> semantic decision artifact
```

A Creative Skill Definition may produce a `SkillEvaluation` or recommend a
non-executable Edit Intent. A separate Host-owned adapter may translate an
approved proposal into current execution, or produce the current bounded
`CreativeSkillOutputV1` Preset selections. The Definition never emits the
current Skill Output directly and never carries arbitrary commands,
RenderGraph nodes, shell, backend strings, code, network downloads, or direct
model tools.

## Governance

Definitions are immutable by version. Marketplace or untrusted definitions are
quarantined. Evaluation records pin exact context and definition digests.
Failure, stale evidence, unsupported capability, or missing license leaves
Timeline unchanged and returns a reasoned blocker or alternative.
