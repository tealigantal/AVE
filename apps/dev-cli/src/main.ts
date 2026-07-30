#!/usr/bin/env node
import { existsSync } from "node:fs";
import { copyFile, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fingerprintFile } from "../../../packages/core/media-identity/src/fingerprint.js";
import { assetIdFromFingerprint } from "../../../packages/core/media-identity/src/public.js";
import { ProjectHostSession } from "../../desktop/src/project-host.js";
import { startWorker } from "../../../packages/platform/worker-client/src/public.js";
import { createJob, dispatchJob } from "../../../packages/platform/job-engine/src/public.js";
// @ts-expect-error runtime JS boundary intentionally has no generated declaration
import { qcMaster } from "../../../packages/platform/render-service/src/render-service.mjs";
// @ts-expect-error runtime JS boundary intentionally has no generated declaration
import { createProject, openProject, putObject } from "../../../packages/platform/project-storage/src/project-storage.mjs";
const run = promisify(execFile);
function revive(value: unknown): unknown { if (typeof value === "string" && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1)); if (Array.isArray(value)) return value.map(revive); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)])); return value; }

function output(value: unknown): void { process.stdout.write(`${JSON.stringify(value)}\n`); }
const [command, ...args] = process.argv.slice(2);
if (command === "verify-project") {
  const projectPath = resolve(args[0] ?? ".");
  try { const session = await openProject(projectPath); output({ ok: true, project_path: projectPath, project_manifest: true, integrity: session.integrity }); await session.close(); } catch (error) { output({ ok: false, project_path: projectPath, error: { code: "PROJECT_VERIFY_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "create-project") {
  const projectPath = resolve(args[0] ?? "");
  if (!projectPath || projectPath === resolve("")) { output({ ok: false, error: { code: "PATH_REQUIRED", message: "create-project requires a directory" } }); process.exitCode = 2; }
  else { const manifest = await createProject(projectPath); output({ ok: true, manifest }); }
} else if (command === "inspect-project") {
  const projectPath = resolve(args[0] ?? ".");
  if (!existsSync(resolve(projectPath, "project.json"))) { output({ ok: false, error: { code: "PROJECT_NOT_FOUND", message: "project.json not found" } }); process.exitCode = 1; }
  else { const session = await openProject(projectPath); output({ ok: true, manifest: session.manifest, integrity: session.integrity }); await session.close(); }
} else if (command === "inspect-media") {
  const mediaPath = resolve(args[0] ?? "");
  try { const { stdout } = await run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", mediaPath]); const fingerprint = await fingerprintFile(mediaPath); output({ ok: true, path: mediaPath, fingerprint: { ...fingerprint, byte_length: fingerprint.byte_length.toString() }, probe: JSON.parse(stdout) }); } catch (error) { output({ ok: false, error: { code: "MEDIA_PROBE_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "import-media") {
  const projectPath = resolve(args[0] ?? ""); const mediaPath = resolve(args[1] ?? "");
  try { const session = await openProject(projectPath); const fingerprint = await fingerprintFile(mediaPath); const stored = await putObject(projectPath, await readFile(mediaPath)); await copyFile(mediaPath, resolve(projectPath, "originals", basename(mediaPath))); await session.close(); output({ ok: true, asset_id: assetIdFromFingerprint(fingerprint), fingerprint: { ...fingerprint, byte_length: fingerprint.byte_length.toString() }, object: stored, original: resolve(projectPath, "originals", basename(mediaPath)) }); } catch (error) { output({ ok: false, error: { code: "MEDIA_IMPORT_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "create-timeline") {
  const projectPath = resolve(args[0] ?? ""); const host = new ProjectHostSession();
  try { await host.open(projectPath); const status = host.initializeTimeline([{ track_id: args[1] ?? "v1", kind: "video", clips: [] }]); await host.close(); output({ ok: true, status }); } catch (error) { await host.close(); output({ ok: false, error: { code: "TIMELINE_CREATE_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "render-preview" || command === "render-master") {
  const projectPath = resolve(args[0] ?? ""); const mediaPath = resolve(args[1] ?? ""); const host = new ProjectHostSession();
  try { await host.open(projectPath); const status = await host.render(mediaPath); await host.close(); output({ ok: true, status }); } catch (error) { await host.close(); output({ ok: false, error: { code: "RENDER_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "apply-command") {
  const projectPath = resolve(args[0] ?? ""); const baseVersion = Number(args[1]); const host = new ProjectHostSession();
  try { const commandValue = revive(JSON.parse(args.slice(2).join(" "))); await host.open(projectPath); const status = host.applyTimelineCommand(commandValue as any, baseVersion); await host.close(); output({ ok: true, status }); } catch (error) { await host.close(); output({ ok: false, error: { code: "TIMELINE_COMMAND_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "run-qc") {
  const masterPath = resolve(args[0] ?? "");
  try { const report = await qcMaster(masterPath); output({ ok: report.status === "passed", report }); if (report.status !== "passed") process.exitCode = 1; } catch (error) { output({ ok: false, error: { code: "QC_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "migrate-project") {
  const projectPath = resolve(args[0] ?? ".");
  try { const session = await openProject(projectPath); const migration = session.db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as { version?: number }; output({ ok: true, project_path: projectPath, integrity: session.integrity, schema_version: migration.version ?? null }); await session.close(); } catch (error) { output({ ok: false, error: { code: "MIGRATION_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "analyze") {
  const projectPath = resolve(args[0] ?? ""); const analysisType = args[1]; const records = revive(JSON.parse(args.slice(2).join(" "))) as unknown; const job = createJob(`analysis-${Date.now()}`, `analysis-${Date.now()}`, { analysis_type: analysisType, records }); const worker = startWorker({ command: "python", args: ["apps/worker-host/src/worker_host/main.py"], cwd: process.cwd() });
  try { const dispatched = await dispatchJob(job, (message) => worker.send(message), async (jobId) => { let result; do { result = await worker.waitFor(jobId); } while (result.message_type !== "job_result"); return result; }, () => worker.stop()); worker.stop(); if (dispatched.job.state !== "SUCCEEDED") throw new Error("analysis job failed"); const outputs = (dispatched.result as { outputs?: Array<Record<string, unknown>> }).outputs ?? []; const host = new ProjectHostSession(); await host.open(projectPath); for (const record of outputs) host.registerEvidence({ evidence_id: `${analysisType}:${record.segment_id ?? record.frame_id ?? Date.now()}`, analysis_type: analysisType, asset_id: record.asset_id, start_pts: record.start_pts, end_pts: record.end_pts, text: record.text, label: record.label, source: record.source }); await host.close(); output({ ok: true, job_id: job.job_id, evidence_count: outputs.length }); } catch (error) { worker.stop(); output({ ok: false, error: { code: "ANALYSIS_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "inspect-evidence") {
  const projectPath = resolve(args[0] ?? ""); const evidenceId = args[1]; const host = new ProjectHostSession();
  try { await host.open(projectPath); const evidence = host.readEvidence(evidenceId); await host.close(); if (!evidence) { output({ ok: false, error: { code: "EVIDENCE_NOT_FOUND", message: "evidence not found" } }); process.exitCode = 1; } else output({ ok: true, evidence }); } catch (error) { await host.close(); output({ ok: false, error: { code: "EVIDENCE_READ_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "propose-story") {
  const projectPath = resolve(args[0] ?? ""); const evidenceIds = JSON.parse(args.slice(1).join(" ")) as string[]; const host = new ProjectHostSession();
  try { await host.open(projectPath); for (const id of evidenceIds) if (!host.readEvidence(id)) throw new Error(`evidence not found: ${id}`); await host.close(); const proposalId = `proposal-${Date.now()}`; output({ ok: true, proposal: { schema_version: 1, proposal_id: proposalId, evidence_ids: evidenceIds, coverage_matrix_id: `${proposalId}:coverage`, beats: evidenceIds.map((evidenceId, index) => ({ beat_id: `${proposalId}:beat-${index + 1}`, evidence_ids: [evidenceId], purpose: index === 0 ? "开场" : "推进" })), status: "candidate" } }); } catch (error) { await host.close(); output({ ok: false, error: { code: "STORY_PROPOSAL_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "approve-story") {
  const projectPath = resolve(args[0] ?? ""); const plan = JSON.parse(args.slice(1).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.registerApprovedStoryPlan(plan); const approved = host.readApprovedStoryPlan(plan.plan_id); await host.close(); output({ ok: true, plan: approved }); } catch (error) { await host.close(); output({ ok: false, error: { code: "STORY_APPROVAL_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "register-assembly") {
  const projectPath = resolve(args[0] ?? ""); const cut = JSON.parse(args.slice(1).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.registerAssemblyCut(cut); const saved = host.readAssemblyCut(cut.assembly_id); await host.close(); output({ ok: true, cut: saved }); } catch (error) { await host.close(); output({ ok: false, error: { code: "ASSEMBLY_REGISTER_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "compile-assembly") {
  const projectPath = resolve(args[0] ?? ""); const assemblyId = args[1]; const trackId = args[2] ?? "v1"; const baseVersion = Number(args[3]); const host = new ProjectHostSession();
  try { await host.open(projectPath); const status = host.compileAssemblyToTimeline(assemblyId, trackId, baseVersion); await host.close(); output({ ok: true, status }); } catch (error) { await host.close(); output({ ok: false, error: { code: "ASSEMBLY_COMPILE_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "apply-rough-cut") {
  const projectPath = resolve(args[0] ?? ""); const trackId = args[1] ?? "v1"; const patch = revive(JSON.parse(args.slice(2).join(" "))); const host = new ProjectHostSession();
  try { await host.open(projectPath); const status = host.applyRoughCutPatch(patch, trackId); await host.close(); output({ ok: true, status }); } catch (error) { await host.close(); output({ ok: false, error: { code: "ROUGH_CUT_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "review-diagnosis") {
  const projectPath = resolve(args[0] ?? ""); const diagnosis = JSON.parse(args[1]); const issues = JSON.parse(args.slice(2).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.registerFeedbackDiagnosis(diagnosis, issues); const saved = host.readReviewArtifact(diagnosis.diagnosis_id); await host.close(); output({ ok: true, artifact: saved }); } catch (error) { await host.close(); output({ ok: false, error: { code: "DIAGNOSIS_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "compare-review") {
  const projectPath = resolve(args[0] ?? ""); const compare = JSON.parse(args.slice(1).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.registerCompare(compare); const saved = host.readReviewArtifact(compare.compare_id); await host.close(); output({ ok: true, artifact: saved }); } catch (error) { await host.close(); output({ ok: false, error: { code: "COMPARE_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "reaction-review") {
  const projectPath = resolve(args[0] ?? ""); const reaction = revive(JSON.parse(args.slice(1).join(" "))); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.registerReactionTiming(reaction as any); const saved = host.readReactionTiming((reaction as any).reaction_id); await host.close(); output({ ok: true, reaction: saved }); } catch (error) { await host.close(); output({ ok: false, error: { code: "REACTION_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "approve-privacy" || command === "approve-rights") {
  const projectPath = resolve(args[0] ?? ""); const entry = JSON.parse(args.slice(1).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); if (command === "approve-privacy") host.registerPrivacy(entry); else host.registerRights(entry); await host.close(); output({ ok: true, entry_id: entry.entry_id }); } catch (error) { await host.close(); output({ ok: false, error: { code: "DELIVERY_GATE_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "create-delivery") {
  const projectPath = resolve(args[0] ?? ""); const manifest = JSON.parse(args.slice(1).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.registerDelivery(manifest); const saved = host.readDeliveryRecord(manifest.delivery_id); await host.close(); output({ ok: true, delivery: saved }); } catch (error) { await host.close(); output({ ok: false, error: { code: "DELIVERY_GATE_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "validate-export") {
  const projectPath = resolve(args[0] ?? ""); const capability = args[1]; const profile = JSON.parse(args.slice(2).join(" ")); const host = new ProjectHostSession();
  try { await host.open(projectPath); host.validateExportProfile(capability, profile); await host.close(); output({ ok: true, capability }); } catch (error) { await host.close(); output({ ok: false, error: { code: "EXPORT_CAPABILITY_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else if (command === "register-export") {
  const projectPath = resolve(args[0] ?? ""); const deliveryId = args[1]; const qcId = args[2]; const exportId = args[3]; const filePath = resolve(args[4] ?? ""); const host = new ProjectHostSession();
  try { await host.open(projectPath); const registration = await host.registerExportFile(deliveryId, qcId, exportId, filePath); await host.close(); output({ ok: true, registration }); } catch (error) { await host.close(); output({ ok: false, error: { code: "EXPORT_REGISTER_FAILED", message: error instanceof Error ? error.message : String(error) } }); process.exitCode = 1; }
} else {
  output({ ok: false, error: { code: "UNKNOWN_COMMAND", message: "supported commands: create-project <directory>, inspect-project <directory>, verify-project <directory>, inspect-media <file>, import-media <project> <file>, create-timeline <project> [track], apply-command <project> <base-version> <json>, render-preview/render-master <project> <file>, run-qc <master>, migrate-project <project>, analyze <project> <asr|ocr|scene> <records-json>, inspect-evidence <project> <evidence-id>, propose-story <project> <evidence-ids-json>, approve-story <project> <plan-json>, register-assembly <project> <cut-json>, compile-assembly <project> <assembly-id> [track] [base-version], apply-rough-cut <project> [track] <patch-json>, review-diagnosis <project> <diagnosis-json> <issues-json>, compare-review <project> <compare-json>, reaction-review <project> <reaction-json>, approve-privacy/approve-rights <project> <entry-json>, create-delivery <project> <manifest-json>, validate-export <project> <capability> <profile-json>, register-export <project> <delivery> <qc> <export> <file>" } });
  process.exitCode = 2;
}
