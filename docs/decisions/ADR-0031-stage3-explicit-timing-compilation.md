# ADR-0031: Stage3 explicit candidate timing compilation

Status: selected for implementation under the authorized full Stage3 repair.
Acceptance remains in the existing C1-C9 matrix and Evidence.

## Problem

Three retained production attempts exposed a structural weakness in asking the
planner to calculate both source PTS and a complete Timeline duration. The third
used the configured model's actual bounded reasoning, but still confused a 1001
source-frame step with an 800-unit Timeline tick. Its prose claimed 24 seconds
while the chosen windows totalled about 34.65 seconds. The existing compiler
correctly rejected it; no draft was committed. More instructions alone did not
establish a usable creation loop.

This ADR records the consequential model/Host boundary choice. Existing runtime
and object documents own its current API semantics; no second architecture or
project-state authority is introduced.

## Decision

The current model boundary is `creation-decision.v1`, with required
`decision_version`, `target_duration_ticks`, ordered source windows and explicit
per-shot timing. The Host narrows the total target to the mechanically recognized
whole-work requirement. The model chooses actual source windows, their order,
creative purpose, audiovisual edits and relative rhythm.

- `weighted`: a positive integer relative weight, with a source window defining
  the authorized usable motion interval. The Host retains its start and computes
  an exact end. It reserves one Timeline tick per weighted shot, then allocates
  the remaining ticks proportionally, capping at available window duration.
  Integer remainders are distributed by largest remainder, with shot order as a
  stable tie-break. This is the declared candidate semantics, not an output fix.
- `exact`: the entire source window is the finished cut, including its exact
  source phase and duration. Non-integral Timeline durations fail. Protected or
  retained content uses this mode and still passes existing preservation checks.

Exact cuts consume the target budget first. Insufficient window capacity,
impossible targets, malformed values and unsafe integer projections fail with
specific errors. Nothing is silently stretched, repeated, frozen or dropped.
Captions and independent audio remain exact; they are not trimmed or cleaned to
fit the resulting shots.

One pure compiler produces the existing `CreationPlanV1` artifact. Host then
uses the existing CommandEditIntent/IR, simulation, independent duration and
preservation checks, CommitPlan, semantic manifest and target ExecutionPlans.
The raw decision, fixed context and compiled plan remain distinct audit facts.
Storage recomputes the plan with the same compiler on read/reopen.

Source endpoints and observed bounds may use different rational grids. The IR
compiler expresses them on an exact common-denominator grid without rounding;
an observation's storage timescale is not an additional sampling lattice.
Timeline duration must still be a whole tick. Where embedded audio has a shorter
physical interval than video, generation receives only their explicit editable intersection and the restriction
reason. Original stream/observation bounds remain in internal probe and observation
receipts, not as competing model selection boundaries. Visual evidence is projected
as sample points; full windows and capacities are separate. Every transcript has
a mechanically derived eligibility and exact-duration/anchor option; these options
do not choose captions, change transcript text, or repair model output. This is
available-material context before selection,
not truncation of a returned decision or invented silent audio.

Current dispatch rejects old implicit source-range decisions. Immutable older
model records retain a narrow read-only reconstruction path identified by their
saved input schema and absent new protocol; they cannot enter current generation
as a fallback. Existing projects and failed-run evidence are not rewritten.

## Validation

The existing Stage3 gate adds exact/rational allocation properties, capacity
failure, immutable inputs and deterministic recompile checks. Product-loop
fixtures exercise weighted compilation through actual Host/SQLite/render/QC and
reopen. Exact fixtures retain their prior source/time assertions. The same
frozen 24-second real cold-start goal must pass a new recorded production run;
previous failures remain failures. Full regression, remote CI and final human
review are not implied by this decision.

The focused product regression additionally encoded a real 30000/1001-fps
synthetic motion source and compiled unequal weighted cuts on a 1/24000
Timeline. Exact source endpoints, Preview/Master QC and reopen passed, including
an endpoint not representable on the observation's original 1/30000 scale.
This proves rational compilation and encoding, not real Vlog creative quality.
