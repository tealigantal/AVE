import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createProject, openProject, readExport, registerExport } from "../../packages/platform/project-storage/src/project-storage.mjs";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-export-")); const file = resolve(root, "master.mp4"); try { const session = await createProject(root); const bytes = Buffer.from("registered-master"); await import("node:fs/promises").then(({ writeFile }) => writeFile(file, bytes)); const sha256 = createHash("sha256").update(bytes).digest("hex"); await registerExport(session, session.manifest.project_id, { export_id: "export-1", delivery_id: "delivery-1", path: file, sha256, media_type: "video/mp4", qc_report_id: "qc-1" }); assert.equal(readExport(session, "export-1").sha256, sha256); await session.close(); const reopened = await openProject(root); assert.equal(readExport(reopened, "export-1").delivery_id, "delivery-1"); await reopened.close(); } finally { await rm(root, { recursive: true, force: true }); } console.log("export persistence check passed");
