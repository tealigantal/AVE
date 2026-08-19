# EVD-20260819-DOC-002-DOCUMENTATION-ARCHITECTURE-REFACTOR

## Scope and authority

Independent documentation Evidence for DOC-002 on branch
`codex/product-intelligence-docs`, based on HEAD `b72fc84`. This Evidence is not
owned by, attached to, or sufficient to advance/complete the active
`WP-ADV-002`. It changes no capability, acceptance, programme, generated-current,
or application state.

The editing programme code fingerprint remains
`6831b85967b8e4120326f2fa73c24d40cebc499fd9b9c42f4568d382682cfc6d`;
DOC-002 does not replace the programme's latest capability Evidence.

## Artifacts

- [`docs/README.md`](../../README.md) and nine numbered domain directories;
- requested vision, product, intelligence, architecture, engineering,
  evaluation, privacy, Work Order, and ADR policy documents;
- root `ARCHITECTURE.md` plus focused `README.md` and `AGENTS.md` changes;
- [`docs/FINAL_DOC_REFACTOR_REPORT.md`](../../FINAL_DOC_REFACTOR_REPORT.md);
- [`docs/decisions/OPEN_ISSUES.md`](../../decisions/OPEN_ISSUES.md);
- [`DOC-002 ExecPlan`](../../plans/2026-08-19-documentation-architecture-refactor.md).

## Executed validation

Observed passing on 2026-08-19 Asia/Shanghai:

- `pnpm docs:start -- WP-ADV-002` returned successfully as the idempotent
  repository governance entry and produced no programme/current diff;
- `pnpm run docs:sync -- --check`;
- `pnpm run docs:check` (`docs check passed`);
- `pnpm run docs:architecture:test` (structure and governance negative-fixture
  contracts passed);
- `git diff --check`;
- NUL-delimited UTF-8 Markdown audit over tracked plus untracked files: 424
  files after this Evidence record, zero broken relative links, zero
  byte-identical documents;
- required-artifact audit: all 31 named target/report/architecture artifacts
  present;
- docs-only path audit: every changed file matches root documentation or
  `docs/**/*.md`;
- generated/programme immutability audit: no change to `docs/current/**`,
  `docs/DOCUMENT_INDEX.md`, programme YAML matrices/state, source, tests,
  scripts, contracts, database, packages, apps, or configuration;
- canonical terminology scan: no non-archive occurrence of the incorrect
  single-target-neutral-RenderGraph claim or old `Edit Intent -> Edit IR ->
  Resolve` sequence; current/future intent terminology is separated.

The first custom link-scan attempt failed before evaluating links because Git's
quoted Chinese filename output was parsed as a literal path. It was corrected
to use NUL-delimited UTF-8 `git ls-files -z`; the corrected scan passed. This was
a validation-harness issue, not a product/document failure.

## Audit conclusions

- Baseline audit covered 381 tracked Markdown files, including all 97 archive
  files for inventory only; archive content did not establish current truth.
- Direct physical migration is not valid inside DOC-002 because existing docs
  tooling/tests hard-code current product/architecture paths and scripts/tests
  are forbidden. The non-destructive numbered overlay preserves all checks.
- Root README no longer duplicates a maturity/status snapshot and directs
  readers to generated current status.
- Project Host, Evidence Graph, Material Evidence Pack, semantic Edit Intent,
  CommandEditIntent, CommandEditIR, Timeline, CommitPlan, RenderGraph,
  ExecutionPlan, Creator Model, Creative Skill Definition,
  `CreativeSkillOutputV1`, Decision Record, and ADR have one registered meaning
  in `docs/README.md`.
- Source inspection confirmed that current Project Host builds and persists
  target-specific `previewGraph` and `masterGraph`, verifies equal
  `semanticGraphPayload` hashes, and resolves one ExecutionPlan per graph. It
  also confirmed the current Host input is `CommandEditIntent`; command-free
  semantic Edit Intent remains a future adapter input.
- Future creative intelligence, provenance classes, Creator Model, knowledge,
  learning, and autonomy policies remain explicitly specified/future and do not
  claim runtime implementation.

## Independent review

Three read-only review lanes examined repository authority/governance,
all-Markdown terminology/content, and overlay structure. Initial review rejected
the inaccurate single-RenderGraph model, premature semantic Edit Intent claim,
an incomplete report/plan record, and two stale Evidence sentences. Source-
grounded corrections were applied and every affected gate was rerun. Final
authority, structure, and content reviews each reported no blocker.

## Remaining risk

Generated index coverage and “Latest evidence” wording require a future
authorized docs-tooling change. Twenty-three legacy current specification/work-
package files still have inline heading-format debt. Older ADR section formats,
candidate Work Order lifecycle metadata, future object contracts, and the
searchability of historical documents remain explicitly recorded in
`docs/decisions/OPEN_ISSUES.md`.
