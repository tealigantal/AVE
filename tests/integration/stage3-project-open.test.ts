import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createPersistentJob, openProject, putObjectAndRegister, readPersistentJob, registerMediaAsset, startPersistentJob } from "../../packages/platform/project-storage/src/public.js";
import { assertTimelineStructure, type Timeline } from "../../packages/core/timeline-core/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-project-open-"));
const credential = {}, assetId = `asset:sha256:${"a".repeat(64)}`;
const options = { now: () => Date.parse("2026-09-24T00:00:00Z"), creationRequestChannels: [{ credential, actor_id: "user" }] };
const host = new ProjectHostSession(options);
const fixture = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8"));
const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = fixture.authorization;
authorization.expires_at = "2027-01-01T00:00:00Z"; authorization.asset_ids = [assetId];
const snapshot = (session: any) => JSON.stringify({
  jobs: session.db.prepare("SELECT * FROM jobs ORDER BY job_id").all(),
  attempts: session.db.prepare("SELECT * FROM job_attempts ORDER BY attempt_id").all(),
  events: session.db.prepare("SELECT * FROM project_events ORDER BY event_id").all(),
  refs: session.db.prepare("SELECT * FROM object_refs ORDER BY object_ref_id").all(),
  versions: session.db.prepare("SELECT * FROM timeline_versions ORDER BY timeline_version").all(),
});
const source = { asset_id: assetId as any, start_pts: 0n, end_pts: 60n, timescale: 30n };
const richTracks: Timeline["tracks"] = [{
  track_id: "shots", kind: "video", enabled: true, clips: [{ clip_id: "shot", source, timeline_start: 0n, timeline_duration: 60n, gain_db: -3,
    transform: { x: 0, scale_x: 1, fit: "fit" }, speed: { numerator: 1n, denominator: 1n },
    grade: { grade_id: "grade", brightness: 0, context: { input_space: "rec709", working_space: "rec709", output_space: "rec709", bit_depth: 8, range: "limited" } },
    mask: { mask_id: "mask", shape: "rectangle", mode: "blur", x: 0, y: 0, width: 0.2, height: 0.2, lost_frame_policy: "block", tracking_samples: [{ time: 0n, x: 0, y: 0, width: 0.2, height: 0.2, confidence: 1 }] },
    boundary_fades: { schema_version: 1, video_fade_in: { value: 1n, timescale: 30n } },
    automation_curves: [{ curve_id: "opacity", target_id: "shot", property_path: "transform.opacity", value_kind: "number", keyframes: [{ keyframe_id: "point", time: 0n, value: 1, interpolation: "linear", out_tangent: { time: 1, value: 0 } }] }],
  }],
  captions: [{ caption_id: "caption", text: "1n", timeline_start: 0n, timeline_duration: 30n, words: [{ text: "2n", timeline_start: 0n, timeline_duration: 10n }], style: { literal: "3n" } }],
  semantic_sidecar: { semantic_id: "literal", labels: ["4n"], evidence_refs: [], metadata: { value: "5n", time: "6n" } },
}, {
  track_id: "sound", kind: "audio", clips: [{ clip_id: "audio", source, timeline_start: 0n, timeline_duration: 60n, media_kind: "audio" }],
  audio_routing: [{ routing_id: "dialogue", source_clip_id: "audio", bus: "dialogue", gain_db: -2, muted: false }],
}];

