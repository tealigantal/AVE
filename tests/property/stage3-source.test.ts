import { resolveRejectedCreationPlanningFinal as readHistoricalPlanningFinal } from "../../packages/platform/contract-runtime/src/public.js";
import { compileCreationPlan } from "../../packages/core/edit-ir/src/public.js";
import { simulateCommands } from "../../packages/core/timeline-core/src/public.js";
import { createHash } from "node:crypto";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { creationWeightedAnchorContext, creationTemporalFrameIndices, creationObservationNeedsTemporalCoverage, CREATION_TEMPORAL_SAMPLING_POLICY, creationCapacityContext, creationGenerationFailureContext, creationMediaFacts, resolveCreationObservation, bindCreationDecision, assertCreationDecisionSourceWindows, assertCreationDecisionRenderCapabilities, creationOutputSchema, creationTimelineContext, resolveCreationDurationTarget, resolveBoundCreationDurationTarget, assertCreationDurationTarget, creationSourceAvailabilityContext, creationEditGridContext, creationVerbatimCaptionContext, creationDurationBudgetContext } from "../../packages/platform/project-host/src/stage3-creative.js";
import { creationDecisionSchema, CREATION_PLANNING_PROTOCOL, creationPlanningMeasurementReceipt, buildCreationSourceChoiceCatalog, creationDigest, deriveCreationPlanningInput, measureCreationSelection } from "../../packages/platform/contract-runtime/src/public.js";
import { beginCreation, startCreationRun } from "../../packages/platform/project-host/src/stage3-request.js";

