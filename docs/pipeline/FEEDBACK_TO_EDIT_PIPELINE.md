# Feedback to Edit Pipeline

Feedback is first classified as intent, factual correction, taste preference,
technical defect or approval. The system locates affected beats/ranges,
retrieves the original decision and evidence, proposes one or more local
patches, previews their consequences and asks for approval where semantics or
protected material changes.

Accepted patches become new Edit Intent and follow the same IR/Command/Commit
path. Feedback never silently rewrites the whole project or erases the reason
for the previous version.

