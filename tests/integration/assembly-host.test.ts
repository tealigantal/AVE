import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-assembly-host-v2-"));
try { const host = new ProjectHostSession(); await host.create(root); const session = (host as any).session; assert.equal("registerAssemblyCut" in host, false); assert.equal("readAssemblyCut" in host, false); assert.equal("compileAssemblyToTimeline" in host, false); assert.equal(typeof host.registerAssemblyCutV2, "function"); const before = session.db.prepare("SELECT total_changes() count").get().count; await assert.rejects(() => host.registerAssemblyCutV2({ schema_version: 2, assembly_id: "missing-plan", object_version: 1, approved_story_ref: { object_id: "missing", object_version: 1, digest: "0".repeat(64) }, clips: [], status: "candidate", created_at: "2026-08-28T00:00:00Z", provenance: { producer: "project-host", source_version: "assembly-cut-v2", input_refs: [] } }), /STORY_UNAVAILABLE_OR_STALE/); assert.equal(session.db.prepare("SELECT total_changes() count").get().count, before); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((done) => setTimeout(done, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("AssemblyCutV2 Host boundary rejects absent exact authority without writes");
