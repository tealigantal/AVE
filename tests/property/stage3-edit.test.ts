import { buildTimelineRenderGraph } from "../../packages/core/render-graph/src/public.js";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { creationTimelineContext, creationVerbatimCaptionContext } from "../../packages/platform/project-host/src/stage3-creative.js";
import { assertCreationPlanV1 } from "../../packages/platform/contract-runtime/src/public.js";
import { compileCreationPlan, resolveCommandEditIntent, type CommandEditIntent, type CreationCompileContext } from "../../packages/core/edit-ir/src/public.js";
import { createCommitPlan, simulateCommands, type Timeline } from "../../packages/core/timeline-core/src/public.js";

const plan = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-plan.v1.json", "utf8"));
assertCreationPlanV1(plan);
const time = (value: number, timescale = 30) => ({ schema_version: 1 as const, value, timescale });
const asset = plan.shots[0].source.asset_id as any;
plan.shots.push({ ...structuredClone(plan.shots[0]), shot_id: "reaction", source: { ...plan.shots[0].source, start: time(90), end: time(180) }, purpose: "Preserve the source reaction." });
plan.captions = [{ caption_id: "caption", shot_id: "shot-1", offset: time(0), duration: time(30), text: "actual words", kind: "verbatim", evidence_ids: ["quote-1"], audio_anchor: { kind: "embedded", id: "shot-1" } }];
plan.audio = [{ audio_id: "sound", shot_id: "reaction", source: { ...plan.shots[0].source, start: time(60), end: time(150) }, offset: time(-30), role: "dialogue", gain_db: -3, fade_in: time(3), fade_out: time(3), purpose: "J-cut with actual source audio." }];
const context: CreationCompileContext = { request_id: plan.request_id, revision: 1, input_digest: plan.input_digest, authorized_asset_ids: [asset], protected_refs: [], principle_ids: [], spans: [{ span_id: "evidence-1", asset_id: asset, start_pts: 0n, end_pts: 240n, timescale: 30n, has_video: true, has_audio: true, observations: [{ evidence_id: "visual-1", kind: "visual", start_pts: 0n, end_pts: 240n, timescale: 30n, text: "Fixture visual", uncertain: false }, { evidence_id: "audio-1", kind: "audio", start_pts: 0n, end_pts: 240n, timescale: 30n, text: "Fixture audio", uncertain: false }, { evidence_id: "quote-1", kind: "transcript", start_pts: 0n, end_pts: 30n, timescale: 30n, text: "actual words", uncertain: false }] }] };
const base: Timeline = { version: 0, tracks: [], sequence: { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] } };
const phased = structuredClone(plan);
phased.shots = [phased.shots[0]]; phased.audio = [];
phased.shots[0].source.start = time(101, 100); phased.shots[0].source.end = time(201, 100);
const phasedContext = { ...context, spans: [{ ...context.spans[0]!, timescale: 300n, end_pts: 2400n, observations: context.spans[0]!.observations.map(item => item.kind === "transcript" ? { ...item, start_pts: 101n, end_pts: 201n, timescale: 100n } : item) }] };
const phasedTimeline = simulateCommands(base, compileCreationPlan(phased, base, phasedContext));
assert.equal(phasedTimeline.tracks[0]!.clips[0]!.timeline_duration, 30n);
assert.equal(phasedTimeline.tracks[0]!.captions![0]!.timeline_start, 0n, "source 1.01s maps exactly relative to the audible anchor, without rounding absolute time");
const captionOptionContext = { ...context, spans: [{ ...context.spans[0]!, observations: context.spans[0]!.observations.map(item => item.kind === "transcript" ? { ...item, start_pts: 101n, end_pts: 381n, timescale: 100n } : item.kind === "visual" ? { ...item, start_pts: 120n, end_pts: 121n, timescale: 100n } : item) }] };
const captionOption = creationVerbatimCaptionContext(captionOptionContext.spans.map(compile => ({ compile, context: {} })), base.sequence!.timebase!)[0]!;
assert.equal(captionOption.duration_ticks, "84");
const anchor = captionOption.exact_embedded_anchor_options[0]!;
const fromOption = structuredClone(phased);
fromOption.shots[0].source = { ...anchor.source_window }; fromOption.captions[0].offset = anchor.caption_offset; fromOption.captions[0].duration = anchor.caption_duration;
const optionTimeline = simulateCommands(base, compileCreationPlan(fromOption, base, captionOptionContext));
assert.equal(optionTimeline.tracks[0]!.clips[0]!.timeline_duration, 84n);
assert.equal(optionTimeline.tracks[0]!.captions![0]!.timeline_duration, 84n, "all-source deterministic caption option compiles at its exact audio phase");
const roundedQuote = structuredClone(fromOption); roundedQuote.shots[0].source.end = time(481, 100); roundedQuote.captions[0].duration = time(86);
assert.throws(() => compileCreationPlan(roundedQuote, base, captionOptionContext), /CREATION_CAPTION_QUOTE_UNSUPPORTED/, "86/30 cannot replace a true 2.8-second transcript; context never repairs output");
// C-style sparse samples: the full 2.8-second sentence contains no frame
// point, but integer-tick padding can reach the final in-bounds frame point.
const sparseSpan = { ...context.spans[0]!, start_pts: 990n, end_pts: 360000n, timescale: 30000n,
  observations: [990n, 180169n, 359348n].map((point, index) => ({ evidence_id: `sparse-${index}`, kind: "visual" as const, start_pts: point, end_pts: point + 1001n, timescale: 30000n, text: "Actual sparse frame", uncertain: false })) };
