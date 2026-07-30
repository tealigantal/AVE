import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const input = JSON.parse(fs.readFileSync(path.join(root, 'contracts/compatibility/v0/rational-time.v0.json'), 'utf8'));
if (input.schema_version !== 0 || !Number.isInteger(input.ticks) || !Number.isInteger(input.scale) || input.scale <= 0) {
  throw new Error('invalid v0 RationalTime fixture');
}
const output = { value: input.ticks, timescale: input.scale };
if (output.value !== 9000 || output.timescale !== 30000) throw new Error('v0 migration mismatch');
console.log(`v0 migration passed (${output.value}/${output.timescale})`);
