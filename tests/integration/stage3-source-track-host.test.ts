import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { creationSourceTrackBoundary } from "../../packages/platform/contract-runtime/src/public.js";
import { readMediaAsset, readCreationDraftExecution, readCreationMaterial, readModelRun, readObjectSync, putObjectSync } from "../../packages/platform/project-storage/src/public.js";
import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";
import { insertAuthorizedMediaAt } from "../../apps/desktop/src/renderer/features/p4-timeline-commands.js";

// Real encoded sources, Worker, Host, SQLite and Preview/Master. All model
// responses are local deterministic fixtures; there is no provider network.
const root = await mkdtemp(resolve(tmpdir(), "ave-source-track-host-"));
const credential = {}, now = () => Date.parse("2026-09-24T01:00:00Z");
const run = promisify(execFile);
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
let mode: "full" | "missing" | "wrong" | "muted" | "shifted" | "ambiguous" | "separate" = "full";
let selectedAsset = "", modelCalls = 0;

function planningFixtureExchange(context: any, decision: any) {
  const query_id = context.planning_exchange.assigned_query_id;
  if (context.planning_exchange.phase === "measure-only") {
    const exchange = fixtureSkillExchange(context, {
    exchange_version: 3, kind: "measure_selection", query_id, target_duration_ticks: decision.target_duration_ticks,
    selection: decision.shots.map(({ shot_id, source_window, timing }: any) => ({ selection_id: shot_id, source_choice: { kind: "custom_window", source_window }, timing })),
    }, decision);
    // A model can omit the request; the local complete-track constraint must
    // still reject a truncated Timeline in the "missing" case.
    if (mode === "ambiguous") {
      const revision=context.request.current_revision.revision;
      exchange.audio_intent = { status: "required", requirements: ["素材 A 的原轨", "素材 B 的演奏"].map(request_quote=>({kind:"source_audio",revision,request_quote,evidence_ids:[`source-track:${selectedAsset}`]})) };
    } else if (mode !== "missing") exchange.audio_intent = { status: "required", requirements: [{ kind: "source_audio", revision: 1, request_quote: "保留选定素材的完整原音轨", evidence_ids: [`source-track:${selectedAsset}`] }] };
    return exchange;
  }
  const receipt = context.planning_exchange.feasible_receipts.at(-1);
  assert.ok(receipt, "the final decision must bind an actual measured feasible selection");
  const { decision_version, target_duration_ticks, shots, ...creative } = decision;
  return fixtureSkillExchange(context, { exchange_version: 3, kind: "final", measured_query_id: receipt.query_id, measurement_receipt_digest: receipt.measurement_receipt_digest,
    creative: { ...creative, shots: shots.map(({ source_window, timing, ...shot }: any) => shot) } }, decision);
}

const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: ["image/png"] }], fetch_impl: async (_url, init) => {
  modelCalls++;
  const content = JSON.parse(init!.body as string).messages[0].content;
  let output: unknown;
  if (Array.isArray(content)) {
    assert.ok(content.every((item: any) => !["input_audio", "audio_url"].includes(item.type) && !Object.hasOwn(item, "audio")), "without audio authorization the fixture provider must not receive audio payloads");
    const input = JSON.parse(content[0].text);
    output = { samples: input.samples.map((item: any) => ({ sample_id: item.sample_id, description: "Synthetic motion fixture", uncertain: false, transcript: [] })) };
  } else {
    const input = JSON.parse(content), span = input.source_spans.find((item: any) => mode === "wrong" ? item.asset_id !== selectedAsset : item.asset_id === selectedAsset);
    assert.ok(span, `selected fixture source is available for ${mode}`);
    const length = mode === "missing" ? 45 : 90, start = mode === "shifted" ? 30 : 0;
    const decision = { decision_version: 1, target_duration_ticks: length, thesis: "Controlled full source track", shots: [{ shot_id: "shot-1", timing: { kind: "exact" },
      source_window: { span_id: span.span_id, asset_id: span.asset_id, start: time(start), end: time(start + length) }, purpose: "Controlled source", embedded_gain_db: mode === "muted" ? -96 : 0, reframe: null, color: null }],
      audio: [], captions: [], preserve_refs: input.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: input.request.original_text, change_summary: "Controlled source selection" };
    if(mode==="separate") decision.shots=[{shot_id:"shot-1",timing:{kind:"exact"},source_window:{span_id:span.span_id,asset_id:span.asset_id,start:time(45),end:time(90)},purpose:"Later picture first",embedded_gain_db:-96,reframe:null,color:null},{shot_id:"shot-2",timing:{kind:"exact"},source_window:{span_id:span.span_id,asset_id:span.asset_id,start:time(0),end:time(45)},purpose:"Earlier picture second",embedded_gain_db:-96,reframe:null,color:null}];
    output = planningFixtureExchange(input, decision);
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });

