import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";
import { exportOtio, importOtio, validateOtioRoundtrip } from "../../packages/adapters/otio-adapter/src/public.js";
import { exportFcpXml, importFcpXml } from "../../packages/adapters/fcpxml-adapter/src/public.js";
import { exportEdl, importEdl } from "../../packages/adapters/edl-adapter/src/public.js";
import { exportWebPreview, validateTimelineRoundtrip, validateWebPreview } from "../../packages/adapters/web-preview-adapter/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { readTimeline, writeTimeline } from "../../packages/adapters/desktop-filesystem-adapter/src/public.js";

const asset = `asset:sha256:${"a".repeat(64)}` as any;
const timeline: Timeline = { version: 4, tracks: [{ track_id: "video-main", kind: "video", clips: [{ clip_id: "clip-a", source: sourceRange(asset, 10n, 30n, 25n), timeline_start: 0n, timeline_duration: 20n, semantic_sidecar: { semantic_id: "semantic-a", labels: ["人物"], evidence_refs: ["evidence-a"] } }] }] };
const checkShape = (candidate: Timeline) => { assert.equal(candidate.tracks[0].track_id, "video-main"); assert.equal(candidate.tracks[0].clips[0].clip_id, "clip-a"); assert.equal(candidate.tracks[0].clips[0].source.start_pts, 10n); assert.equal(candidate.tracks[0].clips[0].timeline_duration, 20n); };
const otio = exportOtio(timeline); assert.equal(otio.issues.length, 0); assert.equal(validateOtioRoundtrip(timeline, importOtio(otio)).length, 0); assert.equal(validateTimelineRoundtrip(timeline, importOtio(otio)).length, 0); checkShape(importOtio(otio));
const fcpxml = exportFcpXml(timeline); assert.match(fcpxml.xml, /<fcpxml/); assert.equal(validateTimelineRoundtrip(timeline, importFcpXml(fcpxml)).length, 0); checkShape(importFcpXml(fcpxml));
const edl = exportEdl(timeline); assert.match(edl.text, /clip-a/); assert.equal(validateTimelineRoundtrip(timeline, importEdl(edl)).length, 0); checkShape(importEdl(edl));
assert.equal(validateWebPreview(exportWebPreview(timeline)).length, 0);
const directory = await mkdtemp(resolve(tmpdir(), "ave-adapter-roundtrip-"));
try { const path = resolve(directory, "timeline.json"); await writeTimeline(path, timeline); checkShape(await readTimeline(path)); const host = new ProjectHostSession(); await host.create(resolve(directory, "project")); host.initializeTimeline(timeline.tracks); const hostExport = host.exportTimeline("otio") as any; assert.equal(host.validateTimelineExport("otio", hostExport).length, 0); await host.close(); } finally { await rm(directory, { recursive: true, force: true }); }
console.log("adapter roundtrip check passed");
