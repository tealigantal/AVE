import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { acquireResumeLock, assertEmptySwitchComplete, buildHarnessManifest, stagePerformanceHarness, stageUsedHarness, stageUsed2Harness, verifyAmendedHarness, validateEmptySwitchEvidence, validateStoppedRuntime, validateUsedResumeRuntime } from '../../scripts/p5/run.mjs';
import { runFixedUsed2Switch } from '../../scripts/p5/used2-policy-run.mjs';
import { requireNoUsed2Helper, used2ResumeSource, verifyFixedUsed3RunArtifacts, verifyFixedUsed4RunArtifacts, verifyFixedUsed5RunArtifacts, verifyFixedUsed6RunArtifacts, verifyFixedUsed7RunArtifacts, verifyFixedUsed8RunArtifacts, verifyFixedUsed9RunArtifacts, verifyFixedUsed10RunArtifacts, verifyFixedUsed11RunArtifacts, verifyFixedUsed12RunArtifacts, verifyFixedUsed13RunArtifacts, verifyFixedUsed15RunArtifacts, verifyFixedUsed16RunArtifacts, verifyFixedUsed17RunArtifacts, verifyFixedUsed18RunArtifacts, verifyFixedUsed19RunArtifacts, verifyFixedUsed20RunArtifacts, verifyFixedUsed21RunArtifacts, verifyFixedUsed22RunArtifacts, verifyFixedUsed23RunArtifacts, verifyFixedUsed24RunArtifacts, verifyFixedUsed25RunArtifacts } from '../../scripts/p5/used2-policy-runtime.mjs';
import { verifyFixedUsedRunArtifacts, runFixedUsedSwitch, requireNoUsedHelper } from '../../scripts/p5/used-policy-run.mjs';
import { policyDigest } from '../../scripts/p5/guard.mjs';
import { verifyFixedUsed26RunArtifacts, verifyFixedUsed27RunArtifacts, verifyFixedUsed28RunArtifacts } from '../../scripts/p5/used2-policy-runtime.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const image = `sha256:${'b'.repeat(64)}`;
const realR3Root = fileURLToPath(new URL('../../docs/evidence/assets/mixed-media-p5/current-build-20261105/', import.meta.url));
const realR3Files = ['guarded-run-20261105-r3.json', 'compose-guarded-20261105-r3.json', 'build-20261105-r3.json', 'guarded-identity-1793879372476.json'];
const realR4Files = ['guarded-run-20261105-r4.json', 'compose-guarded-20261105-r4.json', 'build-20261105-r4.json', 'guarded-identity-1793882332337.json'];
const realR5Files = ['guarded-run-20261105-r5.json', 'compose-guarded-20261105-r5.json', 'build-20261105-r5.json', 'guarded-identity-1793884580468.json'];
const realR6Files = ['guarded-run-20261105-r6.json', 'compose-guarded-20261105-r6.json', 'build-20261105-r6.json', 'guarded-identity-1793885717885.json'];

