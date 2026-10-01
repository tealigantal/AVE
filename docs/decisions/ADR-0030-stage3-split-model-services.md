# ADR-0030: Explicit split model services for Stage3

Status: accepted; configurable framework implemented with engineering gates passed. Real model quality and first personalized checkpoint validation remain pending.
Date: 2026-09-24

## Context and decision
The user selected Qwen vision, Whisper transcription and an independent acoustic
model, with credentials entered later. Extend the existing observable ModelProvider
boundary with a serial composite provider. Text-only creation/learning uses the
configured planner (the vision deployment by default). Images only go to vision;
WAV audio goes separately to Whisper and the native-audio sound deployment.
Whisper text must never masquerade as environmental-sound perception.

Keep one request authorization bound to an immutable composite deployment digest
and its explicit receiving routes. Native consent lists all role/provider/model/
endpoint mappings. Every physical send has exact serialized bytes and a target,
its own Host-persisted dispatch and settlement. No aggregate ledger can replace
physical-call accounting. Child failure/cancellation stops subsequent calls;
completed calls remain immutable and no partial observation/Timeline is published.
No automatic retry of an entire multi-call observation or provider substitution.

Each sample is sent serially to avoid concurrent model requests. This does not
unload independently hosted model weights or promise constant application memory. Visual output has no speech
transcript; sound output supplies environmental descriptions only; Whisper segments
are validated relative to the actual uploaded WAV and converted exactly onto its
source RationalTime origin. Fusion is deterministic by sample ID, never another
unrecorded model call. Missing/invalid responses fail explicitly.

Main reads a local user-editable JSON settings file outside the repository;
keys remain Main-only and absent from deployment digests, Renderer, project
records, logs and examples. A disabled template permits first launch. Enabled but
incomplete configuration fails with the exact configuration field, never fallback.
Local HTTP loopback may omit a key; remote services require one. User chooses
compatible services; this slice does not deploy servers or promise all computers
can execute every model. No package/real-checkpoint completion is implied.

## Consequences and alternatives
A single Omni model was previously sufficient but is not required. A transcription
server's chat facade is not an acoustic model. Multi-provider fallback or universal
SDK abstraction is not introduced. Retain the current protocol, schemas, request
and profile authority; add explicit composite target records coherently across
schema/generated readers/Host/UI/tests. Runtime input windows and inference speed
remain deployment constraints, not product data/cost ceilings.

Fusion retains ordered child outputs, targets and usage in the current ModelAudit.
The shared contract-runtime reconstructs the aggregate output at publication and
reopen, matching every child digest to its immutable physical settlement. The
composite owns child audit draining; outer cancellation must not settle a child
with unknown usage before its own known usage is recorded.