const grid = { value: 1n, timescale: 30n };
const asset = `asset:sha256:${"a".repeat(64)}`, ref = { run_id: "observation", digest: "f".repeat(64) };
const probe = { streams: [{ index: 2, codec_type: "video", time_base: "2/60", start_pts: 30, duration_ts: 90, width: 64, height: 64 }, { index: 5, codec_type: "audio", time_base: "1/48000", start_pts: 48000, duration_ts: 144000 }],
  timing: { streams: { "2": { time_base: "2/60", duration_ts: 90, frame_pts: [30, 31, 34], vfr: true }, "5": { time_base: "1/48000", duration_ts: 144000, packet_pts: [48000] } } } };
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const row = { object_hash: ref.digest, value: { project_id: "project", ticket: { run_id: ref.run_id, request_id: "request" }, spans: [{ span_id: "span-1", asset_id: asset, start: time(30), end: time(120) }], samples: [{ span_id: "span-1", asset_id: asset, sample: { sample_id: "frame-1", detail: { kind: "frame" }, actual_start: time(30), actual_end: time(31) } }] }, output: { samples: [{ sample_id: "frame-1", description: "observed scene", uncertain: false, transcript: [] }] } };
const resolveObservation = (value: unknown, _reference: typeof ref, project: string, assets: readonly string[], media: ReturnType<typeof creationMediaFacts>) => resolveCreationObservation(value, _reference, project, "request", assets, new Map([[asset, media]]))[0]!;
const code = (expected: string) => (error: any) => error.code === expected;
const facts = creationMediaFacts(probe), resolved = resolveObservation(row, ref, "project", [asset], facts);
assert.equal(resolved.compile.end_pts, 120n); assert.equal(resolved.compile.observations.length, 1); assert.equal(resolved.compile.observations[0]!.end_pts, 31n); assert.equal(resolved.compile.has_audio, true);
const projectedSample = (resolved.context as any).observations[0];
assert.deepEqual(projectedSample, { kind: "visual", evidence_id: resolved.compile.observations[0]!.evidence_id, sample_at: { schema_version: 1, value: 1, timescale: 1 }, description: "observed scene", uncertain: false });
for (const field of ["start", "end", "start_pts", "end_pts", "timescale", "source_window"]) assert.equal(Object.hasOwn(projectedSample, field), false, "visual point evidence cannot resemble an editable interval");
const availableWindow = creationEditGridContext([resolved], grid)[0]!;
assert.deepEqual(availableWindow.source_window, { span_id: "span-1", asset_id: asset, start: time(30), end: time(120) });
assert.equal(availableWindow.maximum_duration_ticks, "90", "whole editable window capacity is independent of its one-frame sample");
assert.deepEqual(availableWindow.millisecond_source_window, { span_id: "span-1", asset_id: asset, start: { schema_version: 1, value: 1000, timescale: 1000 }, end: { schema_version: 1, value: 4000, timescale: 1000 } });
const fractionalClock = { ...resolved, compile: { ...resolved.compile, start_pts: 1n, end_pts: 31499468n, timescale: 240000n }, context: { ...(resolved.context as any), editable_start: { schema_version: 1, value: 1, timescale: 240000 }, editable_end: { schema_version: 1, value: 31499468, timescale: 240000 } } };
const fractionalGrid = creationEditGridContext([fractionalClock], grid)[0]!;
assert.deepEqual(fractionalGrid.millisecond_source_window?.start, { schema_version: 1, value: 1, timescale: 1000 }, "optional millisecond range rounds start inward, never before source");
assert.deepEqual(fractionalGrid.millisecond_source_window?.end, { schema_version: 1, value: 131247, timescale: 1000 }, "optional millisecond range rounds end inward, never extending source");
assert.deepEqual(fractionalGrid.source_window.end, fractionalClock.context.editable_end, "authoritative source endpoint is unchanged");
assert.equal(creationEditGridContext([{ ...fractionalClock, compile: { ...fractionalClock.compile, end_pts: 2n } }], grid)[0]!.millisecond_source_window, null, "sub-millisecond intervals retain original precision without inventing a coarse window");
const withAudio = structuredClone(row);
withAudio.value.samples.push({ span_id: "span-1", asset_id: asset, sample: { sample_id: "sound-1", detail: { kind: "audio" }, actual_start: time(30), actual_end: time(90) } });
(withAudio.output.samples as any[]).push({ sample_id: "sound-1", description: "source sound", uncertain: true, transcript: [{ start: time(45), end: time(75), text: "exact words", uncertain: false }] });
const audioProjection = resolveObservation(withAudio, ref, "project", [asset], facts);
assert.deepEqual((audioProjection.context as any).observations.slice(1), audioProjection.compile.observations.slice(1).map(item => ({ ...item, start_pts: String(item.start_pts), end_pts: String(item.end_pts), timescale: String(item.timescale) })), "audio and transcript retain full exact evidence intervals");
assert.equal(facts.video!.start, 30n); assert.equal(facts.video!.end, 120n); assert.equal(facts.video!.numerator, 2n);
const wav = { streams: [{ index: 0, codec_type: "audio", time_base: "1/48000", duration_ts: 4800, sample_rate: "48000" }], timing: { streams: { "0": { time_base: "1/48000", duration_ts: 4800, frame_pts: [2400, 4800], decoded_audio_bounds: { method: "decoded-contiguous-samples-v1", start_pts: 2400, end_pts: 7200, frame_count: 2, sample_count: 4800, sample_rate: 48000 } } } } };
assert.equal(creationMediaFacts(wav).audio!.start, 2400n, "missing container start uses certified decoded PTS, never zero");
assert.throws(() => creationMediaFacts({ ...wav, timing: { streams: { "0": { ...wav.timing.streams["0"], decoded_audio_bounds: null } } } }), code("CREATION_MEDIA_BOUNDS_REQUIRED"));
assert.throws(() => creationMediaFacts({ ...wav, timing: { streams: { "0": { ...wav.timing.streams["0"], decoded_audio_bounds: { ...wav.timing.streams["0"].decoded_audio_bounds, end_pts: 7201 } } } } }), code("CREATION_MEDIA_BOUNDS_REQUIRED"));
assert.throws(() => resolveObservation({ ...row, value: { ...row.value, spans: [{ ...row.value.spans[0], start: time(1), end: time(2) }] } }, ref, "project", [asset], facts), code("CREATION_OBSERVATION_OUTSIDE_MEDIA"));
assert.throws(() => resolveObservation({ ...row, value: { ...row.value, spans: [{ ...row.value.spans[0], start: time(241), end: time(242) }] } }, ref, "project", [asset], facts), code("CREATION_OBSERVATION_OUTSIDE_MEDIA"));
const containerProbe = structuredClone(probe) as any;
containerProbe.streams = [{ ...containerProbe.streams[0], time_base: "1/90000", start_pts: 0, duration_ts: 7993609 }];
containerProbe.timing.streams = { "2": { time_base: "1/90000", duration_ts: 7993609, frame_pts: [0, 7989857], vfr: true } };
const containerRow = structuredClone(row);
containerRow.value.spans[0]!.start = { schema_version: 1, value: 0, timescale: 90000 };
containerRow.value.spans[0]!.end = { schema_version: 1, value: 7993610, timescale: 90000 };
const containerIntersection = resolveObservation(containerRow, ref, "project", [asset], creationMediaFacts(containerProbe));
assert.equal(containerIntersection.compile.end_pts, 7993609n);
assert.equal((containerIntersection.context as any).source_coverage.restriction, "video-container-intersection");
assert.equal(containerRow.value.spans[0]!.end.value, 7993610, "full decoded/stts observation stays unchanged despite header intersection");
const containerDecision = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
containerDecision.shots[0].source_window = { span_id: "span-1", asset_id: asset, start: containerRow.value.spans[0]!.start, end: containerRow.value.spans[0]!.end };
assert.throws(() => assertCreationDecisionSourceWindows(containerDecision, [containerIntersection]), code("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA"), "full decoded tail cannot authorize selection past the exact editable container boundary");
containerDecision.shots[0].source_window.end = (containerIntersection.context as any).editable_end;
assert.doesNotThrow(() => assertCreationDecisionSourceWindows(containerDecision, [containerIntersection]));
assert.throws(() => resolveObservation({ ...row, value: { ...row.value, project_id: "other" } }, ref, "project", [asset], facts), code("CREATION_OBSERVATION_STALE"));
assert.throws(() => resolveObservation({ ...row, value: { ...row.value, spans: [{ ...row.value.spans[0], start: { ...time(30), timescale: 0 } }] } }, ref, "project", [asset], facts), code("CREATION_OBSERVATION_TIME_INVALID"));
assert.throws(() => resolveObservation(row, ref, "project", [], facts), code("CREATION_SOURCE_DENIED"));
assert.throws(() => creationMediaFacts({ ...probe, streams: [...probe.streams, { ...probe.streams[1], index: 6 }] }), code("CREATION_STREAM_AMBIGUOUS"));
const noDuration = structuredClone(probe) as any; delete noDuration.streams[0].duration_ts;
assert.throws(() => creationMediaFacts(noDuration), code("CREATION_MEDIA_BOUNDS_REQUIRED"));
const rounded = structuredClone(probe) as any; rounded.streams[0].start_pts = Number.MAX_SAFE_INTEGER + 1;
assert.throws(() => creationMediaFacts(rounded), code("CREATION_MEDIA_BOUNDS_REQUIRED"));
const shortAudio = structuredClone(probe) as any; shortAudio.streams[1].duration_ts = 48000; shortAudio.timing.streams["5"].duration_ts = 48000;
const audioIntersection = resolveObservation(row, ref, "project", [asset], creationMediaFacts(shortAudio));
assert.deepEqual((audioIntersection.context as any).editable_end, { schema_version: 1, value: 2, timescale: 1 });
assert.deepEqual((audioIntersection.context as any).source_coverage, { restriction: "embedded-audio-intersection" }, "model receives no competing original-video or audio bounds");
assert.deepEqual(row.value.spans[0]!.end, time(120), "original observation receipt remains intact");
assert.equal((audioIntersection.context as any).source_coverage.restriction, "embedded-audio-intersection");
const disjointAudio = structuredClone(shortAudio); disjointAudio.streams[1].start_pts = 192000;
assert.throws(() => resolveObservation(row, ref, "project", [asset], creationMediaFacts(disjointAudio)), code("CREATION_EMBEDDED_AUDIO_RANGE_INVALID"));
const partialDecision = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
partialDecision.shots[0].source_window = { span_id: "span-1", asset_id: asset, start: time(30), end: time(60) };
assert.doesNotThrow(() => assertCreationDecisionSourceWindows(partialDecision, [audioIntersection]));
partialDecision.shots[0].source_window.end = time(120);
assert.throws(() => assertCreationDecisionSourceWindows(partialDecision, [audioIntersection]), code("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA"), "original video coverage does not authorize missing embedded audio");
const cProbe = structuredClone(probe) as any;
Object.assign(cProbe.streams[0], { start_pts: 990, duration_ts: 359359, time_base: "1/30000" });
Object.assign(cProbe.timing.streams["2"], { duration_ts: 359359, time_base: "1/30000" });
Object.assign(cProbe.streams[1], { start_pts: 0, duration_ts: 529200, time_base: "1/44100" });
Object.assign(cProbe.timing.streams["5"], { duration_ts: 529200, time_base: "1/44100" });
const cRow = structuredClone(row); cRow.value.spans[0]!.start = { schema_version: 1, value: 990, timescale: 30000 }; cRow.value.spans[0]!.end = { schema_version: 1, value: 360349, timescale: 30000 };
const cEvidence = resolveObservation(cRow, ref, "project", [asset], creationMediaFacts(cProbe));
assert.deepEqual((cEvidence.context as any).editable_end, { schema_version: 1, value: 12, timescale: 1 });
assert.equal(JSON.stringify(cEvidence.context).includes("360349"), false, "C01 raw overhanging video end is absent from generation context");
assert.deepEqual(creationEditGridContext([cEvidence], grid)[0]!.source_window.end, { schema_version: 1, value: 12, timescale: 1 });
partialDecision.shots[0].source_window = { span_id: "span-1", asset_id: asset, start: { schema_version: 1, value: 180169, timescale: 30000 }, end: cRow.value.spans[0]!.end };
assert.throws(() => assertCreationDecisionSourceWindows(partialDecision, [cEvidence]), code("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA"), "actual rejected C endpoint stays invalid; projection never repairs output");
partialDecision.shots[0].source_window = { span_id: "span-1", asset_id: asset, start: cRow.value.spans[0]!.start, end: { schema_version: 1, value: 240990, timescale: 30000 } };
assert.doesNotThrow(() => assertCreationDecisionSourceWindows(partialDecision, [cEvidence]), "actual C01 stream timing permits an eight-second audiovisual selection");
const tagged = structuredClone(probe) as any;
Object.assign(tagged.streams[0], { color_primaries: "bt709", color_transfer: "bt709", color_space: "bt709", color_range: "tv", pix_fmt: "yuv420p" });
const colorEvidence = resolveObservation(row, ref, "project", [asset], creationMediaFacts(tagged));
assert.equal(colorEvidence.compile.color_context?.bit_depth, 8);
assert.equal((creationOutputSchema([resolved], [], grid) as any).properties.shots.items.properties.color.type, "null");
assert.deepEqual((creationOutputSchema([colorEvidence], [], grid) as any).properties.shots.items.allOf[0].if.properties.source_window.properties.span_id.enum, ["span-1"]);
for (const changed of [{ pix_fmt: "yuv420p10le" }, { color_range: "pc" }, { color_transfer: "smpte2084" }]) {
  const unsupported = structuredClone(tagged); Object.assign(unsupported.streams[0], changed);
  assert.equal(creationMediaFacts(unsupported).color_context, null, "do not invite model edits the render route cannot execute");
}
assert.deepEqual((creationOutputSchema([resolved], [], grid) as any).properties.shots.items.properties.reframe.anyOf.map((item: any) => item.properties?.mode?.const ?? item.type), ["static_transform", "null"]);
assert.deepEqual({ ...((resolved.context as any).render_capabilities), static_transform: undefined }, { static_transform: undefined, native_canvas: { width: 64, height: 64 }, static_reframe_modes: [], unavailable_reason: "STATIC_REFRAME_9_16_PROFILE_REQUIRED" });
const portraitProbe = structuredClone(probe); portraitProbe.streams[0]!.width = 108; portraitProbe.streams[0]!.height = 192;
const portrait = resolveObservation(row, ref, "project", [asset], creationMediaFacts(portraitProbe));
const crop = structuredClone(partialDecision); crop.shots[0].source_window = { span_id: "span-1", asset_id: asset, start: time(30), end: time(60) }; crop.shots[0].reframe = { mode: "crop_fill", focal_x: 0.5, focal_y: 0.8 };
assert.throws(() => assertCreationDecisionRenderCapabilities(crop, [resolved]), code("CREATION_REFRAME_UNSUPPORTED"));
assert.doesNotThrow(() => assertCreationDecisionRenderCapabilities(crop, [portrait]));
assert.deepEqual((portrait.context as any).render_capabilities.static_reframe_modes, ["crop_fill", "contain", "blurred_background"]);
assert.notEqual((creationOutputSchema([portrait], [], grid) as any).properties.shots.items.properties.reframe.type, "null", "existing native portrait capability remains available");
const privatePath = "C:/private/creator/look.cube";
const privateClip = { clip_id: "clip", source: { asset_id: asset, start_pts: 0n, end_pts: 30n, timescale: 30n }, timeline_start: 0n, timeline_duration: 30n, grade: { grade_id: "grade", lut_path: privatePath }, semantic_sidecar: { semantic_id: "clip", metadata: { privatePath } } };
const projected: any = creationTimelineContext({ version: 1, sequence: { sequence_id: "sequence", timebase: { value: 1n, timescale: 30n }, tracks: [{ clips: [privateClip] }] }, tracks: [{ track_id: "video", kind: "video", clips: [privateClip] }] } as any);
assert.equal(JSON.stringify(projected).includes(privatePath), false);
assert.equal(projected.sequence.tracks, undefined); assert.equal(projected.tracks[0].clips[0].unsupported_semantics, true);
const plan = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-plan.v1.json", "utf8"));
const nativeZoom = structuredClone(crop); nativeZoom.shots[0].reframe = { mode: "static_transform", scale: 1.5, x: -16, y: -16 };
assert.doesNotThrow(() => assertCreationDecisionRenderCapabilities(nativeZoom, [resolved]));
nativeZoom.shots[0].reframe.x = -34;
assert.throws(() => assertCreationDecisionRenderCapabilities(nativeZoom, [resolved]), /CREATION_TRANSFORM_BOUNDS_INVALID/);

