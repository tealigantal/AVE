import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { readMediaAsset } from "../../packages/platform/project-storage/src/public.js";
import { assertCreationAudioIntentTimeline, assertCreationSourceTrackTimeline, creationSourceTrackBoundary } from "../../packages/platform/contract-runtime/src/public.js";

// Real encode, Worker probe, project database, close/reopen and fresh reprobe.
const root = await mkdtemp(resolve(tmpdir(), "ave-source-track-"));
const source = resolve(root, "tone.wav"), project = resolve(root, "project");
const credential = {}, host = new ProjectHostSession({ now: () => Date.parse("2026-09-24T01:00:00Z"), creationRequestChannels: [{ credential, actor_id: "user-1" }] });
try {
  await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-c:a", "pcm_s16le", source]);
  await host.create(project);
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = (await host.importMedia([source]))[0] as any;
  const session = () => (host as any).session;
  const persisted = () => readMediaAsset(session(), session().manifest.project_id, imported.asset_id) as any;
  const fresh = async () => (host as any).inspectMediaCandidate(source, "ephemeral");
  const initial = creationSourceTrackBoundary(persisted(), await fresh());
  assert.equal(initial.asset_id, imported.asset_id);
  assert.equal(initial.sample_rate, "48000");
  assert.equal(initial.sample_count, "48000");
  const clip = (id: string, first: bigint, last: bigint, at: bigint) => ({ clip_id: id, source: { asset_id: initial.asset_id, start_pts: first, end_pts: last, timescale: 48000n }, timeline_start: at, timeline_duration: (last - first) / 1600n, gain_db: 0 });
  const retained = { ...clip("retained", 0n, 48000n, 30n), semantic_sidecar: { semantic_id: "retained", labels: ["source-track-retention-v1"] } };
  const timeline = { sequence: { timebase: { value: 1n, timescale: 30n } }, tracks: [{ track_id: "audio-source-retained", kind: "audio", clips: [retained], audio_routing: [{ routing_id: "retained-route", source_clip_id: "retained", bus: "embedded" }] }] } as any;
  assert.doesNotThrow(() => assertCreationSourceTrackTimeline(initial, timeline));
  // Historical replay only: new planning exchanges do not emit audio_intent.
  const duplicateRequirements = { audio_intent: { status: "required", requirements: ["素材 A 的原轨", "素材 B 的演奏"].map(request_quote => ({ kind: "source_audio", request_quote, evidence_ids: [`source-track:${initial.asset_id}`] })) } };
  assert.throws(() => assertCreationAudioIntentTimeline({ audio_requirement_projection: "source-evidence-v1", source_track_retention: { version: 1, asset_id: initial.asset_id, boundary: initial }, source_spans: [] }, duplicateRequirements, timeline), (error: any) => error?.code === "CREATION_AUDIO_INTENT_AMBIGUOUS", "the final Timeline guard must independently reject reuse of one track for two sound requirements");
  const rationalBoundary = { ...initial, start_pts: "0", end_pts: "24000", time_base: { numerator: "2", denominator: "48000" } };
  const mixedScale = structuredClone(timeline); mixedScale.tracks[0].clips[0].source = { asset_id: initial.asset_id, start_pts: 0n, end_pts: 2n, timescale: 2n };
  assert.doesNotThrow(() => assertCreationSourceTrackTimeline(rationalBoundary, mixedScale));
  const mutedDuplicate = structuredClone(timeline);
  mutedDuplicate.tracks.push({ track_id: "video-muted", kind: "video", audio_routing: [{ source_clip_id: "muted", muted: true }], clips: [clip("muted", 0n, 48000n, 0n)] });
  assert.doesNotThrow(() => assertCreationSourceTrackTimeline(initial, mutedDuplicate));
  for (const mutation of [
    (value: any) => { value.tracks[0].clips.pop(); },
    (value: any) => { value.tracks[0].clips[0].source.start_pts += 1n; },
    (value: any) => { value.tracks[0].clips[0].gain_db = -6; },
    (value: any) => { value.tracks[0].muted = true; },
    (value: any) => { value.tracks[0].clips[0].speed = { value: 2, timescale: 1 }; },
    (value: any) => { value.tracks[0].clips[0].kind = "graphic"; },
    (value: any) => { value.tracks[0].clips[0].semantic_sidecar.labels = []; },
    (value: any) => { value.tracks[0].audio_routing[0].muted = true; },
  ]) {
    const changedTimeline = structuredClone(timeline); mutation(changedTimeline);
    assert.throws(() => assertCreationSourceTrackTimeline(initial, changedTimeline), (error: any) => error?.code === "CREATION_SOURCE_TRACK_UNMET");
  }
  for (const at of [0n, 60n, 61n]) {
    const separated = structuredClone(timeline); separated.tracks.push({ track_id: `video-${at}`, kind: "video", clips: [clip(`video-${at}`, 0n, 48000n, at)] });
    assert.doesNotThrow(() => assertCreationSourceTrackTimeline(initial, separated), "adjacent or separated same-source picture retains its own audio");
  }
  for (const at of [1n, 29n, 30n, 59n]) {
    const overlap = structuredClone(timeline); overlap.tracks.push({ track_id: `video-${at}`, kind: "video", clips: [clip(`video-${at}`, 0n, 48000n, at)] });
    assert.throws(() => assertCreationSourceTrackTimeline(initial, overlap), (error: any) => error?.code === "CREATION_SOURCE_TRACK_AUDIO_OVERLAP", "partial and complete same-source audio overlap are rejected");
  }
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  host.beginCreationRequest(credential, { ...authorization, request_id: "track-experiment", asset_ids: [imported.asset_id], source_track_requirement_update: { version: 1, value: "require", asset_id: imported.asset_id } });
  await host.prepareCreationMaterial(credential, { request_id: "track-experiment", operation_id: "track-material", asset_id: imported.asset_id, asset_location_id: imported.asset_location_id });
  const attempt = () => host.generateCreationDraft(credential, { request_id: "track-experiment", expected_revision: 1, observation_refs: [{ run_id: "not-dispatched", digest: "0".repeat(64) }], profile_query: null });
  await assert.rejects(attempt(), (error: any) => error?.code === "CREATION_OBSERVATION_STALE");
  assert.equal(session().db.prepare("SELECT count(*) n FROM model_runs").get().n, 0);
  await host.close();
  await host.open(project);
  await assert.rejects(attempt(), (error: any) => error?.code === "CREATION_OBSERVATION_STALE");
  const saved = persisted(), inspected = await fresh();
  assert.deepEqual(creationSourceTrackBoundary(saved, inspected), initial);
  const rejects = (...codes: string[]) => (error: any) => codes.includes(error?.code);
  assert.throws(() => creationSourceTrackBoundary(saved, { ...inspected, asset_id: `asset:sha256:${"0".repeat(64)}` }), rejects("CREATION_SOURCE_TRACK_IDENTITY_INVALID"));
  const changed = structuredClone(inspected.probe) as any;
  const decoded = changed.timing.streams[String(initial.stream_index)].decoded_audio_bounds;
  decoded.end_pts -= 1; decoded.sample_count -= 1;
  assert.throws(() => creationSourceTrackBoundary(saved, { ...inspected, probe: changed }), rejects("CREATION_SOURCE_TRACK_BOUNDARY_UNPROVEN", "CREATION_SOURCE_TRACK_BOUNDARY_REBOUND", "CREATION_MEDIA_BOUNDS_REQUIRED"));
  const missing = structuredClone(inspected.probe) as any;
  delete missing.timing.streams[String(initial.stream_index)].decoded_audio_bounds;
  assert.throws(() => creationSourceTrackBoundary(saved, { ...inspected, probe: missing }), rejects("CREATION_SOURCE_TRACK_BOUNDARY_UNPROVEN", "CREATION_MEDIA_BOUNDS_REQUIRED"));
  const shortened = structuredClone(saved) as any;
  const timing = shortened.stream_facts.timing.streams[String(initial.stream_index)];
  const stream = shortened.stream_facts.streams.find((item: any) => item.index === initial.stream_index);
  timing.duration_ts -= 1; stream.duration_ts -= 1;
  timing.decoded_audio_bounds.end_pts -= 1; timing.decoded_audio_bounds.sample_count -= 1;
  assert.throws(() => creationSourceTrackBoundary(shortened, inspected), rejects("CREATION_SOURCE_TRACK_BOUNDARY_REBOUND"));
  await appendFile(source, Buffer.from([0]));
  const changedFile = await fresh();
  assert.notEqual(changedFile.asset_id, initial.asset_id);
  assert.throws(() => creationSourceTrackBoundary(saved, changedFile), rejects("CREATION_SOURCE_TRACK_IDENTITY_INVALID"));
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true });
}
