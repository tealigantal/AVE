# ExecPlan: Issue #15 exact feedback RationalTime

## Objective

Make a feedback trim duration exact from desktop input through native confirmation, Feedback Diagnosis, Edit Intent, Edit IR and the committed Timeline source PTS range.

## Progress

- [x] Rebuild the merged #13 baseline and create the dedicated Issue #15 branch.
- [x] Locate the rounded desktop conversion and the current Host/compiler range checks.
- [x] Register/start WP-CA-STAB-004 and establish exact RationalTime regression cases.
- [x] Replace rounded conversion with exact parsing, persisted declaration and independent Host/compiler validation.
- [x] Validate focused, contract, architecture and synthetic acceptance gates; record current-fingerprint Evidence.
- [ ] Run the final full repository gate, publish, merge and clean the branch after remote checks pass.

## Discovery

The desktop feedback helper currently executes `Math.round(seconds * source.timescale)`, while the Host accepts only the resulting source range. The Edit IR compiler already rejects non-integral RationalTime conversions, but Diagnosis and Intent do not persist the user trim declaration, so the Host cannot prove that the displayed request was the submitted duration.

## Decision log

The canonical request will carry a positive exact RationalTime duration and its derived source PTS delta. The desktop parses decimal text with integer arithmetic, native confirmation displays the exact declaration and PTS range, and Host/IR recompute the same value against the current clip. No numeric seconds fallback is retained.

## Outcome and retrospective

The desktop no longer rounds a feedback duration into source PTS. The same exact reduced RationalTime crosses confirmation, Diagnosis, Intent and compiler validation, and malformed or forged declarations close before durable state is written. Real-media and direct-human acceptance remain deliberately outside this synthetic stabilization package.
