# CI automation redesign

## Purpose / Big Picture

Replace the overlapping AVE GitHub Actions workflows with one required CI entry
point for pull requests and merged `main` commits, plus a release wrapper that
uses the same verification implementation. The user-visible outcome is one
clear merge verdict per commit without weakening Contract, Host/Worker,
RenderGraph, Electron, synthetic-media, or dependency-security gates.

## Context and Orientation

Before this plan, one branch push plus a pull request started thirteen runs for
the same SHA. `pnpm run check` already included the tests repeated by the
Architecture, Contracts, Worker, Golden, and Acceptance workflows. The
real-media acceptance path stays local and authorized; no workflow may access
or upload user media.

## Plan of Work

1. Create a reusable verification workflow containing exactly one complete
   quality run and a separate, inexpensive security job.
2. Make CI trigger only for pull requests and `main`; cancel superseded runs
   for the same pull request or ref.
3. Make release verification call the reusable workflow for tags and manual
   dispatch. Remove duplicated specialist workflows.
4. Extend the workflow-contract test to assert the new trigger, concurrency,
   reusable-workflow, and single synthetic-acceptance topology.
5. Run the static workflow contract and repository checks. The known
   `fast-uri` advisory is preserved as a separate dependency issue, not hidden
   by this redesign.

## Validation and Acceptance

- `pnpm run ci:workflow:test` proves the checked-in topology.
- `pnpm run docs:sync`, `pnpm run docs:check`, and `pnpm run check` establish
  repository consistency; if security blocks the full GitHub run, report that
  separately rather than weakening the gate.
- The configured workflows must not invoke `acceptance:real`.

## Idempotence and Recovery

The change is declarative. Re-running CI only supersedes stale runs for the
same PR/ref. Reverting this patch restores the former workflow files from Git
history; no runtime data or user media is affected.

## Progress

- [x] Audited duplicate workflows and live runs.
- [x] Implement reusable topology and contract coverage.
- [x] Validate locally and record the outcome.

## Decision Log

- 2026-08-10: Retain the `CI` caller and its `check` job identifier so an
  existing branch-protection rule has the least disruptive migration path.
- 2026-08-10: Keep real-media review outside GitHub Actions because it relies
  on authorized local inputs and human encoded-output inspection.

## Outcomes & Retrospective

The repository now has three workflows: `ci.yml` for PRs and `main`,
`release.yml` for tags/manual release verification, and `verify.yml` as their
single implementation. The specialised workflows were retired. `pnpm run
check`, `pnpm run acceptance:final:synthetic`, generated-doc checks, the
workflow topology contract, and YAML parsing passed locally. `pnpm audit
--audit-level high` remains intentionally failing on the pre-existing
`fast-uri < 3.1.5` advisory; this change preserves that blocking signal rather
than treating it as a workflow failure.
