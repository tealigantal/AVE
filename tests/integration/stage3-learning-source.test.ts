import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { registerMediaAsset, readCreationState, readCreationLearningObject } from "../../packages/platform/project-storage/src/public.js";
import { buildCreationLearningEvent, bindCreationLearningDecision, parseCreationLearningInput, creationLearningSource } from "../../packages/platform/project-host/src/stage3-learning.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";
import { compileCreationPlan, type CreationCompileContext } from "../../packages/core/edit-ir/src/public.js";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";

// Actual immutable Host/SQLite records; no media-understanding or remote-model claim.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-learning-source-")), credential = {};
const now = "2026-09-24T00:00:00Z", host = new ProjectHostSession({ now: () => Date.parse(now), creationRequestChannels: [{ credential, actor_id: "user" }] });
try {
  await host.create(root);
  const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "a".repeat(64), byte_length: 1n }), session = (host as any).session, project = session.manifest.project_id;
  registerMediaAsset(session, project, { asset_id: asset, algorithm: "sha256", digest: "a".repeat(64), byte_length: 1, stream_facts: {} });
  const caption = { caption_id: "caption", text: "1n", timeline_start: 0n, timeline_duration: 30n, style: { font_size: 24 }, semantic_sidecar: { semantic_id: "caption", labels: ["OLD_MODEL_LABEL"], evidence_refs: ["OLD_PROFILE_REF"], metadata: { private_summary: "PRIVATE_PROFILE_SUMMARY" } } };
  host.initializeTimeline([{ track_id: "main", kind: "video", clips: [{ clip_id: "shot", source: { asset_id: asset, start_pts: 0n, end_pts: 90n, timescale: 30n }, timeline_start: 0n, timeline_duration: 90n }], captions: [caption] }], { sequence_id: "sequence", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const { project_id: _project, actor_id: _actor, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  authorization.asset_ids = [asset]; authorization.expires_at = "2027-01-01T00:00:00Z";
  host.beginCreationRequest(credential, authorization);
  const history = parseCreationLearningInput({ operation_id: "history", request_id: authorization.request_id, expected_revision: 1, correction: null, selection: { data_type: "history_reference", timeline_version: 0, observation_refs: [], raw_text: null } });
  const event = buildCreationLearningEvent(session, host.readCreationRequest(authorization.request_id), "user", history, now);
  const wire = JSON.stringify(event);
  assert.equal(wire.includes("PRIVATE_PROFILE_SUMMARY"), false); assert.equal(wire.includes("OLD_PROFILE_REF"), false); assert.equal(wire.includes("OLD_MODEL_LABEL"), false);
  assert.equal(JSON.parse(event.facts[0]!.content).tracks[0].captions[0].text, "1n", "numeric-looking user caption is not a bigint");
  assert.equal(JSON.parse(event.facts[0]!.content).tracks[0].captions[0].style.font_size, 24);
  const candidate = { principles: [{ dimension: "caption", statement: "Keep captions literal in this context.", contexts: ["daily"], exceptions: [], evidence_refs: [event.facts[0]!.fact_id] }], no_inference_reason: null };
  const output = bindCreationLearningDecision(candidate, event, now);
  assert.equal(output.principles[0]!.status, "hypothesis"); assert.equal(output.principles[0]!.source_digest, creationLearningSource(event).content_digest);
  assert.throws(() => bindCreationLearningDecision({ ...candidate, principles: [{ ...candidate.principles[0], evidence_refs: ["held-out-answer"] }] }, event, now), /every extracted principle/);
  assert.deepEqual(bindCreationLearningDecision({ principles: [], no_inference_reason: "Not enough signal." }, event, now).principles, []);
  const raw = "我只是不要总结句，镜头和音乐保持原样。";
  host.reviseCreationRequest(credential, authorization.request_id, 1, { raw_text: raw, viewed_timeline_version: 0, preserve_refs: ["shot"] });
  const historicalState = readCreationState(session, project, authorization.request_id);
  const feedback = parseCreationLearningInput({ operation_id: "feedback", request_id: authorization.request_id, expected_revision: 2, correction: null, selection: { data_type: "feedback", state_ref: { request_id: authorization.request_id, sequence: historicalState.value.sequence, digest: historicalState.object_hash }, revision: 2, result_draft_id: null } });
  host.reviseCreationRequest(credential, authorization.request_id, 2, { raw_text: "新的要求不能替换先前原话。", viewed_timeline_version: 0, preserve_refs: ["shot"] });
  const feedbackEvent = buildCreationLearningEvent(session, host.readCreationRequest(authorization.request_id), "user", feedback, now);
  assert.equal(feedbackEvent.facts[0]!.content, raw); assert.deepEqual(feedbackEvent.requested_preserve_refs, ["shot"]); assert.deepEqual(feedbackEvent.verified_unchanged_refs, []);
  host.applyTimelineCommand({ type: "set_track_properties", track_id: "main", properties: { captions: [{ ...caption, text: "实际改过的字幕", style: { font_size: 30 } }] } }, 0);
  const ir = session.db.prepare("SELECT relation_key,object_hash,version FROM object_refs WHERE object_type='edit_ir' AND version=1").get();
  const manual = parseCreationLearningInput({ operation_id: "manual", request_id: authorization.request_id, expected_revision: 3, correction: null, selection: { data_type: "manual_diff", edit_ref: { edit_ir_id: ir.relation_key, timeline_version: 1, digest: ir.object_hash }, raw_text: "这是我认可的字幕修改；学习这个差分。" } });
  const manualEvent = buildCreationLearningEvent(session, host.readCreationRequest(authorization.request_id), "user", manual, now), diff = JSON.parse(manualEvent.facts.find(fact => fact.kind === "difference")!.content);
  assert.equal(diff.changed.length, 1); assert.equal(diff.changed[0].ref, "caption:caption"); assert.equal(diff.changed[0].before.text, "1n"); assert.equal(diff.changed[0].after.style.font_size, 30); assert.ok(manualEvent.verified_unchanged_refs.includes("clip:shot"));
  assert.equal(manualEvent.verified_unchanged_refs.includes("track:main"), false, "changed child content means the track is not entirely unchanged");
  assert.equal((host.readTimelineSnapshot() as Timeline).version, 1, "learning projection never edits the real work");
  assert.throws(() => readCreationLearningObject(session, project, "creation_session", authorization.request_id, historicalState.value.sequence, "0".repeat(64)), /CREATION_LEARNING_REFERENCE_REBOUND/);
  assert.throws(() => readCreationLearningObject(session, "foreign", "timeline_snapshot", "timeline:0", 0), /CREATION_LEARNING_REFERENCE_INVALID/);
  assert.throws(() => buildCreationLearningEvent(session, { ...host.readCreationRequest(authorization.request_id), authorization: { ...authorization, asset_ids: [] } } as any, "user", history, now), /all selected historical material/);
  // Use the current compiler's independent audio route, then save actual manual
  // changes through Host. These are Timeline facts, not a model/media claim.
  const plan = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-plan.v1.json", "utf8"));
  const time = (value: number) => ({ schema_version: 1 as const, value, timescale: 30 });
  plan.request_id = authorization.request_id; plan.revision = 3; plan.base_timeline_version = 1;
  plan.audio = [{ audio_id: "sound", shot_id: "shot-1", source: plan.shots[0].source, offset: time(0), role: "dialogue", gain_db: -3, fade_in: time(0), fade_out: time(0), purpose: "fixture independent sound" }];
  const spans: CreationCompileContext["spans"] = [{ span_id: "evidence-1", asset_id: asset, start_pts: 0n, end_pts: 90n, timescale: 30n, has_video: true, has_audio: true, observations: ["visual", "audio"].map(kind => ({ evidence_id: kind, kind: kind as "visual" | "audio", start_pts: 0n, end_pts: 90n, timescale: 30n, text: "controlled fixture", uncertain: false })) }];
  host.applyTimelineCommands(compileCreationPlan(plan, host.readTimelineSnapshot() as Timeline, { request_id: authorization.request_id, revision: 3, input_digest: plan.input_digest, authorized_asset_ids: [asset], protected_refs: [], principle_ids: [], spans }), 1);
  const compiled = host.readTimelineSnapshot() as Timeline, audioTrack = compiled.tracks.find(track => track.track_id === "audio-dialogue")!;
  assert.deepEqual(audioTrack.audio_routing, [{ routing_id: "routing:sound", source_clip_id: "sound", bus: "dialogue" }]);
  const compiledHistory = buildCreationLearningEvent(session, host.readCreationRequest(authorization.request_id), "user", { ...history, operation_id: "compiled-history", selection: { ...history.selection as any, timeline_version: 2 } }, now);
  assert.deepEqual(JSON.parse(compiledHistory.facts[0]!.content).tracks.find((track: any) => track.track_id === "audio-dialogue").audio_routing, audioTrack.audio_routing);
  const selectedEdit = (version: number, operation: string) => {
    const saved = session.db.prepare("SELECT relation_key,object_hash FROM object_refs WHERE object_type='edit_ir' AND version=?").get(version);
    const input = parseCreationLearningInput({ operation_id: operation, request_id: authorization.request_id, expected_revision: 3, correction: null, selection: { data_type: "manual_diff", edit_ref: { edit_ir_id: saved.relation_key, timeline_version: version, digest: saved.object_hash }, raw_text: "学习我明确认可的这次修改。" } });
    return { input, event: buildCreationLearningEvent(session, host.readCreationRequest(authorization.request_id), "user", input, now) };
  };
  host.applyTimelineCommand({ type: "set_track_properties", track_id: audioTrack.track_id, properties: { audio_routing: [{ ...audioTrack.audio_routing![0]!, gain_db: -6, bus: "music" }] } }, 2);
  const audioEdit = selectedEdit(3, "audio-route-edit"), audioDiff = JSON.parse(audioEdit.event.facts.find(fact => fact.kind === "difference")!.content);
  assert.equal(audioDiff.changed.length, 1); assert.equal(audioDiff.changed[0].ref, "track:audio-dialogue");
  assert.equal(audioDiff.changed[0].before.audio_routing[0].bus, "dialogue"); assert.equal(audioDiff.changed[0].after.audio_routing[0].bus, "music"); assert.equal(audioDiff.changed[0].after.audio_routing[0].gain_db, -6);
  assert.equal(audioEdit.event.verified_unchanged_refs.includes("track:audio-dialogue"), false);
  // Both overlapping video tracks have default z-index: their order is a real
  // compositing change even though clip bytes and placement do not change.
  host.applyTimelineCommand({ type: "reorder_track", track_id: "video-main", index: 0 }, 3);
  const reorder = selectedEdit(4, "reorder-edit"), reorderDiff = JSON.parse(reorder.event.facts.find(fact => fact.kind === "difference")!.content);
  assert.deepEqual(reorderDiff.changed.map((item: any) => item.ref), ["track:main", "track:video-main"]);
  const reordered = reorderDiff.changed.find((item: any) => item.ref === "track:video-main"); assert.equal(reordered.before.order, 1); assert.equal(reordered.after.order, 0);
  assert.equal(reorder.event.verified_unchanged_refs.includes("track:main"), false); assert.equal(reorder.event.verified_unchanged_refs.includes("track:video-main"), false);
  assert.equal((host.readTimelineSnapshot() as Timeline).version, 4, "learning projections do not add Timeline commits");
  const move = { intent_id: "preserve-content-move", base_version: 4, actor: { actor_id: "user", producer: "manual" as const }, targets: [{ track_id: "main", clip_id: "shot" }], commands: [{ type: "move_clip" as const, track_id: "main", clip_id: "shot", timeline_start: 10n }], semantic_refs: [], preconditions: [{ kind: "content_preserved" as const, refs: ["clip:shot"] }], protected_refs: [], provenance: { source_id: "user" }, reason: "保留镜头内容，仅移动位置。", expected_effects: ["move existing shot"] };
  host.executeEdit(move);
  const moved = selectedEdit(5, "move-preserved-edit"), movedDiff = JSON.parse(moved.event.facts.find(fact => fact.kind === "difference")!.content), preservation = JSON.parse(moved.event.facts.find(fact => fact.kind === "preservation")!.content);
  assert.equal(movedDiff.changed.find((item: any) => item.ref === "clip:shot").after.timeline_start, "10");
  assert.deepEqual(moved.event.requested_preserve_refs, ["clip:shot"]); assert.deepEqual(preservation.content_preserved_refs, ["clip:shot"]); assert.deepEqual(preservation.violations, []);
  assert.equal(moved.event.verified_unchanged_refs.includes("clip:shot"), false, "preserved content with changed placement is not strictly unchanged");
  assert.equal(moved.event.verified_unchanged_refs.includes("track:main"), false);
  const beforeRejectedEdit = JSON.stringify(session.db.prepare("SELECT * FROM timeline_versions").all());
  assert.throws(() => host.executeEdit({ ...move, intent_id: "forbidden-caption-edit", base_version: 5, commands: [{ type: "set_track_properties", track_id: "main", properties: { captions: [] } }], preconditions: [{ kind: "content_preserved", refs: ["track:main"] }] }), /CREATION_PROTECTED_CONTENT_CHANGED:track:main/);
  assert.equal(JSON.stringify(session.db.prepare("SELECT * FROM timeline_versions").all()), beforeRejectedEdit, "preservation violation never creates a learnable committed edit");
  await host.close(); await host.open(root);
  assert.deepEqual(buildCreationLearningEvent((host as any).session, host.readCreationRequest(authorization.request_id), "user", manual, now), manualEvent);
  assert.deepEqual(buildCreationLearningEvent((host as any).session, host.readCreationRequest(authorization.request_id), "user", audioEdit.input, now), audioEdit.event);
  assert.deepEqual(buildCreationLearningEvent((host as any).session, host.readCreationRequest(authorization.request_id), "user", reorder.input, now), reorder.event);
  assert.deepEqual(buildCreationLearningEvent((host as any).session, host.readCreationRequest(authorization.request_id), "user", moved.input, now), moved.event);
  console.log("Stage3 exact historical learning projection: original words, selected edit, real before/after, caption style, protected intent, profile exclusion and reopen passed (SQLite fixtures only)");
} finally { await host.close(); await rm(root, { recursive: true, force: true }); }
