import { DatabaseSync } from "node:sqlite";
import { closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, renameSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

const MIGRATIONS = resolve(import.meta.dirname, "../../../../database/migrations");

export async function createProject(projectDirectory, { portable = false } = {}) {
  await mkdir(projectDirectory, { recursive: true });
  const projectId = randomUUID();
  const createdAt = new Date().toISOString();
  const manifest = { project_id: projectId, project_format_version: 1, database: "project.sqlite", created_at: createdAt, portable };
  await writeAtomic(resolve(projectDirectory, "project.json"), JSON.stringify(manifest, null, 2) + "\n");
  for (const directory of ["originals", "links", "derived", "objects/sha256", "previews", "renders", "exports", "licenses", "logs", "crash", "temp"]) await mkdir(resolve(projectDirectory, directory), { recursive: true });
  const session = await openProject(projectDirectory);
  session.db.prepare("INSERT INTO projects VALUES (?, ?, ?, ?)").run(projectId, 1, createdAt, portable ? 1 : 0);
  session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "project.created", "{}", createdAt);
  return session;
}

export async function openProject(projectDirectory) {
  const manifest = JSON.parse(await readFile(resolve(projectDirectory, "project.json"), "utf8"));
  if (manifest.database !== "project.sqlite" || manifest.project_format_version !== 1) throw new Error("unsupported project manifest");
  const lock = acquireProjectLock(projectDirectory);
  let db;
  try {
    db = new DatabaseSync(resolve(projectDirectory, manifest.database));
    db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    for (const [version, file] of [[1, "0001_project_core.sql"], [4, "0004_timeline_versions.sql"], [7, "0007_render_and_qc.sql"], [8, "0008_evidence_records.sql"], [9, "0009_render_runs.sql"], [10, "0010_story_plans.sql"], [11, "0011_assembly_cuts.sql"], [12, "0012_review_artifacts.sql"], [13, "0013_reaction_timings.sql"], [14, "0014_delivery_records.sql"], [15, "0015_jobs.sql"], [16, "0016_timeline_redo.sql"], [17, "0017_render_results.sql"], [18, "0018_object_store_and_blueprint.sql"], [19, "0019_render_bundles.sql"]]) { db.exec(await readFile(resolve(MIGRATIONS, file), "utf8")); db.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(version, new Date().toISOString()); }
    backfillLegacyObjects({ projectDirectory, db });
    const result = db.prepare("PRAGMA integrity_check").get();
    if (result.integrity_check !== "ok") throw new Error("project integrity check failed");
    return { manifest, projectDirectory, db, lock, integrity: result.integrity_check, async close() { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); db.close(); await releaseProjectLock(lock); } };
  } catch (error) { try { db?.close(); } catch {} await releaseProjectLock(lock); throw error; }
}

function acquireProjectLock(projectDirectory) {
  const path = resolve(projectDirectory, "project.lock");
  let fd;
  try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY); writeFileSync(fd, String(process.pid), "utf8"); fsyncSync(fd); closeSync(fd); return path; }
  catch (error) { if (fd !== undefined) closeSync(fd); if (error.code === "EEXIST") { const owner = Number(readFileSync(path, "utf8").trim()); if (!Number.isInteger(owner) || owner <= 0) { rmSync(path, { force: true }); return acquireProjectLock(projectDirectory); } try { process.kill(owner, 0); } catch { rmSync(path, { force: true }); return acquireProjectLock(projectDirectory); } throw new Error("project is already locked"); } throw error; }
}

function releaseProjectLock(lock) { if (existsSync(lock)) { const fd = openSync(lock, constants.O_RDONLY); closeSync(fd); } return rm(lock, { force: true }); }

