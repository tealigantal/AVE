# Release Process

## Separate gates

Documentation completion, Work Package completion, commit, push, pull request,
merge, product release, and deployment are separate actions. Passing one never
authorizes the next.

## Work Package closure

1. Finish the exact Work Order outcome within allowed paths.
2. Execute focused, architecture, repository, failure, persistence, real-media,
   and human gates required by the package.
3. Create immutable `EVD-*` with current fingerprint and retained artifacts.
4. Reconcile capability, acceptance, programme state, Debt, and docs truth.
5. Run `docs:complete` only for that package, then `docs:sync` and `docs:check`.
6. Obtain independent review with no unresolved blocker.

A blocked package receives Evidence and active Debt; it is not completed.
Documentation-only tasks use independent DOC Evidence and never close an
unrelated implementation package.

## Publication controls

- A commit includes only intentional in-scope files.
- Push requires explicit authorization or a requested publication workflow.
- A PR does not imply merge; CI and review success do not imply release.
- Merge requires explicit instruction and current branch/PR checks.
- Release or deployment requires explicit target, version, artifacts,
  rollback, credentials, privacy/security checks, and user authorization.

## Post-release verification

Verify the real user journey and artifact provenance in the released runtime,
not only source parity or a health endpoint. Record observed version, environment,
output, rollback status, and known residual risk.
