# ADR-0033: Stage3 bounded planning measurements

Status: selected for implementation in WP-S3-INTEGRATION-001. Implementation,
real-media verification and final acceptance remain separate claims in C1-C9.

## Problem

Two retained B production attempts select only 800 and 726 Timeline ticks of
source capacity for a 900-tick work. The second raw output correctly cites the
previous 800-tick failure and assigns weights equal to individual capacities,
but incorrectly claims their total is 938. Host rejects both without committing.
Repeating the same arithmetic instructions is not a demonstrated repair.

The first real exchange implementation then receives a direct final with no
measurement. It mixes one span's sampled time with another span's identity and
uses whole-span capacities as weights for shorter middle-frame windows. Actual
input contains correct per-option capacities, but duplicated schemas and scattered
source tables make it large and permit avoidable transcription. This retained
failure motivates the selected stricter reference/measurement contract below;
optional measurement alone is not accepted as the repair.

A later real v2 correction measures a feasible 835-tick selection for a
720-tick work, then names that query while repeating a different six-shot
selection instead of its measured seven shots. The existing rebound guard
correctly rejects it with no commit. Requiring the model to copy the same
selection into two separate responses adds no creative choice and creates a
second opportunity to contradict the accepted measurement. That failure remains
unchanged; it motivates the current receipt-reference boundary below.

This changes the model/Host planning boundary and therefore needs a new decision
record. The existing runtime and object documents continue to own API semantics;
this ADR does not introduce a second project state or a separate programme.

## Decision

Use one bounded, typed JSON `planning-exchange-v3` on the current authorized planner
transport. The outer protocol distinguishes a read-only selection measurement
from a final decision whose source choices resolve to `CreationDecisionV1`.
It is not a provider fallback or a second
candidate-production path. Existing final weighted/exact decision semantics,
creative source selection and the Host compiler remain authoritative.

The first response must measure the model's selected sources. At most two
measurements are allowed before its final response. Each source choice explicitly
selects a deterministic option in the fixed authorized catalog or supplies a
custom exact rational window. Each catalog row keeps its source identity,
description, grounding, precise window and capacity together. Host resolves an
explicit option reference exactly; it does not infer or correct a bad reference.
Custom weighted/exact ranges remain supported for actual editorial expression.

Host calculates exact per-window capacity, total,
reserved exact duration and target deficit using RationalTime and the same
capacity semantics as compilation. Model choices determine the windows, order
and subsequent changes. Host neither appends shots nor substitutes ranges,
rewrites captions or selects a story. Measurement is an explicit planning
operation, not successful candidate validation or a Timeline write. The final
response explicitly names a completed feasible query and its measurement receipt
digest. That digest binds the fixed root, original query and exact measurement.
The final contains creative text, sound, captions, preservation/learning claims
and per-shot purpose/picture decisions, with every original selection ID present
exactly once. It cannot repeat or replace source choices, order, timing or target.
Host resolves those fields from the model's own immutable measured query; it
does not choose a story, accept a measurement without a final, or repair a bad
final. Unknown, stale, infeasible or rebound receipts and extra selection fields
are rejected. All resulting creative decisions still undergo existing checks.

There are at most three physical planner calls: up to two valid measurements
and one final response. The existing per-call token ceiling remains, so the
maximum generation token allowance is at most three such ceilings. Context and
audit expose this budget. An invalid exchange, invalid query, exhausted budget,
transport/persistence error or invalid final response terminates the affected
run with its original cause. A rejected final never triggers another call.
The protocol does not automatically restart failed production.

The run fixes request/revision, base version, source identities, profile snapshot,
authorization, initial context, tool definition and budget. Each later input is
derived only from that fixed root and the recorded exchange transcript. The
fixed run digest must not be rebound to arbitrary input. The model-facing
projection avoids duplicating full schemas and scattered source-window tables;
the complete original evidence remains auditable. Every physical send
retains its actual input and wire identity, output/usage/settlement and exact
planning position. Completed exchanges and raw failed responses survive failure;
missing proof is an error, not an empty or invented transcript.

