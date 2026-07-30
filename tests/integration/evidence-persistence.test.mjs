import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, readEvidence, registerEvidence } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-evidence-"));
const asset = "asset:sha256:" + "a".repeat(64);
try {
  const session = await createProject(root);
  registerEvidence(session, session.manifest.project_id, { evidence_id: "asr:seg-1", analysis_type: "asr", asset_id: asset, start_pts: 0, end_pts: 12, text: "明确证据" });
  assert.equal(readEvidence(session, "asr:seg-1").content, "明确证据");
  assert.throws(() => registerEvidence(session, session.manifest.project_id, { evidence_id: "bad", analysis_type: "ocr", asset_id: asset, start_pts: 3, end_pts: 3, text: "无效" }), /invalid evidence range/);
  await session.close();
  const reopened = await openProject(root);
  assert.equal(readEvidence(reopened, "asr:seg-1").analysis_type, "asr");
  await reopened.close();
} finally { await rm(root, { recursive: true, force: true }); }
console.log("evidence persistence check passed");
