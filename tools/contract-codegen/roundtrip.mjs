import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const generated = path.join(root, 'contracts/generated');
function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(target));
    else result.push(target);
  }
  return result;
}
const files = fs.existsSync(generated) ? walk(generated) : [];
const ts = files.filter((file) => file.endsWith('.ts'));
const py = files.filter((file) => file.endsWith('.py'));
if (ts.length === 0 || ts.length !== py.length) throw new Error(`generated language count mismatch (${ts.length}/${py.length})`);
for (const file of [...ts, ...py]) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('GENERATED FILE')) throw new Error(`missing generated marker: ${file}`);
}
const python = spawnSync('python', ['-m', 'compileall', '-q', generated], { encoding: 'utf8' });
if (python.status !== 0) throw new Error(`Python generated contract compile failed: ${python.stderr || python.stdout}`);
console.log(`contract roundtrip shape check passed (${ts.length} TypeScript/${py.length} Python)`);