const decision = { decision_version: 1, target_duration_ticks: 60, thesis: "Source-supported action.", shots: [{ shot_id: "shot-1", source_window: { asset_id: asset, span_id: "evidence-1", start: time(0), end: time(60) }, timing: { kind: "exact" }, purpose: "Show complete action.", embedded_gain_db: 0, reframe: null, color: null }], audio: [], captions: [], preserve_refs: [], applied_principle_ids: [], feedback_interpretation: "Initial request.", change_summary: "Create a first draft." };
const authorization = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
const ticket = startCreationRun(beginCreation(authorization, 0, "2026-09-23T00:00:00Z"), "run", 0, "b".repeat(64), null, "2026-09-23T00:00:00Z").active_run!;
assert.equal(bindCreationDecision(decision, ticket, grid, null).input_digest, ticket.input_digest);
assert.throws(() => bindCreationDecision(plan, ticket, grid, null), code("CREATION_DECISION_FIELDS_INVALID"));
assert.equal(Object.hasOwn(creationDecisionSchema.properties, "input_digest"), false);
assert.equal(JSON.stringify(creationDecisionSchema).includes("https://ai-vlog.local/contracts/common/rational-time"), false, "model receives a self-contained schema without unavailable external refs");

assert.equal((creationOutputSchema([resolved], [], grid) as any).properties.applied_principle_ids.maxItems, 0);
assert.deepEqual((creationOutputSchema([resolved], ["consented-principle"], grid) as any).properties.applied_principle_ids.items.enum, ["consented-principle"]);
assert.equal((creationOutputSchema([resolved], ["consented-principle"], grid) as any).properties.applied_principle_ids.maxItems, undefined);

const narrowed = creationOutputSchema([resolved], [], grid) as any;
assert.equal(narrowed.properties.shots.items.properties.source_window.allOf[0].$ref, "#/$defs/creationVideoSourceBounds");
assert.equal(narrowed.$defs.creationVideoSourceBounds.anyOf[0].properties.span_id.const, resolved.compile.span_id);
assert.equal(narrowed.properties.captions.items.allOf[0].then, false, "no verified transcript must not invite a verbatim quotation");
const require = createRequire(import.meta.url), Ajv = require("ajv/dist/2020.js").default;
const ajv = new Ajv({ strict: false }); require("ajv-formats")(ajv);
const validate = ajv.compile(narrowed), candidate = structuredClone(decision);candidate.target_duration_ticks=30;
candidate.shots[0].source_window = { asset_id: asset, span_id: resolved.compile.span_id, start: time(30), end: time(60) };
assert.equal(validate(candidate), true, JSON.stringify(validate.errors));
const millisecondCandidate = structuredClone(candidate);
millisecondCandidate.shots[0]!.source_window = { ...candidate.shots[0]!.source_window, start: { schema_version: 1, value: 1000, timescale: 1000 }, end: { schema_version: 1, value: 2000, timescale: 1000 } };
assert.equal(validate(millisecondCandidate), true, JSON.stringify(validate.errors));
assert.doesNotThrow(() => assertCreationDecisionSourceWindows(millisecondCandidate, [resolved]));
millisecondCandidate.shots[0]!.source_window.start.value = 180000;
millisecondCandidate.shots[0]!.source_window.end.value = 204000;
assert.equal(ajv.compile(creationOutputSchema([fractionalClock], [], grid))(millisecondCandidate), false, "the observed D-style 180-second invented window is explicitly outside millisecond schema bounds");
assert.throws(() => assertCreationDecisionSourceWindows(millisecondCandidate, [fractionalClock]), code("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA"), "more legible model context never repairs or admits an out-of-range candidate");
const cropCandidate = structuredClone(candidate); cropCandidate.shots[0]!.reframe = { mode: "crop_fill", focal_x: 0.5, focal_y: 0.8 } as any;
assert.equal(validate(cropCandidate), false, "native nonportrait schema excludes static reframe before dispatch");
const zoomCandidate = structuredClone(candidate); zoomCandidate.shots[0]!.reframe = { mode: "static_transform", scale: 1.5, x: -16, y: -16 } as any;
assert.equal(validate(zoomCandidate), true, JSON.stringify(validate.errors));
const oddPixel = structuredClone(zoomCandidate); (oddPixel.shots[0]!.reframe as any).x = -15;
assert.equal(validate(oddPixel), false, "existing overlay chroma grid must not silently round placement");
assert.equal(ajv.compile(creationOutputSchema([portrait], [], grid))(cropCandidate), true, "native portrait schema retains the existing executable reframe route");