test('only the specifically named recovery builds accept their verified predecessors', () => {
  assert.equal(used2ResumeSource('20261109-budget-r29'), 'r28');
  for (const other of ['20261109-budget-r29-copy', '20261109-budget-r029', '20261109-budget-r29 ', '20261109-budget-r29x']) assert.notEqual(used2ResumeSource(other), 'r28');
  assert.equal(used2ResumeSource('20261109-seek-audio-r28'), 'r27');
  for (const other of ['20261109-seek-audio-r28-copy', '20261109-seek-audio-r028', '20261109-seek-audio-r28 ', '20261109-seek-audio-r28x', '20261109-seek-audio-r29']) assert.notEqual(used2ResumeSource(other), 'r27');
  assert.equal(used2ResumeSource('20261109-manual-track-r27'), 'r26');
  for (const other of ['20261109-manual-track-r27-copy', '20261109-manual-track-r027', '20261109-manual-track-r27 ', '20261109-manual-track-r27x', '20261109-manual-track-r28']) assert.notEqual(used2ResumeSource(other), 'r26');
  assert.equal(used2ResumeSource('20261109-independent-track-r26'), 'r25');
  for (const other of ['20261109-independent-track-r26-copy', '20261109-independent-track-r026', '20261109-independent-track-r26 ', '20261109-independent-track-r26x', '20261109-independent-track-r27']) assert.notEqual(used2ResumeSource(other), 'r25');
  assert.equal(used2ResumeSource('20261109-source-track-r25'), 'r24');
  for (const other of ['20261109-source-track-r25-copy', '20261109-source-track-r025', '20261109-source-track-r25 ', '20261109-source-track-r25x', '20261109-source-track-r26']) assert.notEqual(used2ResumeSource(other), 'r24');
  assert.equal(used2ResumeSource('20261105-r4'), 'r3');
  assert.equal(used2ResumeSource('20261105-r5'), 'r4');
  assert.equal(used2ResumeSource('20261105-r6'), 'r5');
  assert.equal(used2ResumeSource('20261106-ux-r7'), 'r6');
  assert.equal(used2ResumeSource('20261106-ux-r8'), 'r7');
  assert.equal(used2ResumeSource('20261106-ux-r9'), 'r8');
  assert.equal(used2ResumeSource('20261106-ux-r10'), 'r9');
  assert.equal(used2ResumeSource('20261108-plan-r11'), 'r10');
  assert.equal(used2ResumeSource('20261108-audio-r12'), 'r11');
  assert.equal(used2ResumeSource('20261108-profile-r13'), 'r12');
  assert.equal(used2ResumeSource('20261108-noop-r14'), 'r13');
  assert.equal(used2ResumeSource('20261108-qc-r15'), 'r13');
  assert.equal(used2ResumeSource('20261108-audio-r16'), 'r15');
  assert.equal(used2ResumeSource('20261108-status-r17'), 'r16');
  assert.equal(used2ResumeSource('20261108-workspace-r18'), 'r17');
  assert.equal(used2ResumeSource('20261108-audio-r19'), 'r18');
  assert.equal(used2ResumeSource('20261108-errors-r20'), 'r19');
  assert.equal(used2ResumeSource('20261109-qc-r21'), 'r20');
  assert.equal(used2ResumeSource('20261109-reauth-r22'), 'r21');
  assert.equal(used2ResumeSource('20261109-grant-r23'), 'r22');
  assert.equal(used2ResumeSource('20261109-audio-message-r24'), 'r23');
  for (const other of ['20261109-audio-message-r24-copy', '20261109-audio-message-r024', '20261109-audio-message-r24 ', '20261109-audio-message-r24x', '20261109-audio-message-r25']) assert.notEqual(used2ResumeSource(other), 'r23');
  for (const other of ['20261109-grant-r23-copy', '20261109-grant-r023', '20261109-grant-r23 ', '20261109-grant-r23x', '20261109-grant-r24']) assert.notEqual(used2ResumeSource(other), 'r22');
  for (const other of ['20261109-reauth-r22-copy', '20261109-reauth-r022', '20261109-reauth-r22 ', '20261109-reauth-r22x', '20261109-reauth-r23']) assert.notEqual(used2ResumeSource(other), 'r21');
  for (const other of ['20261105-r2', '20261105-r3', '20261105-r4-copy', '20261105-r5-copy', '20261105-r6-copy', '20261105-r7', '20261108-profile-r13-copy', '20261108-noop-r14-copy', '20261108-qc-r15-copy', '20261108-audio-r16-copy', '20261108-audio-r016', '20261108-status-r17-copy', '20261108-status-r017', '20261108-workspace-r18-copy', '20261108-workspace-r018', '20261108-audio-r19-copy', '20261108-audio-r019', '20261108-errors-r20-copy', '20261108-errors-r020', '20261109-qc-r21-copy', '20261109-qc-r021', '']) assert.equal(used2ResumeSource(other), 'r2');
});

const realR28Files=['guarded-run-20261109-seek-audio-r28.json','compose-guarded-20261109-seek-audio-r28.json','build-20261109-seek-audio-r28.json','guarded-identity-1794223138902.json'];
test('r28 budget continuation binds all artifacts and rejects changed identity', {skip:realR28Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR28Files.map(name=>readFileSync(join(realR3Root,name))),config=verifyFixedUsed28RunArtifacts(realR3Root,...bytes);
  assert.equal(config.project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed28RunArtifacts(realR3Root,...modified),/r28 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed28RunArtifacts(join(realR3Root,'other'),...bytes),/r28 run identity mismatch/);
});

const realR27Files=['guarded-run-20261109-manual-track-r27.json','compose-guarded-20261109-manual-track-r27.json','build-20261109-manual-track-r27.json','guarded-identity-1794221940409.json'];
test('r27 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR27Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR27Files.map(name=>readFileSync(join(realR3Root,name))),config=verifyFixedUsed27RunArtifacts(realR3Root,...bytes);
  assert.equal(config.project,'ave-p5-current-20261105');
  assert.equal(config.desktopImage,'sha256:ac3fb6fcc2b300612f1d250b9aa2820e090c0290a74748ad7979743b345b336c');
  assert.equal(config.whisperImage,'sha256:3d0c27f01325cb0f40b9ed9c546526f60c4d8d13ecf16e4e903dbb58032fb51f');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed27RunArtifacts(realR3Root,...modified),/r27 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed27RunArtifacts(join(realR3Root,'other'),...bytes),/r27 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed27RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r27 run artifacts changed/);
});

const realR26Files=['guarded-run-20261109-independent-track-r26.json','compose-guarded-20261109-independent-track-r26.json','build-20261109-independent-track-r26.json','guarded-identity-1794220516648.json'];
test('r26 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR26Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR26Files.map(name=>readFileSync(join(realR3Root,name))),config=verifyFixedUsed26RunArtifacts(realR3Root,...bytes);
  assert.equal(config.project,'ave-p5-current-20261105');
  assert.equal(config.desktopImage,'sha256:96303525d3448cf20821d21cf848c05dec83830e008e5518b3de4bc44097a2e3');
  assert.equal(config.whisperImage,'sha256:373826cab0707017d21f26bc4575c49182882699520d9a103ea2fa6ffa577023');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed26RunArtifacts(realR3Root,...modified),/r26 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed26RunArtifacts(join(realR3Root,'other'),...bytes),/r26 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed26RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r26 run artifacts changed/);
});

