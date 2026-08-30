# WP-CA-INT-001 Creative Skill Definition and Evaluation

This is the governed promotion of candidate `WO-INT-001`. Current Contracts,
source, tests and Evidence outrank the candidate document if they conflict.

## Goal

Implement immutable Creative Skill Definitions and deterministic,
context-bound Skill Evaluations so Stage 2 can select and explain reusable
creative knowledge without granting editing or backend authority.

## Authority and compatibility

Project Host validates and registers exact Definition versions/digests, pins
an approved Creative Contract and current Material Evidence Pack, invokes only
the pure evaluator and persists the immutable Evaluation through Project
Storage. Contract schemas remain the cross-language authority. Built-in
definitions are read-only repository knowledge; there is no network catalog,
Marketplace or runtime download.

Creative Skill Definitions are evidence-bound reasoning knowledge. They are
not `CreativeSkillOutputV1` Preset selections and cannot carry Timeline
Commands, RenderGraph nodes, adapter/backend/shell/model execution fields or
runtime call targets. Free prose is stored and compared only as inert data and
is never interpreted or forwarded to an executor. Only an exact current
repository-catalog Definition may be evaluated. Preset Core, Timeline,
RenderGraph, Worker and Model Gateway are forbidden paths for this package.

## Acceptance

`ACC-CA-INT-001-SKILL` covers exact version/content identity, trust/retirement,
deterministic evaluation, parameter/rule conflicts, Contract/Pack staleness,
idempotency, migration preservation, reopen and zero unrelated mutation.
Execution-shaped fields and unknown fields fail at the Contract boundary;
command-looking prose remains inert and fails Host catalog authority unless it
is part of the exact reviewed repository Definition.

Analysis accuracy, Direction/Story generation, model invocation, semantic Edit
Intent, Preset application, rendering and UI are explicit non-goals.
