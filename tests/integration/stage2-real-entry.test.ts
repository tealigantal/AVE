import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), 'ave-stage2-real-entry-'));
try {
  const manifest = resolve(root, 'single-source.json');
  await writeFile(manifest, JSON.stringify({ schema_version: 1, originals: [{ path: resolve(root, 'unread-source.mp4') }] }));
  for (const [entry, outputVariable] of [
    ['intelligence-pipeline-real.test.ts', 'AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT'],
    ['feedback-revision-real.test.ts', 'AVE_INTELLIGENCE_PIPELINE_REVIEW_ROOT'],
  ]) {
    const output = resolve(root, entry);
    await assert.rejects(
      run(process.execPath, ['--import', 'tsx', `tests/integration/${entry}`], {
        cwd: resolve(import.meta.dirname, '../..'),
        env: { ...process.env, AVE_REAL_MEDIA_MANIFEST: manifest, [outputVariable]: output, AVE_STAGE2_PRODUCT_PROJECT: resolve(root, 'unused-old-project') },
      }),
      (error: any) => {
        assert.notEqual(error.code, 0);
        assert.match(error.stderr, /STAGE2_MATERIAL_CASE_REQUIRED/);
        return true;
      },
    );
    assert.deepEqual((await readdir(output)).sort(), ['人工评审.md', '开始验收.html', '素材准备.md'].sort(), 'a rejected manifest creates only the blocker report, never a project or rendered output');
  }
  const retiredOutput = resolve(root, 'retired-desktop-output');
  await assert.rejects(run(process.execPath, ['--import', 'tsx', 'tests/integration/stage2-product-workspace-real.test.ts'], {
    cwd: resolve(import.meta.dirname, '../..'),
    env: { ...process.env, AVE_REAL_MEDIA_MANIFEST: manifest, AVE_STAGE2_PRODUCT_REVIEW_ROOT: retiredOutput },
  }), (error: any) => { assert.notEqual(error.code, 0); assert.match(error.stderr, /STAGE2_DESKTOP_REVIEW_RETIRED/); return true; });
  assert.equal((await readdir(root)).includes('retired-desktop-output'), false, 'retired product entry must fail before reading media or creating review/project/render output');

} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
console.log('Stage2 real entries reject single-source manifests without invoking another workflow');