const realR25Files=['guarded-run-20261109-source-track-r25.json','compose-guarded-20261109-source-track-r25.json','build-20261109-source-track-r25.json','guarded-identity-1794218348568.json'];
test('r25 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR25Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR25Files.map(name=>readFileSync(join(realR3Root,name)));
  const config=verifyFixedUsed25RunArtifacts(realR3Root,...bytes);
  assert.equal(config.project,'ave-p5-current-20261105');
  assert.equal(config.desktopImage,'sha256:caf2d87c1c7a8a35c9a9da4e1c394bcb6f6c542d1dbd0a820d1b50f6c4479fd8');
  assert.equal(config.whisperImage,'sha256:830a9b4e1db770185b2c3317d75a5c9da358438575018533efc8c47f762a98bf');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed25RunArtifacts(realR3Root,...modified),/r25 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed25RunArtifacts(join(realR3Root,'other'),...bytes),/r25 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed25RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r25 run artifacts changed/);
});

const realR24Files=['guarded-run-20261109-audio-message-r24.json','compose-guarded-20261109-audio-message-r24.json','build-20261109-audio-message-r24.json','guarded-identity-1794208340346.json'];
test('r24 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR24Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR24Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed24RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed24RunArtifacts(realR3Root,...modified),/r24 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed24RunArtifacts(join(realR3Root,'other'),...bytes),/r24 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed24RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r24 run artifacts changed/);
});

const realR23Files=['guarded-run-20261109-grant-r23.json','compose-guarded-20261109-grant-r23.json','build-20261109-grant-r23.json','guarded-identity-1794200022348.json'];
test('r23 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR23Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR23Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed23RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed23RunArtifacts(realR3Root,...modified),/r23 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed23RunArtifacts(join(realR3Root,'other'),...bytes),/r23 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed23RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r23 run artifacts changed/);
});

const realR22Files=['guarded-run-20261109-reauth-r22.json','compose-guarded-20261109-reauth-r22.json','build-20261109-reauth-r22.json','guarded-identity-1794198233674.json'];
test('r22 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR22Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR22Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed22RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed22RunArtifacts(realR3Root,...modified),/r22 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed22RunArtifacts(join(realR3Root,'other'),...bytes),/r22 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed22RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r22 run artifacts changed/);
});

const realR21Files=['guarded-run-20261109-qc-r21.json','compose-guarded-20261109-qc-r21.json','build-20261109-qc-r21.json','guarded-identity-1794197370990.json'];
test('r21 recovery pins all four artifacts, the owning root, and rejects tampering', {skip:realR21Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR21Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed21RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed21RunArtifacts(realR3Root,...modified),/r21 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed21RunArtifacts(join(realR3Root,'other'),...bytes),/r21 run identity mismatch/);
  assert.throws(()=>verifyFixedUsed21RunArtifacts(realR3Root,bytes[1],bytes[0],bytes[2],bytes[3]),/r21 run artifacts changed/);
});

const realR20Files=['guarded-run-20261108-errors-r20.json','compose-guarded-20261108-errors-r20.json','build-20261108-errors-r20.json','guarded-identity-1794142349282.json'];
test('r20 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR20Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR20Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed20RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed20RunArtifacts(realR3Root,...modified),/r20 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed20RunArtifacts(join(realR3Root,'other'),...bytes),/r20 run identity mismatch/);
});

const realR19Files=['guarded-run-20261108-audio-r19.json','compose-guarded-20261108-audio-r19.json','build-20261108-audio-r19.json','guarded-identity-1794141279064.json'];
test('r19 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR19Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR19Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed19RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed19RunArtifacts(realR3Root,...modified),/r19 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed19RunArtifacts(join(realR3Root,'other'),...bytes),/r19 run identity mismatch/);
});

const realR18Files=['guarded-run-20261108-workspace-r18.json','compose-guarded-20261108-workspace-r18.json','build-20261108-workspace-r18.json','guarded-identity-1794138548409.json'];
test('r18 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR18Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR18Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed18RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed18RunArtifacts(realR3Root,...modified),/r18 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed18RunArtifacts(join(realR3Root,'other'),...bytes),/r18 run identity mismatch/);
});

const realR17Files=['guarded-run-20261108-status-r17.json','compose-guarded-20261108-status-r17.json','build-20261108-status-r17.json','guarded-identity-1794137750088.json'];
test('r17 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR17Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR17Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed17RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed17RunArtifacts(realR3Root,...modified),/r17 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed17RunArtifacts(join(realR3Root,'other'),...bytes),/r17 run identity mismatch/);
});

const realR16Files=['guarded-run-20261108-audio-r16.json','compose-guarded-20261108-audio-r16.json','build-20261108-audio-r16.json','guarded-identity-1794136093791.json'];
test('r16 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR16Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR16Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed16RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed16RunArtifacts(realR3Root,...modified),/r16 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed16RunArtifacts(join(realR3Root,'other'),...bytes),/r16 run identity mismatch/);
});