const sparseTranscript = { evidence_id: "sparse-quote", kind: "transcript" as const, start_pts: 259n, end_pts: 343n, timescale: 30n, text: "complete source sentence", uncertain: false };
const sparseEvidence = { ...sparseSpan, observations: [...sparseSpan.observations, sparseTranscript] };
const sparse = creationVerbatimCaptionContext([{ compile: sparseEvidence, context: {} }], base.sequence!.timebase!)[0]!;
assert.equal(sparse.duration_ticks, "84");
assert.deepEqual(sparse.exact_embedded_anchor_options.map(option => option.padding_ticks), [{ before: "0", after: "17" }, { before: "79", after: "0" }]);
assert.deepEqual(sparse.exact_embedded_anchor_options[0]!.source_window.end, time(12, 1));
assert.deepEqual(sparse.unavailable_anchor_candidates, [{ visual_evidence_id: "sparse-0", reason: "integer-padding-outside-editable-window" }]);
for (const option of sparse.exact_embedded_anchor_options) {
  const selected = structuredClone(phased); selected.shots[0].source = option.source_window;
  selected.captions[0] = { ...selected.captions[0], text: sparseTranscript.text, evidence_ids: [sparseTranscript.evidence_id], offset: option.caption_offset, duration: option.caption_duration };
  const executed = simulateCommands(base, compileCreationPlan(selected, base, { ...context, spans: [sparseEvidence] }));
  assert.equal(executed.tracks[0]!.clips[0]!.timeline_duration, BigInt(option.duration_ticks));
  assert.equal(executed.tracks[0]!.captions![0]!.timeline_duration, 84n);
  assert.equal(executed.tracks[0]!.captions![0]!.timeline_start, BigInt(option.padding_ticks.before));
}
const mismapped = structuredClone(phased); mismapped.shots[0].source.start = time(990, 30000); mismapped.shots[0].source.end = time(120990, 30000);
mismapped.captions[0] = { ...mismapped.captions[0], text: sparseTranscript.text, evidence_ids: [sparseTranscript.evidence_id], offset: time(0), duration: time(84) };
assert.throws(() => compileCreationPlan(mismapped, base, { ...context, spans: [sparseEvidence] }), /CREATION_CAPTION_QUOTE_UNSUPPORTED/, "actual invalid early-shot anchor cannot acquire a late source sentence");
const edgeFrame = { ...sparseSpan.observations[0]!, evidence_id: "exact-end", start_pts: 343n, end_pts: 344n, timescale: 30n };
const edge = creationVerbatimCaptionContext([{ compile: { ...sparseEvidence, observations: [edgeFrame, sparseTranscript] }, context: {} }], base.sequence!.timebase!)[0]!;
assert.equal(edge.exact_embedded_anchor_options[0]!.padding_ticks.after, "1", "right endpoint is exclusive: a frame exactly at transcript end requires a full tick of padding");
const commands = compileCreationPlan(plan, base, context);
const first = simulateCommands(base, commands);
const video = first.tracks.find(track => track.track_id === "video-main")!;
assert.deepEqual(video.clips.map(clip => clip.timeline_duration), [60n, 90n]);
assert.equal(video.captions![0].text, "actual words");
assert.equal(first.tracks.find(track => track.track_id === "audio-dialogue")!.clips[0].timeline_start, 30n);
assert.equal(first.tracks.find(track => track.track_id === "audio-dialogue")!.audio_routing![0].bus, "dialogue");
const revised = structuredClone(plan); revised.base_timeline_version = 1; revised.revision = 2;
revised.shots[0].source.end = time(45); revised.preserve_refs = ["reaction"];
revised.captions[0].text = "actual words in this source"; revised.captions[0].kind = "editorial"; revised.captions[0].audio_anchor = null;
const nextContext = { ...context, revision: 2, protected_refs: ["reaction"] };
const second = simulateCommands(first, compileCreationPlan(revised, first, nextContext));
const protectionIntent: CommandEditIntent = { intent_id: "fixture-protection", base_version: first.version, actor: { actor_id: "user", producer: "model" }, targets: [], commands: compileCreationPlan(revised, first, nextContext), semantic_refs: [], preconditions: [], protected_refs: ["clip:reaction"], provenance: { source_id: "fixture" }, reason: "verify hard protection", expected_effects: ["move"] };
assert.throws(() => resolveCommandEditIntent(protectionIntent, first), /EDIT_PROTECTED_REFERENCE:clip:reaction/);
assert.doesNotThrow(() => resolveCommandEditIntent({ ...protectionIntent, base_version: base.version, commands }, base), "a protected output can first be created; later changes remain denied");
const nextVideo = second.tracks.find(track => track.track_id === "video-main")!;
assert.equal(nextVideo.clips[1].timeline_start, 45n);
assert.deepEqual(nextVideo.clips[1].source, video.clips[1].source, "tightening opening keeps actual reaction content");
assert.equal(second.tracks.find(track => track.track_id === "audio-dialogue")!.clips[0].timeline_start, 15n, "linked audio follows the changed shot placement");
const forbidden = structuredClone(revised); forbidden.shots[1].source.end = time(179);
assert.throws(() => compileCreationPlan(forbidden, first, nextContext), /CREATION_PROTECTED_CONTENT_CHANGED:reaction/);
const fabricated = structuredClone(plan); fabricated.captions[0].text = "a fabricated quotation";
assert.throws(() => compileCreationPlan(fabricated, base, context), /CREATION_CAPTION_QUOTE_UNSUPPORTED:caption/);
const cropped = structuredClone(plan); cropped.shots[0].source.start = time(30);
assert.throws(() => compileCreationPlan(cropped, base, context), /CREATION_CAPTION_QUOTE_UNSUPPORTED:caption/, "a quote removed from audible source cannot remain verbatim");
assert.throws(() => compileCreationPlan(plan, base, { ...context, spans: context.spans.map(span => ({ ...span, observations: span.observations.filter(item => item.kind !== "visual") })) }), /CREATION_SOURCE_UNOBSERVED:.*:video/);
assert.throws(() => compileCreationPlan(plan, base, { ...context, spans: context.spans.map(span => ({ ...span, observations: span.observations.filter(item => item.kind === "visual") })) }), /CREATION_SOURCE_UNOBSERVED:.*:audio/);
const otherAsset = `asset:sha256:${"b".repeat(64)}` as any;
const crossContext: CreationCompileContext = { ...context, authorized_asset_ids: [asset, otherAsset], spans: [...context.spans, { ...context.spans[0]!, span_id: "other-sound", asset_id: otherAsset, has_video: false, observations: [{ evidence_id: "other-audio", kind: "audio", start_pts: 0n, end_pts: 240n, timescale: 30n, text: "Different source sound", uncertain: false }, { evidence_id: "other-quote", kind: "transcript", start_pts: 60n, end_pts: 90n, timescale: 30n, text: "Other source spoken words", uncertain: false }] }] };
const crossPlan = structuredClone(plan); crossPlan.audio[0].source.asset_id = otherAsset; crossPlan.audio[0].source.span_id = "other-sound";
crossPlan.captions = [{ caption_id: "j-caption", shot_id: "reaction", offset: time(-30), duration: time(30), text: "Other source spoken words", kind: "verbatim", evidence_ids: ["other-quote"], audio_anchor: { kind: "audio", id: "sound" } }];
const crossTimeline = simulateCommands(base, compileCreationPlan(crossPlan, base, crossContext));
assert.equal(crossTimeline.tracks.find(track => track.kind === "video")!.captions![0].timeline_start, 30n);
const crossRevision = structuredClone(crossPlan); crossRevision.base_timeline_version = 1; crossRevision.shots[0].source.end = time(45); crossRevision.preserve_refs = ["j-caption", "sound"];
const crossAfter = simulateCommands(crossTimeline, compileCreationPlan(crossRevision, crossTimeline, { ...crossContext, protected_refs: crossRevision.preserve_refs }));
assert.equal(crossAfter.tracks.find(track => track.kind === "video")!.captions![0].timeline_start, 15n, "preserved J-cut caption follows its actual independent audio anchor");
const wrongAnchor = structuredClone(crossPlan); wrongAnchor.captions[0].audio_anchor = { kind: "embedded", id: "reaction" };
assert.throws(() => compileCreationPlan(wrongAnchor, base, crossContext), /CREATION_CAPTION_QUOTE_UNSUPPORTED:j-caption/);
const wrongTiming = structuredClone(crossPlan); wrongTiming.captions[0].offset = time(-29);
assert.throws(() => compileCreationPlan(wrongTiming, base, crossContext), /CREATION_CAPTION_QUOTE_UNSUPPORTED:j-caption/);
const invalid = structuredClone(plan); invalid.shots[0].source.span_id = "unknown";
assert.throws(() => compileCreationPlan(invalid, base, context), /CREATION_SOURCE_DENIED:unknown/);
const inexact = structuredClone(plan); inexact.shots[0].source.end = time(1, 29);
assert.throws(() => compileCreationPlan(inexact, base, context), /CREATION_TIME_INEXACT/, "1/29 seconds is still not a whole 1/30 Timeline tick; a different source representation cannot repair it");
assert.throws(() => compileCreationPlan(plan, { ...base, sequence: undefined }, context), /CREATION_TIMEBASE_REQUIRED/);
assertCreationPlanV1(revised);
const samplePlan = structuredClone(plan);
samplePlan.audio[0].source = { asset_id: asset, span_id: "sample-audio", start: time(1, 48000), end: time(48001, 48000) };
samplePlan.audio[0].fade_in = time(1, 48000); samplePlan.audio[0].fade_out = time(0, 48000);
const sampleContext = { ...context, spans: [...context.spans, { ...context.spans[0]!, span_id: "sample-audio", start_pts: 0n, end_pts: 96000n, timescale: 48000n }] };
const sampleTimeline = simulateCommands(base, compileCreationPlan(samplePlan, base, sampleContext));
assert.equal(sampleTimeline.tracks.find(track => track.kind === "audio")!.clips[0].timeline_duration, 30n);
const reorderBase = structuredClone(first) as any;
reorderBase.tracks[0].captions.push({ ...reorderBase.tracks[0].captions[0], caption_id: "overlay", text: "second overlay" });
const reorder = createCommitPlan(reorderBase, [{ type: "set_track_properties", track_id: "video-main", properties: { captions: [...reorderBase.tracks[0].captions].reverse() } }]);
assert.deepEqual(reorder.plan.affected_ranges, [{ track_id: "video-main", start: 0n, end: 30n }], "caption paint-order changes must remain protected by range locks");
for (const grade of [{ lut_path: "C:/private/look.cube" }, { brightness: 0.1 }, { gamma: 1.1 }]) {
  const graded = structuredClone(first) as any;
  graded.tracks[0].clips[0].grade = { grade_id: "existing-look", ...grade };
  assert.throws(() => compileCreationPlan(revised, graded, nextContext), /CREATION_EXISTING_SEMANTICS_UNREPRESENTED:shot-1/, "unrelated requested edits must not discard an unrepresented existing look");
}
console.log("Stage3 declarative multi-shot/caption/audio compilation, linked timing, protected content and exact-source failures passed (fixtures only)");

