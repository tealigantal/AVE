import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=JSON.parse(await readFile('/ave-build-inputs.json','utf8'));
const provenance=JSON.parse(await readFile('/opt/ave/app/build-provenance.json','utf8'));
const expected=identity.inputs.files.filter(file=>provenance.source_roots.some(root=>file.path===root||file.path.startsWith(`${root}/`))).sort((a,b)=>a.path.localeCompare(b.path,'en'));
assert.deepEqual(provenance.source_inputs,expected);
assert.equal(provenance.source_digest,sha(JSON.stringify(expected)));
assert.equal(provenance.output_digest,sha(JSON.stringify(provenance.outputs)));
for(const output of provenance.outputs){
  assert(!output.path.startsWith('/')&&!output.path.split('/').includes('..'));
  const bytes=await readFile(`/opt/ave/app/${output.path}`);
  assert.equal(bytes.length,output.bytes,output.path);
  assert.equal(sha(bytes),output.sha256,output.path);
}
console.log(JSON.stringify({result:'passed',scope:'actual compiled image files, not running product or UI',code_fingerprint:identity.code_fingerprint,build_input_digest:identity.build_input_digest,source_digest:provenance.source_digest,output_digest:provenance.output_digest,source_count:expected.length,verified_output_count:provenance.outputs.length},null,2));
