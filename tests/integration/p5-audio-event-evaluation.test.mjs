import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const tool = resolve('scripts/p5/audio-event-evaluation.py');
const createFixture = String.raw`
import csv, hashlib, json, pathlib, struct, sys, wave, zipfile, zlib
p=pathlib.Path(sys.argv[1]); sha=lambda b:hashlib.sha256(b).hexdigest()
model=b'local-test-model'; (p/'model.tflite').write_bytes(model)
(p/'README.md').write_text('controlled fixture dataset'); (p/'LICENSE').write_text('fixture only')
with (p/'classmap.csv').open('w',newline='') as f:
 w=csv.writer(f); w.writerow(['index','mid','display_name'])
 for i in range(521): w.writerow([i,'/x', {0:'Speech',132:'Music',133:'Musical instrument'}.get(i,f'other-{i}')])
ids=[('fold1_room6_mix001','train','tau:room6'),('fold2_room8_mix002','test','tau:room8')]
labels={}
for n,(ident,split,room) in enumerate(ids):
 src=p/(ident+'.wav'); derived=p/(ident+'-stereo.wav')
 with wave.open(str(src),'wb') as f:
  f.setnchannels(4);f.setsampwidth(2);f.setframerate(24000)
  f.writeframes(b''.join(struct.pack('<hhhh',(i+n)%97,(i*2+n)%97,(i*3+n)%97,(i*4+n)%97) for i in range(24000)))
 with wave.open(str(derived),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(24000)
  f.writeframes(b''.join(struct.pack('<hh',(i+n)%97,(i*2+n)%97) for i in range(24000)))
 member='metadata_dev/dev-'+split+'-tau/'+ident+'.csv'
 # music covers entire second; instrument overlaps 0.3–0.6; speech at 0.2–0.3
 data=(''.join(f'{i},8,0,0,0\n' for i in range(10))+''.join(f'{i},9,1,0,0\n' for i in range(3,6))+'2,1,2,0,0\n').encode()
 labels[member]=data
with zipfile.ZipFile(p/'metadata.zip','w') as z:
 for k,v in labels.items():z.writestr(k,v)
ref=lambda path:{'path':path.name,'sha256':sha(path.read_bytes())}
records=[]; runrows=[]
for ident,split,room in ids:
 source=p/(ident+'.wav'); derived=p/(ident+'-stereo.wav'); member='metadata_dev/dev-'+split+'-tau/'+ident+'.csv'
 records.append({'id':ident,'split':split,'room':room,'source':ref(source),'derived':ref(derived),'annotation_member':member,'annotation_sha256':sha(labels[member])})
 scores=[0.0]*521; scores[0]=.3; scores[132]=.7; scores[133]=.8
 windows=[{'start':{'value':0,'timescale':16000},'end':{'value':15600,'timescale':16000},'padded_samples':0,'pcm_exact_zero':False,'scores':scores}, {'start':{'value':7680,'timescale':16000},'end':{'value':16000,'timescale':16000},'padded_samples':7280,'pcm_exact_zero':False,'scores':scores}]
 run={'status':'response','facts':{'input_sha256':ref(derived)['sha256'],'model_sha256':sha(model),'classmap_sha256':ref(p/'classmap.csv')['sha256'],'resample':'scipy.signal.resample_poly','score_semantics':'uncalibrated classifier scores, not probabilities','sample_rate':24000,'channels':2,'frames':24000,'windows':windows}}
 path=p/(ident+'.run.json');path.write_text(json.dumps(run));runrows.append({'recording_id':ident,**ref(path)})
receipt={'schema_version':1,'metadata_sha256':ref(p/'metadata.zip')['sha256'],'entries':[]}
for ident,split,room in ids:
 b=(p/(ident+'.wav')).read_bytes();receipt['entries'].append({'name':'mic_dev/dev-'+split+'-tau/'+ident+'.wav','sha256':sha(b),'uncompressed_bytes':len(b),'crc32':f'{zlib.crc32(b):08x}'})
(p/'receipt.json').write_text(json.dumps(receipt))
manifest={'schema_version':1,'dataset_receipt':ref(p/'receipt.json'),'metadata_zip':ref(p/'metadata.zip'),'dataset_readme':ref(p/'README.md'),'dataset_license':ref(p/'LICENSE'),'model':ref(p/'model.tflite'),'classmap':ref(p/'classmap.csv'),'recordings':records}
(p/'manifest.json').write_text(json.dumps(manifest));(p/'runs.jsonl').write_text(''.join(json.dumps(x)+'\n' for x in runrows))
`;

