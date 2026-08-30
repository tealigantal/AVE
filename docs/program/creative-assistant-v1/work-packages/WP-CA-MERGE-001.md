# WP-CA-MERGE-001 Stage 2 merge-gate and Evidence fingerprint hardening

## Outcome

Close only the final branch-review merge gates without changing Stage 2 product
behavior: deterministic Stage 2 tests run in the default PR CI job, Evidence
fingerprints cover governance scripts and critical build/architecture roots,
and current programme bindings are regenerated under the repaired fingerprint.

## Scope

- Add one `stage2:check` script aggregating the eight deterministic Stage 2
  suites and invoke it from `pnpm run check`; keep environment-dependent real
  media in a separate local-only script.
- Repair the Story migration regression so it asserts the owned 24-26
  migrations without assuming no later repository migration exists.
- Extend `scripts/docs/fingerprint.mjs` to include `scripts/**`,
  `tsconfig*.json`, `pnpm-workspace.yaml`, `dependency-cruiser.cjs`,
  `pyproject.toml`, and `uv.lock`.
- Add fail-closed regression assertions for every new fingerprint input and
  for the Stage 2 CI aggregation contract.
- Refresh both programme states, capability and acceptance Evidence bindings,
  generated current documents, and immutable Evidence under the new exact
  fingerprint.
- Record the environment-gated Electron acceptance automation inside
  `apps/desktop/src/main/app-lifecycle.ts` as follow-up engineering debt; do not
  move or refactor it in this package.

## Non-goals

- No Stage 2 feature, contract, database, runtime, renderer, Worker, media, or
  architectural behavior change.
- No edit to the production acceptance harness.
- No merge of the branch. Publication stops at a pushed PR with final-head CI
  evidence unless the user separately authorizes merge.

## Allowed paths and validation

The machine-readable manifest is authoritative for allowed paths. Local package
completion requires `stage2:check`, `docs:fingerprint:test`, `ci:workflow:test`,
`docs:sync`, `docs:check`, `check`, `acceptance:final:synthetic`, and an
allowed-path audit. After publication, remote-head equality and green PR
`security` and `check` jobs remain separate merge gates.
