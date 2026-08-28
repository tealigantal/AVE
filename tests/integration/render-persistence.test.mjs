import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, readLatestRender } from "../../packages/platform/project-storage/src/project-storage.mjs";
import { registerCurrentRenderFixture } from "./current-render-bundle-helper.mjs";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-render-persist-"));
try { const session = await createProject(root); const output = resolve(root, "current-render.mp4"); await writeFile(output, "current render persistence"); registerCurrentRenderFixture(session, session.manifest.project_id, { renderId: "render-1", outputPath: output }); assert.equal(readLatestRender(session, session.manifest.project_id).qc_status, "passed"); await session.close(); const reopened = await openProject(root); assert.equal(readLatestRender(reopened, reopened.manifest.project_id).qc_report_json.includes('"status":"passed"'), true); await reopened.close(); } finally { await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("render persistence check passed");
