# Quality Evaluation Pipeline

Evaluation combines deterministic checks and human review. Story checks cover
evidence coverage, coherence, character continuity and emotional curve. Editing
checks cover pacing, selection, audio, continuity and transition intent.
Technical checks cover `CommandEditIR` validity, Timeline version, Semantic
Render Manifest equality across target-specific Preview/Master execution,
output manifests and Master QC.

The result is a Quality Report with metric definitions, evidence, thresholds,
uncertainty, blockers and reviewer decisions. A score cannot override a failed
QC, missing evidence, license issue or user rejection.