assert.doesNotThrow(() => assertCreationDecisionSourceWindows(candidate, [resolved]));
const forgedWindow: any = structuredClone(candidate); forgedWindow.shots[0].timing = { kind: "weighted", weight: 1 }; forgedWindow.shots[0].source_window.end = time(300);
assert.throws(() => assertCreationDecisionSourceWindows(forgedWindow, [resolved]), code("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA"), "an out-of-range capacity is illegal even when allocation would produce a shorter in-bounds cut");

candidate.shots[0].source_window.start = { schema_version: 1, value: 1, timescale: 1 };
candidate.shots[0].source_window.end = { schema_version: 1, value: 2, timescale: 1 };
assert.equal(validate(candidate), true, "equivalent exact RationalTime units remain valid");
candidate.shots[0].source_window.start = time(30);
candidate.shots[0].source_window.end = time(121);
assert.equal(validate(candidate), false, "known-scale end beyond the selected span remains rejected");
const quoted = { ...resolved, compile: { ...resolved.compile, observations: [{ evidence_id: "quote-1", kind: "transcript" as const, start_pts: 30n, end_pts: 60n, timescale: 30n, text: " Exact source text", uncertain: false }] } };
const quoteOption = creationVerbatimCaptionContext([{ ...quoted, compile: { ...quoted.compile, observations: [...resolved.compile.observations, ...quoted.compile.observations] } }], grid)[0]!;
assert.equal(quoteOption.available, true); assert.equal(quoteOption.duration_ticks, "30");
const noVisualQuote = quoted;
assert.deepEqual(creationVerbatimCaptionContext([noVisualQuote], grid)[0]!.exact_embedded_anchor_options, [], "transcript timing alone does not invent visual coverage");
assert.deepEqual(quoteOption.exact_embedded_anchor_options[0], { source_window: { span_id: quoted.compile.span_id, asset_id: asset, start: { schema_version: 1, value: 1, timescale: 1 }, end: { schema_version: 1, value: 2, timescale: 1 } }, timing: { kind: "exact" }, caption_offset: { schema_version: 1, value: 0, timescale: 1 }, caption_duration: { schema_version: 1, value: 1, timescale: 1 }, padding_ticks: { before: "0", after: "0" }, duration_ticks: "30", visual_evidence_ids: [resolved.compile.observations[0]!.evidence_id] });
const quoteSchema: any = creationOutputSchema([quoted], [], grid);
assert.deepEqual(quoteSchema.properties.captions.items.allOf[0].then.anyOf[0].properties, { text: { const: " Exact source text" }, evidence_ids: { contains: { const: "quote-1" } } });
const offGrid = { ...quoted, compile: { ...quoted.compile, observations: [{ ...quoted.compile.observations[0]!, start_pts: 101n, end_pts: 201n, timescale: 100n }] } };
assert.notEqual((creationOutputSchema([offGrid], [], grid) as any).properties.captions.items.allOf[0].then, false, "source absolute phase is independent of the Timeline origin");
const unalignable = { ...offGrid, compile: { ...offGrid.compile, observations: [{ ...offGrid.compile.observations[0]!, end_pts: 202n }] } };
assert.equal((creationOutputSchema([unalignable], [], grid) as any).properties.captions.items.allOf[0].then, false, "inexact quotation duration cannot become a rounded caption");
assert.equal(creationVerbatimCaptionContext([unalignable], grid)[0]!.unavailable_reason, "duration-not-whole-timeline-ticks");
assert.deepEqual(creationVerbatimCaptionContext([unalignable], grid)[0]!.exact_embedded_anchor_options, []);
const uncertainQuote = { ...quoted, compile: { ...quoted.compile, observations: [{ ...quoted.compile.observations[0]!, uncertain: true }] } };
assert.equal(creationVerbatimCaptionContext([uncertainQuote], grid)[0]!.unavailable_reason, "uncertain-transcript");
const outsideQuote = { ...quoted, compile: { ...quoted.compile, observations: [{ ...quoted.compile.observations[0]!, end_pts: 121n }] } };
assert.equal(creationVerbatimCaptionContext([outsideQuote], grid)[0]!.unavailable_reason, "outside-editable-window");

