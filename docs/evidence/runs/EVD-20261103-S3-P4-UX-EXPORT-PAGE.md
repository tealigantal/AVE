---
evidence_id: EVD-20261103-S3-P4-UX-EXPORT-PAGE
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-03
repository_commit: fae0b79b5c4cc6918baa2bd761ae07b73286a3d3
code_fingerprint: 75ab0ac609800817c0cffaa5682860c22cc06ad8dc5494b7ba796ccd8b63a60e
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
scope_classification: historical-revalidation-debt
result: blocked
---

# Export page navigation and remaining P4 verification

DOC-007 execution evidence for the user's instruction to use all available allowance without repeated authorization. Existing CNY40 cap and conservative reservations remain; no new model calls at this checkpoint. Prior immutable evidence and all user/test data are preserved. This is a bounded continuation, not P4 completion or P5 acceptance.

Actual Browser r7 export downloaded v5 MP4, audio usage JSON and credits via all three visible download links. MP4 SHA256 is `69f66124d80a4701d86844ce8796a2438f2ac24d8f179a5e4e4d44c8240dcd32`, matching approved Master. Credits identify Contemplation/Joth/CC0; this is a new export of the retained successful v5. Initial automation mistakes (wrong confirmation label; waiting for downloads before clicking the prepared-file links) are preserved separately, not attributed to product failure.

Browser navigation from the export page failed because inherited fixed modal CSS intercepted sidebar pointer events. Current page mode now uses normal grid placement, retaining modal styling elsewhere. Page-mode return closes immediately with hidden/inert and cancels pending animation; actual export jobs, permissions and version/QC binding are unchanged. Extended mounted Renderer test failed before repair on navigation hit testing (6/7), then all seven tests passed. It also asserts no remaining animation after immediate page close. Independent read-only review found no blocking issue. Actual r8 Browser navigation, return and reopen passed at 1440/820/360 and all nine workbench routes.

The old Electron 90-second limit covers the entire process, not only shutdown; old timeout never reached the final review or quit marker. A diagnostic run completed, followed by a failed bounded run at reopened export-page close. Neither proves the historical timeout root cause. Harness now bounds capture playback/animation waits with rejection, requires the exact preview version, labels the whole-process watchdog accurately and persists per-mode transcripts. The original 90-second ceiling and shutdown/native-quit assertions remain. Post-fix actual Electron journey, fixed-version export, shutdown and process reopen passed; transcript root is `output/p4-remaining-20261103/electron-after-export-fix.log`.

Historical applicability remains explicitly UNVERIFIED in [reviewed scopes](../assets/p4-ux/verification-20261103/remaining/reviewed-scopes.json). Full current-build empty-project WIN10 and outstanding OP coverage remain independent; no synthetic fixture, old recording or cross-build recovery is promoted to full acceptance.

## Subsequent exact editing and recovery verification

R9 demonstrated that the old IPC projection removed image kind, geometry and other editing semantics; correcting image time arithmetic alone was insufficient. The shared Host-owned projection now carries full editable Timeline semantics and parent-bound opaque references for private metadata, font/LUT paths and unexposed effect/transition parameters. The dedicated projected-manual boundary resolves against the immutable selected parent, then uses the unchanged ordinary manual commit. Normalized input commands, IR, effect digest and idempotent replay stay identical. Existing historical restoration is unchanged. Regressions include private injection/forged reference rejection, LUT identity binding, same-parent retries, copying into new IDs, track-property updates and safe metadata normalization. Static image trim/split preserves its single source frame; splitting an image with fades is rejected to prevent duplicating fades at the new cut.

R10 standard builds and source/runtime provenance passed. Real Browser one-frame image, audio and caption edits produced v11-v13. v13 Preview and Master QC passed with hash 410072a1c88391909e1f1caaf2aafe5e4daf7efe4b2a608ce2ef2cc548af995c; player readyState4 and duration3s. Exact persisted comparison confirms image source/geometry, main grayscale effect, caption style, audio route/gain/opposite fade and all other content retained. Existing audio edge-trim behavior removes the trimmed-edge fade; this was not introduced by this change. Three actual undo operations produced v16, identical to v10 apart from version, including the original fade.

R10 WIN09 interaction used a newly created synthetic project: invalid upload failed; after over30s and an unrelated successful PNG import, the same issue remained queryable. Dismissed issues remained visible with the documented include-processed filter. Re-selecting the valid same-name video recovered the failed item; two assets are registered. Automation mistakes (query before authority settled; inspecting dismissed items with the open-only filter; an unscoped duplicate-text locator) are retained and are not product failures or passing receipts.

The next actual check discovered current-card recycle using a project UUID as a recent-entry UUID. Current summaries now include only the safe project identity alongside the existing opaque reference; the current card requires exactly one match and submits that opaque reference. Missing/ambiguous references never select another project. R11 and final R12 actual Browser current-card recycle, restore and reopened two-asset inventory passed on the new synthetic project. R11 also exposed obsolete Worker cancellation being shown as QUERY_FAILED during close; R12 narrowly maps lifecycle-invalidated Worker cancellations to DESKTOP_SESSION_STALE, preserving their cause and actual completion. Current-session cancellation regression still observes the original error. Final R12 recycle trace contains no former generic cancellation issue.

## Engineering coverage

The initial full check failed in the Electron fixture at explicit-null UI restoration. The fixture returned only version from save-ui while the real Host returns version and value; corrected fixture plus bounded close acknowledgement passes. The exact unexecuted mandatory suffix was subsequently run and passed; the original aggregate failure is retained, not reported as a green aggregate. Targeted final projection/Host/idempotency, typecheck, architecture, web Host and recycle checks are recorded separately. Electron whole-process watchdog and failure assertions remain; no historical timeout root-cause claim.

## Boundary

No new paid calls this turn. CNY37.244568 retained conservative reservations out of CNY40; remaining CNY2.755432. This is not an invoice/balance claim. Current-bound quotes for the four planner sends required by a fresh same-build generation plus annotation journey exceed that remainder even before observations. No historical reservation is refunded or rewritten, and no model retry is attempted merely to consume the remainder. P4 remains incomplete: the complete same-current-build empty-project WIN10 and remaining formal OP/receipt closure are not established by these free regressions. No P5, main merge, deployment to another service, or release is claimed.

Final R12 checkpoint: repeated the failed-upload / over30s delay / unrelated PNG success / persistent issue / dismissed-filter retrieval / same-name correct-source recovery sequence in a second new empty synthetic project. Two assets registered and both import batches completed. Current-card recycle/restore/reopen also passed with no obsolete-cancellation generic error. Source fingerprint75ab0ac609800817c0cffaa5682860c22cc06ad8dc5494b7ba796ccd8b63a60e and build-input9d1d5aadb686b6b8e908a5b61403320ce5a976fa62d241ea6be737d03ead629e are recorded in build-identity-r12.json. Preservation verifies all ten prior project identities and seven export hashes; only the authorized synthetic edit project gained v6-v16, and two new synthetic recovery projects were created. Raw Browser logs, final build identity, selected engineering logs and hash index are retained under verification-20261103/remaining. These WIN09 interactions are actual coverage, not a claim that the complete formal P4 receipt set is closed.
