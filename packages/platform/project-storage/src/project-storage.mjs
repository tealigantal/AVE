import { DatabaseSync } from "node:sqlite";
import { closeSync, constants, existsSync, fsyncSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
    for (const [version, file] of [[1, "0001_project_core.sql"], [4, "0004_timeline_versions.sql"], [7, "0007_render_and_qc.sql"], [8, "0008_evidence_records.sql"], [9, "0009_render_runs.sql"], [10, "0010_story_plans.sql"], [11, "0011_assembly_cuts.sql"], [12, "0012_review_artifacts.sql"], [13, "0013_reaction_timings.sql"], [14, "0014_delivery_records.sql"]]) { db.exec(await readFile(resolve(MIGRATIONS, file), "utf8")); db.prepare("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(version, new Date().toISOString()); }
    const result = db.prepare("PRAGMA integrity_check").get();
    if (result.integrity_check !== "ok") throw new Error("project integrity check failed");
    return { manifest, db, lock, integrity: result.integrity_check, async close() { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); db.close(); await releaseProjectLock(lock); } };
  } catch (error) { try { db?.close(); } catch {} await releaseProjectLock(lock); throw error; }
}

function acquireProjectLock(projectDirectory) {
  const path = resolve(projectDirectory, "project.lock");
  let fd;
  try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY); writeFileSync(fd, String(process.pid), "utf8"); fsyncSync(fd); closeSync(fd); return path; }
  catch (error) { if (fd !== undefined) closeSync(fd); if (error.code === "EEXIST") { const owner = Number(readFileSync(path, "utf8").trim()); if (!Number.isInteger(owner) || owner <= 0) { rmSync(path, { force: true }); return acquireProjectLock(projectDirectory); } try { process.kill(owner, 0); } catch { rmSync(path, { force: true }); return acquireProjectLock(projectDirectory); } throw new Error("project is already locked"); } throw error; }
}

function releaseProjectLock(lock) { if (existsSync(lock)) { const fd = openSync(lock, constants.O_RDONLY); closeSync(fd); } return rm(lock, { force: true }); }

