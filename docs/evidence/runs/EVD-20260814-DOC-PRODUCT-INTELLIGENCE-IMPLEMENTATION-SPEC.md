# EVD-20260814-DOC-PRODUCT-INTELLIGENCE-IMPLEMENTATION-SPEC

## Scope and baseline

Documentation-only implementation blueprint on
`codex/product-intelligence-docs`, starting from branch HEAD `c707219` over
`main` `d8bf049`. This record is independent DOC Evidence. It does not belong
to, advance or close the active `WP-ADV-002`, and it promotes no capability to
implemented, tested or accepted.

## Artifacts

- Added the six requested core specifications: Product Intelligence Object
  Model, Creative Intelligence Runtime, Video Knowledge Model, Trend Knowledge
  Model, Style Knowledge Model and Implementation Work Order Specification.
- Added a self-contained ExecPlan and cross-links from existing concept docs.
- Added the missing Contract/Evidence and Trend candidate Work Orders; deepened
  Creative Skill, Duration, Story/Edit Intent, Research, Style and integration
  Work Orders with exact target paths, tests, failures and Evidence boundaries.
- Defined the first catalog boundary as repository-shipped read-only data plus
  Project Host content-addressed project snapshots. A shared/network catalog
  remains outside scope and requires an ADR and new governed package.
- Corrected the future Work Order dependency topology and first-round Markdown
  EOF whitespace. No source, tests, Contracts, programme matrices/state,
  generated current docs or dependency files changed.

## Validation evidence

Observed passing on 2026-08-14 Asia/Shanghai:

- `pnpm run docs:sync -- --check`
- `pnpm run docs:check`
- `pnpm run docs:architecture:test`
- `git diff --check main --`
- PowerShell relative-link scan across tracked and untracked changed Markdown:
  45 files checked, zero broken relative paths
- PowerShell EOF/trailing-whitespace scan across the same 45 files: passed
- explicit tracked/untracked path audit: no change outside `docs/**`
- object coverage audit: all ten requested object names present in
  `docs/intelligence/OBJECT_MODEL.md`

Two independent read-only reviews checked existing contract compatibility,
Project Host/Timeline/RenderGraph authority and Work Order governance. The
final review confirmed closure of its semantic/architecture findings after the
Contract/Evidence prerequisite, Direction/Story mapping, catalog boundary,
Trend dependency, exact tests and working-tree validation were corrected.

## Remaining boundary

These documents specify future implementation. Before source or test work, each
candidate Work Order must be promoted into a dedicated governed programme with
final work-package and acceptance IDs, exact allowed paths and immutable
Evidence. The unrelated active `WP-ADV-002` remains unchanged and must not be
used as product-intelligence implementation authority.
