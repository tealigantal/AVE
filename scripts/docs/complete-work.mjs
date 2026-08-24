import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint } from "./fingerprint.mjs";
import { activeWorkPackages, assertProgramTopology, exactWorkPackage, loadProgramModel, writeJsonFiles } from "./program-model.mjs";
import { sync } from "./sync.mjs";

function evidenceHeader(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error("completion evidence frontmatter is missing");
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, ""));
  }
  return fields;
}

function evidenceIds(fields, key) {
  const raw = fields.get(key);
  if (!raw?.startsWith("[") || !raw.endsWith("]")) throw new Error(`completion evidence ${key} is invalid`);
  const contents = raw.slice(1, -1).trim();
  return contents ? contents.split(",").map((value) => value.trim().replace(/^['"]|['"]$/g, "")) : [];
}

export async function completeWork(root, id, evidenceId) {
  const value = await loadProgramModel(root);
  assertProgramTopology(value.registry, value.programs);
  const target = exactWorkPackage(value.programs, id);
  const active = activeWorkPackages(value.programs);
  if (active.length !== 1 || active[0].workPackage.work_package_id !== id) throw new Error("work package is not the unique global active package");
  if (target.workPackage.status !== "active" || target.program.state.active_work_package !== id) throw new Error("work package is not active in programme state");
  const owned = [
    ...target.program.capabilities.filter((item) => target.workPackage.capability_ids.includes(item.capability_id)),
    ...target.program.acceptances.filter((item) => target.workPackage.acceptance_ids.includes(item.acceptance_id)),
  ];
  if (target.workPackage.capability_ids.length === 0 || target.workPackage.acceptance_ids.length === 0 || owned.length !== target.workPackage.capability_ids.length + target.workPackage.acceptance_ids.length) throw new Error("work package ownership matrices are incomplete");
  const missingEvidence = owned.filter((item) => !item.evidence_ids.includes(evidenceId));
  if (missingEvidence.length) throw new Error(`matrix status must be reconciled explicitly before completion: ${missingEvidence.map((item) => item.capability_id ?? item.acceptance_id).join(",")}`);
  const currentFingerprint = await fingerprint(root);
  if (target.program.state.code_fingerprint !== currentFingerprint) throw new Error("programme state fingerprint is stale; run docs:sync before completion");
  let evidenceText;
  try { evidenceText = await readFile(resolve(root, `docs/evidence/runs/${evidenceId}.md`), "utf8"); } catch { throw new Error(`completion evidence is missing: ${evidenceId}`); }
  const header = evidenceHeader(evidenceText);
  if (header.get("evidence_id") !== evidenceId) throw new Error("completion evidence identity mismatch");
  if (header.get("work_package_id") !== id) throw new Error("completion evidence work package mismatch");
  if (header.get("code_fingerprint") !== currentFingerprint) throw new Error("completion evidence fingerprint mismatch");
  const evidenceCapabilityIds = new Set(evidenceIds(header, "capability_ids"));
  const evidenceAcceptanceIds = new Set(evidenceIds(header, "acceptance_ids"));
  if (target.workPackage.capability_ids.some((capabilityId) => !evidenceCapabilityIds.has(capabilityId))) throw new Error("completion evidence capability binding mismatch");
  if (target.workPackage.acceptance_ids.some((acceptanceId) => !evidenceAcceptanceIds.has(acceptanceId))) throw new Error("completion evidence acceptance binding mismatch");

  target.workPackage.status = "completed";
  target.program.state.last_completed_work_package = id;
  target.program.state.latest_evidence_id = evidenceId;
  target.program.state.active_work_package = null;
  assertProgramTopology(value.registry, value.programs);
  await writeJsonFiles(root, [
    [target.program.files.manifest, target.program.manifest],
    [target.program.files.capabilities, target.program.capabilities],
    [target.program.files.acceptances, target.program.acceptances],
    [target.program.files.state, target.program.state],
  ]);
  await sync(false, root);
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const [id, evidenceId] = process.argv.slice(2).filter((argument) => argument !== "--");
  if (!id || !evidenceId) throw new Error("WP-ID and EVIDENCE-ID required");
  await completeWork(process.cwd(), id, evidenceId);
}
