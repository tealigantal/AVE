# Video Style Analysis

Analyzer outputs are `VideoObservation` candidates governed by
[Video Knowledge Model](VIDEO_KNOWLEDGE_MODEL.md); reviewed style dimensions
are governed by
[`STYLE_KNOWLEDGE_MODEL.md`](../intelligence/STYLE_KNOWLEDGE_MODEL.md).

Analyze content (topic, audience, emotion, story structure) and editing
(average shot length distribution, cut frequency, hook form, subtitle style,
music structure, transition pattern, pacing and silence). Performance fields
such as completion, engagement, comments and shares are optional and must retain
their source, sampling window and comparability limits.

The analyzer emits time-coded observations and aggregate distributions, not a
single “style label”. Human review can accept, reject or annotate each
observation before it enters the Style Profile or pattern database.