async function writeAtomic(path, contents) { const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`; await writeFile(temporary, contents, "utf8"); const fd = openSync(temporary, "r+"); fsyncSync(fd); closeSync(fd); await rename(temporary, path); }

export async function putObject(projectDirectory, bytes) { const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); await mkdir(dirname(path), { recursive: true }); if (!existsSync(path)) await writeAtomic(path, bytes); return { hash, path }; }

export function commitTimeline(session, projectId, timeline, command, baseVersion) { const snapshot = JSON.stringify(timeline, (_, value) => typeof value === "bigint" ? `${value}n` : value); const commandJson = JSON.stringify(command, (_, value) => typeof value === "bigint" ? `${value}n` : value); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO timeline_versions(timeline_version, project_id, snapshot_json, created_at) VALUES (?, ?, ?, ?)").run(timeline.version, projectId, snapshot, new Date().toISOString()); session.db.prepare("INSERT INTO timeline_commands(project_id, base_version, command_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, baseVersion, commandJson, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "timeline.committed", commandJson, new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function readLatestTimeline(session, projectId) { return session.db.prepare("SELECT snapshot_json FROM timeline_versions WHERE project_id = ? ORDER BY timeline_version DESC LIMIT 1").get(projectId)?.snapshot_json ?? null; }
export function readTimelineAtVersion(session, projectId, version) { return session.db.prepare("SELECT snapshot_json FROM timeline_versions WHERE project_id = ? AND timeline_version = ?").get(projectId, version)?.snapshot_json ?? null; }
export function readLatestTimelineCommand(session, projectId) { return session.db.prepare("SELECT command_json, base_version FROM timeline_commands WHERE project_id = ? ORDER BY command_id DESC LIMIT 1").get(projectId) ?? null; }

export async function registerExport(session, projectId, registration) { const bytes = await readFile(registration.path); const sha256 = createHash("sha256").update(bytes).digest("hex"); if (sha256 !== registration.sha256) throw new Error("export hash mismatch"); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO render_outputs(export_id,project_id,delivery_id,path,sha256,media_type,qc_report_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(registration.export_id, projectId, registration.delivery_id, registration.path, registration.sha256, registration.media_type, registration.qc_report_id, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "export.registered", JSON.stringify(registration), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function readExport(session, exportId) { return session.db.prepare("SELECT * FROM render_outputs WHERE export_id = ?").get(exportId) ?? null; }

export function registerRender(session, projectId, render) {
  session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("INSERT INTO render_runs(render_id,project_id,original_path,proxy_path,preview_path,master_path,qc_status,qc_report_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(render.render_id, projectId, render.original_path, render.proxy_path, render.preview_path, render.master_path, render.qc_report.status, JSON.stringify(render.qc_report), new Date().toISOString());
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "render.completed", JSON.stringify(render), new Date().toISOString());
    session.db.exec("COMMIT");
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readLatestRender(session, projectId) { return session.db.prepare("SELECT * FROM render_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").get(projectId) ?? null; }

export function registerEvidence(session, projectId, evidence) {
  const contentField = evidence.analysis_type === "scene" ? evidence.label : evidence.text;
  if (!["asr", "ocr", "scene"].includes(evidence.analysis_type)) throw new Error("unsupported analysis type");
  if (!/^asset:sha256:[0-9a-f]{64}$/.test(evidence.asset_id)) throw new Error("invalid asset id");
  if (!Number.isInteger(evidence.start_pts) || !Number.isInteger(evidence.end_pts) || evidence.start_pts < 0 || evidence.end_pts <= evidence.start_pts) throw new Error("invalid evidence range");
  if (typeof contentField !== "string" || !contentField.trim()) throw new Error("empty evidence");
  session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("INSERT INTO evidence_records(evidence_id,project_id,analysis_type,asset_id,start_pts,end_pts,content,source_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(evidence.evidence_id, projectId, evidence.analysis_type, evidence.asset_id, evidence.start_pts, evidence.end_pts, contentField, JSON.stringify(evidence), new Date().toISOString());
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "evidence.registered", JSON.stringify(evidence), new Date().toISOString());
    session.db.exec("COMMIT");
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readEvidence(session, evidenceId) { return session.db.prepare("SELECT * FROM evidence_records WHERE evidence_id = ?").get(evidenceId) ?? null; }

export function registerApprovedStoryPlan(session, projectId, plan) {
  if (!plan || plan.schema_version !== 1 || !plan.plan_id || !plan.proposal_id || !plan.approved_by || !plan.approved_at || !Array.isArray(plan.beats) || plan.beats.length === 0) throw new Error("invalid approved story plan");
  for (const beat of plan.beats) { if (!beat.beat_id || !beat.purpose || !Array.isArray(beat.evidence_ids) || beat.evidence_ids.length === 0) throw new Error("invalid story beat"); for (const evidenceId of beat.evidence_ids) if (!readEvidence(session, evidenceId)) throw new Error(`story evidence not found: ${evidenceId}`); }
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("INSERT INTO approved_story_plans(plan_id,project_id,proposal_id,approved_by,approved_at,beats_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(plan.plan_id, projectId, plan.proposal_id, plan.approved_by, plan.approved_at, JSON.stringify(plan.beats), new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "story.plan.approved", JSON.stringify(plan), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readApprovedStoryPlan(session, planId) { const row = session.db.prepare("SELECT * FROM approved_story_plans WHERE plan_id = ?").get(planId); return row ? { schema_version: 1, plan_id: row.plan_id, proposal_id: row.proposal_id, approved_by: row.approved_by, approved_at: row.approved_at, beats: JSON.parse(row.beats_json) } : null; }

export function registerAssemblyCut(session, projectId, cut) { session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO assembly_cuts(assembly_id,project_id,approved_plan_id,status,cut_json,created_at) VALUES (?, ?, ?, ?, ?, ?)").run(cut.assembly_id, projectId, cut.approved_plan_id, cut.status, JSON.stringify(cut), new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "assembly.validated", JSON.stringify(cut), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readAssemblyCut(session, assemblyId) { const row = session.db.prepare("SELECT cut_json FROM assembly_cuts WHERE assembly_id = ?").get(assemblyId); return row ? JSON.parse(row.cut_json) : null; }

export function registerReviewArtifact(session, projectId, artifact) { session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO review_artifacts(artifact_id,project_id,artifact_type,artifact_json,created_at) VALUES (?, ?, ?, ?, ?)").run(artifact.artifact_id, projectId, artifact.artifact_type, JSON.stringify(artifact.value), new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `review.${artifact.artifact_type}.registered`, JSON.stringify(artifact.value), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readReviewArtifact(session, artifactId) { const row = session.db.prepare("SELECT artifact_type, artifact_json FROM review_artifacts WHERE artifact_id = ?").get(artifactId); return row ? { artifact_type: row.artifact_type, value: JSON.parse(row.artifact_json) } : null; }
export function registerReactionTiming(session, projectId, reaction) { const json = JSON.stringify(reaction, (_, value) => typeof value === "bigint" ? `${value}n` : value); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO reaction_timings(reaction_id,project_id,compare_id,timeline_pts,reaction_json,created_at) VALUES (?, ?, ?, ?, ?, ?)").run(reaction.reaction_id, projectId, reaction.compare_id, reaction.timeline_pts, json, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "review.reaction_timing.registered", json, new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readReactionTiming(session, reactionId) { const row = session.db.prepare("SELECT reaction_json FROM reaction_timings WHERE reaction_id = ?").get(reactionId); return row ? JSON.parse(row.reaction_json) : null; }
export function registerDeliveryRecord(session, projectId, record) { session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO delivery_records(record_id,project_id,record_type,record_json,created_at) VALUES (?, ?, ?, ?, ?)").run(record.record_id, projectId, record.record_type, JSON.stringify(record.value), new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `delivery.${record.record_type}.registered`, JSON.stringify(record.value), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readDeliveryRecord(session, recordId) { const row = session.db.prepare("SELECT record_type, record_json FROM delivery_records WHERE record_id = ?").get(recordId); return row ? { record_type: row.record_type, value: JSON.parse(row.record_json) } : null; }
