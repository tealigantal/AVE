# WP-CA-TRUTH-004 Cross-platform immutable-media fixture precision

## Outcome

Make the immutable-media rebound/recovery acceptance deterministic on Windows
and Linux without weakening exact file identity.

## Required behavior

- Preserve Project Host's exact size and `mtime_ms` authority checks.
- Restore the fixture mtime from its stored numeric millisecond value without
  converting through `Date`, which truncates sub-millisecond precision.
- Keep the stale-before-restore and sufficient-after-exact-restore assertions.

## Validation

Run the Stage 2 Product gate, full repository check and documentation gates.
The exact pushed-SHA Linux CI remains a mandatory `WP-CA-EXIT-002` merge-readiness
gate, because its result can exist only after this fixture correction is committed
and pushed.
