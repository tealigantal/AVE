# ADR Required Policy

## Mandatory triggers

Create an ADR before implementation when work introduces or materially changes:

- a process or deployable runtime;
- a database, writer, data owner, persistence strategy, or migration model;
- a protocol, public API, schema compatibility strategy, or contract major
  version;
- an Agent, tool authority, autonomous action class, or approval model;
- Timeline structure, Command/Commit semantics, RationalTime authority, or
  project versioning;
- storage format, media identity, provenance, retention, or deletion behavior;
- a security/privacy boundary, credential flow, external provider, or network
  trust boundary;
- module ownership, dependency direction, major production dependency, or
  deployment topology;
- RenderGraph semantic authority, backend fallback, or publication boundary;
- long-term documentation authority when it replaces an existing source rather
  than adding a navigation view.

## ADR not required

A clarification, compatibility link, non-semantic document reorganization,
test expansion that preserves the contract, or reversible implementation detail
inside an accepted decision does not require a new ADR. Record the reason in the
ExecPlan Decision Log.

## Required ADR content

Status, Context, Considered Options, Decision, Rationale, Consequences,
Migration, Rollback, and Date are mandatory. Include affected authorities,
compatibility, security/privacy, failure behavior, validation, and follow-up
Work Orders when relevant.

## Lifecycle

Proposed ADRs do not authorize code. Acceptance requires the repository's
normal review authority. Superseding an ADR links both directions and preserves
history; do not rewrite an accepted decision to hide the old boundary.