const realR15Files=['guarded-run-20261108-qc-r15.json','compose-guarded-20261108-qc-r15.json','build-20261108-qc-r15.json','guarded-identity-1794132139246.json'];
test('r15 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR15Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR15Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed15RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed15RunArtifacts(realR3Root,...modified),/r15 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed15RunArtifacts(join(realR3Root,'other'),...bytes),/r15 run identity mismatch/);
});

const realR13Files=['guarded-run-20261108-profile-r13.json','compose-guarded-20261108-profile-r13.json','build-20261108-profile-r13.json','guarded-identity-1794129207329.json'];
test('r13 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR13Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR13Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed13RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed13RunArtifacts(realR3Root,...modified),/r13 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed13RunArtifacts(join(realR3Root,'other'),...bytes),/r13 run identity mismatch/);
});

const realR12Files=['guarded-run-20261108-audio-r12.json','compose-guarded-20261108-audio-r12.json','build-20261108-audio-r12.json','guarded-identity-1794127829807.json'];
test('r12 recovery pins each artifact, the owning root, and rejects tampering', {skip:realR12Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR12Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed12RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed12RunArtifacts(realR3Root,...modified),/r12 run artifacts changed/);}
  assert.throws(()=>verifyFixedUsed12RunArtifacts(join(realR3Root,'other'),...bytes),/r12 run identity mismatch/);
});

const realR11Files=['guarded-run-20261108-plan-r11.json','compose-guarded-20261108-plan-r11.json','build-20261108-plan-r11.json','guarded-identity-1794126486290.json'];
test('r11 recovery pins each artifact and rejects tampering', {skip:realR11Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR11Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed11RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed11RunArtifacts(realR3Root,...modified),/r11 run artifacts changed/);}
});

const realR10Files=['guarded-run-20261106-ux-r10.json','compose-guarded-20261106-ux-r10.json','build-20261106-ux-r10.json','guarded-identity-1793979134442.json'];
test('r10 recovery pins each artifact and rejects tampering', {skip:realR10Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR10Files.map(name=>readFileSync(join(realR3Root,name)));
  assert.equal(verifyFixedUsed10RunArtifacts(realR3Root,...bytes).project,'ave-p5-current-20261105');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed10RunArtifacts(realR3Root,...modified),/r10 run artifacts changed/);}
});

const realR9Files=['guarded-run-20261106-ux-r9.json','compose-guarded-20261106-ux-r9.json','build-20261106-ux-r9.json','guarded-identity-1793978668689.json'];
test('r9 recovery pins each artifact and rejects tampering', {skip:realR9Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR9Files.map(name=>readFileSync(join(realR3Root,name)));
  const config=verifyFixedUsed9RunArtifacts(realR3Root,...bytes);
  assert.equal(config.desktopImage,'sha256:28a426d28d30ea2c859a6115fd68b29595743e98ab52bd1202fe512ca8702c20');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed9RunArtifacts(realR3Root,...modified),/r9 run artifacts changed/);}
});

const realR8Files=['guarded-run-20261106-ux-r8.json','compose-guarded-20261106-ux-r8.json','build-20261106-ux-r8.json','guarded-identity-1793974675775.json'];
test('r8 recovery pins each artifact and rejects tampering', {skip:realR8Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const bytes=realR8Files.map(name=>readFileSync(join(realR3Root,name)));
  const config=verifyFixedUsed8RunArtifacts(realR3Root,...bytes);
  assert.equal(config.desktopImage,'sha256:d40d4b950723f885fee641ebeac9f88e59323362f8ff5474644e2c49c9eeaf97');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed8RunArtifacts(realR3Root,...modified),/r8 run artifacts changed/);}
});

const realR7Files=['guarded-run-20261106-ux-r7.json','compose-guarded-20261106-ux-r7.json','build-20261106-ux-r7.json','guarded-identity-1793972738420.json'];
test('r7 recovery pins each artifact and rejects tampering', {skip:realR7Files.some(name=>!existsSync(join(realR3Root,name)))}, () => {
  const names=realR7Files;
  const bytes=names.map(name=>readFileSync(join(realR3Root,name)));
  const config=verifyFixedUsed7RunArtifacts(realR3Root,...bytes);
  assert.equal(config.desktopImage,'sha256:d9b5d1d3af034cbb27bfbd0b4a0a614f8c0c419f5e9d2e05657e5a7828bc2f1e');
  for(let index=0;index<bytes.length;index++){const modified=bytes.map(value=>Buffer.from(value));modified[index][0]^=1;assert.throws(()=>verifyFixedUsed7RunArtifacts(realR3Root,...modified),/r7 run artifacts changed/);}
});

