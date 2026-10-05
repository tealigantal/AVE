import { cp, lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const output = resolve(process.argv[2] ?? 'dist/docker');
const app = resolve(output, 'app');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function inventory(base, roots) {
  const files = [];
  async function visit(path) {
    const target = resolve(base, path);
    const details = await lstat(target);
    if (details.isSymbolicLink()) throw new Error(`Build provenance rejects source/output symlink: ${path}`);
    if (details.isDirectory()) {
      if (['node_modules', '__pycache__', '.git'].includes(path.split('/').at(-1))) return;
      for (const name of (await readdir(target)).sort()) await visit(`${path}/${name}`);
    } else if (details.isFile() && !path.endsWith('.log') && !path.endsWith('.pyc')) files.push({ path, bytes: details.size, sha256: hash(await readFile(target)) });
  }
  for (const path of roots) await visit(path);
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
const sourceRoots = ['apps', 'packages', 'contracts', 'database', 'resources/audio', 'tools/contract-codegen', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'scripts/docker/build-desktop.mjs'];
const sourceInputs = await inventory(root, sourceRoots);
await mkdir(app, { recursive: true });
const config = resolve(output, 'tsconfig.json');
const globRoot = root.replaceAll('\\', '/');
await writeFile(config, JSON.stringify({ extends: resolve(root, 'tsconfig.base.json'), compilerOptions: { noEmit: false, outDir: app, rootDir: root, declaration: false, sourceMap: false }, include: [`${globRoot}/apps/desktop/src/**/*.ts`, `${globRoot}/apps/web/src/**/*.ts`, `${globRoot}/packages/**/*.ts`] }));
const compiled = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', config], { stdio: 'inherit' });
if (compiled.error) throw compiled.error;
if (compiled.status !== 0) throw new Error(`Desktop compilation failed (${compiled.status})`);
for (const path of ['packages', 'resources/audio', 'contracts/generated', 'database', 'apps/worker-host', 'apps/desktop/src/renderer']) await cp(resolve(root, path), resolve(app, path), { recursive: true });
await cp(resolve(root, 'apps/desktop/src/preload-runtime.cjs'), resolve(app, 'apps/desktop/src/preload.cjs'));
await writeFile(resolve(app, 'package.json'), JSON.stringify({ type: 'module' }));
const outputs = await inventory(app, ['apps', 'packages', 'contracts', 'database', 'resources', 'package.json']);
await writeFile(resolve(app, 'build-provenance.json'), JSON.stringify({ schema_version: 1, source_roots: sourceRoots, source_inputs: sourceInputs, source_digest: hash(JSON.stringify(sourceInputs)), outputs, output_digest: hash(JSON.stringify(outputs)) }));
