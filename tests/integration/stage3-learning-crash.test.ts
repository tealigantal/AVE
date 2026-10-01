import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { createDeepSeekProvider } from "../../packages/platform/model-gateway/src/public.js";
import { registerMediaAsset, readCreationLearningAttempt, readCreationLearningModelResult, readCreationLearningResult } from "../../packages/platform/project-storage/src/public.js";
import { assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import type { CreationLearningInput } from "../../packages/platform/project-host/src/stage3-learning.js";

const child = process.argv[2] === "--crash-child";
const root = child ? resolve(process.argv[3]!) : await mkdtemp(resolve(tmpdir(), "ave-stage3-learning-crash-"));
const credential = {}, now = () => Date.parse("2026-09-24T00:00:00Z");
const selection: CreationLearningInput = { operation_id: "crash", request_id: "crash", expected_revision: 1, correction: null, selection: { data_type: "history_reference", timeline_version: 0, observation_refs: [], raw_text: "Learn this approved history." } };
if (!child) {
  try {
    await promisify(execFile)(process.execPath, ["--import", "tsx", "tests/integration/stage3-learning-crash.test.ts", "--crash-child", root], { timeout: 20000, maxBuffer: 10000 });
    assert.fail("child must exit at the durable response checkpoint");
  } catch (error: any) { assert.equal(error.code, 77, error.stderr ?? String(error)); }
}
const profile = new ProfileRepository(resolve(root, "profile"), "profile", credential, now);
let sends = 0;
const provider = createDeepSeekProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: [] }], fetch_impl: async () => {
  sends++; assert.equal(child, true, "recovery must never send to the provider");
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ principles: [], no_inference_reason: "No preference signal." }) }, finish_reason: "stop" }], usage: { prompt_tokens: 70, completion_tokens: 20, total_tokens: 90 } }));
} });
const host = new ProjectHostSession({ now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "user" }], provider: "deepseek", model: "fixture-model", modelProvider: provider, creationModelPolicy: {   max_attempts: 1, timeout_ms: 10000 } });
try {
  if (child) {
    await host.create(resolve(root, "project")); const session = (host as any).session, projectId = session.manifest.project_id;
    const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "a".repeat(64), byte_length: 1n });
    registerMediaAsset(session, projectId, { asset_id: asset, algorithm: "sha256", digest: "a".repeat(64), byte_length: 1, stream_facts: {} });
    host.initializeTimeline([{ track_id: "main", kind: "video", clips: [{ clip_id: "shot", source: { asset_id: asset, start_pts: 0n, end_pts: 60n, timescale: 30n }, timeline_start: 0n, timeline_duration: 60n }] }], { sequence_id: "sequence", timebase: { value: 1n, timescale: 30n }, tracks: [] });
    await profile.configure(credential, { source_project_ids: [projectId], data_types: ["history_reference"], retention_until: "2027-01-01T00:00:00Z", external_provider: "deepseek", enabled: true });
    const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
    host.beginCreationRequest(credential, { ...authorization, request_id: "crash", provider: "deepseek", model: "fixture-model", asset_ids: [asset], allowed_data: ["request", "timeline", "evidence"], expires_at: "2027-01-01T00:00:00Z" });
    const exec = session.db.exec.bind(session.db);
    session.db.exec = (sql: string) => {
      const result = exec(sql);
      if (sql === "COMMIT" && session.db.prepare("SELECT 1 FROM model_runs").get()) {
        assert.equal(sends, 1); assert.equal(readCreationLearningResult(session, projectId, "crash"), null);
        assert.equal(host.readCreationRequest("crash").status, "adjusting");
        // Abrupt process termination: no Host close/catch/finally executes.
        process.exit(77);
      }
      return result;
    };
    await host.learnCreationExperience(credential, selection); assert.fail("crash checkpoint was not reached");
  } else {
    await host.open(resolve(root, "project")); const session = (host as any).session, projectId = session.manifest.project_id;
    const attempt = readCreationLearningAttempt(session, projectId, "crash"), model = readCreationLearningModelResult(session, projectId, "crash");
    assert.ok(model); assert.equal(readCreationLearningResult(session, projectId, "crash"), null);
    assert.equal(host.readCreationRequest("crash").status, "failed");
    assert.equal(host.readCreationRequest("crash").cancellation_generation, attempt.value.ticket.cancellation_generation, "verified saved response is recoverable without fabricating a user cancellation");
    const recovered = await host.learnCreationExperience(credential, selection);
    assert.equal(recovered.result.output_digest, model.result.output_hash); assert.equal(recovered.registration.no_inference_reason, "No preference signal.");
    assert.equal(sends, 0); assert.equal(host.readCreationRequest("crash").model_calls.length, 1);
    await host.close(); await host.open(resolve(root, "project"));
    assert.deepEqual(await host.learnCreationExperience(credential, selection), recovered); assert.equal(sends, 0);
    console.log("Stage3 learning actual process-exit recovery: durable response reused after reopen, zero additional sends, one registration, exact result retained (model fixture only)");
  }
} finally { await host.close(); await profile.close(); if (!child) await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
