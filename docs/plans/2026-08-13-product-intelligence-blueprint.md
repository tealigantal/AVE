# Product intelligence blueprint expansion

## Purpose

Create a complete, implementation-oriented documentation layer connecting the
accepted AVE engineering foundation to the future AI creative-partner product.
This plan is documentation-only; it does not change source code or claim new
capabilities.

## Context

The repository already has authoritative product, architecture, execution
programme, generated current-state and Evidence documents. The missing layer
was the end-to-end user journey, creative knowledge model, research/style/trend
intelligence, reasoning trace, duration strategy, quality model and future
implementation work orders.

## Milestones

- [x] Inventory existing authorities, active package and forbidden boundaries.
- [x] Add a master product-intelligence blueprint and product experience docs.
- [x] Add intelligence, research, pipeline and UX documents.
- [x] Add dependency-ordered future work orders with goals, inputs, outputs,
  dependencies, non-goals and acceptance criteria.
- [x] Run documentation synchronization and validation gates.

## Validation

Run `pnpm run docs:sync`, `pnpm run docs:check`,
`pnpm run docs:architecture:test`, `git diff --check`, and a relative-link
scan for the added Markdown documents. Observed result: generated documents are
synchronized; all listed checks pass, only `docs/` paths changed, and no
current capability was promoted.

## Decision log

- Keep the existing `docs/product/`, `docs/architecture/`, `docs/program/` and
  `docs/current/` authority order.
- Place the new blueprint beside, rather than inside, the execution programme.
- Treat Trend and Style as advisory inputs and Creative Skills as typed,
  versioned knowledge with no execution authority.

## Outcome

The new document map and work orders are present, cross-boundary invariants are
explicit, and repository documentation checks pass. Implementation remains
future governed work.