// Native static composition is lossless through Plan -> IR -> Timeline and later
// audio/caption edits. Unrelated general transforms remain unsupported.
const geometryContext = { ...context, spans: context.spans.map(span => ({ ...span, video_geometry: { width: 96, height: 64 } })) };
const composed = structuredClone(plan); composed.shots[0].reframe = { mode: "static_transform", scale: 1.5, x: -24, y: -16 };
assertCreationPlanV1(composed);
const compositionTimeline = simulateCommands(base, compileCreationPlan(composed, base, geometryContext));
const composedClip = compositionTimeline.tracks[0]!.clips[0]!;
assert.deepEqual(composedClip.transform, { scale_x: 1.5, scale_y: 1.5, x: -24, y: -16 });
assert.deepEqual(composedClip.source, first.tracks[0]!.clips[0]!.source);
assert.equal(composedClip.gain_db, first.tracks[0]!.clips[0]!.gain_db);
assert.deepEqual(compositionTimeline.tracks[0]!.captions, first.tracks[0]!.captions);
const projected = (creationTimelineContext(compositionTimeline) as any).tracks[0].clips[0];
assert.deepEqual(projected.reframe, composed.shots[0].reframe); assert.equal(projected.unsupported_semantics, false);
const audioOnly = structuredClone(composed); audioOnly.base_timeline_version = compositionTimeline.version; audioOnly.shots[0].embedded_gain_db = -9;
const audioChanged = simulateCommands(compositionTimeline, compileCreationPlan(audioOnly, compositionTimeline, geometryContext));
assert.deepEqual(audioChanged.tracks[0]!.clips[0]!.transform, composedClip.transform);
const protectedComposition = { ...geometryContext, protected_refs: [composedClip.clip_id] };
audioOnly.preserve_refs = [composedClip.clip_id];
assert.throws(() => compileCreationPlan(audioOnly, compositionTimeline, protectedComposition), /CREATION_PROTECTED_CONTENT_CHANGED/);
for (const reframe of [{ mode: "static_transform" as const, scale: 1.5, x: -49, y: -16 }, { mode: "static_transform" as const, scale: 1, x: -1, y: 0 }, { mode: "static_transform" as const, scale: 1.5, x: -24.5, y: -16 }, { mode: "static_transform" as const, scale: 1.2, x: -19, y: -12 }]) {
  const bad = structuredClone(composed); bad.shots[0].reframe = reframe;
  assert.throws(() => compileCreationPlan(bad, base, geometryContext), /CREATION_TRANSFORM_BOUNDS_INVALID/);
}
assert.throws(() => compileCreationPlan(composed, base, context), /CREATION_TRANSFORM_GEOMETRY_REQUIRED/);
const missingPosition = structuredClone(composed); delete (missingPosition.shots[0].reframe as any).x;
assert.throws(() => assertCreationPlanV1(missingPosition), /invalid|schema|CreationPlan/i);

