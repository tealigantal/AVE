import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { auditObjectStore, openProject, readCreativeContractVersion, readEvidenceObject, readMaterialEvidencePack, readMediaAsset, registerCreativeContractVersion, registerEvidence, registerMaterialEvidencePack } from "../../packages/platform/project-storage/src/public.js";
import { createPersistentWorkerClient } from "../../packages/platform/worker-client/src/public.js";
import { addTime, compareTime, frameToTime, mapOriginalToProxy, proxyMapFromPoints, rationalTime, sampleToTime, timeToFrame, timeToPts, timeToSample, validateProxyMap } from "../../packages/core/timebase/src/public.js";
import { sourceRange, type AssetId } from "../../packages/core/media-identity/src/public.js";
import type { CommandEditIntent } from "../../packages/core/edit-ir/src/public.js";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-foundation-acceptance-"));
const media = resolve(root, "media");
const original = resolve(media, "same-name.mp4");
const moved = resolve(media, "moved", "same-name.mp4");
const changed = resolve(media, "changed", "same-name.mp4");
let activeHost: ProjectHostSession | undefined;
let activeStorage: Awaited<ReturnType<typeof openProject>> | undefined;

async function makeVideo(path: string, color: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=64x64:r=30000/1001:d=1`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", path]);
}

try {
  // ACC-028: normalization, exact rounding, NTSC frame rates, sample rates and bounded ProxyMap.
  assert.deepEqual(rationalTime(6000n, 24000n), rationalTime(1n, 4n));
  assert.deepEqual(addTime(rationalTime(1n, 3n), rationalTime(1n, 6n)), rationalTime(1n, 2n));
  assert.equal(timeToPts(rationalTime(1n, 3n), 1000n, "floor"), 333n);
  assert.equal(timeToPts(rationalTime(1n, 3n), 1000n, "nearest"), 333n);
  for (const [numerator, denominator] of [[24000n, 1001n], [30000n, 1001n], [60000n, 1001n]] as const) {
    const frame = numerator * 6n * 60n * 60n / denominator + 1n;
    assert.equal(timeToFrame(frameToTime(frame, numerator, denominator), numerator, denominator, "exact"), frame);
  }
  for (const sampleRate of [44_100n, 48_000n]) {
    const sample = sampleRate * 6n * 60n * 60n + 1n;
    assert.equal(timeToSample(sampleToTime(sample, sampleRate), sampleRate, "exact"), sample);
  }
  const bounded = proxyMapFromPoints([{ original: rationalTime(0n, 1000n), proxy: rationalTime(0n, 900n) }, { original: rationalTime(500n, 1000n), proxy: rationalTime(450n, 900n) }, { original: rationalTime(1000n, 1000n), proxy: rationalTime(900n, 900n) }], 1000n, 900n);
  validateProxyMap(bounded);
  assert.equal(compareTime(mapOriginalToProxy(bounded, rationalTime(500n, 1000n)), rationalTime(1n, 2n)), 0);
  assert.throws(() => mapOriginalToProxy(bounded, rationalTime(1001n, 1000n)), /out of range/);
  assert.throws(() => validateProxyMap({ ...bounded, segments: [bounded.segments[0], { ...bounded.segments[1], original_start: rationalTime(501n, 1000n) }] }), /continuous/);
  console.log("foundation checkpoint: exact time");

  // ACC-030: one handshake serves concurrent jobs; crash replay is opt-in.
  const crashMarker = resolve(root, "crash-once.marker");
  const fixture = String.raw`
    const fs=require('fs'); const readline=require('readline'); let handshakes=0;
    const emit=(v)=>process.stdout.write(JSON.stringify(v)+'\n');
    readline.createInterface({input:process.stdin}).on('line',(line)=>{const m=JSON.parse(line);
      if(m.message_type==='handshake'){handshakes++; emit({protocol_version:1,message_type:'handshake',payload:{status:'ready'}}); return;}
      if(m.message_type==='cancel'){emit({protocol_version:1,message_type:'job_result',job_id:m.job_id,status:'cancelled',outputs:[],diagnostics:[{code:'CANCELLED'}]}); return;}
      if(m.payload.task_type==='crash.once'&&!fs.existsSync(m.payload.marker)){fs.writeFileSync(m.payload.marker,'1'); process.exit(17);}
      emit({protocol_version:1,message_type:'progress',job_id:m.job_id,payload:{progress:0.5}});
      setTimeout(()=>emit({protocol_version:1,message_type:'job_result',job_id:m.job_id,status:'succeeded',outputs:[{handshakes,task:m.payload.task_type}],diagnostics:[]}),10);
    });`;
  const client = createPersistentWorkerClient({ command: process.execPath, args: ["-e", fixture] });
  const concurrent = await Promise.all([client.submit<{}, { outputs: Array<{ handshakes: number }> }>("echo.a", {}, { jobId: "a" }), client.submit<{}, { outputs: Array<{ handshakes: number }> }>("echo.b", {}, { jobId: "b" })]);
  assert.ok(concurrent.every((result) => result.outputs[0].handshakes === 1));
  const recovered = await client.submit<{ marker: string }, { outputs: Array<{ handshakes: number }> }>("crash.once", { marker: crashMarker }, { jobId: "crash", idempotent: true });
  assert.equal(recovered.outputs[0].handshakes, 1);
  assert.equal(client.generation, 2);
  await client.close();
  console.log("foundation checkpoint: persistent Worker");

  // ACC-029/031: Host validates content candidates, relinks identical bytes, stales changed dependencies and persists Edit IR atomically.
  await makeVideo(original, "red");
  await mkdir(dirname(moved), { recursive: true });
  await copyFile(original, moved);
  await makeVideo(changed, "blue");
  const host = new ProjectHostSession();
  activeHost = host;
  await host.create(root);
  console.log("foundation checkpoint: host created");
  const [imported] = await host.importMedia([original]) as Array<{ asset_id: AssetId; probe: { streams?: Array<{ codec_type?: string; time_base?: string; duration_ts?: string }> } }>;
  console.log("foundation checkpoint: media imported");
  assert.ok(imported.asset_id.startsWith("asset:sha256:"));
  host.registerMediaDependency(imported.asset_id, "artifact:derived:1", "dependency:derived:1");
  await host.relinkOriginal(imported.asset_id, moved);
  console.log("foundation checkpoint: identical media relinked");
  await assert.rejects(() => host.relinkOriginal(imported.asset_id, changed), /ORIGINAL_CONTENT_CHANGED/);
  console.log("foundation checkpoint: relink");
  assert.equal((host.listMediaDependencies()[0] as { state: string }).state, "stale");
  const video = imported.probe.streams?.find((stream) => stream.codec_type === "video");
  const timeBase = video?.time_base?.match(/^(\d+)\/(\d+)$/);
  assert.ok(timeBase && video?.duration_ts);
  const numerator = BigInt(timeBase![1]); const timescale = BigInt(timeBase![2]); const duration = BigInt(video!.duration_ts!) * numerator;
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "clip-1", source: sourceRange(imported.asset_id, 0n, duration, timescale), timeline_start: 0n, timeline_duration: duration } }, 0);
  const beforeBlockedEdit = host.readTimelineSnapshot() as { version: number };
  const protectedIntent: CommandEditIntent = { intent_id: "protected-removal", base_version: beforeBlockedEdit.version, actor: { actor_id: "model-1", producer: "model" }, targets: [{ track_id: "v1", clip_id: "clip-1" }], commands: [{ type: "remove_clip", track_id: "v1", clip_id: "clip-1" }], semantic_refs: ["model-candidate:1"], preconditions: [{ kind: "clip_exists", track_id: "v1", clip_id: "clip-1" }], protected_refs: ["clip-1"], provenance: { source_id: "model-run:1" }, reason: "attempt protected edit", expected_effects: ["clip removed"] };
  assert.throws(() => host.executeEdit(protectedIntent), /EDIT_PROTECTED_REFERENCE/);
  assert.equal((host.readTimelineSnapshot() as { version: number }).version, beforeBlockedEdit.version);
  host.applyTimelineCommand({ type: "set_track_properties", track_id: "v1", properties: { locked: true } }, beforeBlockedEdit.version);
  const lockedVersion = (host.readTimelineSnapshot() as { version: number }).version;
  const lockBypassIntent: CommandEditIntent = { intent_id: "locked-track-bypass", base_version: lockedVersion, actor: { actor_id: "model-1", producer: "model" }, targets: [{ track_id: "v1", clip_id: "clip-1" }], commands: [{ type: "set_track_properties", track_id: "v1", properties: { opacity: 0.5 } }, { type: "remove_clip", track_id: "v1", clip_id: "clip-1" }], semantic_refs: [], preconditions: [{ kind: "timeline_version", version: lockedVersion }], protected_refs: [], provenance: { source_id: "model-run:lock-bypass" }, reason: "attempt unrelated property lock bypass", expected_effects: ["opacity changed", "clip removed"] };
  assert.throws(() => host.executeEdit(lockBypassIntent), /EDIT_TRACK_LOCKED/);
  assert.equal((host.readTimelineSnapshot() as { version: number }).version, lockedVersion);
  await host.close();
  activeHost = undefined;
  console.log("foundation checkpoint: unified edit");

  // ACC-032: Edit IR and Timeline reopen, object audit, migration backup and fault restoration.
  let storage = await openProject(root);
  activeStorage = storage;
  assert.equal(storage.db.prepare("SELECT MAX(timeline_version) AS version FROM timeline_versions").get().version, 2);
  assert.ok(storage.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_type = 'edit_ir'").get().count >= 1);
  assert.ok((await auditObjectStore(storage)).checked >= 2);
  registerEvidence(storage, storage.manifest.project_id, { evidence_id: "asr:migration-fault", analysis_type: "asr", asset_id: imported.asset_id, start_pts: 0, end_pts: 1, text: "preserve me across migration fault" });
  const migrationContract = { schema_version: 2, contract_id: "contract-migration-fault", project_id: storage.manifest.project_id, object_version: 1, status: "approved", approval: { review_digest: "a".repeat(64), actor_id: "user", approved_at: "2026-08-24T00:00:00Z" } };
  const migrationContractRow = registerCreativeContractVersion(storage, storage.manifest.project_id, migrationContract) as any;
  const migrationPack = { schema_version: 1, pack_id: "pack-migration-fault", project_id: storage.manifest.project_id, object_version: 1, status: "sufficient", contract_ref: { object_id: migrationContract.contract_id, object_version: 1, digest: migrationContractRow.object_hash }, evidence_refs: [], coverage_matrix_ref: { object_id: "coverage-migration-fault", object_version: 1, digest: "b".repeat(64) }, sufficiency: { covered_requirement_ids: [], missing_requirement_ids: [], conflicting_requirement_ids: [] }, availability: [], policy_snapshot: { policy_version: "knowledge-v1", privacy_policy_ref: { object_id: "privacy", object_version: 1, digest: "c".repeat(64) }, rights_policy_ref: { object_id: "rights", object_version: 1, digest: "d".repeat(64) } }, input_fingerprint: "e".repeat(64), created_at: "2026-08-24T00:01:00Z", provenance: { producer: "project-host", source_version: "creative-context-v1", policy_version: "knowledge-v1", input_refs: [], unresolved_assumptions: [] } };
  const migrationPackRow = registerMaterialEvidencePack(storage, storage.manifest.project_id, migrationPack) as any;
  const migrationObjectRefCount = (storage.db.prepare("SELECT COUNT(*) AS count FROM object_refs").get() as any).count;
  storage.db.exec("DROP TABLE feedback_diagnosis_edges; DROP TABLE feedback_diagnoses; DROP TABLE permission_human_approvals; DROP TABLE permission_decision_edges; DROP TABLE permission_decisions; DROP TABLE permission_policy_snapshots; DROP TABLE editorial_artifact_edges; DROP TABLE editorial_artifacts; DELETE FROM schema_migrations WHERE version IN (24,25,26,27);");
  await storage.close();
  activeStorage = undefined;
  console.log("foundation checkpoint: storage recovery");
  await assert.rejects(() => openProject(root, { failMigrationVersion: 24 }), /MIGRATION_FAULT_INJECTED:24/);
  assert.ok((await readdir(resolve(root, "backups"))).some((name) => name.startsWith("pre-migration-v23-")));
  storage = await openProject(root);
  activeStorage = storage;
  assert.equal(storage.db.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 24").get().count, 1);
  assert.equal(storage.db.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 25").get().count, 1);
  assert.equal(storage.db.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 26").get().count, 1);
  assert.equal(storage.db.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 27").get().count, 1);
  assert.equal(storage.db.prepare("SELECT COUNT(*) AS count FROM editorial_artifacts").get().count, 0);
  assert.equal(storage.db.prepare("SELECT MAX(timeline_version) AS version FROM timeline_versions").get().version, 2);
  assert.ok(storage.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_type = 'edit_ir'").get().count >= 1);
  assert.ok(readMediaAsset(storage, storage.manifest.project_id, imported.asset_id));
  assert.equal((readEvidenceObject(storage, "asr:migration-fault") as any).value.text, "preserve me across migration fault");
  assert.equal((readCreativeContractVersion(storage, storage.manifest.project_id, migrationContract.contract_id, 1) as any).object_hash, migrationContractRow.object_hash);
  assert.equal((readMaterialEvidencePack(storage, storage.manifest.project_id, migrationPack.pack_id, 1) as any).object_hash, migrationPackRow.object_hash);
  assert.equal((storage.db.prepare("SELECT COUNT(*) AS count FROM object_refs").get() as any).count, migrationObjectRefCount);
  assert.equal(storage.db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  await storage.close();
  activeStorage = undefined;

  console.log("foundation synthetic acceptance passed: ACC-028 through ACC-032");
} finally {
  await activeHost?.close().catch(() => undefined);
  await activeStorage?.close().catch(() => undefined);
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}
