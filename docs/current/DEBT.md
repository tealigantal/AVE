<!-- GENERATED FILE: Do not edit manually. Update machine-readable program files and run pnpm docs:sync. -->
# Current Debt

| Debt | Status | Capabilities | Acceptance | Exit condition |
| --- | --- | --- | --- | --- |
| DEBT-RENDER-002-A: Nested sequences, compound clips and adjustment tracks are explicit resolver blockers. | active | CAP-TL-001, CAP-COMP-001 | ACC-011 | Implement semantic flattening and verify nested output, persistence and cycle failure. |
| DEBT-RENDER-002-B: Bezier automation, dynamic transform, anchor and original-size semantics are blocked before execution; bounded manual static 9:16 reframe is tested separately. | active | CAP-KF-001, CAP-XFORM-001 | ACC-001, ACC-002 | Compile registered automation paths and verify curves, anchors, dynamic reframe and reopen behavior. |
| DEBT-RENDER-002-C: Tracked and ellipse masks, subject segmentation and manual tracking correction are explicit blockers. | active | CAP-MASK-001, CAP-COMP-001 | ACC-005, ACC-006 | Implement shape-correct ellipse and tracked-mask execution, persist tracking assets, and verify frame-accurate matte output and correction. |
| DEBT-RENDER-002-D: Transition source-handle execution, change-pitch/variable remap, full color, graphics and the remaining broad audio scope remain blocked; bounded Master normalization, ducking and clip fades are tested separately. | active | CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-TEXT-001, CAP-AUDIO-001 | ACC-003, ACC-004, ACC-007, ACC-008, ACC-009, ACC-010 | Implement source-handle transitions, change-pitch and the remaining specified registry operations, then pass every observable media assertion. |
| DEBT-RENDER-002-E: Real-media final acceptance has no authorized repository fixture or configured local input. | blocked | CAP-RENDER-001 | ACC-012, ACC-013 | Run Project Host acceptance with authorized real AV and subtitle inputs without copying or committing user media. |
