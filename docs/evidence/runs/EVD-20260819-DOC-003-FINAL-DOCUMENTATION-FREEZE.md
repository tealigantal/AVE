# EVD-20260819-DOC-003-FINAL-DOCUMENTATION-FREEZE

## Scope and authority

Independent documentation Evidence for DOC-003 on branch
`codex/product-intelligence-docs`, based on baseline HEAD `e4881b5`. It is not
owned by, attached to, or sufficient to advance/complete `WP-ADV-002` and does
not promote any capability or acceptance state.

## Outcome

`Documentation Architecture v1.0 Frozen` is established for document
structure, authority relationships, canonical current/future terminology, and
future document-creation rules.

Primary artifacts:

- root entry and Coding Agent routes;
- [`DOCUMENT_AUTHORITY_MAP.md`](../../DOCUMENT_AUTHORITY_MAP.md);
- maintained current terminology documents;
- [`FINAL_DOCUMENTATION_FREEZE_REPORT.md`](../../FINAL_DOCUMENTATION_FREEZE_REPORT.md);
- [`DOC-003 ExecPlan`](../../plans/2026-08-19-final-documentation-governance-freeze.md).

## Executed validation

Observed passing on 2026-08-19 Asia/Shanghai:

- `pnpm run docs:sync -- --check`;
- `pnpm run docs:check` (`docs check passed`);
- `pnpm run docs:architecture:test` (structure and governance negative-fixture
  contracts passed);
- `pnpm run docs:fingerprint:test` (fail-closed fingerprint and generated
  capability/debt rendering passed);
- `git diff --check`;
- relative Markdown link scan over 428 files: zero broken links;
- changed-path allowlist: root README/AGENTS/ARCHITECTURE and `docs/**` only;
- generated `docs/current/**` and `docs/DOCUMENT_INDEX.md`: unchanged;
- programme `STATE.yaml` and `CAPABILITY_MATRIX.yaml`: unchanged; execution
  manifest package IDs/state/dependencies/paths/acceptance/order unchanged;
- `ACCEPTANCE_MATRIX.yaml`: valid JSON-compatible YAML; all 34 IDs, statuses,
  and Evidence bindings unchanged from baseline;
- maintained non-historical terminology: no unqualified current execution IR
  name, ambiguous unified/target-neutral RenderGraph, or old Creative
  Skill/current Skill Output equivalence.

The first `docs:architecture:test` run rejected the compatibility routes after
their literal `DEPRECATED` markers were removed. The routes were corrected to
retain the markers while adding navigation, and the full document gate passed.

Initial custom terminology audit iterations over-included Windows paths under
archive, Evidence, plans, and decisions, then one historical report, due to
exclusion-pattern errors. The corrected audit passed. These were
validation-harness issues and caused no repository state change.

## Review conclusions

- Entry/authority review confirmed the numbered and retained execution layers
  were already compatible but lacked one first-entry chain and dedicated map.
- Terminology review identified maintained current/future and RenderGraph/Skill
  ambiguities; source-accurate terminology was applied without rewriting
  historical Evidence or ADRs.
- Current/freeze review confirmed generated STATUS plus DEBT answer phase and
  unfinished work, while generated WORK plus STATUS and AGENTS answer active,
  next, and forbidden work. Compatibility routes link to those authorities and
  never duplicate live state.

## Remaining risk

The non-blocking constraints in the freeze report remain registered: legacy
`PROJECT_GOAL.md` shorthand outside allowed paths, generated index/evidence
labels, legacy Markdown formatting, searchable historical material, older
metadata formats, future-only intelligence objects, and the separation between
generated implementation work and independent DOC lanes.

No application code, package, contract, database, script, test, generated
current/index document, programme state, capability status, acceptance status,
or existing immutable Evidence/ADR record was modified. Maintained programme
prose and one display title changed only to enforce the frozen terminology.
