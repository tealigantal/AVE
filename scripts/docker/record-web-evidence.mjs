import { readFile, writeFile } from 'node:fs/promises';
import { fingerprint } from '../docs/fingerprint.mjs';
import { loadProgramModel } from '../docs/program-model.mjs';
import { capabilityScope, scopeFingerprint } from '../docs/evidence-scope.mjs';
const evidenceId=process.argv[2];
if (!/^EVD-20261002-S3-WEB-[A-Z-]+$/.test(evidenceId??'')) throw new Error('Evidence identifier required');
const body=await readFile(process.argv[3],'utf8');
const root=process.cwd(),fp=await fingerprint(root),model=await loadProgramModel(root);
const pins=[];
for(const program of model.programs) {
  for(const capability of program.capabilities) {
    if(['implemented','tested','accepted'].includes(capability.status)) {
      pins.push(`- ${capability.capability_id}; scope_fingerprint: ${await scopeFingerprint(root,capabilityScope(program,capability))}`);
      if(!capability.evidence_ids.includes(evidenceId))capability.evidence_ids.push(evidenceId);
    }
  }
  program.state.latest_evidence_id=evidenceId;
  program.state.latest_validation_at=new Date().toISOString();
  await writeFile(program.files.capabilities,JSON.stringify(program.capabilities,null,2)+'\n');
  await writeFile(program.files.state,JSON.stringify(program.state,null,2)+'\n');
}
await writeFile(`docs/evidence/runs/${evidenceId}.md`,`---\nevidence_id: ${evidenceId}\nwork_package_id: WP-S3-WEB-001\ndate: 2026-10-02\ncode_fingerprint: ${fp}\ncapability_ids: [CAP-S3-WEB-001]\nacceptance_ids: [ACC-S3-WEB-001]\nresult: passed\n---\n${body}\n\n${pins.join('\n')}\n`);
console.log(`Recorded ${evidenceId}; source fingerprint ${fp}`);
