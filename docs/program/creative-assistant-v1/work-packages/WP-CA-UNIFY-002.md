# WP-CA-UNIFY-002 Current Story Assembly and CommandEditIR authority

## Outcome

Preserve the accepted Foundation assembly user result while moving it off old
Approved Story Plan storage and EditIR v1. Assembly consumes the current
Approved Story Plan v2 authority and enters Timeline mutation only through
CommandEditIntent, CommandEditIR v2, simulation and CommitPlan.

## Required behavior

- Resolve current approved Story v2 by exact immutable reference.
- Compile retained assembly operations into current command-bearing authority.
- Remove runtime dependence on the old approved-story table and EditIR v1 API.
- Remove the desktop IPC and Dev CLI routes that call the old Story, Assembly
  or Feedback authority after their retained user result uses the current path.
- Reject old Story/EditIR input before project writes.
- Preserve deterministic compile, atomic commit, idempotency, conflict,
  undo/redo and reopen behavior.
- Close the observed `stage2-product-actions.test.ts` non-exit regression or
  prove it belongs to a later owned boundary without weakening the gate.

## Non-goals

No schema deletion, database-table deletion, Render/Worker change, desktop UI
redesign, old-project migration or capability promotion.

## Validation

Run Story, Assembly, EditIR, Dev CLI, type, architecture and documentation
gates plus focused fail-before-write and reopen tests. The package completes
only when the retained Assembly result uses current authority end to end.