function backfillLegacyObjects(session) {
  const now = new Date().toISOString();
  const add = (projectId, objectRefId, objectType, relationKey, value) => { if (session.db.prepare("SELECT 1 FROM object_refs WHERE object_ref_id = ?").get(objectRefId)) return; session.db.exec("BEGIN IMMEDIATE"); try { storeJsonInTransaction(session, projectId, value, { object_ref_id: objectRefId, object_type: objectType, relation_key: relationKey }, now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } };
  for (const row of session.db.prepare("SELECT project_id, timeline_version, snapshot_json FROM timeline_versions").all()) add(row.project_id, `${row.project_id}:timeline:${row.timeline_version}`, "timeline_snapshot", `timeline:${row.timeline_version}`, JSON.parse(row.snapshot_json));
  for (const row of session.db.prepare("SELECT plan_id, project_id, proposal_id, approved_by, approved_at, beats_json FROM approved_story_plans").all()) add(row.project_id, `${row.project_id}:story-plan:${row.plan_id}`, "story_plan", row.plan_id, { schema_version: 1, plan_id: row.plan_id, proposal_id: row.proposal_id, approved_by: row.approved_by, approved_at: row.approved_at, beats: JSON.parse(row.beats_json) });
  for (const row of session.db.prepare("SELECT assembly_id, project_id, cut_json FROM assembly_cuts").all()) { const value = JSON.parse(row.cut_json); if (!value.object_hash) add(row.project_id, `${row.project_id}:assembly:${row.assembly_id}`, "assembly_cut", row.assembly_id, value); }
  for (const row of session.db.prepare("SELECT artifact_id, project_id, artifact_json FROM review_artifacts").all()) { const value = JSON.parse(row.artifact_json); if (!value.object_hash) add(row.project_id, `${row.project_id}:review:${row.artifact_id}`, "review_artifact", row.artifact_id, value); }
  for (const row of session.db.prepare("SELECT record_id, project_id, record_type, record_json FROM delivery_records").all()) { const value = JSON.parse(row.record_json); if (!value.object_hash) add(row.project_id, `${row.project_id}:delivery:${row.record_id}`, row.record_type === "privacy" ? "privacy_ledger" : row.record_type === "rights" ? "rights_ledger" : "delivery_record", row.record_id, value); }
}

async function writeAtomic(path, contents) { const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`; await writeFile(temporary, contents, "utf8"); const fd = openSync(temporary, "r+"); fsyncSync(fd); closeSync(fd); await rename(temporary, path); }
function writeAtomicSync(path, contents) { const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`; writeFileSync(temporary, contents); const fd = openSync(temporary, "r+"); fsyncSync(fd); closeSync(fd); renameSync(temporary, path); }

export async function putObject(projectDirectory, bytes) { const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); await mkdir(dirname(path), { recursive: true }); if (!existsSync(path)) await writeAtomic(path, bytes); return { hash, path }; }
export function putObjectSync(projectDirectory, bytes) { const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); mkdirSync(dirname(path), { recursive: true }); if (!existsSync(path)) writeAtomicSync(path, bytes); return { hash, path }; }
export async function putObjectAndRegister(session, projectId, bytes, metadata = {}) { const stored = await putObject(session.projectDirectory, bytes); registerObjectRef(session, projectId, stored, { ...metadata, byte_length: metadata.byte_length ?? bytes.byteLength }); return stored; }
function assertStoredObject(stored) { if (!/^[0-9a-f]{64}$/.test(stored.hash) || !existsSync(stored.path)) throw new Error("object file missing"); const actual = createHash("sha256").update(readFileSync(stored.path)).digest("hex"); if (actual !== stored.hash) throw new Error("object hash mismatch"); }
function insertObjectRefRows(session, projectId, stored, metadata, now) { const reference = { object_ref_id: metadata.object_ref_id ?? randomUUID(), object_type: metadata.object_type ?? "opaque", version: metadata.version ?? null, relation_key: metadata.relation_key ?? null, metadata_json: json(metadata) }; session.db.prepare("INSERT OR IGNORE INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?, ?, ?, ?)").run(stored.hash, stored.path, Number(metadata.byte_length ?? readFileSync(stored.path).byteLength), now); session.db.prepare("INSERT INTO object_refs(object_ref_id,project_id,object_hash,object_type,version,relation_key,metadata_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(reference.object_ref_id, projectId, stored.hash, reference.object_type, reference.version, reference.relation_key, reference.metadata_json, now); return { ...reference, object_hash: stored.hash, path: stored.path }; }
export function registerObjectRef(session, projectId, stored, metadata = {}) { assertStoredObject(stored); const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE"); try { const reference = insertObjectRefRows(session, projectId, stored, metadata, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "object.ref.registered", json(reference), now); session.db.exec("COMMIT"); return reference; } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export async function readObject(projectDirectory, hash) { const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const bytes = await readFile(path); const actual = createHash("sha256").update(bytes).digest("hex"); if (actual !== hash) throw new Error("object hash mismatch"); return bytes; }
export function readObjectSync(projectDirectory, hash) { const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const bytes = readFileSync(path); const actual = createHash("sha256").update(bytes).digest("hex"); if (actual !== hash) throw new Error("object hash mismatch"); return bytes; }
export async function listOrphanObjects(session, projectDirectory, { deleteOrphans = false } = {}) { const referenced = new Set(session.db.prepare("SELECT object_hash FROM object_refs").all().map((row) => row.object_hash)); const root = resolve(projectDirectory, "objects", "sha256"); const candidates = []; for (const shard of await readdir(root, { withFileTypes: true }).catch(() => [])) { if (!shard.isDirectory() || !/^[0-9a-f]{2}$/.test(shard.name)) continue; for (const entry of await readdir(resolve(root, shard.name), { withFileTypes: true })) { if (!entry.isFile() || !/^[0-9a-f]{64}$/.test(entry.name) || referenced.has(entry.name)) continue; const path = resolve(root, shard.name, entry.name); candidates.push(path); if (deleteOrphans) await rm(path, { force: true }); } } if (deleteOrphans) { session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("DELETE FROM object_store WHERE object_hash NOT IN (SELECT object_hash FROM object_refs)").run(); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } } return candidates; }

export function commitTimeline(session, projectId, timeline, command, baseVersion) { const snapshot = JSON.stringify(timeline, (_, value) => typeof value === "bigint" ? `${value}n` : value); const commandJson = JSON.stringify(command, (_, value) => typeof value === "bigint" ? `${value}n` : value); const stored = putObjectSync(session.projectDirectory, Buffer.from(snapshot)); const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE"); try { insertObjectRefRows(session, projectId, stored, { object_ref_id: `${projectId}:timeline:${timeline.version}`, object_type: "timeline_snapshot", version: timeline.version, relation_key: `timeline:${timeline.version}`, byte_length: Buffer.byteLength(snapshot) }, now); session.db.prepare("INSERT INTO timeline_versions(timeline_version, project_id, snapshot_json, created_at) VALUES (?, ?, ?, ?)").run(timeline.version, projectId, snapshot, now); session.db.prepare("INSERT INTO timeline_commands(project_id, base_version, command_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, baseVersion, commandJson, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "timeline.committed", json({ ...command, snapshot_object_hash: stored.hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function commitTimelinePlan(session, projectId, timeline, plan, redo = null) { const snapshot = JSON.stringify(timeline, (_, value) => typeof value === "bigint" ? `${value}n` : value); const planJson = JSON.stringify(plan, (_, value) => typeof value === "bigint" ? `${value}n` : value); const stored = putObjectSync(session.projectDirectory, Buffer.from(snapshot)); const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE"); try { const latest = session.db.prepare("SELECT timeline_version FROM timeline_versions WHERE project_id = ? ORDER BY timeline_version DESC LIMIT 1").get(projectId); const currentVersion = latest?.timeline_version ?? null; if (currentVersion !== plan.base_version) throw new Error(`timeline version conflict: expected ${currentVersion}, received ${plan.base_version}`); if (timeline.version !== plan.expected_final_version) throw new Error("commit plan final version mismatch"); insertObjectRefRows(session, projectId, stored, { object_ref_id: `${projectId}:timeline:${timeline.version}`, object_type: "timeline_snapshot", version: timeline.version, relation_key: `timeline:${timeline.version}`, byte_length: Buffer.byteLength(snapshot) }, now); session.db.prepare("INSERT INTO timeline_versions(timeline_version, project_id, snapshot_json, created_at) VALUES (?, ?, ?, ?)").run(timeline.version, projectId, snapshot, now); session.db.prepare("INSERT INTO timeline_commands(project_id, base_version, command_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, plan.base_version, planJson, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "timeline.commit_plan.committed", json({ ...plan, snapshot_object_hash: stored.hash }), now); session.db.prepare("DELETE FROM timeline_redo WHERE project_id = ?").run(projectId); if (redo) { const redoJson = JSON.stringify(redo, (_, value) => typeof value === "bigint" ? `${value}n` : value); session.db.prepare("INSERT INTO timeline_redo(project_id, base_version, commands_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, redo.baseVersion, redoJson, new Date().toISOString()); } session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

function timelineSnapshot(session, projectId, version, fallback) { const reference = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id = ? AND object_type = 'timeline_snapshot' AND relation_key = ? ORDER BY created_at DESC LIMIT 1").get(projectId, `timeline:${version}`); if (!reference) return fallback; return readObjectSync(session.projectDirectory, reference.object_hash).toString("utf8"); }
export function readLatestTimeline(session, projectId) { const row = session.db.prepare("SELECT timeline_version, snapshot_json FROM timeline_versions WHERE project_id = ? ORDER BY timeline_version DESC LIMIT 1").get(projectId); return row ? timelineSnapshot(session, projectId, row.timeline_version, row.snapshot_json) : null; }
export function readTimelineAtVersion(session, projectId, version) { const row = session.db.prepare("SELECT snapshot_json FROM timeline_versions WHERE project_id = ? AND timeline_version = ?").get(projectId, version); return row ? timelineSnapshot(session, projectId, version, row.snapshot_json) : null; }
function storeJsonInTransaction(session, projectId, value, metadata, now) { const bytes = Buffer.from(json(value)); const stored = putObjectSync(session.projectDirectory, bytes); return insertObjectRefRows(session, projectId, stored, { ...metadata, byte_length: bytes.byteLength }, now); }
export function readLatestTimelineCommand(session, projectId) { return session.db.prepare("SELECT command_json, base_version FROM timeline_commands WHERE project_id = ? ORDER BY command_id DESC LIMIT 1").get(projectId) ?? null; }
export function readTimelineRedo(session, projectId) { const row = session.db.prepare("SELECT base_version, commands_json FROM timeline_redo WHERE project_id = ?").get(projectId); if (!row) return null; const payload = JSON.parse(row.commands_json); return { baseVersion: row.base_version, commands: payload?.commands ?? payload }; }

export async function registerExport(session, projectId, registration) { const bytes = await readFile(registration.path); const sha256 = createHash("sha256").update(bytes).digest("hex"); if (sha256 !== registration.sha256) throw new Error("export hash mismatch"); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO render_outputs(export_id,project_id,delivery_id,path,sha256,media_type,qc_report_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(registration.export_id, projectId, registration.delivery_id, registration.path, registration.sha256, registration.media_type, registration.qc_report_id, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "export.registered", JSON.stringify(registration), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function readExport(session, exportId) { return session.db.prepare("SELECT * FROM render_outputs WHERE export_id = ?").get(exportId) ?? null; }
export function listExports(session, projectId) { return session.db.prepare("SELECT * FROM render_outputs WHERE project_id = ? ORDER BY created_at ASC").all(projectId); }
export function registerModelRun(session, projectId, record) {
  if (!record?.model_run_id || !record.input_object_hash || !record.output_object_hash || !record.status || !record.metadata) throw new Error("invalid model run");
  const now = new Date().toISOString();
  session.db.prepare("INSERT INTO model_runs(model_run_id,project_id,input_object_hash,output_object_hash,status,metadata_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(record.model_run_id, projectId, record.input_object_hash, record.output_object_hash, record.status, JSON.stringify(record.metadata), now);
  session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "model.run.registered", json({ model_run_id: record.model_run_id, status: record.status }), now);
  return readModelRun(session, record.model_run_id);
}
export function listModelRuns(session, projectId) { return session.db.prepare("SELECT model_run_id, project_id, input_object_hash, output_object_hash, status, metadata_json, created_at FROM model_runs WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json) })); }
export function readModelRun(session, modelRunId) { const row = session.db.prepare("SELECT model_run_id, project_id, input_object_hash, output_object_hash, status, metadata_json, created_at FROM model_runs WHERE model_run_id = ?").get(modelRunId); return row ? { ...row, metadata: JSON.parse(row.metadata_json) } : null; }

export function registerAssetLocation(session, projectId, location) {
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("INSERT OR REPLACE INTO asset_locations(asset_location_id,project_id,asset_id,location_type,location_ref,verified_at,metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)").run(location.asset_location_id, projectId, location.asset_id, location.location_type, location.location_ref, location.verified_at ?? now, json(location.metadata ?? {})); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'asset.location.registered', ?, ?)").run(projectId, json({ ...location, verified_at: location.verified_at ?? now }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function listAssetLocations(session, projectId) { return session.db.prepare("SELECT asset_location_id, project_id, asset_id, location_type, location_ref, verified_at, metadata_json FROM asset_locations WHERE project_id = ? ORDER BY asset_location_id ASC").all(projectId).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json) })); }

export function registerRender(session, projectId, render) {
  session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("INSERT INTO render_runs(render_id,project_id,original_path,proxy_path,preview_path,master_path,qc_status,qc_report_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(render.render_id, projectId, render.original_path, render.proxy_path, render.preview_path, render.master_path, render.qc_report.status, JSON.stringify(render.qc_report), new Date().toISOString());
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "render.completed", JSON.stringify(render), new Date().toISOString());
    session.db.exec("COMMIT");
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readLatestRender(session, projectId) { return session.db.prepare("SELECT * FROM render_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").get(projectId) ?? null; }
export function listRenderResults(session, projectId) { return session.db.prepare("SELECT * FROM render_results WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => ({ ...row, original_refs: JSON.parse(row.original_refs_json), proxy_refs: JSON.parse(row.proxy_refs_json), profile: JSON.parse(row.profile_json) })); }
export function registerRenderResult(session, projectId, result) { const json = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item); session.db.exec("BEGIN IMMEDIATE"); try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, result, { object_ref_id: `${projectId}:render-result:${result.render_result_id}`, object_type: "render_result", relation_key: result.render_result_id }, now); session.db.prepare("INSERT INTO render_results(render_result_id,render_id,project_id,target,timeline_version,graph_hash,original_refs_json,proxy_refs_json,profile_json,worker_version,ffmpeg_version,output_path,output_hash,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(result.render_result_id, result.render_id, projectId, result.target, result.timeline_version, result.graph_hash, json(result.original_refs), json(result.proxy_refs), json(result.profile), result.worker_version, result.ffmpeg_version, result.output_path, result.output_hash, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "render.result.registered", json({ ...result, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readLatestRenderResult(session, projectId, target) { const row = target ? session.db.prepare("SELECT * FROM render_results WHERE project_id = ? AND target = ? ORDER BY created_at DESC LIMIT 1").get(projectId, target) : session.db.prepare("SELECT * FROM render_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").get(projectId); if (!row) return null; return { ...row, original_refs: JSON.parse(row.original_refs_json), proxy_refs: JSON.parse(row.proxy_refs_json), profile: JSON.parse(row.profile_json) }; }

function canonicalStorageValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("render bundle contains a non-finite number"); return Object.is(value, -0) ? 0 : value; }
  if (typeof value === "bigint") return { $ave_bigint: value.toString(10) };
  if (Array.isArray(value)) return value.map(canonicalStorageValue);
  if (typeof value === "object") return Object.fromEntries(Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => [key, canonicalStorageValue(value[key])]));
  throw new Error(`render bundle contains unsupported value: ${typeof value}`);
}
function canonicalStorageJson(value) { return JSON.stringify(canonicalStorageValue(value)); }
function readRenderBundleRow(session, row) { if (!row) return null; return { ...JSON.parse(readObjectSync(session.projectDirectory, row.bundle_object_hash).toString("utf8")), bundle_object_hash: row.bundle_object_hash, content_hash: row.content_hash, created_at: row.created_at }; }
export function readRenderBundle(session, bundleId) { return readRenderBundleRow(session, session.db.prepare("SELECT * FROM render_bundles WHERE bundle_id = ?").get(bundleId)); }
export function readRenderBundleByIdempotency(session, projectId, idempotencyKey) { return readRenderBundleRow(session, session.db.prepare("SELECT * FROM render_bundles WHERE project_id = ? AND idempotency_key = ?").get(projectId, idempotencyKey)); }

export function registerRenderBundle(session, projectId, bundle, { fail_at: failAt = null } = {}) {
  if (!bundle || bundle.schema_version !== 1 || !bundle.bundle_id || !bundle.idempotency_key || !["completed", "blocked"].includes(bundle.state) || !Array.isArray(bundle.manifests)) throw new Error("invalid render bundle");
  if (bundle.state === "completed" && (!bundle.render?.render_id || !Array.isArray(bundle.results) || bundle.results.length !== 2 || new Set(bundle.results.map((result) => result.target)).size !== 2 || !bundle.results.every((result) => ["preview", "master"].includes(result.target)))) throw new Error("completed render bundle needs Preview and Master results");
  if (bundle.state === "blocked" && (bundle.render || (bundle.results?.length ?? 0) !== 0)) throw new Error("blocked render bundle cannot contain outputs");
  const manifestIds = new Set();
  for (const manifest of bundle.manifests) {
    if (!manifest?.manifest_id || manifestIds.has(manifest.manifest_id) || !["execution_plan", "output_manifest", "blocker_manifest"].includes(manifest.manifest_type)) throw new Error("invalid render bundle manifest");
    manifestIds.add(manifest.manifest_id);
  }
  const manifestCounts = (kind) => bundle.manifests.filter((manifest) => manifest.manifest_type === kind).length;
  if (bundle.state === "completed" && (bundle.manifests.length !== 4 || manifestCounts("execution_plan") !== 2 || manifestCounts("output_manifest") !== 2)) throw new Error("completed render bundle needs two plans and two output manifests");
  if (bundle.state === "blocked" && (manifestCounts("execution_plan") !== 2 || manifestCounts("blocker_manifest") !== 1)) throw new Error("blocked render bundle needs plans and blocker diagnostics");
  const staged = [];
  const stage = (bytes) => {
    const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(session.projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const existed = existsSync(path); const stored = { ...putObjectSync(session.projectDirectory, bytes), existed, byte_length: bytes.byteLength }; staged.push(stored); return stored;
  };
  const normalizedResults = (bundle.results ?? []).map((result) => {
    if (!result.output_path || !existsSync(result.output_path) || !/^[0-9a-f]{64}$/.test(result.output_hash)) throw new Error("render bundle output is missing or unhashed");
    const bytes = readFileSync(result.output_path); const actual = createHash("sha256").update(bytes).digest("hex"); if (actual !== result.output_hash) throw new Error("render bundle output hash mismatch"); const stored = stage(bytes); return { ...result, output_path: stored.path, output_object_hash: stored.hash };
  });
  const normalizedRender = bundle.render ? { ...bundle.render, preview_path: normalizedResults.find((result) => result.target === "preview")?.output_path, master_path: normalizedResults.find((result) => result.target === "master")?.output_path } : null;
  const normalized = { ...bundle, ...(normalizedRender ? { render: normalizedRender } : {}), results: normalizedResults };
  const identity = { ...normalized, results: normalizedResults.map(({ output_path: _path, ...result }) => result) };
  const identityPayload = canonicalStorageJson(identity); const contentHash = createHash("sha256").update(identityPayload).digest("hex");
  const existing = session.db.prepare("SELECT * FROM render_bundles WHERE project_id = ? AND idempotency_key = ?").get(projectId, bundle.idempotency_key);
  if (existing) {
    for (const item of staged.filter((item) => !item.existed)) if (!session.db.prepare("SELECT 1 FROM object_store WHERE object_hash = ?").get(item.hash)) rmSync(item.path, { force: true });
    if (existing.content_hash !== contentHash) throw new Error("RENDER_BUNDLE_IDEMPOTENCY_CONFLICT");
    return { ...readRenderBundleRow(session, existing), idempotent: true };
  }
  const bundleObject = stage(Buffer.from(canonicalStorageJson(normalized)));
  const resultObjects = normalizedResults.map((result) => stage(Buffer.from(canonicalStorageJson(result))));
  const manifestObjects = bundle.manifests.map((manifest) => stage(Buffer.from(canonicalStorageJson(manifest.value))));
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    if (normalizedRender) {
      session.db.prepare("INSERT INTO render_runs(render_id,project_id,original_path,proxy_path,preview_path,master_path,qc_status,qc_report_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(normalizedRender.render_id, projectId, normalizedRender.original_path, normalizedRender.proxy_path, normalizedRender.preview_path, normalizedRender.master_path, normalizedRender.qc_report.status, json(normalizedRender.qc_report), now);
      if (failAt === "render") throw new Error("RENDER_BUNDLE_FAULT_RENDER");
      for (let index = 0; index < normalizedResults.length; index += 1) {
        const result = normalizedResults[index]; const media = staged[index];
        insertObjectRefRows(session, projectId, media, { object_ref_id: `${projectId}:render-output:${result.render_result_id}`, object_type: "render_output", relation_key: result.render_result_id, byte_length: media.byte_length }, now);
        insertObjectRefRows(session, projectId, resultObjects[index], { object_ref_id: `${projectId}:render-result:${result.render_result_id}`, object_type: "render_result", relation_key: result.render_result_id, byte_length: resultObjects[index].byte_length }, now);
        session.db.prepare("INSERT INTO render_results(render_result_id,render_id,project_id,target,timeline_version,graph_hash,original_refs_json,proxy_refs_json,profile_json,worker_version,ffmpeg_version,output_path,output_hash,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(result.render_result_id, result.render_id, projectId, result.target, result.timeline_version, result.graph_hash, json(result.original_refs), json(result.proxy_refs), json(result.profile), result.worker_version, result.ffmpeg_version, result.output_path, result.output_hash, now);
      }
      if (failAt === "results") throw new Error("RENDER_BUNDLE_FAULT_RESULTS");
    }
    for (let index = 0; index < bundle.manifests.length; index += 1) { const manifest = bundle.manifests[index]; insertObjectRefRows(session, projectId, manifestObjects[index], { object_ref_id: `${projectId}:render-manifest:${manifest.manifest_id}`, object_type: `render_${manifest.manifest_type}`, relation_key: manifest.manifest_id, byte_length: manifestObjects[index].byte_length }, now); }
    if (failAt === "manifests") throw new Error("RENDER_BUNDLE_FAULT_MANIFESTS");
    insertObjectRefRows(session, projectId, bundleObject, { object_ref_id: `${projectId}:render-bundle:${bundle.bundle_id}`, object_type: "render_bundle", relation_key: bundle.bundle_id, byte_length: bundleObject.byte_length }, now);
    session.db.prepare("INSERT INTO render_bundles(bundle_id,project_id,idempotency_key,content_hash,bundle_object_hash,render_id,state,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(bundle.bundle_id, projectId, bundle.idempotency_key, contentHash, bundleObject.hash, normalizedRender?.render_id ?? null, bundle.state, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `render.bundle.${bundle.state}`, json({ bundle_id: bundle.bundle_id, render_id: normalizedRender?.render_id ?? null, content_hash: contentHash, bundle_object_hash: bundleObject.hash }), now);
    session.db.exec("COMMIT");
    return { ...normalized, bundle_object_hash: bundleObject.hash, content_hash: contentHash, created_at: now, idempotent: false };
  } catch (error) {
    session.db.exec("ROLLBACK");
    for (const item of staged.filter((item) => !item.existed)) if (!session.db.prepare("SELECT 1 FROM object_store WHERE object_hash = ?").get(item.hash)) rmSync(item.path, { force: true });
    throw error;
  }
}

function json(value) { return JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item); }
function parseJob(row) { if (!row) return null; return { ...row, input: JSON.parse(row.input_json), output_refs: JSON.parse(row.output_refs_json) }; }
function parseAttempt(row) { if (!row) return null; return { ...row, output_refs: JSON.parse(row.output_refs_json) }; }

export function createPersistentJob(session, projectId, record) {
  const existing = session.db.prepare("SELECT * FROM jobs WHERE project_id = ? AND idempotency_key = ?").get(projectId, record.idempotency_key);
  if (existing) return parseJob(existing);
  const createdAt = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("INSERT INTO jobs(job_id,project_id,task_type,idempotency_key,input_hash,input_json,state,idempotent,attempt,progress,error_class,error_message,output_refs_json,created_at,started_at,completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(record.job_id, projectId, record.task_type, record.idempotency_key, record.input_hash, json(record.input), record.state ?? "PENDING", record.idempotent === false ? 0 : 1, 0, 0, null, null, "[]", createdAt, null, null); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "job.created", json({ job_id: record.job_id, task_type: record.task_type, idempotency_key: record.idempotency_key, input_hash: record.input_hash }), createdAt); session.db.exec("COMMIT"); return parseJob(session.db.prepare("SELECT * FROM jobs WHERE job_id = ?").get(record.job_id)); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readPersistentJob(session, jobId) { return parseJob(session.db.prepare("SELECT * FROM jobs WHERE job_id = ?").get(jobId)); }
export function readPersistentJobByIdempotency(session, projectId, idempotencyKey) { return parseJob(session.db.prepare("SELECT * FROM jobs WHERE project_id = ? AND idempotency_key = ?").get(projectId, idempotencyKey)); }
export function listPersistentJobs(session, projectId) { return session.db.prepare("SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map(parseJob); }
export function readPersistentJobAttempts(session, jobId) { return session.db.prepare("SELECT * FROM job_attempts WHERE job_id = ? ORDER BY attempt ASC").all(jobId).map(parseAttempt); }

export function startPersistentJob(session, jobId) {
  const current = readPersistentJob(session, jobId); if (!current) throw new Error("job not found");
  if (!["PENDING", "READY", "RECOVERING", "RETRYABLE_FAILED"].includes(current.state)) throw new Error(`job cannot start from ${current.state}`);
  const now = new Date().toISOString(); const attempt = current.attempt + 1;
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("UPDATE jobs SET state = 'RUNNING', attempt = ?, progress = 0, error_class = NULL, error_message = NULL, started_at = ?, completed_at = NULL WHERE job_id = ?").run(attempt, now, jobId); session.db.prepare("INSERT INTO job_attempts(job_id,attempt,state,progress,error_class,error_message,output_refs_json,created_at,started_at,completed_at) VALUES (?, ?, 'RUNNING', 0, NULL, NULL, '[]', ?, ?, NULL)").run(jobId, attempt, now, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) SELECT project_id, 'job.started', ?, ? FROM jobs WHERE job_id = ?").run(json({ job_id: jobId, attempt }), now, jobId); session.db.exec("COMMIT"); return readPersistentJob(session, jobId); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function updatePersistentJobProgress(session, jobId, progress) { const value = Math.max(0, Math.min(1, Number(progress))); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("UPDATE jobs SET progress = ? WHERE job_id = ? AND state = 'RUNNING'").run(value, jobId); session.db.prepare("UPDATE job_attempts SET progress = ? WHERE job_id = (SELECT job_id FROM jobs WHERE job_id = ?) AND state = 'RUNNING'").run(value, jobId); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function finishPersistentJob(session, jobId, result) {
  const current = readPersistentJob(session, jobId); if (!current) throw new Error("job not found");
  const now = new Date().toISOString(); const outputs = result.output_refs ?? [];
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("UPDATE jobs SET state = ?, progress = ?, error_class = ?, error_message = ?, output_refs_json = ?, completed_at = ? WHERE job_id = ?").run(result.state, result.state === "SUCCEEDED" ? 1 : current.progress, result.error_class ?? null, result.error_message ?? null, json(outputs), now, jobId); session.db.prepare("UPDATE job_attempts SET state = ?, progress = ?, error_class = ?, error_message = ?, output_refs_json = ?, completed_at = ? WHERE job_id = ? AND attempt = ?").run(result.state, result.state === "SUCCEEDED" ? 1 : current.progress, result.error_class ?? null, result.error_message ?? null, json(outputs), now, jobId, current.attempt); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) SELECT project_id, ?, ?, ? FROM jobs WHERE job_id = ?").run(`job.${String(result.state).toLowerCase()}`, json({ job_id: jobId, state: result.state, error_class: result.error_class ?? null }), now, jobId); session.db.exec("COMMIT"); return readPersistentJob(session, jobId); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function recoverPersistentJobs(session, projectId) {
  const rows = session.db.prepare("SELECT job_id FROM jobs WHERE project_id = ? AND state = 'RUNNING'").all(projectId); if (!rows.length) return [];
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try { for (const row of rows) { session.db.prepare("UPDATE jobs SET state = 'RECOVERING', error_class = 'WORKER_CRASH', error_message = 'host restart recovered an active job' WHERE job_id = ?").run(row.job_id); session.db.prepare("UPDATE job_attempts SET state = 'RECOVERING', error_class = 'WORKER_CRASH', error_message = 'host restart recovered an active job' WHERE job_id = ? AND state = 'RUNNING'").run(row.job_id); } session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'jobs.recovered', ?, ?)").run(projectId, json({ job_ids: rows.map((row) => row.job_id) }), now); session.db.exec("COMMIT"); return listPersistentJobs(session, projectId).filter((job) => rows.some((row) => row.job_id === job.job_id)); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function registerEvidence(session, projectId, evidence) {
  const contentField = evidence.analysis_type === "scene" ? evidence.label : evidence.text;
  if (!["asr", "ocr", "scene"].includes(evidence.analysis_type)) throw new Error("unsupported analysis type");
  if (!/^asset:sha256:[0-9a-f]{64}$/.test(evidence.asset_id)) throw new Error("invalid asset id");
  if (!Number.isInteger(evidence.start_pts) || !Number.isInteger(evidence.end_pts) || evidence.start_pts < 0 || evidence.end_pts <= evidence.start_pts) throw new Error("invalid evidence range");
  if (typeof contentField !== "string" || !contentField.trim()) throw new Error("empty evidence");
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, evidence, { object_ref_id: `${projectId}:evidence:${evidence.evidence_id}`, object_type: "evidence_graph", relation_key: evidence.evidence_id }, now);
    session.db.prepare("INSERT INTO evidence_records(evidence_id,project_id,analysis_type,asset_id,start_pts,end_pts,content,source_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(evidence.evidence_id, projectId, evidence.analysis_type, evidence.asset_id, evidence.start_pts, evidence.end_pts, contentField, JSON.stringify({ object_hash: object.object_hash }), now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "evidence.registered", json({ evidence_id: evidence.evidence_id, object_hash: object.object_hash }), now);
    session.db.exec("COMMIT");
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readEvidence(session, evidenceId) { return session.db.prepare("SELECT * FROM evidence_records WHERE evidence_id = ?").get(evidenceId) ?? null; }
export function listApprovedStoryPlans(session, projectId) { return session.db.prepare("SELECT plan_id, project_id, proposal_id, approved_by, approved_at, beats_json, created_at FROM approved_story_plans WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => ({ ...row, beats: JSON.parse(row.beats_json) })); }

export function registerApprovedStoryPlan(session, projectId, plan) {
  if (!plan || plan.schema_version !== 1 || !plan.plan_id || !plan.proposal_id || !plan.approved_by || !plan.approved_at || !Array.isArray(plan.beats) || plan.beats.length === 0) throw new Error("invalid approved story plan");
  for (const beat of plan.beats) { if (!beat.beat_id || !beat.purpose || !Array.isArray(beat.evidence_ids) || beat.evidence_ids.length === 0) throw new Error("invalid story beat"); for (const evidenceId of beat.evidence_ids) if (!readEvidence(session, evidenceId)) throw new Error(`story evidence not found: ${evidenceId}`); }
  session.db.exec("BEGIN IMMEDIATE");
  try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, plan, { object_ref_id: `${projectId}:story-plan:${plan.plan_id}`, object_type: "story_plan", relation_key: plan.plan_id }, now); session.db.prepare("INSERT INTO approved_story_plans(plan_id,project_id,proposal_id,approved_by,approved_at,beats_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(plan.plan_id, projectId, plan.proposal_id, plan.approved_by, plan.approved_at, JSON.stringify(plan.beats), now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "story.plan.approved", json({ plan_id: plan.plan_id, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readApprovedStoryPlan(session, planId) { const row = session.db.prepare("SELECT * FROM approved_story_plans WHERE plan_id = ?").get(planId); return row ? { schema_version: 1, plan_id: row.plan_id, proposal_id: row.proposal_id, approved_by: row.approved_by, approved_at: row.approved_at, beats: JSON.parse(row.beats_json) } : null; }

export function registerAssemblyCut(session, projectId, cut) { session.db.exec("BEGIN IMMEDIATE"); try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, cut, { object_ref_id: `${projectId}:assembly:${cut.assembly_id}`, object_type: "assembly_cut", relation_key: cut.assembly_id }, now); session.db.prepare("INSERT INTO assembly_cuts(assembly_id,project_id,approved_plan_id,status,cut_json,created_at) VALUES (?, ?, ?, ?, ?, ?)").run(cut.assembly_id, projectId, cut.approved_plan_id, cut.status, JSON.stringify({ object_hash: object.object_hash }), now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "assembly.validated", json({ assembly_id: cut.assembly_id, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readAssemblyCut(session, assemblyId) { const row = session.db.prepare("SELECT cut_json FROM assembly_cuts WHERE assembly_id = ?").get(assemblyId); if (!row) return null; const stored = JSON.parse(row.cut_json); return stored.object_hash ? JSON.parse(readObjectSync(session.projectDirectory, stored.object_hash).toString("utf8")) : stored; }

export function registerReviewArtifact(session, projectId, artifact) { session.db.exec("BEGIN IMMEDIATE"); try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, artifact.value, { object_ref_id: `${projectId}:review:${artifact.artifact_id}`, object_type: "review_artifact", relation_key: artifact.artifact_id }, now); session.db.prepare("INSERT INTO review_artifacts(artifact_id,project_id,artifact_type,artifact_json,created_at) VALUES (?, ?, ?, ?, ?)").run(artifact.artifact_id, projectId, artifact.artifact_type, JSON.stringify({ object_hash: object.object_hash }), now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `review.${artifact.artifact_type}.registered`, json({ artifact_id: artifact.artifact_id, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readReviewArtifact(session, artifactId) { const row = session.db.prepare("SELECT artifact_type, artifact_json FROM review_artifacts WHERE artifact_id = ?").get(artifactId); if (!row) return null; const stored = JSON.parse(row.artifact_json); return { artifact_type: row.artifact_type, value: stored.object_hash ? JSON.parse(readObjectSync(session.projectDirectory, stored.object_hash).toString("utf8")) : stored }; }
export function listReviewArtifacts(session, projectId) { return session.db.prepare("SELECT artifact_id, artifact_type, artifact_json, created_at FROM review_artifacts WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => { const stored = JSON.parse(row.artifact_json); return { artifact_id: row.artifact_id, artifact_type: row.artifact_type, value: stored.object_hash ? JSON.parse(readObjectSync(session.projectDirectory, stored.object_hash).toString("utf8")) : stored, created_at: row.created_at }; }); }
export function registerRenderManifest(session, projectId, manifest) {
  if (!manifest?.manifest_id || !["execution_plan", "output_manifest"].includes(manifest.manifest_type)) throw new Error("invalid render manifest");
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const now = new Date().toISOString();
    const object = storeJsonInTransaction(session, projectId, manifest.value, { object_ref_id: `${projectId}:render-manifest:${manifest.manifest_id}`, object_type: `render_${manifest.manifest_type}`, relation_key: manifest.manifest_id }, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `render.${manifest.manifest_type}.registered`, json({ manifest_id: manifest.manifest_id, object_hash: object.object_hash }), now);
    session.db.exec("COMMIT");
    return object;
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}
export function listRenderManifests(session, projectId) { return session.db.prepare("SELECT relation_key, object_type, object_hash, created_at FROM object_refs WHERE project_id = ? AND object_type IN ('render_execution_plan', 'render_output_manifest') ORDER BY created_at ASC").all(projectId).map((row) => ({ manifest_id: row.relation_key, manifest_type: row.object_type.replace(/^render_/, ""), value: JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")), created_at: row.created_at })); }
export function registerReactionTiming(session, projectId, reaction) { const json = JSON.stringify(reaction, (_, value) => typeof value === "bigint" ? `${value}n` : value); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO reaction_timings(reaction_id,project_id,compare_id,timeline_pts,reaction_json,created_at) VALUES (?, ?, ?, ?, ?, ?)").run(reaction.reaction_id, projectId, reaction.compare_id, reaction.timeline_pts, json, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "review.reaction_timing.registered", json, new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readReactionTiming(session, reactionId) { const row = session.db.prepare("SELECT reaction_json FROM reaction_timings WHERE reaction_id = ?").get(reactionId); return row ? JSON.parse(row.reaction_json) : null; }
export function registerDeliveryRecord(session, projectId, record) { session.db.exec("BEGIN IMMEDIATE"); try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, record.value, { object_ref_id: `${projectId}:delivery:${record.record_id}`, object_type: record.record_type === "privacy" ? "privacy_ledger" : record.record_type === "rights" ? "rights_ledger" : "delivery_record", relation_key: record.record_id }, now); session.db.prepare("INSERT INTO delivery_records(record_id,project_id,record_type,record_json,created_at) VALUES (?, ?, ?, ?, ?)").run(record.record_id, projectId, record.record_type, JSON.stringify({ object_hash: object.object_hash }), now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `delivery.${record.record_type}.registered`, json({ record_id: record.record_id, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readDeliveryRecord(session, recordId) { const row = session.db.prepare("SELECT record_type, record_json FROM delivery_records WHERE record_id = ?").get(recordId); if (!row) return null; const stored = JSON.parse(row.record_json); return { record_type: row.record_type, value: stored.object_hash ? JSON.parse(readObjectSync(session.projectDirectory, stored.object_hash).toString("utf8")) : stored }; }
export function listDeliveryRecords(session, projectId) { return session.db.prepare("SELECT record_id, record_type, record_json, created_at FROM delivery_records WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => { const stored = JSON.parse(row.record_json); return { record_id: row.record_id, record_type: row.record_type, value: stored.object_hash ? JSON.parse(readObjectSync(session.projectDirectory, stored.object_hash).toString("utf8")) : stored, created_at: row.created_at }; }); }
