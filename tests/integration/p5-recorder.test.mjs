import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { outputWithinRoot, validateChunk, validateCapture, readStopMarker } = require('../../scripts/p5/recorder/guards.cjs');

test('recorder rejects escaped destinations and invalid chunks', () => {
  const root = resolve('p5-evidence-root');
  outputWithinRoot(root, resolve(root, 'run'));
  assert.throws(() => outputWithinRoot(root, resolve(root, '..', 'outside')), /outside evidence root/);
  validateChunk('recording', {}, 0, 0, new ArrayBuffer(3));
  validateChunk('stopping', {}, 1, 1, new ArrayBuffer(1));
  assert.throws(() => validateChunk('recording', {}, 1, 0, new ArrayBuffer(1)), /out-of-order/);
  assert.throws(() => validateChunk('recording', {}, 1, 1, new ArrayBuffer(0)), /invalid/);
  assert.throws(() => validateChunk('starting', {}, 0, 0, new ArrayBuffer(1)), /invalid/);
});

test('recorder fails closed when the requested display does not exist', { timeout: 30000, skip: process.platform !== 'win32' }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-recorder-'));
  try {
    const electron = require('electron');
    const child = spawn(electron, [resolve('scripts/p5/recorder/main.cjs'), '--output', join(root, 'attempt.webm'), '--display-id', 'invalid-display-id'], { env: { ...process.env, AVE_INTERACTION_EVIDENCE_ROOT: root }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    const exit = await new Promise((done, reject) => { child.once('error', reject); child.once('close', code => done(code)); });
    assert.notEqual(exit, 0, stderr);
    assert.match(stdout, /display ID not uniquely available/);
    assert.doesNotMatch(stdout, /"event":"stopped"/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('recorder requires audio/video tracks, duration and stable clock', () => {
  const start = { wallMs: 10000, monoMs: 1000 }, end = { wallMs: 20000, monoMs: 11000 };
  const probe = { format: { duration: '10.1' }, streams: [{ codec_type: 'video' }, { codec_type: 'audio' }] };
  assert.equal(validateCapture(start, end, probe), 10.1);
  assert.throws(() => validateCapture(start, end, { ...probe, streams: [{ codec_type: 'video' }] }), /missing audio/);
  assert.throws(() => validateCapture(start, end, { ...probe, format: {} }), /duration/);
  assert.throws(() => validateCapture(start, { ...end, wallMs: 25000 }, probe), /clock changed/);
  assert.throws(() => validateCapture(start, end, { ...probe, format: { duration: '5' } }), /elapsed capture time/);
});

test('recorder reads a stop marker after a temporary Windows sharing violation', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-stop-marker-'));
  try {
    const markerPath = join(root, 'capture.webm.stop.json');
    await writeFile(markerPath, '{"command":"stop"}');
    const actualFs = await import('node:fs/promises');
    const busy = Object.assign(new Error('sharing violation'), { code: 'EBUSY' });
    let reads = 0, waits = 0;
    const fileSystem = {
      lstat: actualFs.lstat,
      readFile: async (...args) => { if (++reads < 3) throw busy; return actualFs.readFile(...args); },
    };
    assert.deepEqual(await readStopMarker(markerPath, { fileSystem, wait: async () => { waits++; }, attempts: 3 }), { command: 'stop' });
    assert.equal(reads, 3);
    assert.equal(waits, 2);

    reads = 0; waits = 0;
    const permanentlyBusy = { lstat: actualFs.lstat, readFile: async () => { reads++; throw busy; } };
    await assert.rejects(readStopMarker(markerPath, { fileSystem: permanentlyBusy, wait: async () => { waits++; }, attempts: 3 }), error => error === busy);
    assert.equal(reads, 3);
    assert.equal(waits, 2);

    await writeFile(markerPath, '{invalid');
    waits = 0;
    await assert.rejects(readStopMarker(markerPath, { wait: async () => { waits++; } }), SyntaxError);
    assert.equal(waits, 0);
    await assert.rejects(readStopMarker(root), /invalid stop marker/);
    const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    await assert.rejects(readStopMarker(markerPath, { fileSystem: { lstat: async () => { throw denied; } }, wait: async () => { waits++; } }), error => error === denied);
    assert.equal(waits, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('recorder waits for an actual exclusive Windows marker writer to close', { timeout: 20000, skip: process.platform !== 'win32' }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-stop-lock-'));
  const markerPath = join(root, 'capture.webm.stop.json');
  let child, childClosed;
  try {
    await writeFile(markerPath, '{"command":"stop"}');
    const script = "$stream=[System.IO.File]::Open($env:P5_TEST_LOCK_PATH,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::None); try { [Console]::Out.WriteLine('locked'); [Console]::Out.Flush(); [void][Console]::ReadLine() } finally { $stream.Dispose() }";
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, P5_TEST_LOCK_PATH: markerPath }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    childClosed = new Promise(resolveExit => child.once('close', resolveExit));
    await new Promise((resolveReady, reject) => {
      let output = '', errors = '';
      child.stdout.on('data', chunk => { output += chunk; if (output.includes('locked')) resolveReady(); });
      child.stderr.on('data', chunk => { errors += chunk; });
      child.once('error', reject);
      child.once('exit', code => { if (!output.includes('locked')) reject(Error(`lock helper exited ${code}: ${errors}`)); });
    });
    const actualFs = await import('node:fs/promises');
    let release;
    const busySeen = new Promise(resolveBusy => { release = resolveBusy; });
    const fileSystem = {
      lstat: actualFs.lstat,
      readFile: async (...args) => {
        try { return await actualFs.readFile(...args); }
        catch (error) { if (error.code === 'EBUSY') release(); throw error; }
      },
    };
    const pending = readStopMarker(markerPath, { fileSystem, intervalMs: 50 });
    await Promise.race([busySeen, pending.then(() => { throw Error('marker read while exclusively locked'); })]);
    child.stdin.end('\n');
    assert.deepEqual(await pending, { command: 'stop' });
    assert.equal(await childClosed, 0);
  } finally {
    if (child && child.exitCode === null) child.kill();
    if (childClosed) await childClosed;
    rmSync(root, { recursive: true, force: true });
  }
});