function withFixture(fn) {
  const dir = mkdtempSync(resolve(tmpdir(), 'ave-audio-evaluation-'));
  try { execFileSync('python', ['-c', createFixture, dir], { stdio: 'pipe' }); fn(dir); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
function evaluate(dir, output = 'report.json') {
  return spawnSync('python', [tool, '--manifest', resolve(dir, 'manifest.json'), '--runs', resolve(dir, 'runs.jsonl'), '--output', resolve(dir, output)], { encoding: 'utf8' });
}
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, value) => writeFileSync(p, JSON.stringify(value));
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');

test('exact STARSS alignment preserves full, partial, overlap and tail padding without qualification', () => withFixture(dir => {
  const result = evaluate(dir); assert.equal(result.status, 0, result.stderr);
  const report = readJson(resolve(dir, 'report.json')); assert.equal(report.status, 'exploratory_not_qualified');
  const [first, last] = report.recordings[0].windows;
  assert.equal(first.targets.music.state, 'full'); assert.equal(first.targets.instrument.state, 'partial');
  assert.equal(first.targets.female_speech.state, 'unknown'); assert.equal(first.targets.male_speech.state, 'partial');
  assert.deepEqual(first.targets.instrument.coverage, { numerator: 3, denominator: 10 });
  assert.deepEqual(first.overlap_duration, { numerator: 2, denominator: 5 });
  assert.equal(first.targets.music.score, .7); assert.equal(first.targets.instrument.score, .8);
  assert.equal(last.padded_samples, 7280); assert.deepEqual(last.end, { numerator: 1, denominator: 1 });
  assert.equal(report.summary_by_split_room['test/tau:room8'].music.full, 2);
  assert.notEqual(evaluate(dir).status, 0, 'existing report is never overwritten');
}));

test('rejects modified source and mismatched source-to-derived channels', () => withFixture(dir => {
  const path = resolve(dir, 'fold1_room6_mix001-stereo.wav');
  const bytes = readFileSync(path); bytes[100] ^= 1; writeFileSync(path, bytes);
  const badHash = evaluate(dir); assert.notEqual(badHash.status, 0); assert.match(badHash.stderr, /identity mismatch/);
  const manifestPath = resolve(dir, 'manifest.json'), manifest = readJson(manifestPath);
  const hash = execFileSync('python', ['-c', 'import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())', path], { encoding: 'utf8' }).trim();
  manifest.recordings[0].derived.sha256 = hash; writeJson(manifestPath, manifest);
  const changedPcm = evaluate(dir); assert.notEqual(changedPcm.status, 0); assert.match(changedPcm.stderr, /first two source channels/);
}));

test('rejects split misrepresentation and tampered annotation identity', () => withFixture(dir => {
  const path = resolve(dir, 'manifest.json'), manifest = readJson(path);
  manifest.recordings[1].split = 'train'; writeJson(path, manifest);
  let result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /split\/room\/member/);
  manifest.recordings[1].split = 'test'; manifest.recordings[0].annotation_sha256 = '0'.repeat(64); writeJson(path, manifest);
  result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /annotation identity mismatch/);
}));

test('rejects wrong model-run source and malformed or missing window', () => withFixture(dir => {
  const path = resolve(dir, 'runs.jsonl'), rows = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
  rows[0].recording_id = 'fold2_room8_mix002'; writeFileSync(path, rows.map(JSON.stringify).join('\n')+'\n');
  let result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /duplicate recording ID/);
  rows[0].recording_id = 'fold1_room6_mix001'; const manifest = readJson(resolve(dir, 'manifest.json'));
  rows[0].path = rows[1].path; rows[0].sha256 = rows[1].sha256; writeFileSync(path, rows.map(JSON.stringify).join('\n')+'\n');
  result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /source, format or model identity mismatch/);
  assert.notEqual(manifest.recordings[0].derived.sha256, manifest.recordings[1].derived.sha256, 'fixture identity stays distinct');
}));

