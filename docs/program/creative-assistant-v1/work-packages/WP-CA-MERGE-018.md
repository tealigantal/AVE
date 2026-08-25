# WP-CA-MERGE-018 Contract approval and execution-bound Preview closure

## Outcome

Make a newly opened desktop project able to register and explicitly approve an
exact Creative Contract, then render the exact committed Stage 2 execution so
Review can open a current Preview instead of remaining absent or stale.

## Scope

- Add a complete, schema-valid Contract review form with no invented policy
  identity, and persist it only through Project Host.
- Add exact native confirmation and Host-owned human approval for the current
  Contract review digest.
- Add an explicit execution-bound render action that derives source identities
  from the committed execution and rejects workspace, Timeline, graph, plan or
  source rebinding before Worker execution.
- Close the legacy unbound render control and IPC command whenever Stage 2
  execution authority exists, while preserving the non-Stage-2 baseline.
- Prove successful and stale/failure paths at Host, IPC and Renderer boundaries.
- Reconcile programme fingerprints and Evidence without promoting excluded
  capabilities.

## Non-goals

- No contract/schema, persistence, Worker, render-graph or permission-policy
  redesign.
- No implicit Contract approval, automatic rendering after execution, or
  legacy `project.render` semantic change.
- No PR merge authorization.

## Validation

Run focused Contract/Product/Renderer and desktop-boundary tests, typecheck,
architecture, full repository check, synthetic final acceptance, documentation
and fingerprint checks, allowed-path audit, independent review and exact-head
PR checks.
