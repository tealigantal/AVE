import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { listPersistentJobs, openProject } from "../../packages/platform/project-storage/src/public.js";

async function exercise(root: string): Promise<void> {
  const host = new ProjectHostSession();
  await host.create(root);
  await host.render(resolve("tests/fixtures/generated/p0-vfr.mp4"));
  await host.close();
  const session = await openProject(root);
  const jobs = listPersistentJobs(session, session.manifest.project_id) as Array<{ state: string; attempt: number; output_refs: unknown[] }>;
  assert.equal(jobs.length, 6, "legacy render verifies Original identity before probe/QC/render jobs");
  assert.ok(jobs.every((job) => job.state === "SUCCEEDED" && job.attempt === 1));
  assert.ok(jobs.every((job) => job.output_refs.length > 0));
  await session.close();
}

const root = await mkdtemp(resolve(tmpdir(), "ave-project-host-job-"));
try { await exercise(root); console.log("project host persistent media job check passed"); }
finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 150)); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 }); }
