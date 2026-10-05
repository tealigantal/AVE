import {mkdtemp,writeFile,cp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const run=promisify(execFile),root=process.cwd(),base=resolve(tmpdir()),out=await mkdtemp(resolve(base,'ave-p3-music-renderer-'));
try {
  const config=resolve(out,'tsconfig.json');
  await writeFile(config,JSON.stringify({extends:resolve(root,'tsconfig.base.json'),compilerOptions:{noEmit:false,outDir:out,rootDir:root,declaration:false,sourceMap:false},include:[resolve(root,'apps/desktop/src/**/*.ts'),resolve(root,'packages/**/*.ts'),resolve(root,'tests/integration/electron-stage2-harness.ts')]}));
  await run(process.execPath,[resolve(root,'node_modules/typescript/bin/tsc'),'-p',config],{cwd:root,windowsHide:true,maxBuffer:8*1024*1024});
  for(const name of ['packages','resources/audio','database','apps/worker-host','apps/desktop/src/renderer'])await cp(resolve(root,name),resolve(out,name),{recursive:true});
  await cp(resolve(root,'apps/desktop/src/preload-runtime.cjs'),resolve(out,'apps/desktop/src/preload.cjs'));
  await cp(resolve(root,'tests/fixtures/stage3/renderer-races.js'),resolve(out,'apps/desktop/src/renderer/test-renderer-races.js'));
  await writeFile(resolve(out,'apps/desktop/src/renderer/test-races.html'),'<html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/workbench.css"></head><body><div id="root"></div><script src="/test-renderer-races.js"></script></body></html>');
  const result=await run(resolve(root,'node_modules/electron/dist/electron.exe'),['--no-sandbox',`--user-data-dir=${resolve(out,'electron-user-data')}`,resolve(out,'tests/integration/electron-stage2-harness.js'),'--ave-harness-mode=renderer-races'],{cwd:out,windowsHide:true,timeout:90000,maxBuffer:8*1024*1024});
  console.log(result.stdout);console.error(result.stderr);
  assert.match(result.stdout,/AVE_CREATION_RENDERER_RACES/);assert.match(result.stdout,/AVE_ELECTRON_SHUTDOWN_COMPLETE/);assert.doesNotMatch(result.stderr,/AVE_ELECTRON_PRODUCT_REVIEW_FAILED|AVE_ELECTRON_UNCAUGHT/);
}finally {assert.ok(out.startsWith(base+'\\'));await rm(out,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
