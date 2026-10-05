import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {currentBuildIdentity} from '../../../../scripts/docker/build-identity.mjs';
import {loadProgramModel} from '../../../../scripts/docs/program-model.mjs';
import {capabilityScope,scopeFingerprint} from '../../../../scripts/docs/evidence-scope.mjs';
const root=process.cwd(),json=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=await json('docs/evidence/assets/reliable-preview/no-alias-current-runtime.json'),ledger=await json('docs/evidence/assets/reliable-preview/full-ledger-attempt05.json'),current=await currentBuildIdentity(root,{runtime:false});
assert.equal(baseline.code_fingerprint,ledger.code_fingerprint);
for(const c of ledger.commands){assert.equal(c.exit_code,0);assert.equal(sha(await readFile(c.log.path)),c.log.sha256);}
const old=new Map(baseline.inputs.files.map(f=>[f.path,f]));
const changed=[];
for(const f of current.inputs.files){const q=old.get(f.path);if(!q||q.sha256!==f.sha256)changed.push({path:f.path,before:q?.sha256??null,after:f.sha256});old.delete(f.path);}
for(const f of old.values())changed.push({path:f.path,before:f.sha256,after:null});
const model=await loadProgramModel(root),log=await readFile('docs/evidence/assets/reliable-journey/p3-human-docs-check.log','utf8'),ids=[...log.matchAll(/^evidence applicability (\S+)/gm)].map(x=>x[1]);
const glob=g=>new RegExp('^'+g.replace(/[.+^${}()|[\]\\]/g,'\\$&').replaceAll('**','§§').replaceAll('*','[^/]*').replaceAll('§§','.*')+'$');
const capabilities=[];
for(const id of ids){const p=model.programs.find(p=>p.capabilities.some(c=>c.capability_id===id)),c=p.capabilities.find(c=>c.capability_id===id),scope=capabilityScope(p,c);capabilities.push({capability_id:id,name:c.name,status:c.status,scope_id:scope.scope_id,scope_fingerprint:await scopeFingerprint(root,scope),include:scope.include,changed_product_inputs:changed.filter(f=>scope.include.some(g=>glob(g).test(f.path))).map(f=>f.path),historical_evidence_id:c.evidence_ids.at(-1),boundary:'Engineering applicability only; historical human acceptance remains bound to its original build; no new Stage Exit or Release'});}
await writeFile('docs/evidence/assets/doc-008/source-audit.json',JSON.stringify({baseline_fingerprint:baseline.code_fingerprint,current_fingerprint:current.code_fingerprint,baseline_verified_commands:ledger.commands.length,changed_product_inputs:changed,capabilities},null,2));
await writeFile('docs/evidence/assets/doc-008/current-source-identity.json',JSON.stringify(current,null,2));
console.log('Verified historical log hashes; audited',changed.length,'changed product inputs and',capabilities.length,'capability scopes');