test('r6 recovery artifacts are individually pinned to the verified running image pair', { skip: realR6Files.some(name => !existsSync(join(realR3Root, name))) }, () => {
  const bytes = realR6Files.map(name => readFileSync(join(realR3Root, name)));
  const config = verifyFixedUsed6RunArtifacts(realR3Root, ...bytes);
  assert.equal(config.desktopImage, 'sha256:b05f61b105fef7eb795dde9f08f853407b30dade7ff1d1d9813d288494bfecb1');
  assert.equal(config.whisperImage, 'sha256:cf2692fbdb6c99564fa02968c32826876821ed5527dd457a69943f9eb71cb8e6');
  for (let index = 0; index < bytes.length; index++) {
    const modified = bytes.map(value => Buffer.from(value)); modified[index][0] ^= 1;
    assert.throws(() => verifyFixedUsed6RunArtifacts(realR3Root, ...modified), /r6 run artifacts changed/);
  }
  assert.throws(() => verifyFixedUsed6RunArtifacts(realR3Root, bytes[0], bytes[1], bytes[3], bytes[2]), /r6 run artifacts changed/);
});

test('r5 recovery artifacts are individually pinned to the verified running image pair', { skip: realR5Files.some(name => !existsSync(join(realR3Root, name))) }, () => {
  const bytes = realR5Files.map(name => readFileSync(join(realR3Root, name)));
  const config = verifyFixedUsed5RunArtifacts(realR3Root, ...bytes);
  assert.equal(config.desktopImage, 'sha256:71c9ce55c01a4cf1e60973b215ed4e949bfce8139e6eda5e56c1c73308f8791c');
  assert.equal(config.whisperImage, 'sha256:564ee006a5c66b9795b68e32271563c9616944885d3e05a1cba0cd8021f76743');
  for (let index = 0; index < bytes.length; index++) {
    const modified = bytes.map(value => Buffer.from(value)); modified[index][0] ^= 1;
    assert.throws(() => verifyFixedUsed5RunArtifacts(realR3Root, ...modified), /r5 run artifacts changed/);
  }
  assert.throws(() => verifyFixedUsed5RunArtifacts(realR3Root, bytes[0], bytes[1], bytes[3], bytes[2]), /r5 run artifacts changed/);
});

test('r4 recovery artifacts are individually pinned to the verified running image pair', { skip: realR4Files.some(name => !existsSync(join(realR3Root, name))) }, () => {
  const bytes = realR4Files.map(name => readFileSync(join(realR3Root, name)));
  const config = verifyFixedUsed4RunArtifacts(realR3Root, ...bytes);
  assert.equal(config.desktopImage, 'sha256:66c27a16d0573451b4646ab2cbcb3b195cfe9314c39c942eb3220db1315365f0');
  assert.equal(config.whisperImage, 'sha256:50429ecbdea27e13f2b4ef4316561825c6406669cd0484e9944dc6ae2cf3f6d8');
  for (let index = 0; index < bytes.length; index++) {
    const modified = bytes.map(value => Buffer.from(value)); modified[index][0] ^= 1;
    assert.throws(() => verifyFixedUsed4RunArtifacts(realR3Root, ...modified), /r4 run artifacts changed/);
  }
  assert.throws(() => verifyFixedUsed4RunArtifacts(realR3Root, bytes[0], bytes[1], bytes[3], bytes[2]), /r4 run artifacts changed/);
});

test('r3 recovery artifacts are individually pinned to the verified running image pair', { skip: realR3Files.some(name => !existsSync(join(realR3Root, name))) }, () => {
  const bytes = realR3Files.map(name => readFileSync(join(realR3Root, name)));
  const config = verifyFixedUsed3RunArtifacts(realR3Root, ...bytes);
  assert.equal(config.desktopImage, 'sha256:5281a79e49c4c223779f615cbb605a6fb493ae126f06f603d9bd8679f5f6212a');
  assert.equal(config.whisperImage, 'sha256:2586334f8dcd201dfa172bb0240b053c3babbad211cb10fd8e56e8e54803a0d9');
  for (let index = 0; index < bytes.length; index++) {
    const modified = bytes.map(value => Buffer.from(value)); modified[index][0] ^= 1;
    assert.throws(() => verifyFixedUsed3RunArtifacts(realR3Root, ...modified), /r3 run artifacts changed/);
  }
});