try {
  const validRoot = resolve(root, "valid"); await host.create(validRoot); host.initializeCreationTimeline();
  assert.deepEqual(host.readTimelineSnapshot(), { version: 0, tracks: [], sequence: { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] } });
  host.applyTimelineCommand({ type: "add_track", track: richTracks[0]! }, 0);
  host.applyTimelineCommand({ type: "add_track", track: richTracks[1]! }, 1);
  const before = host.readTimelineSnapshot();
  await host.close(); await host.open(validRoot, { requireCreationTimeline: true });
  assert.deepEqual(host.readTimelineSnapshot(), before, "reopen preserves actual multi-track, audio, captions, metadata and timing without conversion");
  assert.equal(host.status().timeline, "v2"); await host.close();

  type Failure = { name: string; error: RegExp; timeline?: (value: any) => void; database?: (session: any, project: string) => void; strict?: boolean };
  const failures: Failure[] = [
    { name: "missing-sequence", error: /CREATION_TIMELINE_TIMEBASE_REQUIRED|explicit positive sequence timing/, timeline: v => { delete v.sequence; } },
    { name: "string-time", error: /TIMELINE_STRUCTURE_INVALID:timeline\/tracks\/0\/clips\/0\/timeline_start:bigint/, timeline: v => { v.tracks[0].clips[0].timeline_start = "0"; }, strict: false },
    { name: "missing-array", error: /TIMELINE_STRUCTURE_INVALID:timeline\/tracks\/0\/clips:array/, timeline: v => { delete v.tracks[0].clips; } },
    { name: "numeric-caption", error: /TIMELINE_STRUCTURE_INVALID:timeline\/tracks\/0\/captions\/0\/text:string/, timeline: v => { v.tracks[0].captions[0].text = 1; } },
    { name: "unknown-semantics", error: /TIMELINE_STRUCTURE_INVALID:timeline\/tracks\/0\/unsupported:known field/, timeline: v => { v.tracks[0].unsupported = true; } },
    { name: "invalid-timebase", error: /TIMEBASE|explicit positive sequence timing/, timeline: v => { v.sequence.timebase.timescale = "0n"; } },
    { name: "invalid-speed", error: /SPEED_RATIO_INVALID/, timeline: v => { v.tracks[0].clips[0].speed.denominator = "0n"; } },
    { name: "divergent-root-sequence", error: /root sequence tracks differ/, timeline: v => { v.sequence.tracks = [v.tracks[0]]; } },
    { name: "overlap", error: /timeline validation failed: OVERLAP/, timeline: v => { v.tracks[0].clips.push({ ...v.tracks[0].clips[0], clip_id: "overlapping", grade: undefined, mask: undefined, automation_curves: undefined }); } },
    { name: "wrong-json-version", error: /TIMELINE_SNAPSHOT_VERSION_REBOUND/, timeline: v => { v.version++; }, strict: false },
    { name: "wrong-reference-version", error: /TIMELINE_SNAPSHOT_REFERENCE_REBOUND/, database: (s,p) => s.db.prepare("UPDATE object_refs SET version=50 WHERE project_id=? AND relation_key='timeline:0'").run(p) },
    { name: "duplicate-reference", error: /TIMELINE_SNAPSHOT_REFERENCE_INVALID/, database: (s,p) => s.db.prepare("INSERT INTO object_refs SELECT 'duplicate',project_id,object_hash,object_type,50,relation_key,metadata_json,created_at FROM object_refs WHERE project_id=? AND relation_key='timeline:0'").run(p) },
    { name: "wrong-object-path", error: /TIMELINE_SNAPSHOT_REFERENCE_REBOUND/, database: (s,p) => s.db.prepare("UPDATE object_store SET object_path=? WHERE object_hash=(SELECT object_hash FROM object_refs WHERE project_id=? AND relation_key='timeline:0')").run(resolve(root,"not-the-object"),p) },
    { name: "missing-history", error: /CREATION_WORKSPACE_HISTORY_INVALID/, database: (s,p) => s.db.prepare("DELETE FROM object_refs WHERE project_id=? AND object_type='creation_session' AND version=1").run(p) },
  ];
  for (const failure of failures) {
    const path = resolve(root, failure.name); await host.create(path);
    host.initializeTimeline(richTracks, { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
    const session = (host as any).session, project = host.status().project;
    registerMediaAsset(session, project, { asset_id: assetId, algorithm: "sha256", digest: "a".repeat(64), byte_length: 1, stream_facts: {} });
    host.beginCreationRequest(credential, authorization);
    (host as any).prepareCreationRun(authorization.request_id, "b".repeat(64), null);
    createPersistentJob(session, project, { job_id: "pending-recovery", task_type: "test", idempotency_key: "pending-recovery", input_hash: "c".repeat(64), input: {}, state: "PENDING" });
    startPersistentJob(session, "pending-recovery");
    if (failure.timeline) {
      const value = JSON.parse(JSON.stringify(host.readTimelineSnapshot(), (_, v) => typeof v === "bigint" ? `${v}n` : v));
      failure.timeline(value);
      const stored = await putObjectAndRegister(session, project, Buffer.from(JSON.stringify(value)));
      session.db.prepare("UPDATE object_refs SET object_hash=? WHERE project_id=? AND relation_key='timeline:0'").run(stored.hash, project);
    }
    failure.database?.(session, project);
    const unchanged = snapshot(session); await host.close();
    await assert.rejects(host.open(path, { requireCreationTimeline: failure.strict !== false }), failure.error, failure.name);
    assert.equal(host.status().project, "not-open", `${failure.name}: rejected session closed`);
    const stored = await openProject(path);
    try {
      assert.equal(snapshot(stored), unchanged, `${failure.name}: no request/job recovery or Timeline commit before denial`);
      assert.equal(readPersistentJob(stored, "pending-recovery").state, "RUNNING");
    } finally { await stored.close(); }
  }
  const broken = structuredClone(before) as any; broken.tracks[0].clips[0].mask.tracking_samples[0].time = 1;
  assert.throws(() => assertTimelineStructure(broken), /TIMELINE_STRUCTURE_INVALID:.*tracking_samples\/0\/time:bigint/);
  console.log("Stage3 current project open: exact snapshot identity, typed multi-track preservation and zero recovery writes on corruption passed");
} finally {
  await host.close();
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