candidate.shots[0].source_window.start = { schema_version: 1, value: 101, timescale: 100 };
candidate.shots[0].source_window.end = { schema_version: 1, value: 201, timescale: 100 };
assert.equal(ajv.compile(creationOutputSchema([offGrid], [], grid))(candidate), true);
const expanded = { ...resolved, compile: { ...resolved.compile, start_pts: 3000n, end_pts: 12000n, timescale: 3000n } };
assert.equal(ajv.compile(creationOutputSchema([expanded], [], grid))(candidate), true, "common denominator does not constrain equivalent source units");
const huge = { ...resolved, compile: { ...resolved.compile, end_pts: 10n ** 30n, timescale: 10n ** 20n } };
assert.doesNotThrow(() => ajv.compile(creationOutputSchema([huge], [], grid)), "unprojectable numeric bounds must not produce an invalid schema");
const durationTarget = (raw_text: string) => resolveCreationDurationTarget([{ revision: 1, raw_text }]);
const fraction = (value: string, timescale = "1") => ({ value, timescale });
const interruptText = "我改主意了，最终只做12秒，至少四个镜头，突出脚步和人物动作。这条插话覆盖刚才15秒要求，仍然只是本次要求。";
for (const text of [interruptText, "这条插话覆盖刚才15秒要求，最终只做12秒。", "把刚才15秒要求改成12秒", "最终只做12秒并覆盖刚才15秒要求", "之前要求15秒，现在最终只做12秒"]) {
  assert.deepEqual(durationTarget(text)?.minimum, fraction("12"), text);
  assert.deepEqual(durationTarget(text)?.maximum, fraction("12"), text);
  assert.equal(creationDurationBudgetContext(durationTarget(text), grid)?.exact_total_ticks, "360");
}
for (const text of ["最终恢复刚才15秒要求", "继续按之前15秒要求做", "沿用刚才15秒要求", "取消12秒要求，恢复之前15秒", "先做12秒，最终改成15秒"]) assert.deepEqual(durationTarget(text)?.minimum, fraction("15"), text);
for (const text of ["这条插话覆盖刚才15秒要求", "刚才要求15秒", "之前做15秒", "不必改成15秒", "取消15秒要求"]) assert.equal(durationTarget(text), null, text);
for (const text of ["不要把15秒改成12秒", "不用将15秒改为12秒", "字幕显示15秒改成12秒", "这个镜头15秒改成12秒"]) assert.equal(durationTarget(text), null, "replacement segmentation cannot erase negation or a local subject: " + text);
assert.deepEqual(resolveCreationDurationTarget([{ revision: 3, raw_text: "先改成15秒" }, { revision: 4, raw_text: interruptText }])?.maximum, fraction("12"));
assert.equal(creationDurationBudgetContext(durationTarget("成片24秒"), grid)?.exact_total_ticks, "720");
const boundedTicks = creationDurationBudgetContext(durationTarget("成片0.04至0.09秒"), grid)!;
assert.equal(boundedTicks.minimum_total_ticks, "2"); assert.equal(boundedTicks.maximum_total_ticks, "2");
assert.throws(() => creationDurationBudgetContext(durationTarget("成片0.04秒"), grid), code("CREATION_DURATION_TARGET_INEXACT"));
assert.equal(creationDurationBudgetContext(null, grid), null);
assert.throws(() => creationDurationBudgetContext(durationTarget("成片24秒"), { value: 1001n, timescale: 30000n }), code("CREATION_DURATION_TARGET_INEXACT"));
for (const text of ["做一个20-30秒的视频", "剪成20至30秒", "总时长20到30秒", "Make a 20 to 30 second video", "video between 20 and 30 seconds"]) {
  assert.deepEqual(durationTarget(text)?.minimum, fraction("20"), text);
  assert.deepEqual(durationTarget(text)?.maximum, fraction("30"), text);
}
for (const text of ["改到25秒", "总时长精确25秒", "video exactly 25 seconds", "做一个25秒的日常观察短片"]) {
  assert.deepEqual(durationTarget(text)?.minimum, fraction("25"), text);
  assert.deepEqual(durationTarget(text)?.maximum, fraction("25"), text);
}
assert.deepEqual(durationTarget("总时长至少20秒")?.minimum, fraction("20"));
assert.equal(durationTarget("总时长至少20秒")?.maximum, null);
assert.equal(durationTarget("全片不超过1.5分钟")?.minimum, null);
assert.deepEqual(durationTarget("全片不超过1.5分钟")?.maximum, fraction("90"));
assert.deepEqual(durationTarget("video at least 0.25 minutes")?.minimum, fraction("15"));
assert.deepEqual(durationTarget("video no more than 1.1 seconds")?.maximum, fraction("11", "10"));
assert.deepEqual(durationTarget("成片1分钟到90秒")?.minimum, fraction("60"));
assert.deepEqual(durationTarget("成片1分钟到90秒")?.maximum, fraction("90"));
const combined = durationTarget("全片至少20秒，不超过30秒");
assert.deepEqual(combined?.minimum, fraction("20")); assert.deepEqual(combined?.maximum, fraction("30"));
for (const text of ["字幕显示2秒", "开头两镜头各2秒", "把全片开头的字幕改为2秒", "素材20至30秒用在片子里", "source 20 to 30 seconds for this video", "video intro 2 seconds", "做个大概20秒的视频", "视频20秒左右", "再长一点", "保持原时长", "第20秒的视频", "全片不是20秒", "video not exactly 20 seconds", "全片增加20秒", "video under 20 seconds", "-20秒的视频", "全片超过20秒"]) assert.equal(durationTarget(text), null, text);
for (const text of ["全片30到20秒", "全片0秒", "全片至少30秒，不超过20秒"]) assert.throws(() => durationTarget(text), code("CREATION_DURATION_TARGET_INVALID"), text);
const revisions = [{ revision: 1, raw_text: "做一个20-30秒的视频" }, { revision: 2, raw_text: "再长一点，字幕显示2秒" }];
assert.equal(resolveCreationDurationTarget(revisions)?.revision, 1);
const overridden = resolveCreationDurationTarget([...revisions, { revision: 3, raw_text: "改到25秒" }]);
assert.equal(overridden?.revision, 3); assert.equal(overridden?.raw_text, "改到25秒"); assert.deepEqual(overridden?.maximum, fraction("25"));
const durationTimeline = (ticks: bigint) => ({ version: 1, sequence: { sequence_id: "sequence", timebase: grid, tracks: [] }, tracks: [{ track_id: "video-main", kind: "video", clips: [{ ...privateClip, timeline_duration: ticks }] }] } as any);
assert.doesNotThrow(() => assertCreationDurationTarget(durationTimeline(600n), combined));
assert.doesNotThrow(() => assertCreationDurationTarget(durationTimeline(900n), combined));
assert.throws(() => assertCreationDurationTarget(durationTimeline(599n), combined), error => code("CREATION_DURATION_TARGET_UNMET")(error) && (error as Error).message.includes("599/30"));
assert.throws(() => assertCreationDurationTarget(durationTimeline(901n), combined), code("CREATION_DURATION_TARGET_UNMET"));
assert.doesNotThrow(() => assertCreationDurationTarget(durationTimeline(33n), durationTarget("全片1.1秒")));
const fractionalTicks = durationTimeline(33n); fractionalTicks.sequence.timebase = { value: 2n, timescale: 60n };
assert.doesNotThrow(() => assertCreationDurationTarget(fractionalTicks, durationTarget("全片1.1秒")));
const activeOnly = durationTimeline(750n);
activeOnly.tracks.push({ track_id: "reference", kind: "video", enabled: false, clips: [{ ...privateClip, timeline_duration: 9000n }] }, { track_id: "muted", kind: "audio", muted: true, clips: [{ ...privateClip, timeline_duration: 9000n }] });
assert.doesNotThrow(() => assertCreationDurationTarget(activeOnly, overridden));
activeOnly.tracks[0].solo = true; activeOnly.tracks[1].enabled = true;
assert.doesNotThrow(() => assertCreationDurationTarget(activeOnly, overridden));
const gap = durationTimeline(600n); gap.tracks[0].gaps = [{ gap_id: "end", timeline_start: 600n, timeline_duration: 150n }];
assert.doesNotThrow(() => assertCreationDurationTarget(gap, overridden));
assert.deepEqual((creationTimelineContext(gap) as any).duration_summary, { output_duration: fraction("25"), selected_video_duration: fraction("20") });
const overlap = { ...resolved, compile: { ...resolved.compile, span_id: "overlap", start_pts: 60n, end_pts: 150n } };
const otherAsset = { ...resolved, compile: { ...resolved.compile, span_id: "other", asset_id: "other" as typeof resolved.compile.asset_id } };
const available = creationSourceAvailabilityContext([resolved, overlap, otherAsset]);
assert.deepEqual(available.assets[0]!.intervals, [{ start: fraction("1"), end: fraction("5") }]);
assert.deepEqual(available.total_unique_video_duration, fraction("7"));
assert.deepEqual((resolved.context as any).editable_duration, fraction("3"));
console.log("Stage3 actual stream bounds and evidence-bound generation schema passed");

for (const raw_text of ["用这份素材做一个24秒的徒步小故事", "把这些原片剪成24秒", "改成24秒", "总时长24秒，至少四个镜头"]) {
  assert.deepEqual(resolveCreationDurationTarget([{ raw_text, revision: 1 }])?.minimum, { value: "24", timescale: "1" });
}
for (const raw_text of ["全片开头字幕24秒", "每个镜头剪成24秒", "源片24秒", "素材从0到24秒"]) assert.equal(resolveCreationDurationTarget([{ raw_text, revision: 1 }]), null);

