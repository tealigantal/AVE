# WP-CA-E2E-001 Production-free Electron E2E harness

## Outcome

Move every Electron smoke, scripted review and automatic confirmation control
out of the production desktop lifecycle and into one test-owned harness.

## Required behavior

- Production application lifecycle contains no smoke, review, auto-confirm or
  test-only environment branch.
- Production native confirmation always displays the exact prepared review and
  requires the returned dialog response; it has no automation parameter.
- A test-owned Electron main entry opens the authorized project, drives the
  rendered workspace, captures review views, exercises Preview, scoped
  feedback rejection and reopen, and emits machine-readable results.
- Test automation may confirm only the exact feedback-rejection dialog through
  an injected dialog service; every other confirmation remains closed.
- A decided feedback revision clears its Renderer-only local effect preview;
  because rejection does not mutate Timeline, the current encoded Preview and
  current Render binding remain available across reopen.
- Runtime smoke and Product real acceptance launch the test-owned entry through
  explicit command-line arguments, never through production environment hooks.
- Project Host, IPC and sender validation remain unchanged. Renderer behavior
  changes only to clear the decided revision's non-authoritative local preview.

## Non-goals

No product capability expansion, real-media evidence replacement, programme
truth reconciliation or merge.

## Validation

Run Electron runtime, desktop boundary, authorized Product real journey, type,
architecture and documentation gates. Close with exact-fingerprint Evidence
and independent read-only review.
