import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";

// Real independent encoded fixtures, Worker, two database owners, compiler and
// Preview/Master/QC. All model observations/decisions are controlled responses.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-personalization-")), run = promisify(execFile), credential = {};
const now = () => Date.parse("2026-09-24T00:00:00Z"), profile = new ProfileRepository(resolve(root, "profile"), "user", credential, now);
const t = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const wires: any[] = [], learningWires: any[] = [];
const correctionWords = "你误解了：只是不喜欢结尾总结句，场景说明字幕要保留；镜头和音乐保持。";
const reply = (output: unknown) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const observation = JSON.parse(content[0].text);
    return reply({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Controlled synthetic color/tone sample.", uncertain: false, transcript: [] })) });
  }
  const context = JSON.parse(content);
  if (context.learning_event) {
    learningWires.push(context); const event = context.learning_event;
    assert.equal(event.data_type, "manual_diff");
    const correcting = event.correction_digest !== null;
    assert.equal(event.facts.find((fact: any) => fact.kind === "user_statement").content, correcting ? correctionWords : "不要总结句；原来的镜头和音乐保持。学习我认可的这次字幕删除。");
    const changed = JSON.parse(event.facts.find((fact: any) => fact.kind === "difference").content).changed;
    assert.ok(changed.some((item: any) => correcting ? item.ref === "caption:scene-caption" && item.before === null && item.after.text === "Fixture ending action" : item.ref === "caption:closing-caption" && item.after === null));
    assert.ok(event.verified_unchanged_refs.includes("track:audio-music"));
    if (correcting) assert.equal(JSON.stringify(context).includes("For daily work omit an imposed closing summary"), false, "old model wording is not a correction source");
    return reply({ principles: [{ dimension: "caption", statement: correcting ? "Keep source-grounded descriptive captions in daily work; omit only imposed closing summaries; preserve shots and music." : "For daily work omit an imposed closing summary; preserve selected shots and music.", contexts: ["daily"], exceptions: ["explicit summary request"], evidence_refs: event.facts.filter((fact: any) => ["user_statement", "difference", "preservation"].includes(fact.kind)).map((fact: any) => fact.fact_id) }], no_inference_reason: null });
  }
  wires.push(context);
  const spans = context.source_spans, source = (index: number, end: number) => ({ span_id: spans[index].span_id, asset_id: spans[index].asset_id, start: t(0), end: t(end) });
  const personalized = Boolean(context.profile?.principles.length);
  const corrected = context.profile?.principles.some((item: any) => item.statement.startsWith("Keep source-grounded descriptive captions"));
  return reply({ thesis: "Two unequal controlled source actions", shots: [{ shot_id: "opening", source: source(0, 30), purpose: "first controlled source", embedded_gain_db: -12, reframe: null, color: null }, { shot_id: "ending", source: source(1, 60), purpose: "second controlled source", embedded_gain_db: -12, reframe: null, color: null }], audio: [{ audio_id: "music", source: source(1, 60), shot_id: "ending", offset: t(0), role: "music", gain_db: -9, fade_in: t(0), fade_out: t(0), purpose: "controlled tone" }], captions: personalized && !corrected ? [] : [{ caption_id: corrected ? "scene-caption" : "closing-caption", shot_id: "ending", offset: t(0), duration: t(45), text: corrected ? "Fixture ending action" : "Fixture closing summary", kind: "editorial", evidence_ids: [spans[1].observations[0].evidence_id], audio_anchor: null }], preserve_refs: context.request.revisions.at(-1).preserve_refs, applied_principle_ids: context.profile?.principles.map((item: any) => item.principle_id) ?? [], feedback_interpretation: context.request.revisions.at(-1).raw_text, change_summary: corrected ? "Keep the descriptive caption according to the narrowed hypothesis." : personalized ? "Omit closing summary according to the selected hypothesis." : "Include explicitly permitted fixture closing text." });
} });
const options = { now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "user" }], provider: "qwen", model: "fixture-model", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: {   max_attempts: 1 as const, timeout_ms: 30000 } };
const hosts: ProjectHostSession[] = [];
try {
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { provider: "qwen", model: "fixture-model", allowed_data: ["request", "timeline", "evidence", "frames", "audio", "transcript", "profile"], expires_at: "2027-01-01T00:00:00Z" });
  const create = async (name: string, hues: readonly number[], frequency: number) => {
    const paths: string[] = [];
    for (const [index, hue] of hues.entries()) {
      const path = resolve(root, `${name}-${index}.mp4`); paths.push(path);
      await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", "-f", "lavfi", "-i", `sine=frequency=${frequency + index * 110}:sample_rate=48000:duration=3`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-vf", `hue=h=${hue},setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, "-c:a", "aac", "-t", "3", path]);
    }
    const host = new ProjectHostSession(options); hosts.push(host); const directory = resolve(root, name);
    await host.create(directory); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
    const imported = await host.importMedia(paths) as any[];
    return { host, directory, imported, projectId: (host as any).session.manifest.project_id, assetIds: imported.map(item => item.asset_id) };
  };
  const generate = async (project: Awaited<ReturnType<typeof create>>, id: string, exceptions: readonly string[] = [], render = true) => {
    const { host, imported } = project;
    host.beginCreationRequest(credential, { ...authorization, request_id: id, original_text: exceptions.length ? "This work explicitly needs a closing summary." : "Create a complete daily fixture work.", asset_ids: project.assetIds });
    for (const item of imported) await host.prepareCreationMaterial(credential, { operation_id: `${id}:${item.asset_id}`, request_id: id, asset_id: item.asset_id, asset_location_id: item.asset_location_id });
    const observation = await host.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: imported.map(item => `${id}:${item.asset_id}`), include_audio: true });
    const draft = await host.generateCreationDraft(credential, { request_id: id, expected_revision: 1, observation_refs: [observation.ref], profile_query: { contexts: ["daily"], except_principle_ids: exceptions } });
    const timeline = host.readTimelineSnapshot() as Timeline;
    assert.deepEqual(timeline.tracks.find(track => track.kind === "video")!.clips.map(clip => clip.timeline_duration), [30n, 60n]);
    const rendered = render ? await host.renderCreationDraft(credential, { operation_id: `${id}:render`, request_id: id, draft_id: draft.draft_id }) : null;
    return { draft, timeline, rendered };
  };
  const history = await create("history", [0, 50], 330);
  const original = await generate(history, "history-create", [], false);
  const video = original.timeline.tracks.find(track => track.kind === "video")!;
  assert.equal(video.captions!.length, 1);
  history.host.applyTimelineCommand({ type: "set_track_properties", track_id: video.track_id, properties: { captions: [] } }, 1);
  const session = (history.host as any).session, ir = session.db.prepare("SELECT relation_key,object_hash FROM object_refs WHERE object_type='edit_ir' AND version=2").get();
  await profile.configure(credential, { source_project_ids: [history.projectId], data_types: ["manual_diff"], retention_until: "2027-01-01T00:00:00Z", external_provider: "qwen", enabled: true });
  history.host.beginCreationRequest(credential, { ...authorization, request_id: "learn-history", original_text: "Learn this explicitly endorsed manual caption edit.", asset_ids: history.assetIds });
  const learned = await history.host.learnCreationExperience(credential, { operation_id: "learn-history", request_id: "learn-history", expected_revision: 1, correction: null, selection: { data_type: "manual_diff", edit_ref: { edit_ir_id: ir.relation_key, timeline_version: 2, digest: ir.object_hash }, raw_text: "不要总结句；原来的镜头和音乐保持。学习我认可的这次字幕删除。" } });
  const principleId = learned.registration.principle_ids[0]!; assert.ok(principleId);
  const heldOut = await create("held-out", [100, 150], 660);
  assert.ok(heldOut.assetIds.every(asset => !history.assetIds.includes(asset)));
  assert.ok(heldOut.assetIds.every(asset => !JSON.stringify(learningWires).includes(asset)), "held-out assets never enter learning input");
  const personalized = await generate(heldOut, "personalized");
  assert.deepEqual(personalized.timeline.tracks.find(track => track.kind === "video")!.captions, []);
  assert.deepEqual(wires.at(-1).profile.principles.map((item: any) => item.principle_id), [principleId]);
  const exception = await generate(heldOut, "exception", [principleId]);
  assert.equal(exception.timeline.tracks.find(track => track.kind === "video")!.captions![0]!.text, "Fixture closing summary");
  assert.equal((await profile.snapshot({ project_id: heldOut.projectId, contexts: ["daily"], except_principle_ids: [] })).principles.length, 1, "one-work exception retains long-term hypothesis");
  assert.notEqual(personalized.rendered!.receipt.master.output_hash, exception.rendered!.receipt.master.output_hash, "actual encoded Master changes with the one-work exception");
  history.host.applyTimelineCommand({ type: "set_track_properties", track_id: video.track_id, properties: { captions: [{ caption_id: "scene-caption", text: "Fixture ending action", timeline_start: 30n, timeline_duration: 45n }] } }, 2);
  const correctionIR = session.db.prepare("SELECT relation_key,object_hash FROM object_refs WHERE object_type='edit_ir' AND version=3").get();
  history.host.beginCreationRequest(credential, { ...authorization, request_id: "correct-history", original_text: correctionWords, asset_ids: history.assetIds });
  const correction = await history.host.learnCreationExperience(credential, { operation_id: "correct-history", request_id: "correct-history", expected_revision: 1, correction: { profile_id: learned.registration.profile_id, predecessors: [{ source_project_id: history.projectId, source_event_id: learned.registration.source_event_id, principle_id: principleId, result_digest: learned.registration.result_digest }] }, selection: { data_type: "manual_diff", edit_ref: { edit_ir_id: correctionIR.relation_key, timeline_version: 3, digest: correctionIR.object_hash }, raw_text: correctionWords } });
  assert.ok(heldOut.assetIds.every(asset => !JSON.stringify(learningWires).includes(asset)), "held-out media remain outside both learning and correction");
  const corrected = await generate(heldOut, "corrected");
  assert.deepEqual(wires.at(-1).profile.principles.map((item: any) => item.principle_id), correction.registration.principle_ids);
  assert.equal(corrected.timeline.tracks.find(track => track.kind === "video")!.captions![0]!.text, "Fixture ending action");
  assert.deepEqual(corrected.timeline.tracks.find(track => track.kind === "audio")!.clips, personalized.timeline.tracks.find(track => track.kind === "audio")!.clips, "correction preserves the actual audio selection and placement");
  assert.deepEqual(corrected.timeline.tracks.find(track => track.kind === "video")!.clips, personalized.timeline.tracks.find(track => track.kind === "video")!.clips, "correction preserves actual shots");
  assert.notEqual(corrected.rendered!.receipt.master.output_hash, personalized.rendered!.receipt.master.output_hash, "correction changes the actual encoded work");
  const latest = heldOut.host.readTimelineSnapshot(); await heldOut.host.close(); await heldOut.host.open(heldOut.directory);
  assert.deepEqual(heldOut.host.readTimelineSnapshot(), latest);
  assert.equal(heldOut.host.readCreationRequest("personalized").drafts[0]!.timeline_version, 1);
  assert.equal(heldOut.host.readCreationRequest("exception").drafts[0]!.timeline_version, 2);
  assert.equal(heldOut.host.readCreationRequest("corrected").drafts[0]!.timeline_version, 3);
  await profile.forgetSources(credential, [history.projectId]);
  const afterForget = await create("after-forget", [200, 250], 990);
  assert.ok(afterForget.assetIds.every(asset => ![...history.assetIds, ...heldOut.assetIds].includes(asset)));
  const forgotten = await generate(afterForget, "forgotten");
  assert.equal(wires.at(-1).profile, null);
  assert.equal(forgotten.timeline.tracks.find(track => track.kind === "video")!.captions![0]!.text, "Fixture closing summary", "forgetting changes an actual new work, not just an explanation or score");
  assert.equal(learningWires.length, 2);
  for (const artifact of [personalized.rendered!, exception.rendered!, corrected.rendered!, forgotten.rendered!]) for (const target of ["preview", "master"] as const) {
    const output = artifact.receipt[target], qc = output.qc_report as { status: string; issues: Array<{ severity: string; blocker?: boolean }> };
    assert.ok(output.output_hash); assert.equal(qc.status, "passed"); assert.ok(qc.issues.every(issue => issue.severity !== "error" && issue.blocker !== true));
  }
  console.log("Stage3 held-out execution: exact manual feedback → learning → new-source Timeline/Preview/Master/QC, one-work exception, explicit narrowing with preserved shots/audio, forgetting on another new project and reopen passed (synthetic media and controlled model responses only)");
} finally { for (const host of hosts) await host.close(); await profile.close(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