const oldDuration = [{ revision: 1, raw_text: "全片24秒" }];
for (const raw_text of ["只修改字幕", "仅调整音量", "保护镜头，保持当前总时长不变", "总时长不变", "only edit the subtitles", "keep the current duration"]) {
  const bound = resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text }], durationTimeline(360n));
  assert.deepEqual(bound?.minimum, fraction("12"), raw_text); assert.deepEqual(bound?.maximum, fraction("12")); assert.equal(bound?.revision, 2);
}
assert.deepEqual(resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text: "只修改字幕，成片15秒" }], durationTimeline(360n))?.minimum, fraction("15"), "explicit new whole-work number wins");
assert.deepEqual(resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text: "只修改字幕显示2秒" }], durationTimeline(360n))?.minimum, fraction("12"), "local subtitle timing is not output duration");
assert.deepEqual(resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text: "再换一种故事节奏" }], durationTimeline(360n))?.minimum, fraction("24"), "do not infer an unstated duration reset from subjective pacing");
for (const raw_text of ["把成片缩短一点", "整片再短一些", "再短一点", "make it shorter"]) {
  const bound = resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text }], durationTimeline(360n));
  assert.equal(bound?.minimum, null); assert.deepEqual(bound?.maximum, fraction("359", "30"));
  assert.throws(() => assertCreationDurationTarget(durationTimeline(360n), bound!), (error: any) => error.code === "CREATION_DURATION_TARGET_UNMET");
  assert.doesNotThrow(() => assertCreationDurationTarget(durationTimeline(300n), bound!));
}
for (const raw_text of ["把作品加长一点", "make the video longer"]) {
  const bound = resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text }], durationTimeline(360n));
  assert.deepEqual(bound?.minimum, fraction("361", "30")); assert.equal(bound?.maximum, null);
}
for (const raw_text of ["开头镜头短一点", "不要把成片缩短一点", "make this shot shorter"]) assert.deepEqual(resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text }], durationTimeline(360n))?.minimum, fraction("24"), "local or negated feedback must not override whole-work duration");
assert.deepEqual(resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text: "把成片缩短一点，改成10秒视频" }], durationTimeline(360n))?.minimum, fraction("10"));
assert.equal(resolveBoundCreationDurationTarget([{ revision: 1, raw_text: "做个短一点的视频" }], durationTimeline(0n)), null, "a first creative brief does not invent a missing previous duration");

for (const raw_text of ["不要保持当前总时长", "不要只修改字幕", "do not keep the current duration"]) assert.deepEqual(resolveBoundCreationDurationTarget([...oldDuration, { revision: 2, raw_text }], durationTimeline(360n))?.minimum, fraction("24"), "negated preservation is not permission to bind current duration");

// Expose existing Worker eq identities without mutating raw grade or silently
// supplying required values in a model candidate. Zero is a real value.
const neutralTimeline: any = { version: 0, tracks: [{ track_id: "video-main", kind: "video", clips: [{ clip_id: "neutral", source: { asset_id: asset, start_pts: 0n, end_pts: 30n, timescale: 30n }, timeline_start: 0n, timeline_duration: 30n }] }], sequence: { sequence_id: "main", timebase: grid, tracks: [] } };
const neutralProjection = creationTimelineContext(neutralTimeline) as any;
assert.equal(neutralProjection.tracks[0].clips[0].grade, null);
assert.deepEqual(neutralProjection.tracks[0].clips[0].effective_color, { exposure: 0, brightness: 0, contrast: 1, saturation: 1, gamma: 1, render_brightness: 0 });
assert.equal(neutralTimeline.tracks[0].clips[0].grade, undefined);
neutralTimeline.tracks[0].clips[0].grade = { grade_id: "existing", exposure: 0.3, contrast: 0, saturation: 1 };
const flattenedProjection = creationTimelineContext(neutralTimeline) as any;
assert.equal(flattenedProjection.tracks[0].clips[0].effective_color.contrast, 0, "actual bad prior output is not normalized to neutral");
assert.equal(flattenedProjection.tracks[0].clips[0].effective_color.render_brightness, 0.3);
neutralTimeline.tracks[0].clips[0].grade.brightness = 0.1;
assert.equal((creationTimelineContext(neutralTimeline) as any).tracks[0].clips[0].effective_color.render_brightness, 0.4, "matches current Worker additive exposure/brightness execution");

const capacityBudget = creationCapacityContext([resolved], grid, { minimum_total_ticks: "150", maximum_total_ticks: "150", exact_total_ticks: "150" });
assert.equal(capacityBudget.spans[0]!.full_source_capacity_ticks, "90");
assert.equal(capacityBudget.minimum_distinct_full_windows, null);
const tooSmall = structuredClone(candidate); tooSmall.target_duration_ticks = 150;
const binding = { request_id: "request", revision: 1, base_timeline_version: 0, observation_refs: [ref], profile: { version: 1, deletion_generation: 0 } };
const payload = JSON.stringify(tooSmall);
const rejected = { error: { code: "MODEL_OUTPUT_INVALID", cause: { code: "CREATION_DECISION_CAPACITY_INSUFFICIENT" }, creation_generation_binding: binding, output_diagnostic: { representation: "provider-text", payload, utf8_bytes: Buffer.byteLength(payload), sha256: createHash("sha256").update(payload).digest("hex") } } };
const numericFailure = creationGenerationFailureContext(rejected, binding, [resolved], grid)!;
assert.equal(numericFailure.previous_total_capacity_ticks, "30"); assert.equal(numericFailure.deficit_ticks, "120");
assert.equal(JSON.stringify(numericFailure).includes(tooSmall.thesis), false);
for (const changed of [{ ...binding, request_id: "new" }, { ...binding, revision: 2 }, { ...binding, base_timeline_version: 1 }, { ...binding, observation_refs: [{ ...ref, digest: "0".repeat(64) }] }, { ...binding, profile: { version: 2, deletion_generation: 1 } }]) assert.equal(creationGenerationFailureContext(rejected, changed, [resolved], grid), null, "unbound old failure must not enter current generation");
const oldUnbound = structuredClone(rejected); delete (oldUnbound.error as any).creation_generation_binding;
assert.equal(creationGenerationFailureContext(oldUnbound, binding, [resolved], grid), null);
const envelopeRejected = structuredClone(rejected);
const envelopePayload = JSON.stringify({ exchange_version: 1, kind: "final", decision: JSON.parse(payload) });
envelopeRejected.error.output_diagnostic = { representation: "provider-text", payload: envelopePayload, utf8_bytes: Buffer.byteLength(envelopePayload), sha256: createHash("sha256").update(envelopePayload).digest("hex") };
const envelopeContext = creationGenerationFailureContext(envelopeRejected, binding, [resolved], grid)!;
assert.equal(envelopeContext.previous_output_sha256, envelopeRejected.error.output_diagnostic.sha256, "new envelope retains actual provider-byte identity");
const extraEnvelope = structuredClone(envelopeRejected), extraPayload = JSON.stringify({ ...JSON.parse(envelopePayload), extra: true });
extraEnvelope.error.output_diagnostic = { representation: "provider-text", payload: extraPayload, utf8_bytes: Buffer.byteLength(extraPayload), sha256: createHash("sha256").update(extraPayload).digest("hex") };
assert.throws(() => creationGenerationFailureContext(extraEnvelope, binding, [resolved], grid), code("CREATION_PLANNING_EXCHANGE_INVALID"));
// Historical receipt validation remains strict after its old current contract is removed.
const historicalQuery = { exchange_version: 1, kind: "measure_selection", query_id: "old-query", target_duration_ticks: 30, selection: [{ selection_id: "old-shot", source_window: JSON.parse(payload).shots[0].source_window, timing: { kind: "weighted" } }] };
assert.throws(() => readHistoricalPlanningFinal(historicalQuery,null), code("CREATION_FAILURE_DIAGNOSTIC_INVALID"), "valid historical measurements are not failed final decisions");
for (const invalidQuery of [
  { ...historicalQuery, extra: true },
  { ...historicalQuery, target_duration_ticks: 1.5 },
  { ...historicalQuery, target_duration_ticks: Infinity },
  { ...historicalQuery, selection: [{ ...historicalQuery.selection[0], timing: { kind: "weighted", weight: 1 } }] },
  { ...historicalQuery, selection: [{ ...historicalQuery.selection[0], source_window: { ...historicalQuery.selection[0].source_window, end: undefined } }] },
  { ...historicalQuery, selection: [{ ...historicalQuery.selection[0], source_window: { ...historicalQuery.selection[0].source_window, start: { schema_version: 1, value: 0, timescale: 0 } } }] },
]) assert.throws(() => readHistoricalPlanningFinal(invalidQuery,null), code("CREATION_PLANNING_EXCHANGE_INVALID"));
const corruptDiagnostic = structuredClone(rejected); corruptDiagnostic.error.output_diagnostic.payload += " ";
assert.throws(() => creationGenerationFailureContext(corruptDiagnostic, binding, [resolved], grid), code("CREATION_FAILURE_DIAGNOSTIC_INVALID"));
assert.ok(JSON.stringify(creationOutputSchema([resolved], [], grid)).includes('"$ref":"#/$defs/creationVideoSourceBounds"'));

