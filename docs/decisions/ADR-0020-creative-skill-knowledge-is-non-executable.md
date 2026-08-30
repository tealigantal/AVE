# ADR-0020 Creative Skill knowledge is immutable and non-executable

- Status: Accepted
- Date: 2026-08-24

## Context

Stage 2 needs reusable creative reasoning knowledge, while AVE already uses the
name `CreativeSkillOutputV1` for a typed Preset-selection boundary. Treating a
knowledge definition as a Preset, command template or downloadable package
would blur approval and execution authority.

## Considered Options

1. Extend `CreativeSkillOutputV1` with reasoning, catalog and evaluation data.
2. Allow executable Skill packages or backend/compiler fields.
3. Add separate immutable Creative Skill Definition and context-bound Skill
   Evaluation contracts that can only propose later creative objects.

## Decision

Use additive `CreativeSkillDefinitionV1` and `SkillEvaluationV1` Contracts.
The first catalog is repository-shipped and read-only. Project Host may pin
only an exact published, trusted and licensed built-in definition, then invokes
a pure deterministic evaluator against an exact approved Creative Contract and
current sufficient Material Evidence Pack. Project Storage records immutable
Definition pins and Evaluation objects through additive migration 0022.

Definition content identity is the canonical SHA-256 of all definition fields
except the self-declared `definition_digest`. Evaluation input identity pins
the exact Definition, Contract, Pack, context, parameters, conflicts and policy;
evaluation ID and observation time do not change an otherwise identical input.
The evaluator and knowledge-policy versions are Host-owned constants, never
caller input, and Evaluation object version starts at one. The pure evaluator
recomputes canonical Contract and Pack digests and validates the Pack's exact
project, Contract and privacy/rights policy edges before reasoning.
Creative Context timestamp Contracts use the RFC3339 subset JavaScript can
compare exactly (seconds `00` through `59`). Host additionally rejects
non-finite creation/expiry parses and dynamically marks any legacy malformed
expiry stale, so invalid time can never make a Pack appear current.

Definitions and evaluations reject command, Timeline, RenderGraph, node,
backend, adapter, compiler, shell, executable-code, model-call and download
fields. Free prose is opaque data: it is never parsed as a command language,
resolved as a URL, forwarded to Worker/Renderer/shell/model code or used to
select an executable backend. Only an exact current repository-catalog entry
may be used by Host; arbitrary stored Definitions remain inert. Output kinds
are restricted to Direction, Story, Decision and semantic Edit Intent
proposals. Evaluations never create a Preset application or mutate Timeline.

Pinned Definition content remains immutable and historically readable. A
separate Host-owned project control record may retire or revoke an exact pin;
it cannot reactivate a withdrawn pin. New evaluation requires both an exact
match in the current repository catalog and an active project control record,
while withdrawal marks prior Evaluations stale.

## Consequences

Knowledge can be inspected, compared, retired and reproduced without becoming
execution authority. Exact trust/license/status or context staleness blocks
new use, while historical immutable records remain readable. A later compiler
must separately produce the existing typed Preset selection or Host-owned
semantic Edit Intent path and receive its own approval/Evidence.

Marketplace, network retrieval, model invocation, runtime downloads and
third-party executable Skills require separate security/product decisions.

## Migration and rollback

Migration 0022 only adds Definition, availability-control and Evaluation
tables/refs. Existing projects, Context objects, Evidence/media, Timeline and
object refs remain unchanged. Rollback disables the new Host use cases and
leaves the immutable object payloads unread by older code.
