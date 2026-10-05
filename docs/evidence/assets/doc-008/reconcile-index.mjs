import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const json=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const ledgerPath='docs/evidence/assets/doc-008/ledger.json',ledger=await json(ledgerPath),audit=await json('docs/evidence/assets/doc-008/source-audit.json');
assert.equal(ledger.code_fingerprint,audit.current_fingerprint);assert.equal(ledger.final_fingerprint,audit.current_fingerprint);assert.ok(ledger.finished_at);
const extraPath='docs/evidence/assets/doc-008/media-import-host-test.log';
const extra={command:'media-import:host:test',exit_code:0,log:{path:extraPath,sha256:sha(await readFile(extraPath))}};
assert.match((await readFile(extraPath,'utf8')),/passed/i);
const commands=[...ledger.commands,extra];
for(const c of commands)assert.equal(sha(await readFile(c.log.path)),c.log.sha256);
const common=['typecheck','contracts:check','architecture'];
const checks={
 'CAP-CA-GOV-001':['docs:architecture:test','docs:fingerprint:test','interaction-acceptance:test','build-identity:test'],
 'CAP-CA-CONTEXT-001':['stage2:check'], 'CAP-CA-SKILL-001':['stage2:check'],
 'CAP-CA-DURATION-001':['stage2:check','stage3:check'], 'CAP-CA-STORY-001':['stage2:check'],
 'CAP-CA-FEEDBACK-001':['stage2:check','stage3:check'], 'CAP-CA-PRODUCT-001':['stage2:check','workbench:host:test'],
 'CAP-CA-GOV-003':['docs:architecture:test','docs:fingerprint:test'], 'CAP-CA-SEC-001':['contracts:check'],
 'CAP-S3-SKILL-001':['stage3:check'], 'CAP-S3-WEB-001':['storage:check','browser-download:test','workspace-issues:test'],
 'CAP-S3-RELIABLE-IMPORT-001':['media-import:host:test','storage:check'],
 'CAP-S3-RELIABLE-PREVIEW-001':['stage3:check','worker:client:test','worker:crash-recovery:test'],
 'CAP-S3-PROJECT-DELETE-001':['project-delete:test','storage:check','workspace-issues:test']
};
const decisions=audit.capabilities.map(c=>{const required=[...new Set([...common,...(checks[c.capability_id]??[])])];const renderAffected=c.changed_product_inputs.some(p=>p.endsWith('graph_compiler.py'));const missing=required.filter(name=>!commands.some(x=>x.command===name&&x.exit_code===0));return {...c,revalidation_commands:required,disposition:renderAffected?'blocked-render-validation':missing.length?'blocked-required-checks':'engineering-applicability-revalidated',missing};});
const approved=decisions.filter(x=>x.disposition==='engineering-applicability-revalidated');
const indexPath='docs/evidence/APPLICABILITY_INDEX.json',index=await json(indexPath),evidence='EVD-20261005-DOC-008-CURRENT-REPOSITORY';
for(const c of approved)index.entries.push({capability_id:c.capability_id,evidence_id:c.historical_evidence_id,repository_fingerprint:audit.current_fingerprint,scope_id:c.scope_id,scope_fingerprint:c.scope_fingerprint,applicability_index_only:true,revalidation_evidence_id:evidence,revalidation_ledger:{path:ledgerPath,sha256:sha(await readFile(ledgerPath))},impact_audit:{path:'docs/evidence/assets/doc-008/source-audit.json',sha256:sha(await readFile('docs/evidence/assets/doc-008/source-audit.json'))},revalidation_commands:c.revalidation_commands,acceptance_boundary:c.boundary});
await writeFile(indexPath,JSON.stringify(index,null,2)+'\n');
await writeFile('docs/evidence/assets/doc-008/applicability-decisions.json',JSON.stringify({evidence_id:evidence,approved:approved.length,retained_blockers:decisions.length-approved.length,commands,decisions},null,2));
console.log('Revalidated',approved.length,'scopes; retained',decisions.length-approved.length,'unproven scopes');