test('real P5 CLI resolves used resume dependencies without top-level-await deadlock', () => {
  const cli = fileURLToPath(new URL('../../scripts/p5/run.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, '--check-resume-modules'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `stdout=${result.stdout}\nstderr=${result.stderr}`);
  assert.match(result.stdout, /P5_RESUME_MODULES_READY/);
  assert.doesNotMatch(result.stderr, /unsettled top-level await/);
});

test('resume lock releases its own file and refuses a replaced owner', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-resume-lock-'));
  const path = join(root, 'owner.lock');
  try {
    const owner = acquireResumeLock(path);
    assert.throws(() => acquireResumeLock(path), /EEXIST/);
    owner.release();
    assert.equal(existsSync(path), false);

    const replaced = acquireResumeLock(path);
    renameSync(path, join(root, 'original.lock'));
    writeFileSync(path, 'other owner', { flag: 'wx' });
    assert.throws(() => replaced.release(), /ownership changed/);
    assert.equal(readFileSync(path, 'utf8'), 'other owner');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('second used harness stages only a stopped exact first-generation harness', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-used2-harness-'));
  try {
    const harness = join(root, 'harness'); mkdirSync(harness);
    for (const name of ['guard.mjs', 'ledger.mjs', 'install.mjs', 'launch.py', 'sources.mjs', 'performance-amendment.mjs', 'used-policy-switch.mjs', 'used2-policy-switch.mjs']) writeFileSync(join(harness, name), `fixture ${name}`);
    const old = json(buildHarnessManifest(harness, 'used'));
    writeFileSync(join(root, 'harness-manifest-used-r1.json'), old); writeFileSync(join(root, 'harness-manifest.json'), old);
    const next = buildHarnessManifest(harness, 'used2');
    assert.throws(() => stageUsed2Harness(root, next, () => false), /Host must be stopped/);
    assert.equal(stageUsed2Harness(root, next, () => true), sha(json(next)));
    assert.deepEqual(readFileSync(join(root, 'harness-manifest-before-used-r2.json')), old);
    assert.deepEqual(readFileSync(join(root, 'harness-manifest.json')), json(next));
    assert.equal(stageUsed2Harness(root, next, () => true), sha(json(next)));
    const changed = structuredClone(next); changed.files[0].sha256 = 'a'.repeat(64);
    assert.throws(() => stageUsed2Harness(root, changed, () => true), /snapshot changed/);
    assert.throws(() => requireNoUsed2Helper('remaining-helper'), /still exists/);
    assert.equal(requireNoUsed2Helper(''), true);
    assert.throws(() => runFixedUsed2Switch({ root }), /fixed Windows host invocation/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('budget-amended harness resumes only from its exact stopped snapshot', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-budget-harness-'));
  try {
    const harness = join(root, 'harness'); mkdirSync(harness);
    for (const name of ['guard.mjs','ledger.mjs','install.mjs','launch.py','sources.mjs','performance-amendment.mjs','used-policy-switch.mjs','used2-policy-switch.mjs','budget-amendment.mjs']) writeFileSync(join(harness, name), `fixture ${name}`);
    const manifest = buildHarnessManifest(harness, 'used2', true), serialized = json(manifest);
    writeFileSync(join(root, 'harness-manifest.json'), serialized); writeFileSync(join(root, 'harness-manifest-budget-200.json'), serialized);
    assert.throws(() => verifyAmendedHarness(root, manifest, () => false), /Host must be stopped/);
    assert.equal(verifyAmendedHarness(root, manifest, () => true), sha(serialized));
    writeFileSync(join(root, 'harness-manifest-budget-200.pending'), 'pending');
    assert.throws(() => verifyAmendedHarness(root, manifest, () => true), /snapshot changed/);
    writeFileSync(join(root, 'harness-manifest-budget-299173272.json'), serialized);
    assert.equal(verifyAmendedHarness(root, manifest, () => true, true), sha(serialized));
    writeFileSync(join(root, 'harness-manifest-budget-299173272.pending'), 'pending');
    assert.throws(() => verifyAmendedHarness(root, manifest, () => true, true), /snapshot changed/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('stopped P5 resume refuses running, failed, changed mounts, ports and networks', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-resume-runtime-'));
  try {
    for (const part of ['inputs', 'exports', 'budget', 'harness']) mkdirSync(join(root, part));
    const config = { project: 'ave-p5-test', port: 6083, mode: 'guarded', desktopImage: image, whisperImage: image, runRoot: root, materialsRoot: join(root, 'inputs'), exportRoot: join(root, 'exports'), budgetRoot: join(root, 'budget'), harnessRoot: join(root, 'harness') };
    const volume = (Destination, Name, RW = true) => ({ Destination, Type: 'volume', Name, RW });
    const bind = (Destination, Source, RW = false) => ({ Destination, Type: 'bind', Source, RW });
    const state = { Running: false, Status: 'exited', ExitCode: 0, Paused: false, Restarting: false };
    const desktopId = 'a'.repeat(64);
    const desktop = { Id: desktopId, Image: image, State: state, Config: { Labels: { 'com.docker.compose.project': config.project, 'com.docker.compose.service': 'desktop' }, Entrypoint: ['/opt/ave-python/bin/python', '/p5-harness/launch.py'], Env: [`AVE_P5_ISOLATED_PROJECT=${config.project}`] }, NetworkSettings: { Ports: {} }, HostConfig: { RestartPolicy: { Name: 'no' }, PortBindings: { '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '6083' }] } }, Mounts: [
      volume('/config', `${config.project}_profile`), volume('/run/ave', `${config.project}_configuration`), volume('/workspace/projects', `${config.project}_projects`), volume('/workspace/uploads', `${config.project}_uploads`),
      bind('/workspace/materials', config.materialsRoot), bind('/workspace/exports', config.exportRoot, true), volume('/original-config', 'ave-desktop_configuration', false), bind('/p5-harness', config.harnessRoot), bind('/p5-run', config.runRoot), bind('/p5-budget', config.budgetRoot, true),
    ] };
    const whisper = { Id: 'c'.repeat(64), Image: image, State: state, Config: { Labels: { 'com.docker.compose.project': config.project, 'com.docker.compose.service': 'whisper' }, Env: ['HF_HUB_OFFLINE=1'] }, HostConfig: { RestartPolicy: { Name: 'no' }, NetworkMode: `container:${desktopId}` }, NetworkSettings: { Ports: {} }, Mounts: [volume('/home/ubuntu/.cache/huggingface/hub', `${config.project}_whisper-cache`)] };
    assert.equal(validateStoppedRuntime(config, desktop, whisper), true);
    const nextConfig = { ...config, desktopImage: `sha256:${'e'.repeat(64)}`, whisperImage: `sha256:${'f'.repeat(64)}` };
    assert.equal(validateUsedResumeRuntime(config, nextConfig, desktop, whisper), 'previous');
    const nextDesktop = { ...desktop, Image: nextConfig.desktopImage }, nextWhisper = { ...whisper, Image: nextConfig.whisperImage };
    assert.equal(validateUsedResumeRuntime(config, nextConfig, nextDesktop, nextWhisper), 'next');
    assert.throws(() => validateUsedResumeRuntime(config, nextConfig, nextDesktop, whisper), /authorized pair/);
    const unrelatedDesktop = { ...desktop, Image: `sha256:${'1'.repeat(64)}` }, unrelatedWhisper = { ...whisper, Image: `sha256:${'2'.repeat(64)}` };
    assert.throws(() => validateUsedResumeRuntime(config, nextConfig, unrelatedDesktop, unrelatedWhisper), /authorized pair/);
    assert.throws(() => validateUsedResumeRuntime(config, nextConfig, desktop, nextWhisper), /authorized pair/);
    assert.throws(() => validateUsedResumeRuntime(config, { ...nextConfig, project: 'other' }, desktop, whisper), /configuration identity changed/);
    const mutate = (value, change) => { const copy = structuredClone(value); change(copy); return copy; };
    assert.equal(validateStoppedRuntime(config, mutate(desktop, x => { x.State.ExitCode = 143; }), whisper), true);
    assert.throws(() => validateStoppedRuntime(config, mutate(desktop, x => { x.State.Running = true; }), whisper), /stopped without failure/);
    assert.throws(() => validateStoppedRuntime(config, desktop, mutate(whisper, x => { x.State.ExitCode = 1; })), /stopped without failure/);
    assert.throws(() => validateStoppedRuntime(config, mutate(desktop, x => { x.State.OOMKilled = true; }), whisper), /stopped without failure/);
    assert.throws(() => validateStoppedRuntime(config, mutate(desktop, x => { x.HostConfig.RestartPolicy.Name = 'always'; }), whisper), /automatic restart/);
    assert.throws(() => validateStoppedRuntime(config, mutate(desktop, x => { x.Mounts[2].Name = 'different_projects'; }), whisper), /mount mismatch/);
    assert.throws(() => validateStoppedRuntime(config, mutate(desktop, x => { x.Mounts[8].RW = true; }), whisper), /mount mismatch/);
    assert.throws(() => validateStoppedRuntime(config, mutate(desktop, x => { x.HostConfig.PortBindings['8080/tcp'][0].HostIp = '0.0.0.0'; }), whisper), /port mismatch/);
    assert.throws(() => validateStoppedRuntime(config, desktop, mutate(whisper, x => { x.HostConfig.NetworkMode = `container:${'d'.repeat(64)}`; })), /network differs/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('performance harness keeps original immutable and refuses stale or incomplete changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-resume-harness-'));
  try {
    const harness = join(root, 'harness'); mkdirSync(harness);
    for (const name of ['guard.mjs', 'ledger.mjs', 'install.mjs', 'launch.py', 'sources.mjs', 'performance-amendment.mjs']) writeFileSync(join(harness, name), `fixture ${name}`);
    const old = { schema_version: 1, files: [
      { file: 'guard.mjs', sha256: 'ced3093eeae667e8f03bf748e24e5bc4ee37377ddffd662d825c66e61ccf4d34' },
      { file: 'install.mjs', sha256: 'cc85119253813ae16fd5f6b71095ae179f36aa52f55be09a424bbd03b481375a' },
      { file: 'launch.py', sha256: 'd0d12c4cd7769bd574ce8d8b026ab2d4e9759b0e3d15c9e1f4194cd014744f55' },
      { file: 'ledger.mjs', sha256: 'b63f0e36c13d1b709dc4402d99a5fe8dc738f50aa794da55cbc9fbf73e4d0c07' },
    ] };
    const canonical = join(root, 'harness-manifest.json'), oldBytes = json(old); writeFileSync(canonical, oldBytes);
    const next = buildHarnessManifest(harness, 'performance');
    assert.equal(next.files.length, 6);
    assert.equal(stagePerformanceHarness(root, next), sha(json(next)));
    assert.deepEqual(readFileSync(join(root, 'harness-manifest-baseline-performance-r1.json')), oldBytes);
    assert.deepEqual(readFileSync(canonical), json(next));
    assert.equal(stagePerformanceHarness(root, next), sha(json(next)));
    assert.throws(() => stagePerformanceHarness(root, { ...next, files: next.files.slice(0, 4) }), /invalid expanded/);
    writeFileSync(join(root, 'harness-manifest-performance-r1.pending'), 'interrupted');
    assert.throws(() => stagePerformanceHarness(root, next), /replacement remains pending/);
    assert.deepEqual(readFileSync(canonical), json(next));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('used harness stages only while stopped, preserves the previous manifest, and rejects drift', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-used-harness-'));
  try {
    const harness = join(root, 'harness'); mkdirSync(harness);
    for (const name of ['guard.mjs', 'ledger.mjs', 'install.mjs', 'launch.py', 'sources.mjs', 'performance-amendment.mjs', 'used-policy-switch.mjs']) writeFileSync(join(harness, name), `fixture ${name}`);
    const old = json(buildHarnessManifest(harness, 'performance'));
    writeFileSync(join(root, 'harness-manifest-performance-r1.json'), old);
    writeFileSync(join(root, 'harness-manifest.json'), old);
    const next = buildHarnessManifest(harness, 'used');
    assert.throws(() => stageUsedHarness(root, next, () => false), /Host must be stopped/);
    assert.equal(stageUsedHarness(root, next, () => true), sha(json(next)));
    assert.deepEqual(readFileSync(join(root, 'harness-manifest-before-used-r1.json')), old);
    assert.deepEqual(readFileSync(join(root, 'harness-manifest.json')), json(next));
    assert.equal(stageUsedHarness(root, next, () => true), sha(json(next)));
    const changed = structuredClone(next); changed.files[0].sha256 = 'a'.repeat(64);
    assert.throws(() => stageUsedHarness(root, changed, () => true), /snapshot changed/);
    assert.throws(() => stageUsedHarness(root, { ...next, files: next.files.slice(0, 6) }, () => true), /invalid used harness/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('fixed transition wrapper rejects caller paths and changed run artifacts', () => {
  assert.throws(() => runFixedUsedSwitch('other'), /fixed Windows host invocation only/);
  assert.throws(() => verifyFixedUsedRunArtifacts('elsewhere', Buffer.from('{}'), Buffer.from('{}'), Buffer.from('{}')), /artifacts changed/);
  assert.equal(requireNoUsedHelper(''), true);
  assert.throws(() => requireNoUsedHelper('some-container-id'), /helper still exists/);
  assert.throws(() => requireNoUsedHelper(null), /state is unknown/);
});

test('empty policy switch must have matching immutable receipt, snapshots and pristine ledger', () => {
  const root = mkdtempSync(join(tmpdir(), 'p5-resume-switch-'));
  try {
    const snapshots = join(root, 'empty-policy-switch.snapshots'), ledger = join(root, 'budget', 'ledger');
    mkdirSync(snapshots); mkdirSync(ledger, { recursive: true });
    const previous = { version: 1, purpose: 'baseline' }, next = { version: 1, purpose: 'performance' }, evidence = { fixture: 'test' };
    const previousHash = policyDigest(previous), nextHash = policyDigest(next);
    const oldHead = { version: 1, sequence: 0, hash: '0'.repeat(64), policyHash: previousHash, limit: 100_000_000 };
    const items = { 'old-head.json': json(oldHead), 'old-policy.json': json(previous), 'new-policy.json': json(next), 'evidence.json': json(evidence) };
    for (const [name, bytes] of Object.entries(items)) writeFileSync(join(snapshots, name), bytes);
    const receipt = { version: 1, oldPolicyHash: previousHash, newPolicyHash: nextHash, oldHeadSha256: sha(items['old-head.json']), ledgerSha256: sha(Buffer.alloc(0)), files: Object.fromEntries(Object.entries(items).map(([name, bytes]) => [name, sha(bytes)])) };
    const receiptBytes = json(receipt); writeFileSync(join(snapshots, 'receipt.json'), receiptBytes);
    writeFileSync(join(root, 'empty-policy-switch.completed'), json({ receiptSha256: sha(receiptBytes) }));
    writeFileSync(join(root, 'baseline-policy-performance-r1.json'), items['old-policy.json']);
    writeFileSync(join(root, 'guard-policy.json'), items['new-policy.json']);
    writeFileSync(join(root, 'candidate-evidence-performance-r1.json'), items['evidence.json']);
    writeFileSync(join(ledger, 'head.json'), json({ ...oldHead, policyHash: nextHash }));
    writeFileSync(join(ledger, 'ledger.jsonl'), '');
    assert.equal(validateEmptySwitchEvidence(root, next, previousHash), true);
    assert.throws(() => assertEmptySwitchComplete(root, next), /policy switch identity mismatch/);
    writeFileSync(join(root, 'empty-policy-switch.pending'), '{}');
    assert.throws(() => validateEmptySwitchEvidence(root, next, previousHash), /remains pending/);
    rmSync(join(root, 'empty-policy-switch.pending'));
    writeFileSync(join(ledger, 'ledger.jsonl'), '{}\n');
    assert.throws(() => validateEmptySwitchEvidence(root, next, previousHash), /ledger not pristine/);
    writeFileSync(join(ledger, 'ledger.jsonl'), '');
    writeFileSync(join(snapshots, 'evidence.json'), '{}');
    assert.throws(() => validateEmptySwitchEvidence(root, next, previousHash), /snapshot mismatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
