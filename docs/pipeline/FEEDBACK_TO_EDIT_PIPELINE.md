# Feedback to Edit Pipeline

Feedback is first classified as intent, factual correction, taste preference,
technical defect or approval. The system locates affected beats/ranges,
retrieves the original decision and evidence, proposes one or more local
patches, previews their consequences and asks for approval where semantics or
protected material changes.

Accepted patches become new Edit Intent and follow the same Host adapter ->
`CommandEditIntent` -> `CommandEditIR` -> Command/Commit path. Feedback never
silently rewrites the whole project or erases the reason
for the previous version.

For a local semantic trim, the user duration is a positive exact RationalTime
(a decimal or `numerator/denominator` input), not a floating-point seconds
approximation. The desktop rejects any duration that cannot be represented as
an integral source PTS before native confirmation. That exact duration and its
derived inward source range are retained in Feedback Diagnosis and Edit Intent;
Project Host and the Edit IR compiler independently recompute them against the
current clip before any persisted artifact or Timeline commit.
