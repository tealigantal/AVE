# Creative Intelligence System

## Responsibilities

The intelligence layer turns creator intent and material evidence into
ranked, explainable creative proposals. It owns no project state and cannot
execute edits. Its durable outputs are versioned data objects: Creative
Contract, Material Evidence Pack, Skill Evaluation, Direction Card, Story Plan,
Decision Record and Edit Intent.

The target fields, lifecycle, ownership and compatibility with existing narrow
contracts are defined in [Product Intelligence Object Model](OBJECT_MODEL.md).

## Decision stages

```text
Context assembly -> candidate generation -> evidence binding
-> constraint/conflict evaluation -> ranking -> explanation
-> user approval -> typed downstream artifact
```

Each stage records model/version, inputs, policy version, evidence references,
confidence, alternatives and unresolved questions. Candidate generation may be
creative; validation is deterministic wherever possible.

The stage-by-stage orchestration, approval gates, retries and failure semantics
are defined in [Creative Intelligence Runtime](CREATIVE_INTELLIGENCE_RUNTIME.md).

## Integration boundary

The Project Host receives typed proposals through contracts and validates them.
A future Host-owned adapter translates approved semantic Edit Intent into the
current `CommandEditIntent → Resolve/Preconditions → CommandEditIR → Simulate →
Validate → CommitPlan → Commit` path. Skills are above
execution primitives and follow `PRESET_AND_SKILL_INTERFACE.md`; they do not
carry commands, graph nodes, shell or executable code.
