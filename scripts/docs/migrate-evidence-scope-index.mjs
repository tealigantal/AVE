import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProgramModel, writeTextFiles } from "./program-model.mjs";
import { capabilityScope, scopeFingerprint } from "./evidence-scope.mjs";

const root = process.cwd();
const evidenceHeader = (text) => new Map((text.match(/^---\r?\n([\s\S]*?)\r?\n---/m)?.[1] ?? "").split(/\r?\n/).map((line) => {
  const index = line.indexOf(":");
  return index < 0 ? [] : [line.slice(0, index).trim(), line.slice(index + 1).trim()];
}).filter((pair) => pair.length));

export async function migrateEvidenceScopeIndex(modelRoot = root) {
  const value = await loadProgramModel(modelRoot);
  const entries = [];
  for (const program of value.programs) for (const capability of program.capabilities) {
    const scope = capabilityScope(program, capability);
    const scope_fingerprint = await scopeFingerprint(modelRoot, scope);
    for (const evidence_id of capability.evidence_ids) {
      const header = evidenceHeader(await readFile(resolve(modelRoot, `docs/evidence/runs/${evidence_id}.md`), "utf8"));
      const repository_fingerprint = header.get("code_fingerprint");
      if (!/^[a-f0-9]{64}$/.test(repository_fingerprint ?? "")) throw new Error(`legacy Evidence lacks repository fingerprint: ${evidence_id}`);
      entries.push({ capability_id: capability.capability_id, evidence_id, repository_fingerprint, scope_id: scope.scope_id, scope_fingerprint, applicability_index_only: true });
    }
  }
  entries.sort((left, right) => `${left.capability_id}/${left.evidence_id}`.localeCompare(`${right.capability_id}/${right.evidence_id}`, "en"));
  await writeTextFiles(modelRoot, [["docs/evidence/APPLICABILITY_INDEX.json", `${JSON.stringify({ schema_version: 1, generated_by: "WP-CA-GOV-003", entries }, null, 2)}\n`]]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) migrateEvidenceScopeIndex().then(() => console.log("Evidence applicability index written")).catch((error) => { console.error(error.message); process.exitCode = 1; });
