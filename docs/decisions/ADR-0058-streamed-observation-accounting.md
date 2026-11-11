# ADR-0058: Streamed audio observation identity and accounting

Date: 2026-11-11. Status: selected for implementation; not yet connected to the
production observation path. This decision is not evidence of a complete
low-resource user journey or of equivalent model understanding.

## Context

The current observation run constructs one inline `ModelInput` containing all
PNG and WAV samples, clones it, and persists and reopens it as canonical JSON.
Even if an audio file is cut into smaller samples, retaining every sample in
that input and keeping every physical call in the v1 session array still makes
memory grow with total input and call count. The v1 composition also preserves
individual provider responses only as part of its final composition: a crash
after a provider response and before final publication does not by itself prove
that the response can be reconstructed or safely reused.

## Decision

An authorized audio stream may be represented by a versioned, immutable
`CreationAudioStreamRootV1` and a byte-hashed, ordered chunk index. The root
binds project, request, run, revision, authorization and cancellation
generations, base Timeline identity, complete deployment identity, source and
material authorization identities, actual stream index, and an exact sample
grid and chunk policy. The chunk index records every non-overlapping core and
its bounded overlapping model-input context, the sample identifier, content
hash and byte length. It is canonical UTF-8 JSON Lines with one trailing newline
per record. Its exact byte length, record count and SHA-256 are committed by the
root; the chunk record does not include the root digest, avoiding a circular
hash. A streaming validation pass checks the complete ordered plan, payload
limits, canonical bytes, hash and authorization before exposing records for
use. The caller must hold and revalidate the relevant original, derived sample,
index and authorization identities; a schema or digest alone is not authority.
The isolated verifier currently returns a process-local, unforgeable selection
receipt only after checking the entire index. It must be recreated on reopen;
selecting every one of N chunks this way rereads the index N times, an O(N²)
cost. A production implementation needs a checked on-disk index or membership
proof to avoid that cost without weakening the full-index verification.

Each physical transcription or sound request requires a separate immutable
reservation binding root digest, exact indexed chunk digest, target route,
wire digest, byte length and attempt. Before actual dispatch, Host must check
the request, material, source, Timeline and authorized deployment again. The
validated provider response and settlement must be persisted atomically with
their precise known usage or an explicit unknown usage; a response cannot be
claimed reusable until its durable object and semantic content have been
independently verified. The reservation and settlement are immutable, distinct
records. A sent-but-unconfirmed call is `unknown`, never assumed failed, free,
or safe to repeat automatically. An explicit retry creates a new attempt; an
already verified response is reused without another model call.

All chunk cores must cover the authorized source interval in order without gaps
or overlaps. Model input context may overlap. Exact RationalTime and integer
sample coordinates are retained; no float time is authoritative. Raw child
transcription and acoustic responses, including context and their uncertainty,
remain available for audit. A word with reliable individual timing can be
assigned to at most one half-open core by its exact midpoint; a crossing,
conflicting, missing or unaligned interpretation remains uncertain rather
than being silently merged. Acoustic events retain the original event identity
and source range when their intersections with cores are represented. Chunked
model interpretation is not assumed semantically identical to a single
whole-file model call.

These audio roots are per-source inputs to a future complete observation
manifest; they are not a complete observation, a model result, or a project
publication. A production implementation must stream its reference index and
ledger rather than move the unbounded list into a new JSON array. It must also
atomically publish the final observation, evidence and creative-state change
only after all required cores, roles, source identities and permissions pass.
Old v1 inputs, output proofs, call accounting and observation records keep
their existing bytes, identities, readers and historical semantics.

## Consequences and remaining work

The added contracts and isolated verification helpers establish identities and
failure rules only. Host/Worker chunk extraction, physical dispatch accounting,
durable response storage, versioned creative-session/observation state,
cross-modality completion, re-open, recovery and real low-resource acceptance
remain required before enabling a streamed observation path. The bounded v1
guard is an explicit temporary failure, not long-audio support. No deployment,
permission expansion, or change of model follows from this decision.
