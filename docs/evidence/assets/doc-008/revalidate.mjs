import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fingerprint} from '../../../../scripts/docs/fingerprint.mjs';
const root=process.cwd(),dir=resolve(root,'docs/evidence/assets/doc-008');
const commands=['docs:architecture:test','docs:fingerprint:test','interaction-acceptance:test','build-identity:test','typecheck','contracts:check','stage2:check','stage3:check','storage:check','worker:crash-recovery:test','worker:client:test','worker:render-correctness:test','platform:foundation:test','project-recovery:test','renderer:workbench:test','workbench:host:test','export:host:test','render-persistence:test','architecture'];
const jobs=commands.map(command=>({command,args:['run',command]}));
jobs.push({command:'workspace-issues:test',args:null,node:['--import','tsx','tests/integration/workspace-issues.test.ts']},{command:'project-delete:test',node:['--import','tsx','tests/integration/stage3-recent-projects.test.ts']},{command:'browser-download:test',node:['--experimental-vm-modules','tests/property/browser-download.test.mjs']});
const ledger={schema_version:1,scope:'DOC-008 impact checks, controlled fixtures; no real-media or human promotion',code_fingerprint:await fingerprint(root),started_at:new Date().toISOString(),commands:[]};
let next=0;
async function worker(){while(next<jobs.length){const job=jobs[next++],file=job.command.replaceAll(':','-')+'.log';const chunks=[];const child=job.node?spawn(process.execPath,job.node,{cwd:root,env:process.env,windowsHide:true}):spawn('cmd.exe',['/d','/s','/c',`pnpm run ${job.command}`],{cwd:root,env:process.env,windowsHide:true});child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));const exit_code=await new Promise((accept,reject)=>{child.on('error',reject);child.on('close',accept);});const bytes=Buffer.concat(chunks);await writeFile(resolve(dir,file),bytes);ledger.commands.push({command:job.command,exit_code,log:{path:'docs/evidence/assets/doc-008/'+file,sha256:createHash('sha256').update(bytes).digest('hex')}});await writeFile(resolve(dir,'ledger.json'),JSON.stringify(ledger,null,2));console.log(job.command,exit_code);}}
await Promise.all([worker(),worker()]);ledger.finished_at=new Date().toISOString();ledger.final_fingerprint=await fingerprint(root);await writeFile(resolve(dir,'ledger.json'),JSON.stringify(ledger,null,2));if(ledger.commands.some(x=>x.exit_code!==0)||ledger.code_fingerprint!==ledger.final_fingerprint)process.exitCode=1;
