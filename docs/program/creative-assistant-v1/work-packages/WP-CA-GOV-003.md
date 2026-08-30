# WP-CA-GOV-003: Impact-scoped Evidence fingerprints and current-interface drift gates

## Outcome

Issue #12 makes Evidence applicability depend on machine-defined impact scopes, while retaining a repository-wide fingerprint for complete checkout identity. Current Contract-family and authority-document scans must fail closed on interface drift.

## Scope and boundaries

- Allowed: `scripts/docs/**`, `tests/architecture/**`, `docs/program/**`, `docs/decisions/**`, `docs/evidence/**`, the named ExecPlan, generated current outputs through `docs:sync`, and `package.json` only if wiring is required.
- Forbidden: runtime/application code, database, generated Contract bindings, archive content, compatibility shims, real-media paths, Stage Exit and Release claims.
- Inputs: programme manifests, Evidence records, tracked source paths, current Contract schemas and current product/architecture/programme entry documents.
- Outputs: a machine-owned scope model, scope fingerprints/applicability checks, legacy applicability index, Contract-major and current-authority scans, ADR, regression tests and truthful Evidence.

## Invariants and implementation order

Project Host and media architecture are unchanged. Callers cannot opt Evidence out of impact. Scope definitions themselves are fingerprinted; empty/all-excluded/broad-allowlist bypasses fail. Historical Evidence is never rewritten as re-acceptance.

1. Add the ADR comparing global, programme, capability/work-package scope and legacy-index alternatives.
2. Add a deterministic failing regression for unrelated-versus-related mutations and scope-bypass rejection.
3. Implement the smallest machine-owned scope and applicability model.
4. Add Contract family and current-authority scans, then wire them into the default check.
5. Record pre/post results and complete only after the package, focused, full and remote gates pass.

## Validation and stop conditions

Focused checks cover Windows/POSIX normalization, related and unrelated mutations, legacy indexing, scope narrowing, current/archived interface references and Contract-major families. Full checks are `pnpm run check` and `pnpm run acceptance:final:synthetic`.

Stop without completion if scope semantics would require self-asserted applicability, a compatibility layer, a current-document false positive without a precise rule, or any required check cannot establish a deterministic result.

## Definition of Done

The Issue has a completed Work Package, current-fingerprint Evidence, green focused/full/remote gates, a merged PR, and no Stage Exit or Release assertion.
