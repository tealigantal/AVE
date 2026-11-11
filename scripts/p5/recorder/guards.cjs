'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');

function outputWithinRoot(root, parent) {
  const rel = path.relative(root, parent);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw Error('output parent outside evidence root');
}
function validateChunk(state, raw, expected, index, bytes) {
  if (!['recording', 'stopping'].includes(state) || !raw || index !== expected || !(bytes instanceof ArrayBuffer) || !bytes.byteLength || bytes.byteLength > 32 * 1024 * 1024) throw Error('invalid or out-of-order recorder chunk');
}
// A Windows writer can briefly hold the newly published marker exclusively.
// Retry only that explicit sharing violation; malformed or inaccessible markers fail closed.
async function readStopMarker(markerPath, { fileSystem = fs, wait = delay, attempts = 30, intervalMs = 100 } = {}) {
  if (!Number.isSafeInteger(attempts) || attempts < 1 || !Number.isSafeInteger(intervalMs) || intervalMs < 0) throw Error('invalid stop marker retry policy');
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const marker = await fileSystem.lstat(markerPath);
      if (!marker.isFile() || marker.size > 1024) throw Error('invalid stop marker');
      return JSON.parse(await fileSystem.readFile(markerPath, 'utf8'));
    } catch (error) {
      if (error?.code !== 'EBUSY' || attempt === attempts - 1) throw error;
      await wait(intervalMs);
    }
  }
}
function validateCapture(started, finished, probe) {
  if (!started || !finished || !Number.isFinite(started.wallMs) || !Number.isFinite(started.monoMs) || !Number.isFinite(finished.wallMs) || !Number.isFinite(finished.monoMs)) throw Error('invalid capture clock');
  const monotonic = (finished.monoMs - started.monoMs) / 1000;
  const wall = (finished.wallMs - started.wallMs) / 1000;
  if (monotonic <= 0 || Math.abs(wall - monotonic) > 1) throw Error('capture wall clock changed');
  const duration = Number(probe?.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || !probe.streams?.some(x => x.codec_type === 'video') || !probe.streams?.some(x => x.codec_type === 'audio')) throw Error('ffprobe missing audio/video or duration');
  if (Math.abs(duration - monotonic) > 2) throw Error('recording duration differs from elapsed capture time');
  return duration;
}
module.exports = { outputWithinRoot, validateChunk, validateCapture, readStopMarker };
