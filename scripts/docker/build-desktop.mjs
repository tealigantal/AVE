import { cp, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const output = resolve(process.argv[2] ?? 'dist/docker');
const app = resolve(output, 'app');
await mkdir(app, { recursive: true });
const config = resolve(output, 'tsconfig.json');
const globRoot = root.replaceAll('\\', '/');
await writeFile(config, JSON.stringify({ extends: resolve(root, 'tsconfig.base.json'), compilerOptions: { noEmit: false, outDir: app, rootDir: root, declaration: false, sourceMap: false }, include: [`${globRoot}/apps/desktop/src/**/*.ts`, `${globRoot}/apps/web/src/**/*.ts`, `${globRoot}/packages/**/*.ts`] }));
const compiled = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', config], { stdio: 'inherit' });
if (compiled.error) throw compiled.error;
if (compiled.status !== 0) throw new Error(`Desktop compilation failed (${compiled.status})`);
for (const path of ['packages', 'contracts/generated', 'database', 'apps/worker-host', 'apps/desktop/src/renderer']) await cp(resolve(root, path), resolve(app, path), { recursive: true });
await cp(resolve(root, 'apps/desktop/src/preload-runtime.cjs'), resolve(app, 'apps/desktop/src/preload.cjs'));
await writeFile(resolve(app, 'package.json'), JSON.stringify({ type: 'module' }));