const host = new ProjectHostSession({ now, creationRequestChannels: [{ credential, actor_id: "fixture-user" }], provider: "qwen", model: "fixture", modelProvider: provider,
  creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1, timeout_ms: 30000 } });
const contains = (error: any, code: string): boolean => Boolean(error?.code === code || error?.message?.includes(code) || error?.cause && contains(error.cause, code) || error?.errors?.some((item: unknown) => contains(item, code)));

try {
  const paths = [resolve(root, "required.mov"), resolve(root, "other.mov")];
  async function encode(path: string, frequencies: number[], offset = 0) {
    const sources=frequencies.flatMap(frequency=>["-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=1`]);
    await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `testsrc2=s=96x64:r=30:d=${3+offset}`, ...sources,
      "-filter_complex", `[1:a][2:a][3:a]concat=n=3:v=0:a=1,asetpts=PTS+${offset}/TB[a]`, "-map", "0:v", "-map", "[a]", "-vf", "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-t", String(3+offset), path]);
  }
  for (const [index, path] of paths.entries()) await encode(path,index?[880,1100,1320]:[440,660,990]);
  const project = resolve(root, "project");
  await host.create(project); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(paths) as any[];
  selectedAsset = imported[0].asset_id;
  const session = (host as any).session, persisted = readMediaAsset(session, session.manifest.project_id, selectedAsset);
  const inspected = await (host as any).inspectMediaCandidate(paths[0], "ephemeral"), boundary = creationSourceTrackBoundary(persisted, inspected);
  assert.equal(boundary.sample_rate, "48000"); assert.equal(boundary.sample_count, "144000", "test fixture itself must have exact complete decoded source boundaries");
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...base } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  const begin = (request_id: string, original_text = "保留选定素材的完整原音轨。") => host.beginCreationRequest(credential, { ...base, request_id, original_text, expires_at: "2027-01-01T00:00:00Z",
    asset_ids: imported.map(item => item.asset_id), original_locations: imported.map(item => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id })), provider: "qwen", model: "fixture",
    allowed_data: ["request", "timeline", "evidence", "frames"], source_track_requirement_update: { version: 1, value: "require", asset_id: selectedAsset } });
  const produce = (request_id: string, expected_revision = 1) => host.produceCreation(credential, { request_id, expected_revision, profile_query: null });

  // A picture may use another source or be muted once the complete required
  // source track is independently present. A 1.5s work still cannot contain
  // the required 3s track, so this remains an invalid candidate.
  for (const rejected of ["missing"] as const) {
    mode = rejected; const request = `track-${rejected}`; begin(request);
    await assert.rejects(produce(request), (error: unknown) => contains(error, "CREATION_SOURCE_TRACK_DURATION_CONFLICT"), `${rejected} must not pass complete source-track validation`);
    assert.equal((host.readTimelineSnapshot() as { version: number }).version, 0, `${rejected} must not publish a Timeline`);
    assert.equal(host.readCreationRequest(request).drafts.length, 0, `${rejected} must not publish a draft`);
  }
  mode="ambiguous";begin("track-ambiguous","保留素材 A 的原轨以及素材 B 的演奏");
  await assert.rejects(produce("track-ambiguous"),(error:unknown)=>contains(error,"CREATION_AUDIO_INTENT_AMBIGUOUS"),"two distinct sound requests cannot share one selected source-track proof");
  assert.equal((host.readTimelineSnapshot() as { version:number }).version,0);assert.equal(host.readCreationRequest("track-ambiguous").drafts.length,0);

  mode = "full"; begin("track-full");
  const created = await produce("track-full");
  assert.ok(created.draft_id && created.render_id);
  const state = host.readCreationRequest("track-full"), timeline = host.readCreationDraftTimeline(credential, { request_id: "track-full", draft_id: created.draft_id });
  assert.deepEqual(state.revisions[0].source_track_requirement_update, { version: 1, value: "require", asset_id: selectedAsset });
  assert.equal(state.authorization.allowed_data.includes("audio"), false, "local source retention must not expand model audio permission");
  const clips = timeline.tracks.filter(track=>track.kind==="video").flatMap(track => track.clips).filter(clip => clip.source.asset_id === selectedAsset);
  assert.equal(clips.length, 1); assert.equal(clips[0]!.source.start_pts, 0n);
  assert.equal(clips[0]!.source.end_pts * 1n, 3n * clips[0]!.source.timescale);
  assert.equal(clips[0]!.timeline_duration, 90n); assert.equal(clips[0]!.gain_db ?? 0, 0);
  const fullRetained=timeline.tracks.filter(track=>track.kind==="audio"&&track.enabled!==false&&track.muted!==true).flatMap(track=>track.clips).filter(clip=>clip.source.asset_id===selectedAsset);
  assert.equal(fullRetained.length,1);assert.equal(fullRetained[0].source.start_pts,0n);assert.equal(fullRetained[0].source.end_pts,3n*fullRetained[0].source.timescale);assert.equal(fullRetained[0].timeline_duration,90n);assert.equal(fullRetained[0].gain_db??0,0);
  const key = { request_id: "track-full", draft_id: created.draft_id, render_id: created.render_id };
  const preview = await host.readCreationDraftPreview(credential, key), master = host.readCreationDraftMaster(credential, key);
  async function assertSignals(name: string, bytes: Buffer | Uint8Array) {
    const path = resolve(root, `${name}.mp4`); await writeFile(path, bytes);
    const { stdout } = await run("ffmpeg", ["-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "pipe:1"], { encoding: "buffer", maxBuffer: 2 * 1024 * 1024 });
    const samples = stdout.length / 4; assert.ok(samples >= 144000 && samples <= 145024, `${name} must decode the complete three-second audio interval`);
    for (const [index, offset] of [0.2, 1.2, 2.2].entries()) {
      const start = Math.round(offset * 48000), count = 24000;
      const magnitude = (frequency: number) => { let re = 0, im = 0; for (let i = 0; i < count; i++) { const sample = stdout.readFloatLE((start + i) * 4), phase = 2 * Math.PI * frequency * i / 48000; re += sample * Math.cos(phase); im += sample * Math.sin(phase); } return 2 * Math.hypot(re, im) / count; };
      const expected=magnitude([440,660,990][index]),wrong=Math.max(...[440,660,990].filter((_,position)=>position!==index).map(magnitude));
      assert.ok(expected > 0.02 && expected > wrong * 6, `${name} retains source segment ${index+1} in order at ${offset}s: expected=${expected}, wrong=${wrong}`);
    }
  }
  for (const [name, bytes] of [["preview", preview.bytes], ["master", master.bytes]] as const) await assertSignals(name,bytes);
  host.reviseCreationRequest(credential,"track-full",1,{raw_text:"保留素材 A 的原轨以及素材 B 的演奏",viewed_timeline_version:timeline.version,preserve_refs:[]});
  mode="ambiguous";const priorDraftCount=host.readCreationRequest("track-full").drafts.length;
  await assert.rejects(produce("track-full",2),(error:unknown)=>contains(error,"CREATION_AUDIO_INTENT_AMBIGUOUS"),"the same ambiguity must be rejected when revising an existing draft");
  assert.equal(host.readCreationRequest("track-full").drafts.length,priorDraftCount);assert.deepEqual(host.readTimelineSnapshot(),timeline,"a rejected ambiguous revision cannot mutate the existing Timeline");
  const callsBeforeReopen = modelCalls;
  await host.close(); await host.open(project, { requireCreationTimeline: true });
  assert.deepEqual(host.readCreationDraftTimeline(credential, { request_id: "track-full", draft_id: created.draft_id }), timeline);
  assert.deepEqual((await host.readCreationDraftPreview(credential, key)).bytes, preview.bytes);
  assert.deepEqual(host.readCreationDraftMaster(credential, key).bytes, master.bytes);
  assert.equal(modelCalls, callsBeforeReopen, "reopen must not request a model");
  const reopened = (host as any).session, projectId = reopened.manifest.project_id;
  const execution = readCreationDraftExecution(reopened, projectId, created.draft_id) as any;
  const model = readModelRun(reopened, execution.value.source.ticket.run_id) as any;
  const modelInput = JSON.parse(readObjectSync(project, model.input_object_hash).toString("utf8"));
  const proof = modelInput.context.source_track_retention;
  assert.ok(proof && proof.asset_id === selectedAsset, "the actual model input must bind the retained source proof");
  async function swapForCheck(type: string, relation: string, value: unknown, check: () => void) {
    const bytes = Buffer.from(JSON.stringify(value)), stored = putObjectSync(project, bytes);
    reopened.db.exec("BEGIN IMMEDIATE");
    try {
      reopened.db.prepare("INSERT INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?,?,?,?)").run(stored.hash, stored.path, bytes.length, new Date(now()).toISOString());
      const changed = reopened.db.prepare("UPDATE object_refs SET object_hash=? WHERE project_id=? AND object_type=? AND relation_key=?").run(stored.hash, projectId, type, relation);
      assert.equal(changed.changes, 1, `must replace exactly one ${type} reference`); check();
    } finally { reopened.db.exec("ROLLBACK"); await rm(stored.path); }
  }
  const wrongSource = structuredClone(execution.value);
  wrongSource.source_refs.find((item: any) => item.asset_ref === selectedAsset).original_ref += ".substituted";
  await swapForCheck("creation_draft_execution", created.draft_id, wrongSource, () => assert.throws(() => readCreationDraftExecution(reopened, projectId, created.draft_id), /CREATION_SOURCE_TRACK_PROOF_REBOUND/, "wrong immutable source must fail the rebuilt proof"));
  const material = readCreationMaterial(reopened, projectId, proof.material_operation_id) as any, wrongGeneration = structuredClone(material.value);
  wrongGeneration.authorization_generation += 1;
  await swapForCheck("creation_material", proof.material_operation_id, wrongGeneration, () => assert.throws(() => readCreationDraftExecution(reopened, projectId, created.draft_id), /CREATION_MATERIAL_STORED_INVALID/, "a changed authorization generation must fail material validation"));
  const changedMaterial = structuredClone(material.value); changedMaterial.created_at = "2026-09-24T01:00:01.000Z";
  await swapForCheck("creation_material", proof.material_operation_id, changedMaterial, () => assert.throws(() => readCreationDraftExecution(reopened, projectId, created.draft_id), /CREATION_SOURCE_TRACK_PROOF_REBOUND/, "a valid but changed material grant must not satisfy the saved proof digest"));
  const snapshotRef = reopened.db.prepare("SELECT object_hash FROM object_refs WHERE project_id=? AND object_type='timeline_snapshot' AND relation_key=?").get(projectId, `timeline:${timeline.version}`);
  const shortTimeline = JSON.parse(readObjectSync(project, snapshotRef.object_hash).toString("utf8"));
  shortTimeline.tracks.find((track: any) => track.kind === "audio" && track.clips.some((clip: any) => clip.source.asset_id === selectedAsset)).clips = [];
  await swapForCheck("timeline_snapshot", `timeline:${timeline.version}`, shortTimeline, () => assert.throws(() => readCreationDraftExecution(reopened, projectId, created.draft_id), (error: unknown) => contains(error, "CREATION_SOURCE_TRACK_UNMET"), "a reopened snapshot without the required source must fail the rebuilt proof"));
  assert.doesNotThrow(() => readCreationDraftExecution(reopened, projectId, created.draft_id), "rolling back the fixture mutations restores the original saved proof");
  // Separate project with video starting at zero but the three-second source
  // audio stream starting at one second. Its full track is source [1s,4s].
  const shiftedPath=resolve(root,"shifted.mov"),shiftedProject=resolve(root,"shifted-project");
  await encode(shiftedPath,[440,660,990],1);await host.close();await host.create(shiftedProject);
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const shifted=(await host.importMedia([shiftedPath]) as any[])[0];selectedAsset=shifted.asset_id;mode="shifted";
  const shiftedSession=(host as any).session, shiftedAsset=readMediaAsset(shiftedSession,shiftedSession.manifest.project_id,selectedAsset), shiftedInspect=await (host as any).inspectMediaCandidate(shiftedPath,"ephemeral");
  const shiftedBoundary=creationSourceTrackBoundary(shiftedAsset,shiftedInspect);
  assert.equal(BigInt(shiftedBoundary.start_pts)*BigInt(shiftedBoundary.time_base.numerator),BigInt(shiftedBoundary.time_base.denominator),"fixture source audio starts at one second");
  assert.equal(shiftedBoundary.sample_count,"144000");
  host.beginCreationRequest(credential,{...base,request_id:"track-shifted",original_text:"保留选定素材的完整原音轨。",expires_at:"2027-01-01T00:00:00Z",asset_ids:[selectedAsset],original_locations:[{asset_id:selectedAsset,asset_location_id:shifted.asset_location_id}],provider:"qwen",model:"fixture",allowed_data:["request","timeline","evidence","frames"],source_track_requirement_update:{version:1,value:"require",asset_id:selectedAsset}});
  const shiftedCreated=await produce("track-shifted"),shiftedTimeline=host.readCreationDraftTimeline(credential,{request_id:"track-shifted",draft_id:shiftedCreated.draft_id});
  const shiftedClip=shiftedTimeline.tracks.flatMap(track=>track.clips).find(clip=>clip.source.asset_id===selectedAsset)!;
  assert.equal(shiftedClip.source.start_pts,shiftedClip.source.timescale);assert.equal(shiftedClip.source.end_pts,4n*shiftedClip.source.timescale);assert.equal(shiftedClip.timeline_duration,90n);
  const shiftedKey={request_id:"track-shifted",draft_id:shiftedCreated.draft_id,render_id:shiftedCreated.render_id};
  await assertSignals("shifted-preview",(await host.readCreationDraftPreview(credential,shiftedKey)).bytes);
  await assertSignals("shifted-master",host.readCreationDraftMaster(credential,shiftedKey).bytes);
  // The creator can reorder pictures while retaining the selected source
  // independently. The local planner proposes only pictures (audio=[]).
  const separateProject=resolve(root,"separate-project");await host.close();await host.create(separateProject);
  host.initializeTimeline([], { sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[] });
  const separateSources=await host.importMedia(paths) as any[];selectedAsset=separateSources[0].asset_id;mode="separate";
  host.beginCreationRequest(credential,{...base,request_id:"track-separate",original_text:"保留选定素材的完整原音轨。",expires_at:"2027-01-01T00:00:00Z",asset_ids:separateSources.map(item=>item.asset_id),original_locations:separateSources.map(item=>({asset_id:item.asset_id,asset_location_id:item.asset_location_id})),provider:"qwen",model:"fixture",allowed_data:["request","timeline","evidence","frames"],source_track_requirement_update:{version:1,value:"require",asset_id:selectedAsset}});
  const separateCreated=await produce("track-separate"),separateTimeline=host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:separateCreated.draft_id});
  assert.equal(host.readCreationRequest("track-separate").authorization.allowed_data.includes("audio"),false,"independent source retention does not authorize model audio");
  const picture=separateTimeline.tracks.find(track=>track.kind==="video")!,pictureClips=[...picture.clips].sort((a,b)=>a.timeline_start<b.timeline_start?-1:1);
  assert.equal(pictureClips.length,2);assert.equal(pictureClips[0].source.start_pts*2n,3n*pictureClips[0].source.timescale);assert.equal(pictureClips[1].source.start_pts,0n);
  for(const clip of pictureClips) assert.ok(picture.muted===true||picture.audio_routing?.some(route=>route.source_clip_id===clip.clip_id&&route.muted===true),"each rearranged picture source must be routed to real silence, not played over the independent track");
  const independent=separateTimeline.tracks.filter(track=>track.kind==="audio"&&track.enabled!==false&&track.muted!==true).flatMap(track=>track.clips.map(clip=>({track,clip}))).filter(item=>item.clip.source.asset_id===selectedAsset);
  assert.equal(independent.length,1);const retained=independent[0];assert.equal(retained.clip.source.start_pts,0n);assert.equal(retained.clip.source.end_pts,3n*retained.clip.source.timescale);assert.equal(retained.clip.timeline_start,0n);assert.equal(retained.clip.timeline_duration,90n);assert.equal(retained.clip.gain_db??0,0);
  assert.notEqual(retained.track.audio_routing?.find(route=>route.source_clip_id===retained.clip.clip_id)?.muted,true);
  const separateKey={request_id:"track-separate",draft_id:separateCreated.draft_id,render_id:separateCreated.render_id};
  const separatePreview=await host.readCreationDraftPreview(credential,separateKey),separateMaster=host.readCreationDraftMaster(credential,separateKey);
  await assertSignals("separate-preview",separatePreview.bytes);await assertSignals("separate-master",separateMaster.bytes);
  await host.close();await host.open(separateProject,{requireCreationTimeline:true});
  assert.deepEqual(host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:separateCreated.draft_id}),separateTimeline);
  assert.deepEqual((await host.readCreationDraftPreview(credential,separateKey)).bytes,separatePreview.bytes);assert.deepEqual(host.readCreationDraftMaster(credential,separateKey).bytes,separateMaster.bytes);
  const separateSession=(host as any).session,separateId=separateSession.manifest.project_id,separateRelation=`timeline:${separateTimeline.version}`;
  const separateRef=separateSession.db.prepare("SELECT object_hash FROM object_refs WHERE project_id=? AND object_type='timeline_snapshot' AND relation_key=?").get(separateId,separateRelation);
  const savedSeparate=JSON.parse(readObjectSync(separateProject,separateRef.object_hash).toString("utf8"));
  for(const variant of ["wrong-source","muted","shortened"] as const){
    const altered=structuredClone(savedSeparate),track=altered.tracks.find((item:any)=>item.kind==="audio"&&item.clips.some((clip:any)=>clip.source.asset_id===selectedAsset)),clip=track.clips.find((item:any)=>item.source.asset_id===selectedAsset);
    if(variant==="wrong-source")clip.source.asset_id=separateSources[1].asset_id;
    else if(variant==="muted")track.muted=true;
    else clip.source.end_pts=`${BigInt(clip.source.end_pts.slice(0,-1))-1n}n`;
    const bytes=Buffer.from(JSON.stringify(altered)),stored=putObjectSync(separateProject,bytes);separateSession.db.exec("BEGIN IMMEDIATE");
    try{separateSession.db.prepare("INSERT INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?,?,?,?)").run(stored.hash,stored.path,bytes.length,new Date(now()).toISOString());separateSession.db.prepare("UPDATE object_refs SET object_hash=? WHERE project_id=? AND object_type='timeline_snapshot' AND relation_key=?").run(stored.hash,separateId,separateRelation);assert.throws(()=>readCreationDraftExecution(separateSession,separateId,separateCreated.draft_id),(error:unknown)=>contains(error,"CREATION_SOURCE_TRACK_UNMET"),`${variant} cannot satisfy full independent source retention`);}
    finally{separateSession.db.exec("ROLLBACK");await rm(stored.path);}
  }
  assert.doesNotThrow(()=>readCreationDraftExecution(separateSession,separateId,separateCreated.draft_id));
  // Manual caption changes retain a fresh, source-bound proof without invoking a model.
  const beforeManualCalls = modelCalls;
  const manual = await host.editCreationDraft(credential, { operation_id:"track-manual-caption", request_id:"track-separate", expected_revision:1, expected_timeline_version:separateTimeline.version, parent_draft_id:separateCreated.draft_id, raw_text:"添加手动字幕", preserve_refs:[], commands:[{type:"set_track_properties",track_id:picture.track_id,properties:{captions:[{caption_id:"manual-source-caption",text:"caption",timeline_start:0n,timeline_duration:30n}]}}] });
  assert.equal(modelCalls,beforeManualCalls,"manual source-track edits never invoke a model");
  const manualTimeline=host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:manual.draft_id});
  const manualExecution=readCreationDraftExecution((host as any).session,separateId,manual.draft_id) as any;
  assert.equal(manualExecution.value.source.kind,"manual");
  assert.equal(manualExecution.value.source.source_track_retention.asset_id,selectedAsset);
  await assert.rejects(host.editCreationDraft(credential,{operation_id:"track-manual-mute",request_id:"track-separate",expected_revision:1,expected_timeline_version:manualTimeline.version,parent_draft_id:manual.draft_id,raw_text:"静音原轨",preserve_refs:[],commands:[{type:"set_track_properties",track_id:retained.track.track_id,properties:{muted:true}}]}),(error:unknown)=>contains(error,"CREATION_SOURCE_TRACK_UNMET"));
  assert.deepEqual(host.readTimelineSnapshot(),manualTimeline,"rejected manual mutation does not change the committed Timeline");
  await host.close();await host.open(separateProject,{requireCreationTimeline:true});
  assert.deepEqual(host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:manual.draft_id}),manualTimeline);
  assert.equal(modelCalls,beforeManualCalls,"manual draft reopens without model calls");
  const manualSession=(host as any).session;
  const savedManual=readCreationDraftExecution(manualSession,separateId,manual.draft_id) as any;
  for(const variant of ["missing","wrong-source","altered-probe","wrong-material"] as const){
    const changed=structuredClone(savedManual.value),proof=changed.source.source_track_retention;
    if(variant==="missing")delete changed.source.source_track_retention;
    else if(variant==="wrong-source")changed.source_refs.find((source:any)=>source.asset_ref===selectedAsset).original_ref+=".substituted";
    else if(variant==="altered-probe")proof.fresh_probe_digest="0".repeat(64);
    else proof.material_digest="0".repeat(64);
    const bytes=Buffer.from(JSON.stringify(changed)),stored=putObjectSync(separateProject,bytes);manualSession.db.exec("BEGIN IMMEDIATE");
    try {manualSession.db.prepare("INSERT INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?,?,?,?)").run(stored.hash,stored.path,bytes.length,new Date(now()).toISOString());manualSession.db.prepare("UPDATE object_refs SET object_hash=? WHERE project_id=? AND object_type='creation_draft_execution' AND relation_key=?").run(stored.hash,separateId,manual.draft_id);assert.throws(()=>readCreationDraftExecution(manualSession,separateId,manual.draft_id),(error:unknown)=>contains(error,variant==="missing"||variant==="altered-probe"?"CREATION_SOURCE_TRACK_PROOF_REQUIRED":"CREATION_SOURCE_TRACK_PROOF_REBOUND"),`${variant} manual proof must not reopen`);}
    finally {manualSession.db.exec("ROLLBACK");await rm(stored.path);}
  }
  assert.doesNotThrow(()=>readCreationDraftExecution(manualSession,separateId,manual.draft_id));
  // Rebuilt manual proof alone cannot satisfy an independently required ambient event.
  const stateRow=manualSession.db.prepare("SELECT object_ref_id,object_hash FROM object_refs WHERE project_id=? AND object_type='creation_session' AND relation_key=? ORDER BY version DESC LIMIT 1").get(separateId,"track-separate");
  const alteredState=JSON.parse(readObjectSync(separateProject,stateRow.object_hash).toString("utf8"));
  alteredState.revisions[0].ambient_requirement_update={version:1,value:"require"};
  const stateBytes=Buffer.from(JSON.stringify(alteredState)),stateStored=putObjectSync(separateProject,stateBytes);manualSession.db.exec("BEGIN IMMEDIATE");
  try {manualSession.db.prepare("INSERT INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?,?,?,?)").run(stateStored.hash,stateStored.path,stateBytes.length,new Date(now()).toISOString());manualSession.db.prepare("UPDATE object_refs SET object_hash=? WHERE object_ref_id=?").run(stateStored.hash,stateRow.object_ref_id);assert.throws(()=>readCreationDraftExecution(manualSession,separateId,manual.draft_id),(error:unknown)=>contains(error,"CREATION_AUDIO_EVIDENCE_INSUFFICIENT"));}
  finally {manualSession.db.exec("ROLLBACK");await rm(stateStored.path);}
  // Independently audible copies from the same source may be adjacent, never overlapping.
  const available=host.readCreationPrecisionSources(credential,{request_id:"track-separate",parent_draft_id:manual.draft_id});
  const sourceSpan=available.find((item:any)=>item.asset_id===selectedAsset&&item.media_kind==="video");assert.ok(sourceSpan);
  const dropInput={request_id:"track-separate",expected_revision:1,expected_timeline_version:manualTimeline.version,parent_draft_id:manual.draft_id,raw_text:"拖入素材",preserve_refs:[]};
  const template=insertAuthorizedMediaAt(manualTimeline,sourceSpan,90n,"source-drop-test");
  const inserted=template.flatMap((command:any)=>command.type==="add_clip"?[command.clip]:command.type==="restore_track"?command.track.clips:[]).find((clip:any)=>clip.clip_id==="source-drop-test");
  assert.ok(inserted,"the real Renderer insertion contains the selected video clip");
  const draftsBeforeOverlap=host.readCreationRequest("track-separate").drafts.length;
  for(const [position,name] of [[0n,"complete"],[45n,"partial"]] as const){
    const clip={...inserted,clip_id:`overlap-${name}`,timeline_start:position};
    await assert.rejects(host.editCreationDraft(credential,{...dropInput,operation_id:`source-drop-overlap-${name}`,commands:[{type:"add_track",track:{track_id:`video-overlap-${name}`,kind:"video",clips:[clip],captions:[]}}]}),(error:unknown)=>contains(error,"CREATION_SOURCE_TRACK_AUDIO_OVERLAP"),`${name} overlap must fail closed`);
    assert.deepEqual(host.readTimelineSnapshot(),manualTimeline);assert.equal(host.readCreationRequest("track-separate").drafts.length,draftsBeforeOverlap);
  }
  const firstDrop=insertAuthorizedMediaAt(manualTimeline,sourceSpan,0n,"source-drop-before");
  const first=await host.editCreationDraft(credential,{...dropInput,operation_id:"source-drop-before",commands:firstDrop});
  const firstTimeline=host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:first.draft_id});
  const shiftedRetained=firstTimeline.tracks.find(track=>track.track_id===retained.track.track_id)!;
  assert.equal(shiftedRetained.clips[0].timeline_start,90n,"inserting at 0 ripples the protected full track to exactly 3 seconds");
  const firstVideo=firstTimeline.tracks.find(track=>track.track_id===picture.track_id)!;
  assert.ok(!firstVideo.audio_routing?.some(route=>route.source_clip_id==="source-drop-before"&&route.muted===true),"new non-overlapping picture retains its own sound");
  const afterSpan=host.readCreationPrecisionSources(credential,{request_id:"track-separate",parent_draft_id:first.draft_id}).find((item:any)=>item.asset_id===selectedAsset&&item.media_kind==="video");assert.ok(afterSpan);
  const afterTick=firstTimeline.tracks.filter(track=>track.kind==="video").flatMap(track=>track.clips).reduce((end,clip)=>clip.timeline_start+clip.timeline_duration>end?clip.timeline_start+clip.timeline_duration:end,0n);
  const afterDrop=insertAuthorizedMediaAt(firstTimeline,afterSpan,afterTick,"source-drop-after");
  const dropped=await host.editCreationDraft(credential,{...dropInput,expected_timeline_version:firstTimeline.version,parent_draft_id:first.draft_id,operation_id:"source-drop-after",commands:afterDrop});
  const dropTimeline=host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:dropped.draft_id});
  assert.equal(dropTimeline.tracks.find(track=>track.track_id===retained.track.track_id)!.clips[0].timeline_start,90n);
  assert.ok(!dropTimeline.tracks.find(track=>track.track_id===picture.track_id)!.audio_routing?.some(route=>route.source_clip_id==="source-drop-after"&&route.muted===true));
  assert.deepEqual(host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:separateCreated.draft_id}),separateTimeline);
  const rendered=await host.renderCreationDraft(credential,{operation_id:"source-drop-render",request_id:"track-separate",draft_id:dropped.draft_id});
  for(const target of [rendered.receipt.preview,rendered.receipt.master]){
    assert.equal((target.qc_report as {status:string}).status,"passed");
    const path=resolve(root,`drop-${target.output_hash}.mp4`);await writeFile(path,readObjectSync(separateProject,target.output_hash));
    const {stdout}=await run("ffmpeg",["-v","error","-i",path,"-vn","-ac","1","-ar","48000","-f","f32le","pipe:1"],{encoding:"buffer",maxBuffer:3*1024*1024});
    assert.ok(stdout.length/4>=9*48000&&stdout.length/4<=9*48000+1024,"both outputs decode the complete 9-second work");
    for(const index of [0,1,2,3,4,5,6,7,8]){
      const frequency=[440,660,990][index%3],start=Math.round((index+0.2)*48000),count=24000;
      const magnitude=(hz:number)=>{let re=0,im=0;for(let j=0;j<count;j++){const sample=stdout.readFloatLE((start+j)*4),phase=2*Math.PI*hz*j/48000;re+=sample*Math.cos(phase);im+=sample*Math.sin(phase);}return 2*Math.hypot(re,im)/count;};
      const expected=magnitude(frequency),wrong=Math.max(...[440,660,990].filter(hz=>hz!==frequency).map(magnitude));
      assert.ok(expected>0.02&&expected>wrong*6,`source audio is audible in order during second ${index}: ${expected} vs ${wrong}`);
    }
  }
  await host.close();await host.open(separateProject,{requireCreationTimeline:true});
  assert.deepEqual(host.readCreationDraftTimeline(credential,{request_id:"track-separate",draft_id:dropped.draft_id}),dropTimeline);
  assert.equal(modelCalls,beforeManualCalls,"manual source drops, render and reopen must not call models");
  host.reviseCreationRequest(credential,"track-separate",1,{raw_text:"继续并保留环境声",viewed_timeline_version:dropTimeline.version,preserve_refs:[],ambient_requirement_update:{version:1,value:"require"}});
  await assert.rejects(host.editCreationDraft(credential,{operation_id:"track-manual-ambient",request_id:"track-separate",expected_revision:2,expected_timeline_version:dropTimeline.version,parent_draft_id:dropped.draft_id,raw_text:"再添加字幕",preserve_refs:[],commands:[{type:"set_track_properties",track_id:picture.track_id,properties:{captions:[{caption_id:"manual-source-caption-2",text:"caption 2",timeline_start:0n,timeline_duration:30n}]}}]}),(error:unknown)=>contains(error,"CREATION_AUDIO_EVIDENCE_INSUFFICIENT"));
  assert.deepEqual(host.readTimelineSnapshot(),dropTimeline,"ambient failure does not mutate the Timeline");
  console.log("Controlled source-track Host journey passed with real media, dual render and reopen.");
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true });
}
