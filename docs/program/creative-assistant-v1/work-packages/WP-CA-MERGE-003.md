# WP-CA-MERGE-003 Development integration gate and current-interface drift prevention

## Outcome

Define Development Integration, Stage Exit, and Release gates for AVE's current
baseline without claiming Stage 2 exit or release acceptance. The package
records the separation, archives the superseded root blueprint, and confirms
current authority documentation without changing Stage 2 runtime behavior.

## Scope

- Define Development Integration, Stage Exit, and Release gates in a new ADR.
- Preserve the Stage Exit requirements for WP-CA-REAL-001 and WP-CA-EXIT-002.
- Record deferred impact-scoped fingerprint and automated interface-drift work
  as an independent governance follow-up.
- Move the complete historical root engineering blueprint to its archive path
  and retain a short, explicitly historical compatibility entry at the root.

## Non-goals

- No Stage 2 product or runtime behavior change.
- No migration, compatibility, alias, dual-read, or old-project reopening path.
- No assertion that Stage 2 is accepted or released.

## Validation

Run the required package checks, full `check`, final synthetic acceptance, an
allowed-path audit, and final-SHA remote CI/review verification before any
merge decision.
