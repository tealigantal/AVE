# WP-CA-TRUTH-003 Current full-suite fixture identity closure

## Outcome

Remove the final old track and Transition fixture shapes exposed by the full
repository suite so tests exercise only the canonical current `video-main`
execution-output track and exact-overlap Transition rule.

## Required behavior

- Do not restore support for the old `v1` track identifier.
- Initialize and target every feedback case with `video-main`, matching current
  Project Host execution-output authority.
- Preserve all existing success, zero-write, stale, reject and rebound
  assertions.
- Construct Transition affected-range coverage with exact overlap and source
  handles; do not restore adjacent-transition compatibility.

## Validation

Run the Intelligence Pipeline gate, complete Stage 2 synthetic gate, full
repository check, documentation gates and a focused source review.
