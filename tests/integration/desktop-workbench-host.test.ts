import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { safeMediaRows } from "../../apps/desktop/src/main/ipc/project-media-projection.js";
import { createCreationProject, openCreationProject } from "../../apps/desktop/src/main/project-lifecycle.js";
import { createPersistentJob, openProject, readPersistentJob, startPersistentJob } from "../../packages/platform/project-storage/src/public.js";

const projectionBase = { asset_location_id: "location-safe", asset_id: "asset-safe", location_type: "original", verified_at: "2026-08-27T00:00:00.000Z", metadata: { arbitrary_private_value: "omit-me", permission_decision: { actor_id: "private-actor", approval_id: "private-approval" }, probe: { timing: { streams: { v0: { codec_type: "video", time_base: "1/90000", duration_ts: 180000, width: 1920, height: 1080, private_probe_value: "omit-me" } } } } } };
for (const permissionState of ["authorized", "denied"] as const) {
  const projected = safeMediaRows([{ ...projectionBase, metadata: { ...projectionBase.metadata, permission_state: permissionState } }])[0] as any;
  assert.deepEqual(Object.keys(projected).sort(), ["asset_id", "asset_location_id", "display_name", "location_type", "metadata", "permission_state", "verified_at"]); assert.equal(projected.permission_state, permissionState); assert.deepEqual(Object.keys(projected.metadata), ["probe"]); assert.deepEqual(projected.metadata.probe.timing.streams.v0, { codec_type: "video", time_base: "1/90000", duration_ts: 180000, width: 1920, height: 1080 }); assert.equal(JSON.stringify(projected).includes("private"), false); assert.equal(JSON.stringify(projected).includes("approval"), false);
}
for (const location_ref of ["C:\\private-media\\演出.mp4", "/private-media/演出.mp4"]) {
  const projected = safeMediaRows([{ ...projectionBase, location_ref }])[0] as any;
  assert.equal(projected.display_name, "演出.mp4");
  assert.equal(JSON.stringify(projected).includes("private-media"), false, "only the basename may cross the Main projection");
  assert.equal(Object.hasOwn(projected, "location_ref"), false);
}
assert.equal((safeMediaRows([projectionBase])[0] as any).display_name, null);
const absentPermissionProjection = safeMediaRows([projectionBase])[0] as any; assert.equal(Object.prototype.hasOwnProperty.call(absentPermissionProjection, "permission_state"), true); assert.equal(absentPermissionProjection.permission_state, undefined);
const visibleMediaRows = safeMediaRows([
  projectionBase,
  { ...projectionBase, asset_location_id: "proxy-safe", location_type: "proxy" },
  { ...projectionBase, asset_location_id: "immutable-internal", location_type: "immutable_original", metadata: { internal_secret: "must-not-project" } },
  { ...projectionBase, asset_location_id: "future-internal", location_type: "future_internal", metadata: { internal_secret: "must-not-project" } },
]) as any[];
assert.deepEqual(visibleMediaRows.map((row) => row.location_type), ["original", "proxy"], "the desktop Media Panel must fail closed to user-visible Original and Proxy rows");
assert.equal(JSON.stringify(visibleMediaRows).includes("internal"), false);

const fixture = resolve("tests/fixtures/generated/p0-vfr.mp4");
const root = await mkdtemp(resolve(tmpdir(), "ave-workbench-host-"));
const rejectedRoot = await mkdtemp(resolve(tmpdir(), "ave-workbench-no-timebase-"));
const host = new ProjectHostSession();
try {
  await createCreationProject(host,root);
  const initialized=host.readTimelineSnapshot() as any;
  assert.equal(initialized.version,0);assert.deepEqual(initialized.tracks,[]);assert.deepEqual(initialized.sequence.timebase,{value:1n,timescale:30n});
  assert.equal(host.latestRender(),null);assert.equal(await host.readLatestPreview(),null);
  const imported=await host.importMedia([fixture]);assert.equal(imported.length,1);
  const media=imported[0] as any;assert.match(media.asset_id,/^asset:sha256:[0-9a-f]{64}$/);
  const jobs=host.listJobs();assert.equal(jobs.length,2);assert.ok(jobs.every((job:any)=>job.state==="SUCCEEDED"));
  const stream=media.probe.streams.find((stream:any)=>stream.codec_type==="video");assert.ok(stream);
  const timing=media.probe.timing.streams[String(stream.index)];assert.ok(timing);assert.equal(timing.time_base,stream.time_base);assert.equal(String(timing.duration_ts),String(stream.duration_ts));
  const timeBase=String(stream.time_base).match(/^(\d+)\/(\d+)$/);assert.ok(timeBase);
  const source={asset_id:media.asset_id,start_pts:BigInt(stream.start_pts)*BigInt(timeBase![1]),end_pts:(BigInt(stream.start_pts)+BigInt(stream.duration_ts))*BigInt(timeBase![1]),timescale:BigInt(timeBase![2])};
  host.applyTimelineCommand({type:"add_track",track:{track_id:"shots",kind:"video",clips:[{clip_id:"clip-workbench",source,timeline_start:0n,timeline_duration:30n}],captions:[{caption_id:"caption",text:"1n",timeline_start:0n,timeline_duration:30n}]}},0);
  host.applyTimelineCommand({type:"move_clip",track_id:"shots",clip_id:"clip-workbench",timeline_start:2n},1);
  host.applyTimelineCommand({type:"trim_source",track_id:"shots",clip_id:"clip-workbench",source:{...source,end_pts:source.end_pts-1n}},2);
  const expected=host.readTimelineSnapshot() as any;assert.equal(expected.version,3);assert.equal(expected.tracks[0].clips[0].timeline_start,2n);
  const diff=host.readTimelineDiff() as any;assert.deepEqual(diff.changed_clip_ids,["clip-workbench"]);assert.deepEqual(diff.added_clip_ids,[]);assert.deepEqual(diff.removed_clip_ids,[]);
  const projectId=host.status().project;await host.close();await openCreationProject(host,root);
  assert.equal(host.status().project,projectId);assert.deepEqual(host.readTimelineSnapshot(),expected);assert.equal(host.listMedia().length,1);assert.equal(host.listJobs().length,2);
  await host.create(rejectedRoot);host.initializeTimeline([{track_id:"shots",kind:"video",clips:[]}]);
  const session=(host as any).session,rejectedProject=host.status().project;
  createPersistentJob(session,rejectedProject,{job_id:"not-recovered",task_type:"test",idempotency_key:"not-recovered",input_hash:"a".repeat(64),input:{},state:"PENDING"});startPersistentJob(session,"not-recovered");
  await host.close();await assert.rejects(openCreationProject(host,rejectedRoot),/explicit positive sequence timing/);assert.equal(host.status().project,"not-open");
  const stored=await openProject(rejectedRoot);try{assert.equal(readPersistentJob(stored,"not-recovered").state,"RUNNING");}finally{await stored.close();}
  const cause=new Error("INITIALIZATION_FAILED"),cleanup=new Error("CLOSE_FAILED");
  await assert.rejects(createCreationProject({create:async()=>{},initializeCreationTimeline:()=>{throw cause;},close:async()=>{throw cleanup;}} as any,"unused"),(error:any)=>error instanceof AggregateError&&error.cause===cause&&error.errors[1]===cleanup);
} finally {
  await host.close();
  await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});await rm(rejectedRoot,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
console.log("desktop current project: safe media, real import/job persistence, multi-track/caption reopen, denial before recovery and original cleanup causes passed");
