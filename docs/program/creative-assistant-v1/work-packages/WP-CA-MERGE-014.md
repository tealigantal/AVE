# WP-CA-MERGE-014 Fail-closed execution review proof closure

## Outcome

Require an exact confirmed execution review at the Product Host boundary and
add behavioral proof for post-prepare staleness, native confirmation details
and post-read Preview rebinding.

## Scope

- Reject `intent.execute` without a confirmed review before approval or
  Timeline mutation.
- Preserve exact review identity through the confirmation helper and prove the
  native review details contain every bound effect field.
- Exercise a prepared review after its approval authority expires and assert
  zero writes.
- Exercise Preview workspace/render/output-hash changes between the before and
  after reads and fail closed.
- Update the real-media preparation path to use the same exact review boundary.
- Reconcile Evidence without promoting capability status.

## Non-goals

- No contract, schema, storage, permission-policy or render-format change.
- No new product action or editing capability.
- No destructive legacy-data repair and no merge authorization.

## Validation

Run focused Stage 2 Product tests, typecheck, architecture and desktop boundary
checks, full repository check, synthetic final acceptance, documentation and
fingerprint checks, allowed-path audit, independent review, then exact-head PR
checks.
