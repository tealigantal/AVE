import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, readLatestRender, registerRender } from "../../packages/platform/project-storage/src/project-storage.mjs";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-render-persist-"));
try { const session = await createProject(root); const report = { schema_version: 1, render_id: "render-1", status: "passed", issues: [] }; registerRender(session, session.manifest.project_id, { render_id: "render-1", original_path: "original.mp4", proxy_path: "proxy.mp4", preview_path: "preview.mp4", master_path: "master.mp4", qc_report: report }); assert.equal(readLatestRender(session, session.manifest.project_id).qc_status, "passed"); await session.close(); const reopened = await openProject(root); assert.equal(readLatestRender(reopened, reopened.manifest.project_id).qc_report_json.includes('"status":"passed"'), true); await reopened.close(); } finally { await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("render persistence check passed");
