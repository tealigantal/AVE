# WP-CA-MERGE-030 Cross-platform immutable-stat fixture closure

## Outcome

Make the immutable-Original corruption regression portable across Windows and
Linux while preserving its strict proof: after fixture corruption, byte length
and `mtimeMs` must exactly match the registered metadata so only full content
hashing can detect the changed bytes.

## Scope

- Reconstruct the integer-millisecond timestamp originally supplied by Project
  Host before replaying the persisted Linux `mtimeMs` value through `utimes`.
- Restore the immutable read-only mode after controlled fixture corruption so
  permission checks cannot mask the intended content-identity failure.
- Keep exact `mtimeMs` equality and explicitly prove that the subsequent
  fail-closed path receives a successful `media.fingerprint.v1` result whose
  SHA-256 digest equals the controlled corrupted bytes.
- Re-run focused Creative Context checks, the Stage 2 aggregate, repository
  gates and synthetic final acceptance on the resulting shared fingerprint.
- Publish append-only Evidence for both registered programmes and verify the
  pushed exact head with the existing remote `security` and `check` jobs.

## Non-goals

- No Project Host, production filesystem, hashing, permission, storage,
  Contract, Timeline, Renderer, Worker, IPC or dependency change.
- No timestamp tolerance, rounded comparison or weaker current-location check.
- No capability or acceptance promotion, Debt/ADR change, real-media claim or
  PR merge.

## Design decision

Project Host deliberately sends an integer-millisecond `Date` to `utimes` when
creating an immutable snapshot. Linux may report that exact timestamp as
`N - epsilon` in the floating-point `mtimeMs` view. Passing that value directly
back to `new Date` truncates it to the preceding integer millisecond and can
move the restored timestamp by one millisecond. The fixture therefore rounds
the persisted value only when reconstructing the original `Date` input. It
then restores the same read-only protection, compares the resulting filesystem
value to persisted metadata with strict equality, and counts the exact Worker
fingerprint only after it returns the expected corrupted-content digest before
accepting the stale-media rejection.

## Validation

Run `creative-context:test`, `stage2:check`, type and architecture gates,
documentation structure/fingerprint/sync/check, the complete repository check,
synthetic final acceptance, allowed-path and diff audits, then push one exact
head and require that head's remote `security` and `check` jobs to pass. Refresh
review threads after CI and resolve only findings demonstrably closed. Do not
merge.