// Layout version is persisted semantic state, not a new interpretation of old drafts.
const laidOut = simulateCommands(base, compileCreationPlan(plan, base, { ...context, caption_layout_version: 1 }));
assert.deepEqual(laidOut.tracks[0]!.captions![0].style, { layout_version: 1 });
assert.equal(first.tracks[0]!.captions![0].style, undefined);
const protectedCaption = structuredClone(plan); protectedCaption.base_timeline_version = first.version; protectedCaption.preserve_refs = ["caption"];
const preservedCaption = simulateCommands(first, compileCreationPlan(protectedCaption, first, { ...context, caption_layout_version: 1, protected_refs: ["caption"] }));
assert.deepEqual(preservedCaption.tracks[0]!.captions, first.tracks[0]!.captions, "protected legacy captions must not acquire new style");
assert.throws(() => compileCreationPlan(plan, base, { ...context, caption_layout_version: 2 as any }), /CAPTION_LAYOUT_VERSION_UNSUPPORTED/);

const layoutSources = new Map(context.authorized_asset_ids.map(assetId => [assetId, { asset_ref: assetId, original_ref: "/fixture.mp4", source_timescale: 30n }]));
const layoutGraph = buildTimelineRenderGraph(laidOut, layoutSources, "preview");
assert.equal(layoutGraph.nodes.find(node => node.kind === "caption")!.parameters!.layout_version, 1);
const legacyGraph = buildTimelineRenderGraph(first, layoutSources, "preview");
assert.equal(legacyGraph.nodes.find(node => node.kind === "caption")!.parameters!.layout_version, undefined);
assert.notDeepEqual(layoutGraph.nodes, legacyGraph.nodes, "versioned layout participates in actual graph and plan/cache input");
