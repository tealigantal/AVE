# Product intelligence implementation specification

## Purpose / Big Picture

Deepen the existing product-intelligence documentation from concept-level
direction into an implementation blueprint. A future governed agent should be
able to identify target objects, ownership, runtime stages, failure behavior,
versioning, compatibility with current contracts and the Work Order that owns
each implementation slice without inventing product semantics.

This is documentation-only. It does not implement intelligence capability,
change current programme status or close `WP-ADV-002`.

## Context and Orientation

The branch already contains the first-round blueprint and concept documents.
The repository also already implements narrow `CreativeContractV1`,
`StoryProposalV1`, `ApprovedStoryPlanV1`, `CreativeSkillOutputV1` and
`CommandEditIntent` contracts. New documentation must extend those boundaries
through additive versions/adapters and must preserve Project Host, Contracts,
RationalTime, Timeline Command/Commit, RenderGraph and QC authority.

The only active machine-governed package is `WP-ADV-002`; its allowed paths
include `docs/**`, but its goal is unrelated advanced real-media acceptance.
This plan therefore uses an independent DOC Evidence record and never invokes
`docs:complete` or edits programme matrices/state.

## Plan of Work

### Milestone 1: Authority and gap audit

- [x] Read mandatory project authorities, current work and active specifications.
- [x] Compare current branch to `main` and inventory concept documents/contracts.
- [x] Obtain independent read-only documentation and governance reviews.

### Milestone 2: Canonical implementation blueprint

- [x] Add object model, runtime, video, style and trend knowledge models.
- [x] Distinguish future rich objects from current persisted v1 contracts.
- [x] Define ownership, lifecycle, compatibility, failures and zero-mutation gates.

### Milestone 3: Work Order readiness

- [x] Add the repository-specific implementation Work Order specification.
- [x] Correct candidate Work Order dependency topology.
- [x] Deepen Creative Skill, Story/Edit Intent, Video Research, Style, Trend and
  intelligence-to-Timeline candidate Work Orders.

### Milestone 4: Validation and closure

- [x] Normalize Markdown EOF formatting and verify all relative links.
- [x] Run generated-doc drift, documentation governance/architecture and diff checks.
- [x] Record actual commands and scope in immutable DOC Evidence.
- [x] Re-read final diff for authority drift and implementation overclaiming.

## Concrete Steps

Use `pnpm docs:start -- WP-ADV-002` only as the required idempotent governance
entry; do not attribute this task to that package. Modify only `docs/**`.
Validate with `pnpm run docs:sync -- --check`, `pnpm run docs:check`,
`pnpm run docs:architecture:test`, a relative-link scan,
`git diff --check main --`, an explicit whitespace scan that includes untracked
Markdown, and an explicit non-Markdown diff audit. `main...HEAD` alone is not a
working-tree validation command.

Use this exact PowerShell whitespace scan for tracked and untracked Markdown:

```powershell
$files = @(git diff --name-only main...HEAD; git diff --name-only; git ls-files --others --exclude-standard) | Sort-Object -Unique | Where-Object { $_ -like 'docs/*.md' -and (Test-Path -LiteralPath $_) }
$bad = @(); foreach ($file in $files) { $text = [IO.File]::ReadAllText((Resolve-Path $file)); if (-not $text.EndsWith("`n") -or $text.EndsWith("`n`n") -or $text -match '[ \t]+\r?\n') { $bad += $file } }; if ($bad) { throw "Markdown whitespace failed: $($bad -join ', ')" }
```

## Validation and Acceptance

Acceptance requires the six requested core documents; explicit current-vs-
future contract mapping; stage input/output/authority/validation/failure rules;
VideoPattern, Trend and Style knowledge contracts; and Work Orders detailed
enough to govern Creative Skill schema, Story Planner, Trend Retrieval, Style
Retrieval and semantic Edit Intent implementation. All doc gates and links must
pass, and no capability/programme status may change.

## Idempotence and Recovery

All documents are additive or focused edits. Re-running docs synchronization
must produce no drift. If a validation fails, keep `WP-ADV-002` active, correct
only documentation in scope and rerun the focused gate. No database migration,
runtime artifact, generated contract or destructive operation is involved.

## Surprises & Discoveries

- The first-round concepts overlap existing narrow formal contracts; a naive
  object list would create a second schema authority.
- The candidate Work Order README had a dependency order that placed
  `WO-PRODUCT-001` before its declared `WO-INT-003` dependency.
- The first-round committed Markdown range contains redundant blank lines at
  EOF, which working-tree-only `git diff --check` did not reveal.

## Decision Log

- Keep JSON Schema as the only future protocol authority; docs specify target
  semantics and additive migration/adapters.
- Name the knowledge definition `CreativeSkillDefinition`, preserving
  `CreativeSkillOutputV1` as the existing Preset execution boundary.
- Treat Style and Trend as optional, exact-version advisory snapshots.
- Add a separate Trend candidate Work Order rather than hiding it inside video
  research or Story Planner scope.
- Do not modify or complete the unrelated active `WP-ADV-002`.

## Outcomes & Retrospective

The six core specifications now connect target objects to current v1 contract
compatibility, a Host-orchestrated runtime and concrete candidate Work Orders.
Independent review found and then verified closure of missing Contract/Evidence
prerequisites, Direction/Story mapping, catalog ownership, dependency and test
command ambiguity. Documentation gates, link/whitespace checks and the docs-only
scope audit pass. No runtime capability or `WP-ADV-002` status changed.

## Artifacts and Notes

Primary artifacts are under `docs/intelligence/`, `docs/research/` and
`docs/work-orders/`. Validation evidence will be recorded under
`docs/evidence/runs/` without referencing local private media.

## Interfaces and Dependencies

Project Host remains orchestration/persistence authority; Model Gateway and
Worker produce candidates only; Contracts/Core validate; Timeline changes
remain gated by existing Edit IR/Command/Commit; Preview/Master remain one
semantic RenderGraph with explicit QC/blockers. Future implementation packages
must be promoted into a governed programme before source or test edits.