test('rejects malformed window grids and scores even when run identity is updated', () => withFixture(dir => {
  const index = resolve(dir, 'runs.jsonl'), rows = readFileSync(index, 'utf8').trim().split('\n').map(JSON.parse);
  const path = resolve(dir, rows[0].path), original = readJson(path), altered = structuredClone(original);
  altered.facts.windows[0].start.value = 1; writeJson(path, altered); rows[0].sha256 = sha(path); writeFileSync(index, rows.map(JSON.stringify).join('\n')+'\n');
  let result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /window timing\/padding mismatch/);
  altered.facts.windows = original.facts.windows.slice(0,1); writeJson(path, altered); rows[0].sha256 = sha(path); writeFileSync(index, rows.map(JSON.stringify).join('\n')+'\n');
  result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /missing or extra analysis windows/);
  altered.facts.windows = structuredClone(original.facts.windows); altered.facts.windows[0].scores[132] = 1.1; writeJson(path, altered); rows[0].sha256 = sha(path); writeFileSync(index, rows.map(JSON.stringify).join('\n')+'\n');
  result = evaluate(dir); assert.notEqual(result.status, 0); assert.match(result.stderr, /521 finite scores/);
}));

test('unlabelled time stays unknown instead of a silent or negative class', () => withFixture(dir => {
  const script = String.raw`import hashlib,json,pathlib,sys,zipfile
p=pathlib.Path(sys.argv[1]); m=json.loads((p/'manifest.json').read_text()); old=p/'metadata.zip'; temp=p/'metadata-new.zip'
with zipfile.ZipFile(old) as z, zipfile.ZipFile(temp,'w') as out:
 for name in z.namelist():out.writestr(name,b'' if name==m['recordings'][0]['annotation_member'] else z.read(name))
temp.replace(old);m['metadata_zip']['sha256']=hashlib.sha256(old.read_bytes()).hexdigest();receipt=json.loads((p/'receipt.json').read_text());receipt['metadata_sha256']=m['metadata_zip']['sha256'];(p/'receipt.json').write_text(json.dumps(receipt));m['dataset_receipt']['sha256']=hashlib.sha256((p/'receipt.json').read_bytes()).hexdigest();m['recordings'][0]['annotation_sha256']=hashlib.sha256(b'').hexdigest();(p/'manifest.json').write_text(json.dumps(m))`;
  execFileSync('python', ['-c', script, dir]);
  const result=evaluate(dir); assert.equal(result.status,0,result.stderr);
  const first=readJson(resolve(dir,'report.json')).recordings[0].windows[0];
  assert.deepEqual(first.unlabelled_duration,{numerator:39,denominator:40});
  for(const value of Object.values(first.targets)) assert.equal(value.state,'unknown');
  assert.equal('silent' in first,false); assert.equal('negative' in first,false);
}));

test('rejects room leakage across official-named split paths', () => withFixture(dir => {
  const manifestPath=resolve(dir,'manifest.json'), manifest=readJson(manifestPath), r=manifest.recordings[1];
  const oldId=r.id,newId='fold2_room6_mix002';
  renameSync(resolve(dir,r.source.path),resolve(dir,newId+'.wav')); r.source.path=newId+'.wav';
  const oldMember=r.annotation_member; r.id=newId; r.room='tau:room6'; r.annotation_member='metadata_dev/dev-test-tau/'+newId+'.csv';
  const script=String.raw`import pathlib,sys,zipfile
p=pathlib.Path(sys.argv[1]); old=p/'metadata.zip'; temp=p/'metadata-new.zip'
with zipfile.ZipFile(old) as z, zipfile.ZipFile(temp,'w') as out:
 for n in z.namelist(): out.writestr(sys.argv[3] if n==sys.argv[2] else n,z.read(n))
temp.replace(old)`;
  execFileSync('python',['-c',script,dir,oldMember,r.annotation_member]);manifest.metadata_zip.sha256=sha(resolve(dir,'metadata.zip'));const receiptPath=resolve(dir,'receipt.json'), receipt=readJson(receiptPath);receipt.metadata_sha256=manifest.metadata_zip.sha256;writeJson(receiptPath,receipt);manifest.dataset_receipt.sha256=sha(receiptPath);writeJson(manifestPath,manifest);
  const result=evaluate(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/room leaked across splits/);
  assert.notEqual(oldId,newId);
}));


