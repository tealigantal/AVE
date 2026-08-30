# WO-INT-001 Creative Skill Definition and Evaluation

Status: candidate ready for governed promotion; not in the active programme. Proposed acceptance:
`ACC-INT-001`. Promotion must allocate the final ID and immutable Evidence.

## Goal and motivation

Implement immutable Creative Skill Definition and context-bound Skill
Evaluation contracts so reusable creative knowledge can be selected and
explained without carrying executable authority.

## Inputs and dependencies

- `docs/intelligence/OBJECT_MODEL.md` and `CREATIVE_SKILL_LIBRARY.md`.
- `docs/specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md`.
- `WO-INT-000`; existing contract code generation/runtime.

## Outputs and modified paths

- `contracts/schemas/editorial/creative-skill-definition.v1.schema.json` and
  `skill-evaluation.v1.schema.json`.
- Generated bindings only through `tools/contract-codegen/**`.
- Pure validation/evaluation under `packages/core/editorial-core/**`.
- Built-in read-only definitions under
  `packages/core/editorial-core/src/knowledge/skill/**`; no network registry.
- Contract Runtime and Project Host registration/evaluation under
  `packages/platform/contract-runtime/**` and `packages/platform/project-host/**`.
- Content-addressed Definition pins and Evaluation records under
  `packages/platform/project-storage/**`, with an current-baseline atomic write under
  `database/project-format-v2.sql`.
- `tests/property/creative-skill-definition.test.ts`,
  `tests/integration/creative-skill-knowledge-host.test.ts`,
  `tests/integration/creative-skill-knowledge-storage.test.mjs`, docs and
  `package.json`.

All other paths are forbidden until the governed package says otherwise.

## Runtime and failure contract

Project Host validates an exact Definition/version/digest, supplies approved
Contract/Evidence/context refs, invokes the pure evaluator and registers an
immutable Skill Evaluation. Unknown evidence, conflicting rules, invalid
parameters, rights/trust failure or version rebinding blocks. Failure creates
no Timeline, command, Preset application or project artifact other than an
explicit append-only diagnostic allowed by the package.

## Non-goals

Story Planner, model invocation, Timeline Commands, Preset execution,
RenderGraph nodes, shell/backend strings, Marketplace and runtime downloads.

## Acceptance and tests

- create/validate/serialize exact version; deterministic evaluation and digest;
- reject unknown fields/evidence, rule conflicts, bad parameters, rebinding and
  untrusted/retired versions;
- reject non-current projects before writes and prove current-project reopen/idempotency;
- prove definitions cannot contain execution payloads;
- run `pnpm run creative-skill-knowledge:test` (the three focused tests above),
  `pnpm run contracts:check`, `pnpm run contracts:identity`,
  `pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture`
  and `pnpm run docs:check`.

Acceptance proves only the Skill knowledge/evaluation boundary. It does not
prove planning or editing capability.

Completion Evidence: `EVD-<YYYYMMDD>-WO-INT-001-COMPLETE`, including exact
definition digests, rejected execution payloads, deterministic evaluation,
idempotency and reopen results.
