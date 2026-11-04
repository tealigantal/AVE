---
evidence_id: EVD-20261104-S3-P4-UX-DRAG-RECOVERY
work_package_id: WP-S3-RELIABLE-UX-001
date: 2026-11-04
repository_commit: 39e0aadcc8282b15c3a6bd5302a91a8fd1529471
code_fingerprint: ca7bd497c28fe20b5d515718b8806801a58b3d2f50969b1698b16e5f83cc860f
capability_ids: [CAP-S3-P4-DEMO-INTEGRATION-001, CAP-S3-RELIABLE-UX-001]
acceptance_ids: [ACC-S3-P4-DEMO-INTEGRATION-001, ACC-S3-RELIABLE-UX-001]
scope_classification: historical-revalidation-debt
result: blocked
---

# Native drop recovery checkpoint

R17 original-project recovery and fresh WIN10 both resolve two grayscale annotations to v5. Actual downloaded outputs have identical SHA256 eb1b78b7530bb199d7c7c96eab7f7d0b5f52e5746fde69d0fb17d5f9508a3fd4: all90 decoded frames have equal RGB channels; decoded audio equals the prior3second output. Both independent render plans pass QC. Current source checks check-r17, r17-final-synthetic and r17-render-graph exit0. Fresh WIN09 retains a failure over33seconds and unrelated success, then recovers the same failed item. WIN10 has actual complete playback, input persistence, nine pages, seven responsive sizes, comparison, three downloads and close/reopen. These are R17 evidence, not acceptance of subsequent code. Native OS IME and human listening are not claimed.

Further real native operation verification reaches v21 with PiP copy/move/trim/split/delete/undo/track-lock and actual dual render. A resource dropped onto an occupied clip is then canceled by Chromium: copy-only data receives move from a bubbling legacy clip handler. Native dragend is none with no drop and no commit (r17-drag-copy-move-conflict.txt). The separate empty-lane insertion through a PiP correctly rejects unsafe ripple with no mutation. Mounted drag negotiation regression reproduces copy-to-move override; the first detached DataTransfer test had an invalid fixture and is retained separately, then corrected with explicit writable fixture properties. Fix adds stopPropagation only after the typed lane validates authority and recognizes a registered payload; actual insertion, legacy move, permissions and ripple validation remain unchanged.

Reserve total CNY51.905340 of70;94 wires,zero pending. Existing data and historical evidence retained. Same-build final receipt, remaining OP coverage, source-browse recovery and explicit disposition of refresh/closed-connection issues remain outstanding. P4 debt stays active; no P5, main merge or release. Current changed historical scopes are listed in [reviewed scope classification](../assets/p4-ux/verification-20261104/drag-reviewed-scopes.json) as UNVERIFIED.

Mounted regression follow-up: a detached clip retained its legacy listener after seek rebuilt the timeline DOM. The test now resolves the mounted clip after that rebuild and uses explicit writable negotiation properties for Chromium detached DataTransfer fixtures. The final eight-test suite passes (drag-negotiation-mounted-green.log). Earlier failed fixture logs remain diagnostic artifacts, not native acceptance. Native cancellation evidence remains r17-drag-copy-move-conflict.txt; actual post-rebuild native drops are still pending. [Fixture scope review](../assets/p4-ux/verification-20261104/drag-fixture-reviewed-scopes.json) remains UNVERIFIED for historical capabilities.
