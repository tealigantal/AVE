# ADR-0048: Verified Cross-Run Planning Continuation

- Status: Accepted for implementation; not yet implemented or validated
- Date: 2026-11-05

## Context

ADR-0033 fixes a planning root and requires exact, auditable physical calls and
measurements before a final can reach the existing Host compiler. In the P5
preflight, one planning measurement was returned and recorded; the next
physical input was refused by the local budget guard before its reservation and
transport. The failure and Host call settlements are durable. The current
gateway starts the transcript again on each run, while current proof validation
requires all rounds and their calls to belong to one run. A simple retry can
therefore resend and charge for the first measurement, and attaching that
measurement to a new run without changing the proof would misstate provenance.

The local guard's verified code and original hash-chained ledger are relevant
evidence for this particular failure. A generic provider error, absent output,
or a missing ledger entry by itself is not proof that no request was sent.
The failure, actual settlements, cost reservations and diagnostic bytes are
never rewritten to make a continuation appear successful.

## Considered Options

1. Start a fresh transcript and resend the first measurement. Rejected for
   this recovery because it repeats a completed, billable physical request.
2. Reopen the old failed ticket or copy its measurement into a new run as if
   that run made the original call. Rejected because it changes or fabricates
   lifecycle and accounting history.
3. Continue with a new Host-owned run only after validating immutable lineage,
   unchanged authority and a trusted once-only dispatch boundary. Selected.

## Decision

For a failed `planning-exchange-v3` run, Project Host may construct a
versioned continuation from a referenced immutable failure object and its
historical creation-session ticket. Renderer and model may request a normal
product continuation but cannot supply or assert trusted diagnostic objects,
receipts, send status or source authority. Host checks the selected failure's
project, request, revision, generation and failure identity; a missing,
ambiguous or rebound reference fails closed.

The continuation records the original root and its digest, old ticket/run and
each completed round's exact historical call reference, plus the next pending
input and physical transport identity. It recomputes the derivation, query
identity, original output bytes and hash, parsed exchange, measurement, model
snapshot, call target, wire, settlement and usage. Host verifies the old call
was actually settled as a response; it does not treat a failed or unknown call
as one. The new run records its own calls and their actual outcomes. A final
proof explicitly maps each round to its originating run/call and is validated
both before persistence and when the result is read or replayed. Original
failure records, call IDs, failed settlements and reservations remain intact.

The current request must still authorize the same actor, model/deployment,
data and exact sources. Before continuing and before every subsequent send and
commit, Host rechecks revision, cancellation and authorization generations,
expiry, Timeline version and identity, original and immutable source identities
and permissions, observation receipts, profile snapshot and complete
reconstructed planning root. A changed, missing or unverifiable dependency
rejects continuation; a new request or a different intent cannot inherit an
old measurement. Existing Host dispatch, source validation, CommandEditIR,
simulation and CommitPlan remain the only route to an edit.

The next round can be sent only through a **trusted dispatch authority** that
atomically prevents a second external transmission of the exact physical wire
against the retained, complete accounting history. The derived input, bytes,
wire digest, target and authorized deployment must match the saved pending
transport before dispatch. A previously reserved, sent or unresolved wire, an
unverified guard/ledger/runtime, a missing capability or any uncertain send
state fails closed. A no-send receipt may alternatively authorize this boundary
only when the trusted transport itself durably issued it before any possible
send and it binds the same wire and authority. Exception strings and
client-supplied claims do not constitute such a receipt.

For the P5 isolation, the existing preloaded guard's same-ledger atomic wire
reservation may supply that authority only after the old and current guarded
transport route, runtime, policy, exclusive ledger ownership and complete
hash-chained history are verified. Its original reservations and the CNY 100
limit are retained; policy changes do not waive deduplication or authorize a
different wire. Guard code is not a general proof that unrelated network
clients are controlled. If the route or accounting history cannot be bound,
the historical P5 failure remains failed and continuation is unavailable.
This boundary trusts the Host main process and the local code whose build and
startup identity the P5 harness verifies. It does not attest against an
attacker who can execute arbitrary Node preload code inside that process.

The continuation is limited to a fully validated prefix of completed
measurements and an eligible unsent next round. It does not repair rejected
model output, infer a final, alter a query, or automatically retry an uncertain
provider call. Subsequent failure or cancellation appends its own real evidence;
concurrent recovery must not dispatch twice. Existing planning ceilings apply to
the whole logical exchange, including its completed prefix. Until cross-run
audio-resource receipt, grant and retained-source authority are equivalently
validated, a root requiring `audio_library` is not eligible for continuation.

## Rationale

Explicit lineage permits a returned measurement to be reused without claiming
that a new run produced it. A transport authority binds no-duplicate delivery
to the actual wire rather than guessing from a model error. Freshness and
authorization checks prevent a historical measurement from granting a new
source, request or model permission.

## Consequences and Validation

Add a versioned contract and Host-owned durable lineage, gateway continuation,
shared write/read proof validation and a trusted guard capability. No new
SQLite writer, renderer authority, model-selected edits or second Timeline path
is introduced. A blocked continuation remains visible as a failure; no
completion or real-model acceptance follows from this decision alone.

Required tests cover a successful one-round continuation with no second send
of its first wire; exact old/new call and usage attribution; duplicate,
unresolved or unknown send rejection; wrong wire, target, guard or ledger;
tampered output, measurement, failure reference or historical ticket; changed
authorization, source, observation, Timeline, deployment or profile; rejection
of unsupported audio-library continuation; concurrent recovery; cancellation,
crash and close/reopen; and validation of the final persisted proof. Mocked
tests do not establish the actual P5 flow or supplier billing.

## Migration

Historical v3 failures, request states and model records remain immutable and
read under their existing proof rules. New lineage is a separate, versioned
record; ordinary v3 runs without a continuation retain their current validator
and behavior. No historical failure is automatically promoted to a resumable
operation. Eligibility requires the complete authority and transport checks
above, including for the preserved P5 attempt.

## Rollback

Disable creation of new continuations and retain all saved failure, lineage,
call, ledger and result objects. Readers must still validate records already
written; rollback must not reinterpret them as ordinary single-run proofs or
erase their accounting history.
