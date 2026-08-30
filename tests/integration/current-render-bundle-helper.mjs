import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { registerRenderBundle } from "../../packages/platform/project-storage/src/project-storage.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");

export function registerCurrentRenderFixture(session, projectId, { renderId, outputPath, timelineVersion = 1, binding } = {}) {
  const outputHash = digest(readFileSync(outputPath));
  const semanticPayload = JSON.stringify({ render_id: renderId });
  const semanticHash = digest(semanticPayload);
  const plan = (target) => { const cachePayload = JSON.stringify({ render_id: renderId, target }); const cacheKey = digest(cachePayload); return { schema_version: 2, plan_id: `plan-${target}-${cacheKey.slice(0, 24)}`, target, semantic_graph_payload: semanticPayload, semantic_graph_hash: semanticHash, adapter_id: "worker-media", adapter_version: "v4", capability_snapshot: { schema_version: 1, adapter_id: "worker-media", adapter_version: "v4", capabilities: [] }, decisions: [], cache_key_payload: cachePayload, cache_key: cacheKey, diagnostics: [] }; };
  const plans = { preview: plan("preview"), master: plan("master") };
  const result = (target) => ({ render_result_id: `${renderId}-${target}`, render_id: renderId, target, timeline_version: timelineVersion, graph_hash: semanticHash, render_graph: { target }, original_refs: [], proxy_refs: [], profile: { name: "current-test", ...(binding ? { stage2_execution_binding: binding } : {}) }, worker_version: "ave-worker-host-r14", ffmpeg_version: "ffmpeg-test", output_path: outputPath, output_hash: outputHash });
  const output = (target) => ({ schema_version: 2, render_id: renderId, target, semantic_graph_hash: semanticHash, execution_plan_id: plans[target].plan_id, cache_key: plans[target].cache_key, output_hash: outputHash, worker_version: "ave-worker-host-r14", backend_version: "ffmpeg-test", diagnostics: [] });
  return registerRenderBundle(session, projectId, { schema_version: 1, bundle_id: `bundle-${renderId}`, idempotency_key: `render:${renderId}`, state: "completed", render: { render_id: renderId, original_path: outputPath, proxy_path: outputPath, preview_path: outputPath, master_path: outputPath, qc_report: { schema_version: 1, render_id: renderId, status: "passed", issues: [] } }, results: [result("preview"), result("master")], manifests: [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: plans.preview }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: plans.master }, { manifest_id: `${renderId}-output-preview`, manifest_type: "output_manifest", value: output("preview") }, { manifest_id: `${renderId}-output-master`, manifest_type: "output_manifest", value: output("master") }] });
}