const compactSchema = creationOutputSchema([resolved], [], grid) as any;
assert.equal(compactSchema.properties.audio.items.properties.source.allOf[0].$ref, compactSchema.properties.shots.items.properties.source_window.allOf[0].$ref, "identical source authority is shared, not repeated or removed");
assert.equal((creationEditGridContext([resolved], grid)[0] as any).construction, undefined, "constant guidance occurs once at top-level instead of per scene");

// A long uncut source is not adequately observed by its first/middle/last frames.
const temporalFrames = Array.from({ length: 1320 }, (_, index) => ({ frame_index: index, pts: index * 10, end_pts: (index + 1) * 10 }));
const temporalRange = { span_index: 0, first_frame_index: 0, last_frame_index: temporalFrames.length - 1, start_pts: 0, end_pts: 13200 };
const temporalScan = { time_base: { numerator: 1, denominator: 100 }, frames: temporalFrames, spans: [temporalRange] } as any;
const temporalFacts = { ...facts, video: { ...facts.video!, start: 0n, end: 13200n, numerator: 1n, denominator: 100n }, audio: { ...facts.audio!, start: 0n, end: 13185n, numerator: 1n, denominator: 100n } };
const temporalIndices = creationTemporalFrameIndices(temporalScan, temporalRange, temporalFacts);
assert.ok(temporalIndices.length > 10); assert.equal(temporalIndices.at(-1), 1318, "frame starting beyond editable audio end is never a usable tail witness");
for (let i = 1; i < temporalIndices.length; i++) assert.ok(temporalFrames[temporalIndices[i]!]!.pts - temporalFrames[temporalIndices[i-1]!]!.end_pts <= CREATION_TEMPORAL_SAMPLING_POLICY.maximum_unobserved_gap_seconds * 100);
const temporalReceipt = (indices: number[]) => ({ materials: [{ asset_id: asset, scan: temporalScan }], spans: [{ span_id: "temporal", asset_id: asset, start: { value: 0, timescale: 100 }, end: { value: 13200, timescale: 100 } }], samples: indices.map(index => ({ span_id: "temporal", asset_id: asset, sample: { detail: { kind: "frame" }, actual_start: { value: temporalFrames[index]!.pts, timescale: 100 }, actual_end: { value: temporalFrames[index]!.end_pts, timescale: 100 } } })) }) as any;
assert.equal(creationObservationNeedsTemporalCoverage(temporalReceipt([0, 659, 1319]), new Map([[asset, temporalFacts]])), true);
assert.equal(creationObservationNeedsTemporalCoverage(temporalReceipt(temporalIndices), new Map([[asset, temporalFacts]])), false);

// Exact reproduction of D's sparse sample selection failure (synthetic facts).
const anchorSpan = { ...resolved, compile: { ...resolved.compile, start_pts: 0n, end_pts: 131230n, timescale: 1000n,
  observations: [7007n, 8008n, 9009n, 10010n].map((start, index) => ({ evidence_id: `visual-${index}`, kind: "visual" as const, start_pts: start * 600n, end_pts: start * 600n + 1001n, timescale: 60000n, text: `actual sampled moment ${index}`, uncertain: false })).concat([]) } };
anchorSpan.compile.observations.push({ evidence_id: "audio-full", kind: "audio", start_pts: 0n, end_pts: 131230n, timescale: 1000n, text: "full real audio evidence", uncertain: false } as any);
const weightedOptions = creationWeightedAnchorContext([anchorSpan], grid)[0]!.options;
assert.equal(weightedOptions.length, 4); assert.equal(weightedOptions[0]!.source_window!.start.value, 7007); assert.equal(weightedOptions[0]!.source_window!.start.timescale, 100);
assert.equal(weightedOptions[0]!.maximum_duration_ticks, "1834");
const aClockSpan = { ...resolved, compile: { ...resolved.compile, start_pts: 2000000n, end_pts: 2316314n, timescale: 24000n,
  observations: [{ evidence_id: "a-last", kind: "visual" as const, start_pts: 2125123n, end_pts: 2126124n, timescale: 24000n, text: "Actual A-style frame timing", uncertain: false }] } };