test('receipt binds metadata and the exact official member, length, SHA and CRC', () => withFixture(dir => {
 const manifestPath=resolve(dir,'manifest.json'), m=readJson(manifestPath), p=resolve(dir,'receipt.json'), original=readJson(p);
 for (const change of [r=>r.metadata_sha256='0'.repeat(64),r=>r.entries[0].name='mic_dev/dev-train-tau/other.wav',r=>r.entries[0].uncompressed_bytes++,r=>r.entries[0].sha256='0'.repeat(64),r=>r.entries[0].crc32='00000000']) {
  const receipt=structuredClone(original);change(receipt);writeJson(p,receipt);m.dataset_receipt.sha256=sha(p);writeJson(manifestPath,m);
  const result=evaluate(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/receipt:/);
 }
}));

test('rejects identical cross-split PCM even with distinct WAV container hashes', () => withFixture(dir => {
 const script=String.raw`import hashlib,json,pathlib,sys,zlib
p=pathlib.Path(sys.argv[1]);m=json.loads((p/'manifest.json').read_text());rr=json.loads((p/'receipt.json').read_text()); rows=[json.loads(s) for s in (p/'runs.jsonl').read_text().splitlines()]
a,b=m['recordings']; sha=lambda data:hashlib.sha256(data).hexdigest()
for key in ('source','derived'):
 data=(p/a[key]['path']).read_bytes()+b'X';(p/b[key]['path']).write_bytes(data);b[key]['sha256']=sha(data)
data=(p/b['source']['path']).read_bytes();rr['entries'][1].update(sha256=sha(data),uncompressed_bytes=len(data),crc32=f'{zlib.crc32(data):08x}')
(p/'receipt.json').write_text(json.dumps(rr));m['dataset_receipt']['sha256']=sha((p/'receipt.json').read_bytes());(p/'manifest.json').write_text(json.dumps(m))
rp=p/rows[1]['path'];r=json.loads(rp.read_text());r['facts']['input_sha256']=b['derived']['sha256'];rp.write_text(json.dumps(r));rows[1]['sha256']=sha(rp.read_bytes());(p/'runs.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in rows))`;
 execFileSync('python',['-c',script,dir]);const result=evaluate(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/PCM leaked across splits/);
}));

test('rejects changed score-label mapping and incompatible classifier semantics', () => withFixture(dir => {
 const manifestPath=resolve(dir,'manifest.json'), m=readJson(manifestPath), map=resolve(dir,'classmap.csv');
 const lines=readFileSync(map,'utf8').split('\n');const a=lines[1],b=lines[133];lines[1]=a.replace('Speech','Music');lines[133]=b.replace('Music','Speech');writeFileSync(map,lines.join('\n'));m.classmap.sha256=sha(map);writeJson(manifestPath,m);
 let result=evaluate(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/source, format or model identity mismatch/);
 lines[1]=a;lines[133]=b;writeFileSync(map,lines.join('\n'));m.classmap.sha256=sha(map);writeJson(manifestPath,m);
 const index=resolve(dir,'runs.jsonl'), rows=readFileSync(index,'utf8').trim().split('\n').map(JSON.parse), runPath=resolve(dir,rows[0].path), run=readJson(runPath);
 for(const [key,val] of [['resample','none'],['score_semantics','probabilities']]) {const x=structuredClone(run);x.facts[key]=val;writeJson(runPath,x);rows[0].sha256=sha(runPath);writeFileSync(index,rows.map(JSON.stringify).join('\n')+'\n');result=evaluate(dir);assert.notEqual(result.status,0);assert.match(result.stderr,/unsupported resampling or score semantics/);}
}));
