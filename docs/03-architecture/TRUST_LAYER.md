# Trust Layer

## Trust proposition

AVE is trustworthy when a user can inspect the basis of a proposed or executed
change, correct it, reject it, recover the prior version, and verify that the
encoded result matches the committed semantics.

## Decision Trace

```text
Change
  -> Reason
  -> Evidence
  -> Confidence
  -> User Response
```

- **Change** names exact targets, affected ranges, expected effects, and what
  remains protected.
- **Reason** links the change to approved intent and a named creative decision.
- **Evidence** cites immutable media/time, user instruction, contract, Skill,
  research, or QC references with provenance.
- **Confidence** is calibrated uncertainty, separate from evidence sufficiency
  and user approval.
- **User Response** records accept, reject, modify, defer, or revoke against an
  exact version.

## Enforcement layers

Trust combines contract validation, Project Host authority, immutable identity,
version preconditions, capability resolution, atomic commit, same-semantic
Preview/Master, QC, decision trace, and human approval. No single model score or
test replaces the chain.

## Evidence Graph boundary

Evidence Graph records typed source-bound Observation nodes and separately
typed, reviewed Interpretation/Relationship nodes. Every interpretation cites
immutable observations; a narrative or causal view is derived from those links
and cannot rewrite them. Repository `EVD-*` files are engineering execution
evidence and are a different class from project creative evidence.

## Failure disclosure

Fallback, bake, blocker, stale input, missing rights, low confidence, and QC
failure remain visible. A system that silently returns an approximate output
is not trusted merely because the file opens.
