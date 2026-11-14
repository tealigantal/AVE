import assert from "node:assert/strict";
import { creationRetainedPictureHints } from "../../packages/platform/contract-runtime/src/creation-planning.mjs";

const rt = (value, timescale = 30) => ({ schema_version: 1, value, timescale });
const context = {
  timeline: { version: 7, sequence: { timebase: { value: "1", timescale: "30" } }, duration_summary: { output_duration: { value: "4", timescale: "1" } }, tracks: [{ kind: "video", clips: [
    { clip_id: "video", timeline_start: "0", timeline_duration: "45", source: { asset_id: "v", start_pts: "10", end_pts: "55", timescale: "30" } },
    { clip_id: "still", kind: "image", timeline_start: "60", timeline_duration: "30", source: { asset_id: "i" } },
  ] }] },
  source_spans: [
    { asset_id: "v", span_id: "audio-only", media_kind: "audio", editable_start: rt(0), editable_end: rt(90), observations: [{ kind: "visual", sample_at: rt(15) }] },
    { asset_id: "v", span_id: "too-short", editable_start: rt(0), editable_end: rt(30), observations: [{ kind: "visual", sample_at: rt(15) }] },
    { asset_id: "v", span_id: "covering", editable_start: rt(0), editable_end: rt(90), observations: [{ kind: "visual", sample_at: rt(15) }] },
    { asset_id: "i", span_id: "image-span", media_kind: "image", observations: [{ kind: "visual" }] },
  ],
};
const hints = creationRetainedPictureHints(context);
assert.equal(hints.complete, true);
assert.equal(hints.target_duration_ticks, 120, "the full work may extend beyond the last picture");
assert.deepEqual(hints.selections, [
  { selection_id: "video", source_choice: { kind: "custom_window", source_window: { asset_id: "v", span_id: "covering", start: rt(10), end: rt(55) } }, timing: { kind: "exact" } },
  { selection_id: "still", source_choice: { kind: "custom_window", source_window: { kind: "image", asset_id: "i", span_id: "image-span" } }, timing: { kind: "still", duration_ticks: 30 } },
]);
const noCoverage = structuredClone(context); noCoverage.source_spans = noCoverage.source_spans.filter(span => span.span_id !== "covering");
assert.equal(creationRetainedPictureHints(noCoverage).complete, false);
assert.equal(creationRetainedPictureHints(noCoverage).selections[0], null, "a short source span must not become an invented cut");
const noVisibleSample = structuredClone(context); noVisibleSample.source_spans.find(span => span.span_id === "covering").observations[0].sample_at = rt(70);
assert.equal(creationRetainedPictureHints(noVisibleSample).selections[0], null, "an out-of-cut observation cannot support a retained picture hint");
const twoTracks = structuredClone(context); twoTracks.timeline.tracks.push({ kind: "video", clips: [structuredClone(twoTracks.timeline.tracks[0].clips[0])] });
assert.equal(creationRetainedPictureHints(twoTracks).complete, false, "the current retention executor supports one picture track");
console.log("Exact retained-picture hints cover temporal, still, gap, source bounds and unsupported tracks.");