The first real v2 exception still returned a malformed mixture of measurement
and final fields. Its first-round schema was already measurement-only, but its
task prose simultaneously asked for the complete decision. New roots therefore
identify a phase-specific projection: the current physical call has one explicit
phase, permitted response kinds and completed query identities. The creative
objective remains separate from that call's response instructions. Historical
v2 roots retain their exact original projection for proof reconstruction; this
does not select the old projection for new generation or repair rejected output.

A following real measurement returned a second selection with the first query's
identifier, while its selected capacity was still insufficient. Query identifiers
are planning control data, not creative choices. New roots bind
`planning_query_identity: host-root-round-v1`: Host derives the required query
identifier from the fixed root and round, constrains the response schema to that
value, and validates the actual response. A final can cite only completed feasible
queries. Older root policies remain exact read-only proof reconstruction.
The projection also places exact target bounds, the per-shot minimum, every
catalog option meeting that minimum, and the previous measured shortfall near
the current instruction. This is mechanical constraint filtering, not story
selection. Complete evidence and legal custom windows remain available; weights
or a smaller shot count cannot substitute for actual selected-window capacity.

Total duration alone cannot establish a requested change in shot rhythm. For
the recognized request for more spacious shots, Host checks that the output
mean strictly increases and that its shortest shot is no shorter than the
viewed reference's shortest shot, using exact rational conversion. Requiring
every new shot to exceed the old mean was an overly restrictive implementation
proxy; its immutable earlier roots retain their original read-only proof rules.
The current policy is identified in the fixed root. Explicitly lengthening
individual shots requires unambiguous per-shot correspondence; a whole-work
mean cannot establish that instruction. Missing correspondence fails explicitly.
These checks are not aesthetic scores or a claim that all slow-story language
is mechanically understood. The immutable reference version/hash and its exact durations are
bound separately from the current commit base; watching an old work never
changes the authoritative Timeline or revision CAS. Measurement reports actual
allocated lengths against this bound, and final validation rejects violations.
Insufficient source capacity or conflicting protected content is reported,
without shortening the goal, adding filler or choosing the story for the model.

Existing Host dispatch validates authorization, revision, base version, source
and profile immediately before each send. Tool execution and return boundaries
also check freshness; cancellation or closing prevents later calls and commits.
Already-sent calls retain their settlement and usage facts. The gateway and
model acquire no project-write authority.

Only the final decision enters existing source/render checks, exact compilation,
feedback preservation, CommandEditIR simulation and CommitPlan. Preview/Master
continue sharing one Semantic Render Manifest with separate execution plans.
Historical immutable model records, including optional-measurement v1 and
repeated-selection v2 exchanges, remain readable under their original proof rules; they cannot enable
an old protocol for new generation. No failed historical output is repaired.
Only v3 remains in the current Contracts catalog, examples and generated public
bindings. The v1/v2 historical receipt validators are private runtime reading logic;
keeping historical proof readable does not authorize two current contract majors.

## Validation required

Contract and Host regressions cover measurement arithmetic, source and scope
rejection, transcript/hash reconstruction, the exact three-call ceiling, invalid
final with zero additional call/commit, cancellation between rounds, profile or
revision changes, persistence failure and release. A premature direct final,
unknown option, wrong receipt, missing/extra/duplicate shot decoration, repeated
final selection fields or infeasible measurement must not
commit. Catalog-reference and custom-range paths must both preserve existing
creative expressiveness. The earlier direct-final protocol is historical only.

The retained B opposite-intent goal must then run through the formal application
with actual configured services, independent source/duration assertions, real
encoding/QC and playback. Old failures remain. Full repository checks, exact-head
remote CI and final human review are not implied by this decision.
