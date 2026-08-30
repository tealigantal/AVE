import { access } from "node:fs/promises";
import { createLocalWorkerJobPort } from "../../worker-client/src/public.mjs";

async function assertCandidate(path, label) {
  if (typeof path !== "string" || !path) throw new Error(`${label} candidate path is missing`);
  await access(path);
  return path;
}

export async function qcMaster(master, worker, sourceKind = "unknown", options = {}) {
  const active = worker ?? createLocalWorkerJobPort();
  try {
    const result = await active.submit("qc.master.v1", { master_path: await assertCandidate(master, "master"), source_kind: sourceKind, render_id: "master", ...options });
    const report = Array.isArray(result.outputs) ? result.outputs.find((candidate) => candidate.kind === "qc")?.report : undefined;
    if (!report) throw new Error("worker result missing qc report");
    return report;
  } finally { if (!worker) await active.close?.(); }
}
