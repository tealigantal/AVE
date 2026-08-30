# Issue #14: compiler-aligned feedback target eligibility

## Goal

Close the gap between the target list shown to a Stage 2 user and the existing Feedback trim compiler's fail-closed support boundary.

## Milestones

1. Extract the compiler support classification and map stable reason codes into the Host workspace projection.
2. Rebind `createFeedbackRevision` to the same classification before any persistent write.
3. Render unavailable-target reasons without making unsupported targets selectable.
4. Prove unsupported and stale inputs create no Diagnosis or Intent, then complete package evidence and Development Integration.
