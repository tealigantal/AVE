# fast-uri supply-chain security fix

## Purpose / Big Picture

Remove the repository-wide high-severity `fast-uri` advisory without weakening the audit gate or changing AVE product behavior. The dependency repair must preserve the accepted Preset work, all existing blocked capability boundaries, and the complete local and GitHub validation paths.

## Context and Orientation

GitHub PR #7 and local `pnpm audit --audit-level high` identify `fast-uri >=3.0.0 <3.1.5` through `ajv@8.20.0` and `ajv-formats@3.0.1`. `ajv` permits `fast-uri ^3.0.1`, so `3.1.5` is a compatible patched transitive resolution. The user explicitly authorized this separately scoped security repair after `WP-PRESET-001` completion.

Allowed change scope for this maintenance task is `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.github/workflows/verify.yml`, `tests/architecture/ci-workflows.mjs` and `docs/**`; `package.json` is used only if pnpm configuration cannot reliably hold the patched version. Application source, contracts, audit thresholds and user data are unchanged. Workflow changes may only preserve immutable legacy Evidence through exact path exclusions; broad Evidence exclusions are forbidden.

## Plan of Work

- Resolve the transitive dependency to `fast-uri@3.1.5` using pnpm and verify a frozen install reproduces it.
- Run the high-severity audit, dependency inspection, complete repository check, and synthetic final acceptance.
- Create new immutable regression Evidence for the changed repository fingerprint, synchronize generated current documents, and run documentation gates.
- Obtain an independent read-only review, then publish the focused fix to the existing Draft PR and confirm GitHub `security` and `check` jobs.

## Validation and Acceptance

Acceptance requires all of the following actual results:

- `pnpm install --frozen-lockfile`
- `pnpm why fast-uri` reports only `3.1.5` or later within the compatible v3 line
- `pnpm audit --audit-level high` exits successfully
- `pnpm run check` exits successfully
- `pnpm run acceptance:final:synthetic` exits successfully
- `pnpm run docs:check` exits successfully after fingerprint reconciliation
- GitHub PR #7 `verify / security` and `verify / check` pass on the published commit

## Idempotence and Recovery

The lock-only update is deterministic and reversible by a normal follow-up commit. No database, media, generated contract, or user project data is migrated. If the patched dependency breaks validation, retain the failing output, do not weaken the gate, and stop before publication.

## Progress

- 2026-08-11: Confirmed the local and GitHub failure is the same single high-severity advisory on `fast-uri@3.1.4` through `ajv`; authenticated GitHub access and verified the patched version is `3.1.5`.
- 2026-08-11: Added the pnpm workspace override, regenerated the lockfile, and confirmed frozen installation resolves only `fast-uri@3.1.5` with no known high-severity vulnerability.
- 2026-08-11: Contract/AJV validation, generated compatibility, typecheck, architecture, workflow topology, the complete repository check, synthetic final acceptance and documentation gates passed under fingerprint `4f4a3dbec316dd0f0e81b0ef057ab96f0dd92e379e5ec63db0580b851ddfcda9`.
- 2026-08-11: GitHub confirmed the vulnerability audit itself passed, then exposed a previously unreachable machine-path scan failure in two immutable 2026-08-05 Evidence records and one editable plan. The plan was sanitized; the workflow now excludes only the two exact immutable Evidence paths, with an architecture regression requiring that exact exclusion set and pinning both normalized Evidence hashes.
- 2026-08-11: Under final fingerprint `7fa5eeb1215b1bdfb6c44fed282bb551d977eba4f6be9910e8c1bf3385dca295`, frozen install, the patched one-version dependency tree, high-severity audit, exact-exclusion path scan, full repository check, synthetic final acceptance and documentation gates all passed locally.

## Surprises & Discoveries

- The bundled GitHub inspection helper hit a Windows GBK decoding failure while reading Actions logs. Direct `gh` run metadata and logs remained available and confirmed the exact audit failure.

## Decision Log

- Prefer a lock-only compatible transitive update because `ajv@8.20.0` already declares `fast-uri ^3.0.1`; add a root override only if pnpm cannot hold the patched resolution reproducibly.
- Pnpm 11 ignores `pnpm.overrides` in `package.json`; the supported workspace-level `overrides` setting in `pnpm-workspace.yaml` is therefore the authoritative security pin.
- Preserve the existing high-severity audit threshold and workflow unchanged.

## Outcomes & Retrospective

The high-severity advisory is resolved locally without changing application source, protocols or audit thresholds. The workspace override makes the compatible patched transitive resolution explicit, while the regenerated lockfile makes frozen CI installation deterministic. The security workflow retains its machine-path gate and narrows the only exceptions to two named immutable historical Evidence files; an architecture test requires that exact set and pins both normalized file hashes. New immutable regression Evidence carries each published fingerprint and preserves all prior accepted, tested and blocked capability boundaries. Remote GitHub confirmation remains the publication step.