const aClockOption = creationWeightedAnchorContext([aClockSpan], grid)[0]!.options[0]!;
assert.equal(aClockOption.time_representation, "shared-exact-timescale");
assert.deepEqual(aClockOption.source_window!.start, { schema_version: 1, value: 2125123, timescale: 24000 });
assert.deepEqual(aClockOption.source_window!.end, { schema_version: 1, value: 2316314, timescale: 24000 }, "A selectable window does not independently reduce only its end denominator");
const aClockDecision = { ...structuredClone(decision), shots: [{ ...structuredClone(decision.shots[0]!), source_window: aClockOption.source_window, timing: { kind: "weighted", weight: 1 } }] };
assert.equal(ajv.compile(creationOutputSchema([aClockSpan], [], grid))(aClockDecision), true);
const aClockTypo = structuredClone(aClockDecision); aClockTypo.shots[0]!.source_window!.end = { schema_version: 1, value: 1158157, timescale: 1200 };
assert.throws(() => assertCreationDecisionSourceWindows(aClockTypo, [aClockSpan]), code("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA"), "the actual tenfold end-time typo stays a failed unmodified candidate");
const commonClockBound = structuredClone(aClockDecision); commonClockBound.shots[0]!.source_window!.end.value++;
assert.equal(ajv.compile(creationOutputSchema([aClockSpan], [], grid))(commonClockBound), false);
const emptyTimeline = { version: 0, sequence: { sequence_id: "main", timebase: grid, tracks: [] }, tracks: [] } as any;
const anchorCompileContext = { request_id: ticket.request_id, revision: ticket.revision, input_digest: ticket.input_digest, authorized_asset_ids: [asset], protected_refs: [], principle_ids: [], spans: [anchorSpan.compile] } as any;
for (const [start, end] of [[74, 80], [84, 91]]) {
  const rejected = { ...structuredClone(decision), target_duration_ticks: 135, shots: [{ ...structuredClone(decision.shots[0]!), source_window: { span_id: anchorSpan.compile.span_id, asset_id: asset, start: { schema_version: 1, value: start, timescale: 1 }, end: { schema_version: 1, value: end, timescale: 1 } }, timing: { kind: "weighted", weight: 1 } }] };
  const raw = JSON.stringify(rejected), compiled = bindCreationDecision(rejected, ticket, grid);
  assert.throws(() => compileCreationPlan(compiled, emptyTimeline, anchorCompileContext), /CREATION_SOURCE_UNOBSERVED/);
  assert.equal(JSON.stringify(rejected), raw, "a missing or trimmed-away anchor never moves the original candidate");
  const failedVisual = { error: { code: "MODEL_OUTPUT_INVALID", cause: { message: `CREATION_SOURCE_UNOBSERVED:${anchorSpan.compile.span_id}:video` }, creation_generation_binding: binding,
    output_diagnostic: { representation: "provider-text", payload: raw, utf8_bytes: Buffer.byteLength(raw), sha256: createHash("sha256").update(raw).digest("hex") } } };
  const explanation = creationGenerationFailureContext(failedVisual, binding, [anchorSpan], grid)!;
  assert.equal(explanation.code, "CREATION_SOURCE_UNOBSERVED");
  assert.equal(explanation.previous_output_sha256, failedVisual.error.output_diagnostic.sha256);
  assert.deepEqual((explanation.shots[0] as any).allocated_source_range, compiled.shots[0]!.source);
  assert.equal((explanation.shots[0] as any).reason, start === 74 ? "declared-window-has-no-visual-anchor" : "allocation-excluded-declared-visual-anchor");
  assert.equal((explanation.shots[0] as any).nearby_observed_anchor_options.length, 2);
  assert.equal(JSON.stringify(explanation).includes(rejected.thesis), false, "old creative text is not fed back as diagnostic context");
  for (const changed of [{ ...binding, request_id: "new" }, { ...binding, revision: 2 }, { ...binding, base_timeline_version: 1 }, { ...binding, observation_refs: [{ ...ref, digest: "0".repeat(64) }] }, { ...binding, profile: { version: 2, deletion_generation: 1 } }]) assert.equal(creationGenerationFailureContext(failedVisual, changed, [anchorSpan], grid), null, "source diagnostics require complete current binding, including profile deletion generation");
  const unboundVisual = structuredClone(failedVisual); delete (unboundVisual.error as any).creation_generation_binding;
  assert.equal(creationGenerationFailureContext(unboundVisual, binding, [anchorSpan], grid), null);
  const corruptVisual = structuredClone(failedVisual); corruptVisual.error.output_diagnostic.payload += " ";
  assert.throws(() => creationGenerationFailureContext(corruptVisual, binding, [anchorSpan], grid), code("CREATION_FAILURE_DIAGNOSTIC_INVALID"));
  // Current measured/catalog protocol retains the same outer failed-byte identity.
  const currentRoot: any = { context: { creative_brief: "fixture", planning_projection_version: "phase-specific-v1", planning: CREATION_PLANNING_PROTOCOL, generation_binding: binding, output_schema: creationDecisionSchema, timeline: { version: binding.base_timeline_version, sequence: { timebase: { value: "1", timescale: "30" } } }, source_spans: [anchorSpan.context], duration_budget: null }, media: [] };
  // Use matching source context for the synthetic long-span evidence in this case.
  currentRoot.context.source_spans = [{ ...(anchorSpan.context as any), editable_start: {schema_version:1,value:0,timescale:1000}, editable_end: {schema_version:1,value:131230,timescale:1000}, observations: anchorSpan.compile.observations.filter(x=>x.kind==="visual").map(x=>({kind:"visual",evidence_id:x.evidence_id,sample_at:{schema_version:1,value:Number(x.start_pts),timescale:Number(x.timescale)},description:x.text,uncertain:x.uncertain})) }];
  const matchedEvidence = [{ ...anchorSpan, context: currentRoot.context.source_spans[0] }];
  currentRoot.context.source_choice_catalog = buildCreationSourceChoiceCatalog(currentRoot.context);
  const chosen = { ...rejected, shots: rejected.shots.map(({source_window,...shot})=>({...shot,source_choice:{kind:"custom_window",source_window}})) };
  const query: any = {exchange_version:3,kind:"measure_selection",query_id:"checked",target_duration_ticks:chosen.target_duration_ticks,selection:chosen.shots.map(shot=>({selection_id:shot.shot_id,source_choice:shot.source_choice,timing:shot.timing}))};
  const measurement=measureCreationSelection(query,currentRoot.context), firstInput=deriveCreationPlanningInput(currentRoot,[]), lastInput=deriveCreationPlanningInput(currentRoot,[{exchange:query,measurement}]);
  const {decision_version:_version,target_duration_ticks:_target,shots,...fields}=chosen;
  const final={exchange_version:3,kind:"final",measured_query_id:"checked",measurement_receipt_digest:creationPlanningMeasurementReceipt(currentRoot,query,measurement),creative:{...fields,shots:shots.map(({source_choice:_choice,timing:_timing,...shot})=>shot)}};
  const bytes=(value:unknown)=>{const payload=JSON.stringify(value);return {representation:"provider-text",payload,utf8_bytes:Buffer.byteLength(payload),sha256:createHash("sha256").update(payload).digest("hex")}};
  const currentFailure:any=structuredClone(failedVisual);currentFailure.error.output_diagnostic=bytes(final);currentFailure.error.planning_diagnostic={protocol:"planning-exchange-v3",root_input:currentRoot,root_input_digest:creationDigest(currentRoot),rounds:[{input:firstInput,input_hash:creationDigest(firstInput),exchange:query,provider_output:bytes(query),output_hash:creationDigest(query),measurement}],pending:{input:lastInput,input_hash:creationDigest(lastInput),provider_output:bytes(final)}};
  const currentExplanation=creationGenerationFailureContext(currentFailure,binding,matchedEvidence,grid)!;
  assert.equal(currentExplanation.previous_output_sha256,currentFailure.error.output_diagnostic.sha256);
  assert.deepEqual((currentExplanation.shots[0] as any).allocated_source_range,compiled.shots[0]!.source);
  const changedRootBinding=structuredClone(currentFailure);changedRootBinding.error.planning_diagnostic.root_input.context.generation_binding={...binding,profile:{deletion_generation:100}};
  assert.equal(creationGenerationFailureContext(changedRootBinding,binding,matchedEvidence,grid),null,"current failure binding alone cannot rebind a different saved planning profile");
  assert.equal(JSON.stringify(rejected), raw, "explaining a failure cannot repair its candidate");
}
const observedDecision = { ...structuredClone(decision), target_duration_ticks: 540, shots: weightedOptions.map((option, index) => ({ ...structuredClone(decision.shots[0]!), shot_id: `anchored-${index}`, source_window: option.source_window!, timing: { kind: "weighted", weight: 1 } })) };
const observedPlan = bindCreationDecision(observedDecision, ticket, grid);
const observedCommands = compileCreationPlan(observedPlan, emptyTimeline, anchorCompileContext);
assert.equal(simulateCommands(emptyTimeline, observedCommands).tracks.flatMap(track => track.clips).length, 4);
assert.deepEqual(observedPlan.shots.map(shot => shot.source.start), weightedOptions.map(option => option.source_window!.start), "model-selected exact anchor starts survive allocation unchanged");
