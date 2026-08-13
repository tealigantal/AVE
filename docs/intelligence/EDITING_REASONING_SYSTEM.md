# Editing Reasoning System

## Decision record

Each decision is represented as:

`Decision → Evidence → Reason → Confidence → Alternative → Constraint → Effect`

Examples include remove clip, shorten dialogue, add reaction, reorder scenes,
change pacing, or preserve a silence. Evidence must point to persisted media or
story facts with exact source/time references. Confidence is calibrated and is
not an approval flag.

## From reasoning to execution

Reasoning emits a typed Edit Intent with affected ranges and semantic intent.
The Host converts it to Edit IR and ordinary Timeline Commands, validates the
base version and protected ranges, and records provenance in the commit. If a
decision cannot map safely, it becomes a user-visible proposal or blocker.

## Feedback loop

Review observations are diagnosed into evidence-backed causes, then proposed as
local patches. The system must distinguish “wrong clip”, “wrong order”, “wrong
pacing”, “missing context” and “technical failure”; generic full re-generation
is a last resort requiring approval.

